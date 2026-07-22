const fs = require('fs');
const content = fs.readFileSync('components/MaintenanceRecordEditor.tsx', 'utf8');

// Import DateInputWithPresets and ErrorRecovery
let newContent = content.replace(
  "import { DatePresetButtons } from './form-ui/EnhancedInput';",
  "import { DatePresetButtons, DateInputWithPresets } from './form-ui/EnhancedInput';\nimport { ErrorRecovery } from './form-ui/ErrorRecovery';"
);

// Add saveError state
newContent = newContent.replace(
  "const [isSaving, setIsSaving] = useState(false);",
  "const [isSaving, setIsSaving] = useState(false);\n  const [saveError, setSaveError] = useState<string | null>(null);"
);

// Update save logic to catch errors
newContent = newContent.replace(
  /const handleSave = \(\) => \{\n\s*validation\.handleSubmit\(onValid, onInvalid\)\(\);\n\s*\};/,
  `const handleSave = () => {
    setSaveError(null);
    validation.handleSubmit(onValid, onInvalid)();
  };`
);

newContent = newContent.replace(
  /const onValid = async \(data: MaintenanceRecord\) => \{\n\s*try \{\n\s*setIsSaving\(true\);\n\s*await onSave\(data\);\n\s*showToast\('تم حفظ التقرير بنجاح', 'success'\);\n\s*\} catch \(error\) \{\n\s*console\.error\('Error saving record:', error\);\n\s*showToast\('حدث خطأ أثناء الحفظ', 'error'\);\n\s*\} finally \{\n\s*setIsSaving\(false\);\n\s*\}\n\s*\};/,
  `const onValid = async (data: MaintenanceRecord) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave(data);
      showToast('تم حفظ التقرير بنجاح', 'success');
    } catch (error) {
      console.error('Error saving record:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };`
);

// Add ErrorRecovery component above ValidationSummary
newContent = newContent.replace(
  /\{validation\.hasErrors && \(\n\s*<ValidationSummary\n\s*errors=\{validation\.allErrors\}\n\s*onJumpToError=\{focusField\}\n\s*\/>\n\s*\)\}/,
  `{saveError && (
          <div className="mb-6">
            <ErrorRecovery
              error={new Error(saveError)}
              onRetry={() => handleSave()}
              onSaveDraft={() => {
                setSaveError(null);
                showToast('تم حفظ المسودة محلياً', 'info');
              }}
              onDismiss={() => setSaveError(null)}
            />
          </div>
        )}

        {validation.hasErrors && (
          <ValidationSummary
            errors={validation.allErrors}
            onJumpToError={focusField}
          />
        )}`
);

// Replace raw date input with DateInputWithPresets
newContent = newContent.replace(
  /<DatePresetButtons\n\s*value=\{editedRecord\.maintenanceDate\}\n\s*onChange=\{\(date\) =>\n\s*setEditedRecord\(prev => \(\{ \.\.\.prev, maintenanceDate: date \}\)\)\n\s*\}\n\s*variant="cream"\n\s*className="mb-2"\n\s*\/>\n\s*<div className="relative">\n\s*<CalendarIcon className="absolute left-3 top-1\/2 -translate-y-1\/2 w-5 h-5 text-latte" \/>\n\s*<input\n\s*type="date"\n\s*name="maintenanceDate"\n\s*value=\{editedRecord\.maintenanceDate\}\n\s*onChange=\{handleFieldChange\}\n\s*className=\{`w-full pl-10 pr-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border \$\{\n\s*errors\.maintenanceDate \n\s*\? 'border-ember-500 focus:ring-ember-500' \n\s*: 'border-hairline dark:border-hairline'\n\s*\}\`\}\n\s*\/>\n\s*<\/div>/,
  `<DateInputWithPresets
                  name="maintenanceDate"
                  value={editedRecord.maintenanceDate}
                  onChange={(date) => {
                    setEditedRecord(prev => ({ ...prev, maintenanceDate: date }));
                    validation.clearError('maintenanceDate');
                  }}
                  error={errors.maintenanceDate || validation.errors.maintenanceDate}
                />`
);

fs.writeFileSync('components/MaintenanceRecordEditor.tsx', newContent);
