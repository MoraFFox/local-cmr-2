import * as fs from 'fs';
import * as path from 'path';
import { auditFile, findSourceFiles, Finding } from './lib/i18n-audit';

const OUTPUT = path.resolve('tests/i18n-allowlist.json');

function main() {
  const sourceDirs = [path.resolve('src'), path.resolve('components')];
  const allFiles: string[] = [];
  for (const dir of sourceDirs) {
    if (fs.existsSync(dir)) {
      allFiles.push(...findSourceFiles(dir));
    }
  }

  const findings = new Map<string, Finding>();
  for (const file of allFiles) {
    for (const finding of auditFile(file)) {
      findings.set(finding.text, finding);
    }
  }

  const allowed = Array.from(findings.keys()).sort();
  fs.writeFileSync(OUTPUT, JSON.stringify(allowed, null, 2) + '\n', 'utf-8');
  console.log(`Generated allowlist with ${allowed.length} entries at ${OUTPUT}`);
}

main();
