#!/usr/bin/env python3
"""
rag_query.py — Query one agent's NotebookLM notebook.

Exit codes:
  0 — success, answer is non-empty
  2 — advisory failure (empty result, network error, not configured) — pipeline continues

Stdout: one JSON object: {"answer": "<str>", "citations": ["<str>", ...]}
Stderr: all diagnostics

Usage:
    python3 scripts/rag_query.py --agent=arc --query="redesign auth flow"
    python3 scripts/rag_query.py --agent=sec --task-goal="add login" --triage="risk: high"
"""
import argparse
import asyncio
import json
import logging
import os
import re
import stat
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from rag.config import NOTEBOOKS, QUERY_TEMPLATES, NOTEBOOKS_JSON_PATH

logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("rag_query")

EMPTY_RESULT = {"answer": "", "citations": []}

# R8: patterns to strip from queries before transmission
_STRIP_PATTERNS = [
    re.compile(r'\b[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b'),   # email addresses
    re.compile(r'kv/\S+'),                                   # Vault paths
    re.compile(r'\S+\.internal\b'),                          # internal hostnames
]


def _sanitize_query(query: str) -> str:
    """R8: Strip PII and internal identifiers from query strings before transmission."""
    original_len = len(query)
    for pattern in _STRIP_PATTERNS:
        query = pattern.sub('[redacted]', query)
    stripped = original_len - len(query)
    if stripped > 0:
        log.info("rag_query: sanitized %d chars from query", stripped)
    return query


def _emit(result: dict):
    print(json.dumps(result), flush=True)


def _write_auth_tmpfs() -> tuple[str | None, str | None]:
    """R4: Write NOTEBOOKLM_AUTH_JSON to tmpfs, clear env var."""
    auth_json = os.environ.get("NOTEBOOKLM_AUTH_JSON")
    if not auth_json:
        return None, None
    tmp_path = f"/dev/shm/notebooklm_{os.getpid()}.json"
    with open(tmp_path, "w") as f:
        f.write(auth_json)
    os.chmod(tmp_path, stat.S_IRUSR | stat.S_IWUSR)
    del os.environ["NOTEBOOKLM_AUTH_JSON"]
    return tmp_path, tmp_path


async def query(agent_key: str, question: str) -> dict:
    if not NOTEBOOKS_JSON_PATH.exists():
        log.warning("rag_query: notebooks.json not found; run rag_setup.py first")
        return EMPTY_RESULT

    try:
        notebook_ids = json.loads(NOTEBOOKS_JSON_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        log.warning("rag_query: failed to read notebooks.json: %s", exc)
        return EMPTY_RESULT

    if agent_key not in notebook_ids:
        log.warning("rag_query: agent key '%s' not in notebooks.json", agent_key)
        return EMPTY_RESULT

    notebook_id = notebook_ids[agent_key]

    tmp_path, storage_path = None, None
    try:
        tmp_path, storage_path = _write_auth_tmpfs()
    except Exception as exc:
        log.warning("rag_query: failed to write auth to tmpfs: %s", exc)
        return EMPTY_RESULT

    try:
        from notebooklm import NotebookLMClient

        async with (await NotebookLMClient.from_storage(path=storage_path)) as client:
            result = await client.chat.ask(
                notebook_id=notebook_id,
                question=question,
            )
    except Exception as exc:
        log.warning("rag_query: ask failed for '%s': %s", agent_key, exc)
        return EMPTY_RESULT
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    answer = result.answer or ""
    citations = []
    for ref in (result.references or []):
        text = getattr(ref, "cited_text", None) or getattr(ref, "source_id", None) or str(ref)
        citations.append(str(text))

    return {"answer": answer, "citations": citations}


def build_question(agent_key: str, raw_query: str, task_goal: str, triage_summary: str) -> str:
    if raw_query:
        return _sanitize_query(raw_query)
    template = QUERY_TEMPLATES.get(agent_key, "{task_goal}. Context: {triage_summary}")
    return _sanitize_query(template.format(task_goal=task_goal, triage_summary=triage_summary))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", required=True, choices=list(NOTEBOOKS.keys()))
    parser.add_argument("--query", default="")
    parser.add_argument("--task-goal", default="")
    parser.add_argument("--triage", default="")
    args = parser.parse_args()

    if not args.query and not args.task_goal:
        log.warning("rag_query: neither --query nor --task-goal provided")
        _emit(EMPTY_RESULT)
        sys.exit(2)

    question = build_question(args.agent, args.query, args.task_goal, args.triage)

    try:
        result = asyncio.run(query(args.agent, question))
    except Exception as exc:
        log.warning("rag_query: unexpected error: %s", exc)
        result = EMPTY_RESULT

    _emit(result)
    # R5: exit 2 on empty result (advisory failure), 0 on success
    sys.exit(0 if result.get("answer") else 2)


if __name__ == "__main__":
    main()
