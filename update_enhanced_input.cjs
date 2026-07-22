const fs = require('fs');
let content = fs.readFileSync('components/form-ui/EnhancedInput.tsx', 'utf8');

// Update autoScroll behavior to use { block: 'center' }
content = content.replace(
  /const scrollIntoView = \(\) => \{\n\s*const viewportHeight = window\.innerHeight;\n\s*const inputRect = input\.getBoundingClientRect\(\);\n\s*const targetY = inputRect\.top - \(viewportHeight \* 0\.2\);\n\n\s*window\.scrollTo\(\{\n\s*top: window\.scrollY \+ targetY,\n\s*behavior: 'smooth'\n\s*\}\);\n\s*\};/,
  `const scrollIntoView = () => {
      input.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };`
);

fs.writeFileSync('components/form-ui/EnhancedInput.tsx', content);
