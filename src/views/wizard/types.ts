/**
 * Shared prop types for wizard step components.
 */

import React from "react";
import type { FormData, Branch, Barista, MaintenanceRecord } from "../../../types";

export type ContactPath = "main" | "warehouse" | `branch-${number}`;

export interface WizardStepActions {
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleRadioChange: (name: string, value: unknown) => void;
  addContact: (path: ContactPath) => void;
  removeContact: (path: ContactPath, contactIndex: number) => void;
  handleContactChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, path: ContactPath, contactIndex: number) => void;
  addPhoneNumber: (path: ContactPath, contactIndex: number) => void;
  removePhoneNumber: (path: ContactPath, contactIndex: number, phoneIndex: number) => void;
  handlePhoneNumberChange: (e: React.ChangeEvent<HTMLInputElement>, path: ContactPath, contactIndex: number, phoneIndex: number) => void;
  addListItem: (listName: "branches" | "baristas" | "maintenanceHistory") => void;
  removeListItem: (listName: "branches" | "baristas" | "maintenanceHistory", index: number) => void;
  handleListItemChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, listName: "branches" | "baristas", index: number) => void;
  addNestedListItem: (branchIndex: number, listName: "baristas" | "maintenanceHistory" | "clientBaristas") => void;
  removeNestedListItem: (branchIndex: number, listName: "baristas" | "maintenanceHistory" | "clientBaristas", itemIndex: number) => void;
  handleNestedListItemChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, branchIndex: number, listName: "baristas" | "clientBaristas", itemIndex: number) => void;
  handleClientBaristaChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, branchIndex: number | null, index: number) => void;
  handleQuickAddClientBarista: (name: string, branchIndex: number | null) => void;
  handleQuickAddBarista: (name: string, branchIndex: number | null) => void;
  removeClientBarista: (branchIndex: number | null, index: number) => void;
  /** Add a blank client barista (used by Step 4.5) */
  addBlankClientBarista: (branchIndex: number | null) => void;
  /** Replace main office baristas (used by AI notes in step 4) */
  replaceBaristas: (baristas: Barista[]) => void;
  /** Update a main office maintenance record at index */
  onMainOfficeMaintenanceChange: (index: number, record: MaintenanceRecord) => void;
  /** Update a branch-level maintenance record */
  onBranchMaintenanceChange: (branchIndex: number, recordIndex: number, record: MaintenanceRecord) => void;
  /** Set form data branches directly (used for branch-level AI notes) */
  onBranchAiNotesApplied: (branchIndex: number, baristaIndex: number, notes: string) => void;
  /** Set newlyAddedId for focus/scrolling */
  setNewlyAddedId: (id: number | string | null) => void;
}

export interface WizardStepProps {
  formData: FormData;
  actions: WizardStepActions;
  newlyAddedId: number | string | null;
  isSubmitting: boolean;
  allKnownBaristaNames: string[];
}
