const fs = require('fs');
let content = fs.readFileSync('components/MobileMaintenanceEditor.tsx', 'utf8');

// Import DateInputWithPresets
content = content.replace(
  "import { DatePresetButtons } from './form-ui/EnhancedInput';",
  "import { DatePresetButtons, DateInputWithPresets } from './form-ui/EnhancedInput';"
);

// Add safe area paddings to the scroll container
content = content.replace(
  /<div\n\s*ref=\{sectionContentRef\}\n\s*data-testid="section-content"\n\s*className=\{`space-y-4 \$\{activeSection \? 'block' : 'hidden'\}`\}\n\s*>/,
  `<div
          ref={sectionContentRef}
          data-testid="section-content"
          className={\`space-y-4 \${activeSection ? 'block' : 'hidden'} pb-safe pt-safe\`}
        >`
);

// Replace raw date input with DateInputWithPresets
const dateBlockRegex = /<DatePresetButtons\n\s*value=\{selectedRecord\.maintenanceDate\}\n\s*onChange=\{\(date\) =>\n\s*handleUpdateRecord\(\{\n\s*\.\.\.selectedRecord,\n\s*maintenanceDate: date,\n\s*\}\)\n\s*\}\n\s*variant="slate"\n\s*className="mb-2"\n\s*\/>\n\s*<input\n\s*type="date"\n\s*name="maintenanceDate"\n\s*value=\{selectedRecord\.maintenanceDate\}\n\s*onChange=\{\(e\) =>\n\s*handleUpdateRecord\(\{\n\s*\.\.\.selectedRecord,\n\s*maintenanceDate: e\.target\.value,\n\s*\}\)\n\s*\}\n\s*className=\{`w-full px-3 py-3 bg-slate-100 dark:bg-slate-700 border rounded-lg \$\{\n\s*validation\.errors\.maintenanceDate\n\s*\? 'border-red-500 focus:ring-red-500'\n\s*: 'border-slate-300 dark:border-slate-600'\n\s*\}\`\}\n\s*\/>/;

content = content.replace(dateBlockRegex, 
  `<DateInputWithPresets
                    name="maintenanceDate"
                    value={selectedRecord.maintenanceDate}
                    onChange={(date) => {
                      handleUpdateRecord({ ...selectedRecord, maintenanceDate: date });
                      validation.clearError('maintenanceDate');
                    }}
                    error={validation.errors.maintenanceDate}
                  />`
);

fs.writeFileSync('components/MobileMaintenanceEditor.tsx', content);
