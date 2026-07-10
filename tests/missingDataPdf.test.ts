import { describe, it, expect } from 'vitest';
import { getMissingFields, applyParsedMissingData, parseMissingDataPDF, getInitials } from '../utils/missingDataPdf';
import { FormData, Branch, Contact, Barista } from '../types';
import { PDFDocument } from 'pdf-lib';

const createBaseFormData = (overrides: Partial<FormData> = {}): FormData => ({
  companyName: 'Test Company',
  email: 'test@example.com',
  taxNumber: '123456789',
  location: 'Cairo',
  hasBranches: false,
  usesOurMachines: true,
  machineOwnershipType: 'bought',
  branchCount: 0,
  branches: [],
  warehouse: { location: '', contacts: [] },
  baristas: [],
  clientBaristas: [],
  maintenanceHistory: [],
  contacts: [],
  ...overrides,
});

const createContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 1,
  name: 'Ahmed',
  position: 'manager',
  phoneNumbers: [{ id: 1, number: '01234567890' }],
  ...overrides,
});

const createBarista = (overrides: Partial<Barista> = {}): Barista => ({
  id: 1,
  name: 'Mohamed',
  phone: '01234567890',
  ...overrides,
});

const createBranch = (overrides: Partial<Branch> = {}): Branch => ({
  id: 1,
  branchName: 'Main Branch',
  email: 'branch@example.com',
  taxNumber: '987654321',
  location: 'Alexandria',
  contacts: [createContact()],
  baristas: [createBarista()],
  clientBaristas: [],
  usesOurMachines: true,
  machineOwnershipType: 'bought',
  maintenanceHistory: [],
  ...overrides,
});

describe('getMissingFields', () => {
  it('returns no missing fields for a complete single-location company', () => {
    const data = createBaseFormData({
      hasBranches: false,
      usesOurMachines: true,
      machineOwnershipType: 'bought',
      contacts: [createContact()],
      baristas: [createBarista()],
      clientBaristas: [createBarista({ id: 2, name: 'Client Barista' })],
    });

    const result = getMissingFields(data, { scope: 'company' });

    expect(result.hasMissing).toBe(false);
    expect(result.company).toHaveLength(0);
    expect(Object.keys(result.branches)).toHaveLength(0);
  });

  it('detects missing company profile fields', () => {
    const data = createBaseFormData({
      email: '',
      taxNumber: '',
      location: '',
      hasBranches: null,
    });

    const result = getMissingFields(data, { scope: 'company' });

    expect(result.hasMissing).toBe(true);
    expect(result.company.some((f) => f.key === 'company.email')).toBe(true);
    expect(result.company.some((f) => f.key === 'company.taxNumber')).toBe(true);
    expect(result.company.some((f) => f.key === 'company.location')).toBe(true);
    expect(result.company.some((f) => f.key === 'company.hasBranches')).toBe(true);
  });

  it('detects missing hasBranches select when null', () => {
    const data = createBaseFormData({ hasBranches: null });
    const result = getMissingFields(data, { scope: 'company' });
    expect(result.company.some((f) => f.key === 'company.hasBranches')).toBe(true);
  });

  it('detects missing usesOurMachines select for single-location company', () => {
    const data = createBaseFormData({
      hasBranches: false,
      usesOurMachines: null,
    });

    const result = getMissingFields(data, { scope: 'company' });

    expect(result.company.some((f) => f.key === 'company.usesOurMachines')).toBe(true);
  });

  it('detects missing machine ownership type when machines are used', () => {
    const data = createBaseFormData({
      hasBranches: false,
      usesOurMachines: true,
      machineOwnershipType: undefined,
    });

    const result = getMissingFields(data, { scope: 'company' });

    expect(result.company.some((f) => f.key === 'company.machineOwnershipType')).toBe(true);
  });

  it('detects missing daily lease cost for leased machines', () => {
    const data = createBaseFormData({
      hasBranches: false,
      usesOurMachines: true,
      machineOwnershipType: 'leased',
      dailyLeaseCost: undefined,
    });

    const result = getMissingFields(data, { scope: 'company' });

    expect(result.company.some((f) => f.key === 'company.dailyLeaseCost')).toBe(true);
  });

  it('generates contact slots when contacts array is empty', () => {
    const data = createBaseFormData({ contacts: [] });
    const result = getMissingFields(data, { scope: 'company' });

    expect(result.company.some((f) => f.key === 'company.contacts.0.name')).toBe(true);
    expect(result.company.some((f) => f.key === 'company.contacts.1.name')).toBe(true);
  });

  it('detects missing phone for an contact with name and position', () => {
    const data = createBaseFormData({
      contacts: [createContact({ phoneNumbers: [{ id: 1, number: '' }] })],
    });
    const result = getMissingFields(data, { scope: 'company' });

    expect(result.company.some((f) => f.key === 'company.contacts.0.phone')).toBe(true);
  });

  it('generates barista slots when baristas array is empty', () => {
    const data = createBaseFormData({
      hasBranches: false,
      baristas: [],
    });

    const result = getMissingFields(data, { scope: 'company' });

    expect(result.company.some((f) => f.key === 'company.baristas.0.name')).toBe(true);
    expect(result.company.some((f) => f.key === 'company.baristas.1.name')).toBe(true);
  });

  it('detects missing fields inside branches for company scope', () => {
    const branch = createBranch({
      branchName: '',
      email: '',
      contacts: [],
      baristas: [],
    });
    const data = createBaseFormData({
      hasBranches: true,
      branches: [branch],
    });

    const result = getMissingFields(data, { scope: 'company' });

    expect(result.hasMissing).toBe(true);
    expect(result.branches[0].some((f) => f.key === 'branch.0.branchName')).toBe(true);
    expect(result.branches[0].some((f) => f.key === 'branch.0.email')).toBe(true);
    expect(result.branches[0].some((f) => f.key === 'branch.0.contacts.0.name')).toBe(true);
    expect(result.branches[0].some((f) => f.key === 'branch.0.baristas.0.name')).toBe(true);
  });

  it('returns only the requested branch fields for branch scope', () => {
    const branch1 = createBranch({ id: 1, branchName: 'Branch 1' });
    const branch2 = createBranch({ id: 2, branchName: '', email: '' });
    const data = createBaseFormData({
      hasBranches: true,
      branches: [branch1, branch2],
    });

    const result = getMissingFields(data, { scope: 'branch', branchId: 2 });

    expect(result.branches[1].some((f) => f.key === 'branch.1.branchName')).toBe(true);
    expect(result.branches[1].some((f) => f.key === 'branch.1.email')).toBe(true);
    expect(result.branches[0]).toBeUndefined();
  });

  it('returns empty result when branch id is not found', () => {
    const data = createBaseFormData({
      hasBranches: true,
      branches: [createBranch({ id: 1 })],
    });

    const result = getMissingFields(data, { scope: 'branch', branchId: 999 });

    expect(result.hasMissing).toBe(false);
    expect(Object.keys(result.branches)).toHaveLength(0);
  });
});

describe('applyParsedMissingData', () => {
  it('applies company email', () => {
    const data = createBaseFormData({ email: '' });
    const result = applyParsedMissingData(data, { 'company.email': 'new@example.com' });
    expect(result.email).toBe('new@example.com');
  });

  it('applies branch name', () => {
    const data = createBaseFormData({
      hasBranches: true,
      branches: [createBranch({ branchName: '' })],
    });
    const result = applyParsedMissingData(data, { 'branch.0.branchName': 'New Branch' });
    expect(result.branches[0].branchName).toBe('New Branch');
  });

  it('applies company contact fields', () => {
    const data = createBaseFormData({ contacts: [] });
    const result = applyParsedMissingData(data, {
      'company.contacts.0.name': 'Khaled',
      'company.contacts.0.position': 'supervisor',
      'company.contacts.0.phone': '01111111111',
    });

    expect(result.contacts[0].name).toBe('Khaled');
    expect(result.contacts[0].position).toBe('supervisor');
    expect(result.contacts[0].phoneNumbers[0].number).toBe('01111111111');
  });

  it('applies company barista fields', () => {
    const data = createBaseFormData({
      hasBranches: false,
      baristas: [],
    });
    const result = applyParsedMissingData(data, {
      'company.baristas.0.name': 'Omar',
      'company.baristas.0.phone': '05555555555',
    });

    expect(result.baristas[0].name).toBe('Omar');
    expect(result.baristas[0].phone).toBe('05555555555');
  });

  it('applies branch barista fields', () => {
    const data = createBaseFormData({
      hasBranches: true,
      branches: [createBranch({ baristas: [] })],
    });
    const result = applyParsedMissingData(data, {
      'branch.0.baristas.0.name': 'Sara',
      'branch.0.baristas.0.phone': '02222222222',
    });

    expect(result.branches[0].baristas[0].name).toBe('Sara');
    expect(result.branches[0].baristas[0].phone).toBe('02222222222');
  });

  it('applies branch contact fields', () => {
    const data = createBaseFormData({
      hasBranches: true,
      branches: [createBranch({ contacts: [] })],
    });
    const result = applyParsedMissingData(data, {
      'branch.0.contacts.0.name': 'Khaled',
      'branch.0.contacts.0.position': 'supervisor',
      'branch.0.contacts.0.phone': '01111111111',
    });

    expect(result.branches[0].contacts[0].name).toBe('Khaled');
    expect(result.branches[0].contacts[0].position).toBe('supervisor');
    expect(result.branches[0].contacts[0].phoneNumbers[0].number).toBe('01111111111');
  });

  it('applies company client barista fields', () => {
    const data = createBaseFormData({
      hasBranches: false,
      clientBaristas: [],
    });
    const result = applyParsedMissingData(data, {
      'company.clientBaristas.0.name': 'Client Barista',
      'company.clientBaristas.0.phone': '03333333333',
    });

    expect(result.clientBaristas![0].name).toBe('Client Barista');
    expect(result.clientBaristas![0].phone).toBe('03333333333');
  });

  it('applies branch client barista fields', () => {
    const data = createBaseFormData({
      hasBranches: true,
      branches: [createBranch({ clientBaristas: [] })],
    });
    const result = applyParsedMissingData(data, {
      'branch.0.clientBaristas.0.name': 'Branch Client Barista',
      'branch.0.clientBaristas.0.phone': '04444444444',
    });

    expect(result.branches[0].clientBaristas![0].name).toBe('Branch Client Barista');
    expect(result.branches[0].clientBaristas![0].phone).toBe('04444444444');
  });

  it('converts select values to booleans for hasBranches and usesOurMachines', () => {
    const data = createBaseFormData({
      hasBranches: null,
      usesOurMachines: null,
    });

    const result = applyParsedMissingData(data, {
      'company.hasBranches': 'نعم',
      'company.usesOurMachines': 'لا',
    });

    expect(result.hasBranches).toBe(true);
    expect(result.usesOurMachines).toBe(false);
  });

  it('converts machine ownership type select values', () => {
    const data = createBaseFormData({ machineOwnershipType: undefined });

    const boughtResult = applyParsedMissingData(data, { 'company.machineOwnershipType': 'شراء' });
    expect(boughtResult.machineOwnershipType).toBe('bought');

    const leasedResult = applyParsedMissingData(data, { 'company.machineOwnershipType': 'إيجار' });
    expect(leasedResult.machineOwnershipType).toBe('leased');
  });

  it('applies daily lease cost as a number', () => {
    const data = createBaseFormData({ dailyLeaseCost: undefined });
    const result = applyParsedMissingData(data, { 'company.dailyLeaseCost': '150' });
    expect(result.dailyLeaseCost).toBe(150);
  });

  it('ignores empty parsed values', () => {
    const data = createBaseFormData({ email: 'original@example.com' });
    const result = applyParsedMissingData(data, { 'company.email': '' });
    expect(result.email).toBe('original@example.com');
  });

  it('ignores unknown or malformed field keys', () => {
    const data = createBaseFormData({ email: 'original@example.com' });
    const result = applyParsedMissingData(data, {
      'unknown.field': 'value',
      'company.unknownField': 'value',
      'branch': 'value',
    });
    expect(result.email).toBe('original@example.com');
  });

  it('treats invalid daily lease cost as undefined', () => {
    const data = createBaseFormData({ dailyLeaseCost: undefined });
    const result = applyParsedMissingData(data, { 'company.dailyLeaseCost': 'not-a-number' });
    expect(result.dailyLeaseCost).toBeUndefined();
  });

  it('preserves existing data that is not in the parsed set', () => {
    const data = createBaseFormData({ companyName: 'Acme' });
    const result = applyParsedMissingData(data, { 'company.email': 'x@y.com' });
    expect(result.companyName).toBe('Acme');
    expect(result.email).toBe('x@y.com');
  });

  it('does not mutate the original data object', () => {
    const data = createBaseFormData({ email: 'original@example.com' });
    const result = applyParsedMissingData(data, { 'company.email': 'new@example.com' });
    expect(data.email).toBe('original@example.com');
    expect(result.email).toBe('new@example.com');
  });
});

describe('parseMissingDataPDF', () => {
  const createTestPDF = async (fields: { name: string; type: 'text' | 'checkbox'; value?: string; checked?: boolean }[]) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const form = pdfDoc.getForm();

    for (const field of fields) {
      if (field.type === 'text') {
        const textField = form.createTextField(field.name);
        textField.addToPage(page, { x: 10, y: 700, width: 100, height: 20 });
        if (field.value) {
          textField.setText(field.value);
        }
      } else if (field.type === 'checkbox') {
        const checkBox = form.createCheckBox(field.name);
        checkBox.addToPage(page, { x: 10, y: 700, width: 10, height: 10 });
        if (field.checked) {
          checkBox.check();
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  };

  it('maps checked yes checkbox to "نعم"', async () => {
    const pdfBuffer = await createTestPDF([
      { name: 'company.hasBranches_0', type: 'checkbox', checked: true },
      { name: 'company.hasBranches_1', type: 'checkbox', checked: false },
    ]);

    const result = await parseMissingDataPDF(pdfBuffer);

    expect(result['company.hasBranches']).toBe('نعم');
  });

  it('maps checked no checkbox to "لا"', async () => {
    const pdfBuffer = await createTestPDF([
      { name: 'company.usesOurMachines_0', type: 'checkbox', checked: false },
      { name: 'company.usesOurMachines_1', type: 'checkbox', checked: true },
    ]);

    const result = await parseMissingDataPDF(pdfBuffer);

    expect(result['company.usesOurMachines']).toBe('لا');
  });

  it('maps checked ownership type checkboxes correctly', async () => {
    const pdfBuffer = await createTestPDF([
      { name: 'company.machineOwnershipType_0', type: 'checkbox', checked: false },
      { name: 'company.machineOwnershipType_1', type: 'checkbox', checked: true },
    ]);

    const result = await parseMissingDataPDF(pdfBuffer);

    expect(result['company.machineOwnershipType']).toBe('إيجار');
  });

  it('maps branch binary checkbox fields', async () => {
    const pdfBuffer = await createTestPDF([
      { name: 'branch.0.usesOurMachines_0', type: 'checkbox', checked: true },
      { name: 'branch.0.usesOurMachines_1', type: 'checkbox', checked: false },
    ]);

    const result = await parseMissingDataPDF(pdfBuffer);

    expect(result['branch.0.usesOurMachines']).toBe('نعم');
  });

  it('reads text field values', async () => {
    const pdfBuffer = await createTestPDF([
      { name: 'company.email', type: 'text', value: 'test@example.com' },
    ]);

    const result = await parseMissingDataPDF(pdfBuffer);

    expect(result['company.email']).toBe('test@example.com');
  });

  it('returns empty object when no fields are checked', async () => {
    const pdfBuffer = await createTestPDF([
      { name: 'company.hasBranches_0', type: 'checkbox', checked: false },
      { name: 'company.hasBranches_1', type: 'checkbox', checked: false },
    ]);

    const result = await parseMissingDataPDF(pdfBuffer);

    expect(result['company.hasBranches']).toBeUndefined();
  });
});

describe('getInitials', () => {
  it('returns first two characters for a single-word name', () => {
    expect(getInitials('Makkan')).toBe('MA');
  });

  it('returns first letter of first two words for multi-word names', () => {
    expect(getInitials('Mido Distribution')).toBe('MD');
  });

  it('returns question mark for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns question mark for whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('handles names with extra spaces', () => {
    expect(getInitials('  Mido   Distribution  ')).toBe('MD');
  });

  it('handles single-character names', () => {
    expect(getInitials('A')).toBe('A');
  });

  it('converts initials to uppercase', () => {
    expect(getInitials('mido distribution')).toBe('MD');
  });

  it('handles a second word that is only one character', () => {
    expect(getInitials('Mido A')).toBe('MA');
  });
});
