#!/usr/bin/env python3
import re
from pathlib import Path

UI_FILE_EXTENSIONS = {'.ts', '.tsx'}
EXCLUDED_DIRS = {'node_modules', 'dist', 'build', '.freebuff', 'test-results', 'tests', '__tests__'}
UI_ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'label']
JSX_TEXT_RE = re.compile(r'>([^<>]*[A-Za-z][^<>]*)<', re.MULTILINE)

def build_attr_pattern(attr):
    return re.compile(f'{attr}=(?:\\{{)?"([^"]*[A-Za-z][^"]*)"(?:\\}})?', re.MULTILINE)

SKIP_SUBSTRINGS = {
    'className', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
    'useContext', 'useReducer', 'import ', 'from ',
}

def is_likely_ui_string(text):
    if not text or len(text.strip()) < 2:
        return False
    if not any(c.isalpha() for c in text):
        return False
    if '{' in text or '}' in text:
        return False
    if re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', text) and ' ' not in text:
        return False
    for skip in SKIP_SUBSTRINGS:
        if skip in text:
            return False
    if ' ' not in text and '-' in text:
        return False
    return True

def audit_file(path):
    content = path.read_text(encoding='utf-8')
    findings = set()
    for match in JSX_TEXT_RE.finditer(content):
        text = match.group(1).strip()
        if is_likely_ui_string(text):
            findings.add(text)
    for attr in UI_ATTRS:
        pattern = build_attr_pattern(attr)
        for match in pattern.finditer(content):
            text = match.group(1).strip()
            if is_likely_ui_string(text):
                findings.add(text)
    return findings

def main():
    all_findings = set()
    for base in ['src', 'components']:
        d = Path(base)
        if not d.exists():
            continue
        for path in d.rglob('*'):
            if path.suffix in UI_FILE_EXTENSIONS:
                if any(part in EXCLUDED_DIRS for part in path.parts):
                    continue
                if '.test.' in path.name or '.spec.' in path.name:
                    continue
                all_findings.update(audit_file(path))
    for text in sorted(all_findings):
        print(f"  '{text}',")

if __name__ == '__main__':
    main()
