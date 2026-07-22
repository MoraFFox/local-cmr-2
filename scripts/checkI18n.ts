import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { auditFile, findSourceFiles, Finding } from './lib/i18n-audit';

const ALLOWLIST_PATH = path.resolve('tests/i18n-allowlist.json');
const UI_SOURCE_DIRS = [path.resolve('src'), path.resolve('components')];

function loadAllowlist(): Set<string> {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return new Set();
  }
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf-8');
  const list = JSON.parse(raw) as string[];
  return new Set(list);
}

function isUnderSourceDirs(file: string): boolean {
  const normalized = path.resolve(file);
  return UI_SOURCE_DIRS.some(dir => normalized.startsWith(dir));
}

function getStagedFiles(): string[] {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  return output
    .split('\n')
    .map(f => f.trim())
    .filter((f): f is string => Boolean(f) && (f.endsWith('.ts') || f.endsWith('.tsx')) && isUnderSourceDirs(f))
    .map(f => path.resolve(f));
}

function formatPath(file: string): string {
  return path.relative(process.cwd(), file) || file;
}

function main() {
  const useStaged = process.argv.slice(2).includes('--staged');

  let filesToCheck: string[];
  if (useStaged) {
    filesToCheck = getStagedFiles();
    if (filesToCheck.length === 0) {
      console.log('ℹ️ No staged .ts/.tsx files under src/ or components/ to check.');
      process.exit(0);
    }
  } else {
    filesToCheck = [];
    for (const dir of UI_SOURCE_DIRS) {
      if (fs.existsSync(dir)) {
        filesToCheck.push(...findSourceFiles(dir));
      }
    }
  }

  const findings: Finding[] = [];
  for (const file of filesToCheck) {
    findings.push(...auditFile(file));
  }

  const allowlist = loadAllowlist();
  const newFindings = findings.filter(f => !allowlist.has(f.text));

  if (newFindings.length === 0) {
    console.log(' No new hard-coded English UI strings found.');
    process.exit(0);
  }

  console.error(` Found ${newFindings.length} new hard-coded English UI string(s):\n`);
  for (const f of newFindings) {
    console.error(`  [${f.kind}] ${f.text}`);
    console.error(`    at ${formatPath(f.file)}:${f.line}`);
  }
  console.error(`\nEither localize these strings or add genuinely untranslatable strings to ${ALLOWLIST_PATH}.`);
  console.error(`To regenerate the allowlist, run: npm run i18n:allowlist`);
  process.exit(1);
}

main();
