from pathlib import Path

NOTEBOOKS_JSON_PATH = Path(__file__).parent / "notebooks.json"
SYNCED_RUNS_PATH = Path(__file__).parent / "synced_runs.json"
REPO_ROOT = Path(__file__).parent.parent
K = 5
MAX_SOURCES_PER_NOTEBOOK = 50

NOTEBOOKS = {
    "arc": {"title": "arc-notebook", "agent_field": "arc"},
    "sec": {"title": "sec-notebook", "agent_field": "sec"},
    "dev": {"title": "dev-notebook", "agent_field": "dev"},
    "qa":  {"title": "qa-notebook",  "agent_field": "qa"},
    "dvo": {"title": "dvo-notebook", "agent_field": "dvo"},
}

# Sanitized corpus files ONLY — never raw memory files
CORPUS_SOURCES = [
    ("rag/corpus/lessons-summary.md", "lessons-summary"),
    ("rag/corpus/decisions-summary.md", "decisions-summary"),
]

QUERY_TEMPLATES = {
    "arc": "What past architectural decisions or design patterns are relevant to: {task_goal}. Context: {triage_summary}",
    "sec": "What security findings or failure patterns from past runs apply to: {task_goal}. Context: {triage_summary}",
    "dev": "What implementation notes or past code changes are relevant to implementing: {task_goal}. Context: {triage_summary}",
    "qa":  "What past QA verdicts or failure modes apply to verifying: {task_goal}. Context: {triage_summary}",
    "dvo": "What past DevOps provisioning steps or PR patterns apply to: {task_goal}. Context: {triage_summary}",
}
