import fs from 'fs';

// Each replacement targets an exact user-facing string.  The `from` value is
// treated as a literal pattern and is matched with surrounding word boundaries
// so it does not match inside identifiers like `onSave`, `autoSave`, etc.
const fileReplacements = [
  {
    file: 'components/MaintenanceRecordEditor.tsx',
    replacements: [
      // Basic info
      { from: 'Maintenance Date', to: '{t.ui.maintenanceEditor.maintenanceDate}' },
      { from: 'Last Visit', to: '{t.ui.maintenanceEditor.lastVisit}' },
      { from: 'My Technician', to: '{t.ui.maintenanceEditor.myTechnician}' },
      { from: 'Select Technician', to: '{t.ui.maintenanceEditor.selectTechnician}' },
      { from: 'Client Barista Performance Rating', to: '{t.ui.maintenanceEditor.clientBaristaPerformanceRating}' },
      { from: 'Client Barista', to: '{t.ui.maintenanceEditor.clientBarista}' },
      { from: 'Select Client Barista', to: '{t.ui.maintenanceEditor.selectClientBarista}' },
      { from: 'Visit Zone', to: '{t.ui.maintenanceEditor.visitZone}' },
      { from: 'Select Zone', to: '{t.ui.maintenanceEditor.selectZone}' },
      { from: 'Cairo (500 EGP)', to: '{t.ui.maintenanceEditor.cairo}' },
      { from: 'Outside Cairo (1500 EGP)', to: '{t.ui.maintenanceEditor.outsideCairo}' },
      { from: 'El Sahel (4000 EGP)', to: '{t.ui.maintenanceEditor.elSahel}' },
      { from: 'No previous visits', to: '{t.ui.maintenanceEditor.noPreviousVisits}' },
      // Problems
      { from: 'Was there a problem?', to: '{t.ui.maintenanceEditor.wasThereAProblem}' },
      { from: 'Problem is NOT solved', to: '{t.ui.maintenanceEditor.problemIsNotSolved}' },
      { from: 'Problem is solved', to: '{t.ui.maintenanceEditor.problemIsSolved}' },
      // Services / Parts
      { from: 'Services Performed', to: '{t.ui.maintenanceEditor.servicesPerformed}' },
      { from: 'Were parts replaced?', to: '{t.ui.maintenanceEditor.werePartsReplaced}' },
      { from: 'Replaced Parts', to: '{t.ui.maintenanceEditor.replacedParts}' },
      // Payment
      { from: 'Paid By', to: '{t.ui.maintenanceEditor.paidBy}' },
      { from: "Mido's", to: '{t.ui.maintenanceEditor.midos}' },
      { from: 'Company pays', to: '{t.ui.maintenanceEditor.companyPays}' },
      { from: 'Customer pays', to: '{t.ui.maintenanceEditor.customerPays}' },
      { from: 'Client', to: '{t.ui.maintenanceEditor.client}' },
      // Supervisor / Notes / Photos
      { from: 'Name *', to: '{t.ui.maintenanceEditor.supervisorName}' },
      { from: 'Phone', to: '{t.ui.maintenanceEditor.phone}' },
      { from: 'Remove', to: '{t.ui.maintenanceEditor.remove}' },
      { from: 'Add Supervisor', to: '{t.ui.maintenanceEditor.addSupervisor}' },
      { from: 'Recommendations', to: '{t.ui.maintenanceEditor.recommendations}' },
      { from: 'Has notes', to: '{t.ui.maintenanceEditor.hasNotes}' },
      { from: 'Notes', to: '{t.ui.maintenanceEditor.notes}' },
      { from: 'Before Photos', to: '{t.ui.maintenanceEditor.beforePhotos}' },
      { from: 'After Photos', to: '{t.ui.maintenanceEditor.afterPhotos}' },
      { from: 'Upload Before', to: '{t.ui.maintenanceEditor.uploadBefore}' },
      { from: 'Upload After', to: '{t.ui.maintenanceEditor.uploadAfter}' },
      { from: 'No before photos', to: '{t.ui.maintenanceEditor.noBeforePhotos}' },
      { from: 'No after photos', to: '{t.ui.maintenanceEditor.noAfterPhotos}' },
      { from: 'Imported from previous records', to: '{t.ui.maintenanceEditor.legacyPhotosHint}' },
      { from: 'Legacy Photos', to: '{t.ui.maintenanceEditor.legacyPhotos}' },
      { from: 'Legacy', to: '{t.ui.maintenanceEditor.legacy}' },
      { from: 'Uploading photos...', to: '{t.ui.maintenanceEditor.uploadingPhotos}' },
      { from: 'Before', to: '{t.ui.maintenanceEditor.before}' },
      { from: 'After', to: '{t.ui.maintenanceEditor.after}' },
      // Actions / misc
      { from: 'Cancel', to: '{t.ui.maintenanceEditor.cancel}' },
      { from: 'Save', to: '{t.ui.maintenanceEditor.save}' },
      { from: '"Please fix the following errors before saving"', to: '{t.ui.maintenanceEditor.validationTitle}' },
      { from: 'You are offline. Changes are being saved locally and will sync when connection returns.', to: '{t.ui.maintenanceEditor.offlineBanner}' },
      { from: "'Basic'", to: "t.ui.maintenanceEditor.progress.basic" },
      { from: "'Problems'", to: "t.ui.maintenanceEditor.progress.problems" },
      { from: "'Services'", to: "t.ui.maintenanceEditor.progress.services" },
      { from: "'Parts'", to: "t.ui.maintenanceEditor.progress.parts" },
      { from: "'Payment'", to: "t.ui.maintenanceEditor.progress.payment" },
      { from: "'Supervisor'", to: "t.ui.maintenanceEditor.progress.supervisor" },
      { from: "'Photos'", to: "t.ui.maintenanceEditor.progress.photos" },
      { from: "'Notes'", to: "t.ui.maintenanceEditor.progress.notes" },
    ],
  },
  {
    file: 'components/MobileMaintenanceEditor.tsx',
    replacements: [
      { from: '"Please fix the following errors"', to: '{t.ui.mobileMaintenanceEditor.validationTitle}' },
      { from: 'No Date', to: '{t.ui.mobileMaintenanceEditor.noDate}' },
      { from: 'Edit Visit', to: '{t.ui.mobileMaintenanceEditor.editVisit}' },
      { from: 'Add Maintenance Visit', to: '{t.ui.mobileMaintenanceEditor.addMaintenanceVisit}' },
      { from: 'Parts Were Replaced', to: '{t.ui.mobileMaintenanceEditor.partsWereReplaced}' },
      { from: 'Had Problem', to: '{t.ui.mobileMaintenanceEditor.hadProblem}' },
      { from: 'Solved', to: '{t.ui.mobileMaintenanceEditor.solved}' },
      { from: 'Has Issues', to: '{t.ui.mobileMaintenanceEditor.hasIssues}' },
      { from: 'Normal', to: '{t.ui.mobileMaintenanceEditor.normal}' },
      { from: 'Staff', to: '{t.ui.mobileMaintenanceEditor.staff}' },
      { from: 'Date', to: '{t.ui.mobileMaintenanceEditor.date}' },
      { from: 'Templates', to: '{t.ui.mobileMaintenanceEditor.templates}' },
    ],
  },
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const { file, replacements } of fileReplacements) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const { from, to } of replacements) {
    // For short single-word replacements, enforce word boundaries to avoid
    // touching identifiers. For quoted or multi-word strings, the literal is
    // already specific enough.
    const needsBoundary = /^[A-Za-z]+$/.test(from) && !from.includes(' ') && !from.includes("'");
    let pattern;
    if (needsBoundary) {
      pattern = new RegExp('\\b' + escapeRegex(from) + '\\b', 'g');
    } else {
      pattern = new RegExp(escapeRegex(from), 'g');
    }
    const before = content;
    content = content.replace(pattern, to);
    if (content !== before) changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
