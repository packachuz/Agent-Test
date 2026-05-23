#!/usr/bin/env python3
"""
rag_rebuild.py — Full rebuild of all NotebookLM notebooks.

Operator-only script. Exits 1 on failure.
R9: In settings.json deny list — must not be invoked by any agent.

Usage:
    python3 scripts/rag_rebuild.py
    python3 scripts/rag_rebuild.py --dry-run
"""
import argparse
import asyncio
import json
import logging
import os
import stat
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from rag.config import NOTEBOOKS, CORPUS_SOURCES, NOTEBOOKS_JSON_PATH, SYNCED_RUNS_PATH, REPO_ROOT

logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("rag_rebuild")


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


async def main(dry_run: bool):
    log.info("rag_rebuild: starting%s", " [DRY RUN]" if dry_run else "")

    tmp_path, storage_path = None, None
    try:
        tmp_path, storage_path = _write_auth_tmpfs()
    except Exception as exc:
        log.error("rag_rebuild: failed to write auth to tmpfs: %s", exc)
        sys.exit(1)

    try:
        from notebooklm import NotebookLMClient

        async with (await NotebookLMClient.from_storage(path=storage_path)) as client:
            if NOTEBOOKS_JSON_PATH.exists():
                try:
                    old_ids = json.loads(NOTEBOOKS_JSON_PATH.read_text(encoding="utf-8"))
                except Exception:
                    old_ids = {}
                for key, nb_id in old_ids.items():
                    if dry_run:
                        log.info("  [dry-run] would delete notebook %s (%s)", key, nb_id)
                        continue
                    try:
                        await client.notebooks.delete(notebook_id=nb_id)
                        log.info("  Deleted %s OK", key)
                    except Exception as exc:
                        log.warning("  Failed to delete %s: %s — continuing", key, exc)
                if not dry_run:
                    NOTEBOOKS_JSON_PATH.unlink(missing_ok=True)
                    if SYNCED_RUNS_PATH.exists():
                        SYNCED_RUNS_PATH.unlink(missing_ok=True)

            if dry_run:
                log.info("rag_rebuild: [dry-run] stopping before create step")
                return

            notebook_ids = {}
            for key, meta in NOTEBOOKS.items():
                log.info("Creating notebook: %s (%s)", key, meta["title"])
                try:
                    nb = await client.notebooks.create(title=meta["title"])
                    notebook_ids[key] = nb.id
                except Exception as exc:
                    log.error("Failed to create notebook %s: %s", key, exc)
                    sys.exit(1)
                for rel_path, title in CORPUS_SOURCES:
                    full_path = REPO_ROOT / rel_path
                    if not full_path.exists():
                        log.warning("  Corpus source not found: %s", full_path)
                        continue
                    content = full_path.read_text(encoding="utf-8")
                    try:
                        await client.sources.add_text(
                            notebook_id=nb.id, title=title, content=content, wait=True
                        )
                    except Exception as exc:
                        log.error("  Failed to add source '%s': %s", title, exc)
                        sys.exit(1)

            NOTEBOOKS_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
            NOTEBOOKS_JSON_PATH.write_text(json.dumps(notebook_ids, indent=2), encoding="utf-8")
            SYNCED_RUNS_PATH.write_text(
                json.dumps({key: [] for key in NOTEBOOKS}, indent=2), encoding="utf-8"
            )
            log.info("rag_rebuild: DONE")

    except SystemExit:
        raise
    except Exception as exc:
        log.error("rag_rebuild: unexpected error: %s", exc)
        sys.exit(1)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
