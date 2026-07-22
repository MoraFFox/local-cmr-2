#!/usr/bin/env python3
"""
Audit script that scans .tsx/.ts files for hard-coded English UI strings
that should likely be localized into the ar.ui / ar.common translation tree.

It reports candidate strings but excludes:
- strings already using translation calls (t\.(...), ar\.(...))
- className strings
- comments and docstrings
- test files
- obvious non-English text
- common code-only strings (e.g. types, import paths, variable names)
"""

import os
import re
import sys
from pathlib import Path

UI_FILE_EXTENSIONS = {'.tsx', '.ts'}
EXCLUDED_DIRS = {'node_modules', 'dist', 'build', '.freebuff', 'test-results', 'tests', '__tests__'}

# Attributes that commonly carry user-facing strings
UI_ATTRS = ('placeholder', 'aria-label', 'title', 'alt', 'label')

# Regex for JSX text nodes (between > and <)
JSX_TEXT_RE = re.compile(r'>([^<>]*[A-Za-z][^<>]*)<', re.MULTILINE)

# Regex for string literals assigned to UI attributes: attr="..." or attr={"..."}
ATTR_RE_TEMPLATE = r'{attr}=(?:{{)?"([^"]*[A-Za-z][^"]*)"(?:}})?'

# Common code-only strings that are not user-facing
SKIP_SUBSTRINGS = {
    'className', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
    'useContext', 'useReducer', 'useT(', 'ar.', 't.', 'import ', 'from ',
    'undefined', 'null', 'true', 'false', 'return', 'function', 'const ',
    'export ', 'default', 'interface', 'type ', '=>', '...', 'string', 'number',
    'boolean', 'void', 'any', 'unknown', 'never', 'React.', 'ReactNode',
    'Component', 'Props', 'State', 'Dispatch', 'SetStateAction',
    'onClick', 'onChange', 'onSubmit', 'onBlur', 'onFocus', 'onMouseEnter',
    'onMouseLeave', 'onTouchStart', 'onTouchEnd', 'onKeyDown', 'onKeyUp',
    'preventDefault', 'stopPropagation', 'target', 'currentTarget', 'value',
    'checked', 'selected', 'disabled', 'required', 'readOnly', 'type=',
    'http', 'https', 'mailto:', 'tel:', '.jpg', '.png', '.svg', '.webp',
    '@heroicons', 'data:', 'base64', 'rgb(', 'rgba(', '#', 'px', 'rem', 'em',
    'md', 'lg', 'xl', 'sm', 'xs', '2xl', '3xl', '4xl', '5xl', '6xl',
    'bottom', 'center', 'left', 'right', 'top', 'start', 'end', 'auto', 'full',
    'small', 'medium', 'large', 'primary', 'secondary', 'success', 'error',
    'warning', 'info', 'light', 'dark', 'outline', 'ghost', 'link', 'solid',
    'fixed', 'absolute', 'relative', 'static', 'sticky', 'block', 'inline',
    'flex', 'grid', 'hidden', 'visible', 'invisible', 'collapse', 'uppercase',
    'lowercase', 'capitalize', 'normal-case', 'truncate', 'break-words',
    'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line',
    'whitespace-pre-wrap', 'leading-', 'tracking-', 'font-', 'text-', 'bg-',
    'border-', 'rounded-', 'shadow-', 'opacity-', 'z-', 'translate-', 'scale-',
    'rotate-', 'skew-', 'origin-', 'duration-', 'delay-', 'ease-', 'transition-',
    'animate-', 'cursor-', 'select-', 'resize-', 'appearance-', 'outline-',
    'ring-', 'divide-', 'space-', 'gap-', 'p-', 'px-', 'py-', 'm-', 'mx-', 'my-',
    'mt-', 'mb-', 'ml-', 'mr-', 'pt-', 'pb-', 'pl-', 'pr-', 'w-', 'h-', 'min-w-',
    'min-h-', 'max-w-', 'max-h-', 'inset-', 'top-', 'right-', 'bottom-', 'left-',
    'x-', 'y-', 'col-', 'row-', 'flex-', 'grid-', 'basis-', 'grow-', 'shrink-',
    'order-', 'place-', 'content-', 'items-', 'justify-', 'self-', 'overflow-',
    'overscroll-', 'sr-only', 'not-sr-only', 'rtl', 'ltr', 'role=', 'tabIndex',
    'aria-', 'data-', 'id=', 'name=', 'htmlFor', 'key={', 'ref={', 'style=',
}


def is_mostly_english(text: str) -> bool:
    """Return True if the string looks like mostly English UI text."""
    if not text or len(text.strip()) < 2:
        return False
    ascii_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    total_alpha = sum(1 for c in text if c.isalpha())
    if total_alpha == 0:
        return False
    return ascii_chars / total_alpha > 0.6


def should_skip_file(path: Path) -> bool:
    if any(part in EXCLUDED_DIRS for part in path.parts):
        return True
    if '.test.' in path.name or '.spec.' in path.name:
        return True
    return False


def is_likely_ui_string(text: str, kind: str) -> bool:
    """Filter out obvious non-UI strings."""
    text = text.strip()
    if len(text) < 2:
        return False
    # Skip if mostly numbers/symbols
    if not any(c.isalpha() for c in text):
        return False
    # Skip dynamic JSX expressions
    if '{' in text or '}' in text:
        return False
    # Skip if it's camelCase/PascalCase with no spaces (likely a code identifier)
    if re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', text) and ' ' not in text:
        return False
    # Skip common code-only substrings
    for skip in SKIP_SUBSTRINGS:
        if skip in text:
            return False
    # Skip CSS class-like strings (no spaces, has dashes)
    if ' ' not in text and '-' in text:
        return False
    # Skip strings that look like dates or numbers
    if re.fullmatch(r'\d{1,4}[/-]\d{1,2}[/-]\d{1,4}', text):
        return False
    return True


def audit_file(path: Path):
    content = path.read_text(encoding='utf-8')
    findings = []

    # JSX text nodes
    for match in JSX_TEXT_RE.finditer(content):
        text = match.group(1).strip()
        if not is_likely_ui_string(text, 'JSX text'):
            continue
        if is_mostly_english(text):
            findings.append(('JSX text', text))

    # UI attributes
    for attr in UI_ATTRS:
        pattern = re.compile(ATTR_RE_TEMPLATE.format(attr=attr), re.MULTILINE)
        for match in pattern.finditer(content):
            text = match.group(1).strip()
            if not is_likely_ui_string(text, attr):
                continue
            if is_mostly_english(text):
                findings.append((attr, text))

    return findings


def main():
    base_dirs = [Path('src'), Path('components')]
    files = []
    for d in base_dirs:
        if not d.exists():
            continue
        for path in d.rglob('*'):
            if path.suffix in UI_FILE_EXTENSIONS and not should_skip_file(path):
                files.append(path)

    all_findings: dict[str, list[tuple[str, str]]] = {}
    for f in files:
        findings = audit_file(f)
        if findings:
            all_findings[str(f)] = findings

    if not all_findings:
        print('No obvious hard-coded English UI strings found.')
        return 0

    for f, findings in sorted(all_findings.items()):
        print(f'--- {f} ---')
        for kind, text in findings:
            print(f'  [{kind}] {text!r}')
        print()

    return 0


if __name__ == '__main__':
    sys.exit(main())
