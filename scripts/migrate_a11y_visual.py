import io, glob, re

paths = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('components/**/*.tsx', recursive=True) + ['App.tsx']

for p in paths:
    s = io.open(p, encoding='utf-8').read()
    
    # Visual Performance
    s = s.replace('shadow-2xl', 'shadow-sm')
    s = s.replace('backdrop-blur-md', 'backdrop-blur-sm')
    
    # App.tsx Mobile Menu toggle
    s = s.replace('<button\n                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}',
                  '<button\n                aria-label="القائمة"\n                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}')
    
    # ThemeToggle
    if 'ThemeToggle' in p:
        s = s.replace('<button\n      onClick={toggleTheme}', '<button\n      aria-label="تغيير المظهر"\n      onClick={toggleTheme}')
    
    # Remove photo button
    s = s.replace('title="إزالة الصورة"', 'title="إزالة الصورة" aria-label="إزالة الصورة"')

    io.open(p, 'w', encoding='utf-8').write(s)
print('A11y and visual updates applied.')
