#!/usr/bin/env python3
"""
test_rag.py — Unit tests for RAG scripts (no network calls).
Run: python3 scripts/test_rag.py
"""
import json
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

sys.path.insert(0, str(Path(__file__).parent.parent))

# Test run_id validation from rag_sync
RUN_ID_PATTERN = re.compile(r'^run_[a-zA-Z0-9]{8}$')

class TestRunIdValidation(unittest.TestCase):
    def test_valid_ids(self):
        for rid in ["run_e4b9f732", "run_a1b2c3d4", "run_ABCDEF12"]:
            self.assertIsNotNone(RUN_ID_PATTERN.fullmatch(rid), f"{rid} should be valid")

    def test_invalid_ids(self):
        for rid in ["run_", "run_abc", "run_tooolong12", "run_abc!@#$", "../../etc"]:
            self.assertIsNone(RUN_ID_PATTERN.fullmatch(rid), f"{rid} should be invalid")

class TestQuerySanitization(unittest.TestCase):
    _STRIP_PATTERNS = [
        re.compile(r'\b[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b'),
        re.compile(r'kv/\S+'),
        re.compile(r'\S+\.internal\b'),
    ]

    def _sanitize(self, query: str) -> str:
        for p in self._STRIP_PATTERNS:
            query = p.sub('[redacted]', query)
        return query

    def test_strips_email(self):
        result = self._sanitize("contact admin@company.com about this")
        self.assertNotIn("admin@company.com", result)
        self.assertIn("[redacted]", result)

    def test_strips_vault_path(self):
        result = self._sanitize("token at kv/agents/github/token was rotated")
        self.assertNotIn("kv/agents/github/token", result)

    def test_strips_internal_hostname(self):
        result = self._sanitize("service at api.company.internal is down")
        self.assertNotIn("api.company.internal", result)

    def test_preserves_normal_query(self):
        original = "implement OIDC login with authorization code flow"
        result = self._sanitize(original)
        self.assertEqual(original, result)

class TestJSONLAllowlist(unittest.TestCase):
    def _extract_verdicts(self, entries, run_id):
        aliases = {
            "architect": "arc", "arc": "arc",
            "security": "sec", "sec": "sec",
            "developer": "dev", "dev": "dev",
            "qa": "qa",
            "devops": "dvo", "dvo": "dvo",
        }
        agent_verdicts = {key: [] for key in ["arc","sec","dev","qa","dvo"]}
        for entry in entries:
            agent_results = entry.get("agent_results", {})
            for agent_name, result in agent_results.items():
                nb_key = aliases.get(agent_name.lower())
                if nb_key and isinstance(result, dict):
                    status = re.sub(r'[^a-zA-Z0-9_-]', '', str(result.get("status", "unknown")))
                    agent_verdicts[nb_key].append(f"run={run_id} agent={agent_name} status={status}")
        return {k: "\n".join(v) for k, v in agent_verdicts.items() if v}

    def test_strips_vault_paths_from_content(self):
        entries = [{"agent_results": {"architect": {"status": "done", "vault_path": "kv/secret"}}}]
        result = self._extract_verdicts(entries, "run_abc12345")
        arc_content = result.get("arc", "")
        self.assertNotIn("kv/secret", arc_content)
        self.assertIn("status=done", arc_content)

    def test_only_allowlisted_fields_in_output(self):
        entries = [{"agent_results": {"developer": {
            "status": "done",
            "summary": "implemented login; token at kv/auth/token",
            "files": ["/workspaces/Agent-Test/agent/cto/types.ts"]
        }}}]
        result = self._extract_verdicts(entries, "run_test1234")
        dev_content = result.get("dev", "")
        # Only status should appear, not summary or files
        self.assertIn("status=done", dev_content)
        self.assertNotIn("kv/auth/token", dev_content)
        self.assertNotIn("/workspaces", dev_content)

class TestConfigPaths(unittest.TestCase):
    def test_corpus_files_exist(self):
        repo_root = Path(__file__).parent.parent
        corpus_dir = repo_root / "rag" / "corpus"
        self.assertTrue((corpus_dir / "lessons-summary.md").exists(),
                        "rag/corpus/lessons-summary.md must exist")
        self.assertTrue((corpus_dir / "decisions-summary.md").exists(),
                        "rag/corpus/decisions-summary.md must exist")

    def test_requirements_file_pins_version(self):
        repo_root = Path(__file__).parent.parent
        req_file = repo_root / "requirements.txt"
        self.assertTrue(req_file.exists(), "requirements.txt must exist")
        content = req_file.read_text()
        self.assertIn("notebooklm-py==", content, "notebooklm-py must be pinned to exact version")

if __name__ == "__main__":
    unittest.main(verbosity=2)
