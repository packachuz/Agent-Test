#!/usr/bin/env python3
"""
rag_sync.py — Post-run: sync run outputs to NotebookLM notebooks.

Exits 0 always (advisory). Logs to stderr.
R2: Only allowlisted fields uploaded (run_id, agent_name, verdict/status).
R6: run_id validated before any file path use.
R7: Deduplication via rag/synced_runs.json; max 50 synced runs per notebook.

Usage:
    python3 scripts/rag_sync.py --run_id=run_e4b9f732
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
from rag.config import NOTEBOOKS, NOTEBOOKS_JSON_PATH, SYNCED_RUNS_PATH, REPO_ROOT, MAX_SOURCES_PER_NOTEBOOK

logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("rag_sync")

# R6: strict run_id pattern
RUN_ID_PATTERN = re.compile(r'^run_[a-zA-Z0-9]{8}$')


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


def _load_notebooks_json() -> dict | None:
    if not NOTEBOOKS_JSON_PATH.exists():
        log.warning("rag_sync: notebooks.json not found; run rag_setup.py first")
        return None
    try:
        return json.loads(NOTEBOOKS_JSON_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        log.warning("rag_sync: failed to read notebooks.json: %s", exc)
        return None


def _load_synced_runs() -> dict:
    if not SYNCED_RUNS_PATH.exists():
        return {key: [] for key in NOTEBOOKS}
    try:
        return json.loads(SYNCED_RUNS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {key: [] for key in NOTEBOOKS}


def _save_synced_runs(synced: dict):
    try:
        SYNCED_RUNS_PATH.write_text(json.dumps(synced, indent=2), encoding="utf-8")
    except Exception as exc:
        log.warning("rag_sync: failed to save synced_runs.json: %s", exc)


def _extract_agent_verdicts(entries: list[dict], run_id: str) -> dict[str, str]:
    """
    R2: Extract only allowlisted fields. Maps notebook key to safe summary line.
    Allowlist: run_id, agent_name, status/verdict fields only.
    """
    aliases = {
        "architect": "arc", "arc": "arc",
        "security": "sec", "sec": "sec",
        "developer": "dev", "dev": "dev",
        "qa": "qa",
        "devops": "dvo", "dvo": "dvo",
    }

    agent_verdicts: dict[str, list[str]] = {key: [] for key in NOTEBOOKS}

    for entry in entries:
        if not isinstance(entry, dict):
            continue

        agent_results = entry.get("agent_results", {})
        for agent_name, result in agent_results.items():
            nb_key = aliases.get(agent_name.lower())
            if nb_key is None or not isinstance(result, dict):
                continue
            # R2: only status field, sanitized to safe chars
            status = re.sub(r'[^a-zA-Z0-9_-]', '', str(result.get("status", "unknown")))
            agent_verdicts[nb_key].append(f"run={run_id} agent={agent_name} status={status}")

        # Top-level decision/outcome — strip to safe chars
        decision = re.sub(r'[^a-zA-Z0-9_-]', '', str(entry.get("decision", "")))
        outcome = re.sub(r'[^a-zA-Z0-9_-]', '', str(entry.get("outcome", "")))
        if decision or outcome:
            summary = f"run={run_id} decision={decision} outcome={outcome}"
            for key in agent_verdicts:
                agent_verdicts[key].append(summary)
            break

    return {key: "\n".join(lines) for key, lines in agent_verdicts.items() if lines}


async def sync(run_id: str):
    notebook_ids = _load_notebooks_json()
    if notebook_ids is None:
        return

    run_file = REPO_ROOT / "runs" / f"{run_id}.jsonl"
    if not run_file.exists():
        log.warning("rag_sync: run file not found: %s", run_file)
        return

    entries = []
    with run_file.open(encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError as exc:
                log.warning("rag_sync: skipping malformed JSONL line %d: %s", lineno, exc)

    if not entries:
        log.info("rag_sync: no entries in %s", run_file)
        return

    agent_contents = _extract_agent_verdicts(entries, run_id)
    synced = _load_synced_runs()

    tmp_path, storage_path = None, None
    try:
        tmp_path, storage_path = _write_auth_tmpfs()
    except Exception as exc:
        log.warning("rag_sync: failed to write auth to tmpfs: %s", exc)
        return

    try:
        from notebooklm import NotebookLMClient

        async with (await NotebookLMClient.from_storage(path=storage_path)) as client:
            for nb_key, content in agent_contents.items():
                if nb_key not in notebook_ids:
                    log.warning("rag_sync: notebook key '%s' not in notebooks.json", nb_key)
                    continue

                # R7: deduplication
                already_synced = synced.get(nb_key, [])
                if run_id in already_synced:
                    log.info("rag_sync: %s already synced to %s, skipping", run_id, nb_key)
                    continue

                # R7: max source limit
                if len(already_synced) >= MAX_SOURCES_PER_NOTEBOOK:
                    log.warning(
                        "rag_sync: notebook '%s' at max %d runs; skipping %s",
                        nb_key, MAX_SOURCES_PER_NOTEBOOK, run_id,
                    )
                    continue

                log.info("rag_sync: syncing %s -> %s (%d chars)", run_id, nb_key, len(content))
                try:
                    await client.sources.add_text(
                        notebook_id=notebook_ids[nb_key],
                        title=run_id,
                        content=content,
                        wait=True,
                        wait_timeout=120,
                    )
                    if nb_key not in synced:
                        synced[nb_key] = []
                    synced[nb_key].append(run_id)
                    log.info("rag_sync: synced %s -> %s OK", run_id, nb_key)
                except Exception as exc:
                    log.warning("rag_sync: failed %s -> %s: %s", run_id, nb_key, exc)

    except Exception as exc:
        log.warning("rag_sync: client error: %s", exc)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    _save_synced_runs(synced)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run_id", required=True)
    args = parser.parse_args()

    # R6: validate run_id before any file path use
    if not RUN_ID_PATTERN.fullmatch(args.run_id):
        log.error("rag_sync: invalid run_id format: %s (expected run_[a-zA-Z0-9]{8})", args.run_id)
        sys.exit(1)

    try:
        asyncio.run(sync(args.run_id))
    except Exception as exc:
        log.warning("rag_sync: unexpected error: %s", exc)
    sys.exit(0)


if __name__ == "__main__":
    main()
