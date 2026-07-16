/**
 * Shared test helpers for wizard step component tests.
 */
import { vi } from "vitest";
import { initialFormData } from "../../utils/sharedConstants";
import type { FormData } from "../../types";
import type { WizardStepActions } from "../../src/views/wizard/types";

export function createMockActions(
  overrides: Partial<WizardStepActions> = {},
): WizardStepActions {
  return {
    handleChange: vi.fn(),
    handleRadioChange: vi.fn(),
    addContact: vi.fn(),
    removeContact: vi.fn(),
    handleContactChange: vi.fn(),
    addPhoneNumber: vi.fn(),
    removePhoneNumber: vi.fn(),
    handlePhoneNumberChange: vi.fn(),
    addListItem: vi.fn(),
    removeListItem: vi.fn(),
    handleListItemChange: vi.fn(),
    addNestedListItem: vi.fn(),
    removeNestedListItem: vi.fn(),
    handleNestedListItemChange: vi.fn(),
    handleClientBaristaChange: vi.fn(),
    handleQuickAddClientBarista: vi.fn(),
    handleQuickAddBarista: vi.fn(),
    removeClientBarista: vi.fn(),
    addBlankClientBarista: vi.fn(),
    replaceBaristas: vi.fn(),
    onMainOfficeMaintenanceChange: vi.fn(),
    onBranchMaintenanceChange: vi.fn(),
    onBranchAiNotesApplied: vi.fn(),
    setNewlyAddedId: vi.fn(),
    ...overrides,
  };
}

export function createFormData(overrides: Partial<FormData> = {}): FormData {
  return { ...structuredClone(initialFormData), ...overrides };
}
