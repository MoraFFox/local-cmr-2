import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { auditFile, findSourceFiles, Finding } from '../scripts/lib/i18n-audit';

/**
 * i18n Audit – Regression Test
 *
 * Scans all TypeScript/TSX source files for hard-coded English strings that
 * appear in user-facing positions (JSX text nodes and common UI attributes).
 * The test fails when a string is found that is NOT on the allowlist, which
 * prevents new hard-coded English labels from being introduced.
 *
 * The allowlist is stored in `i18n-allowlist.json`. It intentionally contains
 * existing English strings that have not been migrated yet. As more strings are
 * localized, they should be removed from the allowlist so the test guards
 * against regressions.
 */

const ALLOWLIST_PATH = path.resolve('tests/i18n-allowlist.json');

function loadAllowlist(): Set<string> {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return new Set();
  }
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf-8');
  const list = JSON.parse(raw) as string[];
  return new Set(list);
}

describe('i18n audit', () => {
  it('does not introduce new hard-coded English UI strings', () => {
    const sourceDirs = [path.resolve('src'), path.resolve('components')];
    const allFiles: string[] = [];
    for (const dir of sourceDirs) {
      if (fs.existsSync(dir)) {
        allFiles.push(...findSourceFiles(dir));
      }
    }

    const allFindings: Finding[] = [];
    for (const file of allFiles) {
      allFindings.push(...auditFile(file));
    }

    const allowlist = loadAllowlist();
    const newFindings = allFindings.filter(f => !allowlist.has(f.text));

    if (newFindings.length > 0) {
      const summary = newFindings
        .map(f => `  [${f.kind}] ${f.text} (${f.file})`)
        .join('\n');
      throw new Error(
        `Found ${newFindings.length} new hard-coded English UI string(s). ` +
        `Either localize them or add genuinely untranslatable strings to the allowlist.\n${summary}`
      );
    }

    expect(newFindings).toHaveLength(0);
  });
});
