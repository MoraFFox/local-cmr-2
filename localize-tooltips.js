import fs from 'fs';

const files = [
  {
    path: 'components/MaintenanceRecordEditor.tsx',
    importUseT: true,
    replacements: [
      { from: 'import { useOfflineQueue } from \'../utils/offlineSupport\';', to: "import { useOfflineQueue } from '../utils/offlineSupport';\nimport { useT } from '../utils/i18n';" },
      { from: '  const { showToast } = useToast();', to: '  const { showToast } = useToast();\n  const t = useT();' },
      { from: '<HelpTooltip text="The date the maintenance visit took place." />', to: '<HelpTooltip text={t.tooltips.maintenanceDate} />' },
      { from: '<HelpTooltip text="The timeline and average interval since the previous maintenance visit." />', to: '<HelpTooltip text={t.tooltips.lastVisit} />' },
      { from: '<HelpTooltip text="The technician who performed the maintenance visit." />', to: '<HelpTooltip text={t.tooltips.myTechnician} />' },
      { from: "<HelpTooltip text=\"The client's staff member who was present during the visit.\" />", to: '<HelpTooltip text={t.tooltips.clientBarista} />' },
      { from: '<HelpTooltip text="How well the client barista operates and maintains the equipment." />', to: '<HelpTooltip text={t.tooltips.baristaRating} />' },
      { from: '<HelpTooltip text="The geographic zone determines the visit fee (Cairo, Outside Cairo, or El Sahel)." />', to: '<HelpTooltip text={t.tooltips.visitZone} />' },
      { from: '<HelpTooltip text="Select every service performed during this visit. You can assign each service to Mido\'s or the client." />', to: '<HelpTooltip text={t.tooltips.servicesPerformed} />' },
      { from: '<HelpTooltip text="Select any physical components that were swapped out during this visit." />', to: '<HelpTooltip text={t.tooltips.replacedParts} />' },
      { from: '<HelpTooltip text="Who is responsible for covering the cost of parts and services for this visit." />', to: '<HelpTooltip text={t.tooltips.paidBy} />' },
      { from: '<HelpTooltip text="The manager or person in charge who authorized or signed off on this visit." />', to: '<HelpTooltip text={t.tooltips.supervisor} />' },
      { from: '<HelpTooltip text="Any extra context about the visit that doesn\'t fit in other fields." />', to: '<HelpTooltip text={t.tooltips.notes} />' },
      { from: '<HelpTooltip text="Suggested next steps or preventive actions for future visits." />', to: '<HelpTooltip text={t.tooltips.recommendations} />' },
      { from: '<HelpTooltip text="Photos of the machine before the maintenance work began." />', to: '<HelpTooltip text={t.tooltips.beforePhotos} />' },
      { from: '<HelpTooltip text="Photos of the machine after the maintenance work was completed." />', to: '<HelpTooltip text={t.tooltips.afterPhotos} />' },
      { from: 'helpText="Requested visits are on-demand; Scheduled visits are routine/pre-planned."', to: 'helpText={t.tooltips.visitType}' },
    ],
  },
  {
    path: 'components/MobileMaintenanceEditor.tsx',
    importUseT: true,
    replacements: [
      { from: "import { HelpTooltip } from './form-ui/HelpTooltip';", to: "import { HelpTooltip } from './form-ui/HelpTooltip';\nimport { useT } from '../utils/i18n';" },
      { from: '  baristas = [],\n}) => {', to: '  baristas = [],\n}) => {\n  const t = useT();' },
      { from: '<HelpTooltip text="The date the maintenance visit took place." />', to: '<HelpTooltip text={t.tooltips.maintenanceDate} />' },
      { from: '<HelpTooltip text="The technician who performed the maintenance visit." />', to: '<HelpTooltip text={t.tooltips.myTechnician} />' },
      { from: '<HelpTooltip text="Enable this if the visit was triggered by an equipment issue." />', to: '<HelpTooltip text={t.tooltips.hadProblem} />' },
      { from: '<HelpTooltip text="Check this if the reported issue was fully resolved during this visit." />', to: '<HelpTooltip text={t.tooltips.problemSolved} />' },
      { from: '<HelpTooltip text="Select if any physical components were swapped out during this visit." />', to: '<HelpTooltip text={t.tooltips.partsReplaced} />' },
    ],
  },
];

for (const { path, replacements } of files) {
  let content = fs.readFileSync(path, 'utf8');
  for (const { from, to } of replacements) {
    const idx = content.indexOf(from);
    if (idx === -1) {
      console.warn(`[${path}] not found: ${from.slice(0, 80)}`);
      continue;
    }
    content = content.replace(from, to);
  }
  fs.writeFileSync(path, content, 'utf8');
  console.log(`Updated ${path}`);
}
