# @local/form-progress

Reusable, Arabic-first form progress and required-field components for React + Tailwind CSS projects.

## Components

- `FormProgress` — section stepper with horizontal, vertical, and compact variants
- `RequiredFieldsProgress` — small progress bar for required fields
- `RequiredFieldBadge` — accessible required-field indicator
- `RequiredFieldIcon` — warning icon variant
- `RequiredFieldWrapper` — visual left-border wrapper for required fields

## Usage

```tsx
import { FormProgress, RequiredFieldBadge } from '@local/form-progress';

<FormProgress
  sections={[
    { id: 'basic', label: 'Basic Info', required: true },
    { id: 'details', label: 'Details' },
  ]}
  completedSections={new Set(['basic'])}
  currentSection="details"
  onJumpToNextIncomplete={(id) => console.log(id)}
/>

<label>
  Company Name <RequiredFieldBadge />
</label>
```

## Dependencies

- `react` / `react-dom`
- `@heroicons/react`
- `tailwindcss` (consumer must include this package path in `tailwind.config.js` `content`)

## Translations

Default strings are Arabic. Override via the `translations` prop:

```tsx
<FormProgress
  translations={{ formProgress: 'Form Progress', completed: 'Done' }}
  {...}
/>
```
