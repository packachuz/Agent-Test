import fs from 'node:fs';
import path from 'node:path';
import { generate, MODELS } from '../shared/gemini.js';

function readRecentRuns(maxRuns = 20): string {
  const dir = path.resolve('runs');
  if (!fs.existsSync(dir)) return 'No runs yet.';

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .reverse()
    .slice(0, maxRuns);

  if (files.length === 0) return 'No runs yet.';

  return files.map(f => {
    const lines = fs.readFileSync(path.join(dir, f), 'utf-8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l));
    const errors = lines.filter((l: any) => l.error || l.action.includes('blocked') || l.action.includes('fail'));
    return `### ${f}\n${errors.map((l: any) => `- [${l.agent}] ${l.action}: ${l.error || ''}`).join('\n') || '- No errors'}`;
  }).join('\n\n');
}

function readMemoryFile(name: string): string {
  const p = path.resolve('memory', name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

function writeMemoryFile(name: string, content: string): void {
  fs.mkdirSync(path.resolve('memory'), { recursive: true });
  fs.writeFileSync(path.resolve('memory', name), content.trim() + '\n');
}

// Remove a markdown code fence the model sometimes wraps the whole file in.
function stripFences(text: string): string {
  return text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
}

// Every "[Human-seeded]" heading in the original must survive the update.
function preservesHumanSeeded(original: string, updated: string): boolean {
  const markers = original.match(/\[Human-seeded\][^\n]*/g) ?? [];
  return markers.every(m => updated.includes(m));
}

async function updateMemoryFile(
  filename: string,
  instruction: string,
  currentContent: string,
  runSummary: string
): Promise<void> {
  const text = await generate({
    model: MODELS.flash,
    maxOutputTokens: 4096,
    prompt: `${instruction}

## Recent run summary
${runSummary}

## Current ${filename}
${currentContent || '(empty)'}

Return the updated full file content. Keep it concise and actionable.`,
  });
  const cleaned = stripFences(text);
  if (!cleaned) { console.log(`Skipped memory/${filename} (empty model output)`); return; }
  // roadmap.md carries human-governed sections — never overwrite if the model
  // dropped one. Other memory files have no human-seeded markers, so the
  // guard is a no-op for them.
  if (!preservesHumanSeeded(currentContent, cleaned)) {
    console.error(`Skipped memory/${filename}: model output dropped a [Human-seeded] section`);
    return;
  }
  writeMemoryFile(filename, cleaned);
  console.log(`Updated memory/${filename}`);
}

async function main(): Promise<void> {
  console.log('=== Overnight retrospective starting ===');
  const runSummary = readRecentRuns();

  // allSettled (not all): a single Gemini failure on one file must not abort
  // the others or skip the roadmap reprioritisation below.
  const settled = await Promise.allSettled([
    updateMemoryFile(
      'lessons.md',
      'Update the lessons file with new failure patterns from recent runs. Add entries for anything that failed 2+ times. Keep existing entries if still relevant.',
      readMemoryFile('lessons.md'),
      runSummary
    ),
    updateMemoryFile(
      'skills.md',
      'Update the skills file with improved approaches discovered from recent runs. Add entries for approaches that worked well. Remove outdated entries.',
      readMemoryFile('skills.md'),
      runSummary
    ),
  ]);
  settled.forEach((s, i) => {
    if (s.status === 'rejected') console.error(`  memory update ${i + 1} failed: ${String(s.reason)}`);
  });

  // Roadmap reprioritisation (sequential — reads updated lessons first)
  await updateMemoryFile(
    'roadmap.md',
    'Update only the CTO-maintained section of the roadmap. Reprioritise the backlog based on recent run outcomes. Never touch human-seeded sections.',
    readMemoryFile('roadmap.md'),
    runSummary
  );

  console.log('=== Overnight retrospective complete ===');
}

main().catch(err => { console.error(err); process.exit(1); });
