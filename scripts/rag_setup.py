#!/usr/bin/env python3
"""
rag_setup.py — Create five per-agent NotebookLM notebooks, load sanitized corpus sources,
and save notebook IDs to rag/notebooks.json.

Run once per environment. Exits 1 on failure.

Usage:
    python3 scripts/rag_setup.py
"""
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
log = logging.getLogger("rag_setup")


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


async def main():
    log.info("rag_setup: starting")

    tmp_path, storage_path = None, None
    try:
        tmp_path, storage_path = _write_auth_tmpfs()
    except Exception as exc:
        log.error("rag_setup: failed to write auth to tmpfs: %s", exc)
        sys.exit(1)

    try:
        from notebooklm import NotebookLMClient

        async with (await NotebookLMClient.from_storage(path=storage_path)) as client:
            notebook_ids = {}

            for key, meta in NOTEBOOKS.items():
                log.info("Creating notebook: %s (%s)", key, meta["title"])
                try:
                    nb = await client.notebooks.create(title=meta["title"])
                    notebook_ids[key] = nb.id
                    log.info("  Created %s -> %s", key, nb.id)
                except Exception as exc:
                    log.error("  Failed to create notebook %s: %s", key, exc)
                    sys.exit(1)

                for rel_path, title in CORPUS_SOURCES:
                    full_path = REPO_ROOT / rel_path
                    if not full_path.exists():
                        log.warning("  Corpus source not found, skipping: %s", full_path)
                        continue
                    content = full_path.read_text(encoding="utf-8")
                    log.info("  Adding source '%s' to %s", title, key)
                    try:
                        await client.sources.add_text(
                            notebook_id=nb.id, title=title, content=content, wait=True
                        )
                    except Exception as exc:
                        log.error("  Failed to add source '%s' to %s: %s", title, key, exc)
                        sys.exit(1)

            NOTEBOOKS_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
            NOTEBOOKS_JSON_PATH.write_text(json.dumps(notebook_ids, indent=2), encoding="utf-8")
            log.info("rag_setup: wrote %s", NOTEBOOKS_JSON_PATH)

            if not SYNCED_RUNS_PATH.exists():
                initial = {key: [] for key in NOTEBOOKS}
                SYNCED_RUNS_PATH.write_text(json.dumps(initial, indent=2), encoding="utf-8")
                log.info("rag_setup: initialised %s", SYNCED_RUNS_PATH)

            log.info("rag_setup: DONE")

    except SystemExit:
        raise
    except Exception as exc:
        log.error("rag_setup: unexpected error: %s", exc)
        sys.exit(1)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


if __name__ == "__main__":
    asyncio.run(main())
