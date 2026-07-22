import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const UI_ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'label'];

export interface Finding {
  file: string;
  kind: string;
  text: string;
  line: number;
}

function isCodeLike(text: string): boolean {
  // Contains TypeScript/React code patterns that never appear in user-facing text.
  if (/React\./.test(text)) return true;
  if (/>=/.test(text)) return true;
  if (/\(.*\)\s*=>/.test(text)) return true;
  if (/\{.*\}/.test(text)) return true;
  if (/^[A-Za-z][A-Za-z0-9]*\s*:\s*[A-Za-z]/.test(text)) return true;
  if (/^[a-z][a-zA-Z0-9]*\(/.test(text)) return true;
  return false;
}

export function isLikelyUiString(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  if (isCodeLike(trimmed)) return false;

  // Skip single camelCase identifiers (e.g. "useState", "all", "logs")
  if (/^[a-z][A-Za-z0-9]+$/.test(trimmed) && trimmed.length < 30) return false;

  // Skip CSS class-like identifiers
  if (/^[a-z0-9-]+$/.test(trimmed)) return false;

  // Skip all-caps constants
  if (/^[A-Z0-9_]+$/.test(trimmed)) return false;

  return true;
}

export function auditFile(filePath: string): Finding[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const findings: Finding[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile).trim();
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      if (isLikelyUiString(text)) {
        findings.push({ file: filePath, kind: 'JSX text', text, line: line + 1 });
      }
    }

    if (ts.isJsxAttribute(node)) {
      const attrName = node.name.getText(sourceFile);
      if (!UI_ATTRS.includes(attrName)) {
        return;
      }

      let text = '';
      if (!node.initializer) {
        return;
      }
      if (ts.isStringLiteral(node.initializer)) {
        text = node.initializer.text;
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        ts.isStringLiteral(node.initializer.expression)
      ) {
        text = node.initializer.expression.text;
      }

      if (text && isLikelyUiString(text)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        findings.push({ file: filePath, kind: attrName, text, line: line + 1 });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

export function findSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === '.freebuff' ||
        entry.name === 'test-results'
      ) {
        continue;
      }
      files.push(...findSourceFiles(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.spec.tsx')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}
