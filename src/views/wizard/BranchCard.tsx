/**
 * BranchCard — renders a single branch's editable card with all sub-sections:
 * info fields, contacts, baristas, client baristas, and maintenance history.
 * Extracted from Step2_Branches to reduce component size.
 */
import React from "react";
import CollapsibleCard from "../../../components/CollapsibleCard";
import EmptyState from "../../../components/EmptyState";
import TextInput from "../../../components/TextInput";
import RadioGroup from "../../../components/RadioGroup";
import Button from "../../../components/ui/Button";
import MaintenanceRecordCard from "../../../components/MaintenanceRecordCard";
import { ContactsSection } from "./ContactsSection";
import { BranchBaristaSection } from "./BranchBaristaSection";
import PortalSelect from "../../../components/form-ui/PortalSelect";
import {
  BuildingStorefrontIcon, EnvelopeIcon, DocumentTextIcon, MapPinIcon,
  CurrencyDollarIcon, ScaleIcon, PlusCircleIcon, UserGroupIcon, WrenchScrewdriverIcon,
  PhoneIcon, UserIcon,
} from "@heroicons/react/24/outline";
import { partsList, servicesList, problemCategories } from "../../../constants";
import { allPredefinedProblems, CLASSES } from "../../../utils/sharedConstants";
import type { Branch, FormData } from "../../../types";
import type { WizardStepActions } from "./types";
import { useT } from "../../../utils/i18n";
import { formatEgyptianPhone } from "../../../utils/phone";

interface BranchCardProps {
  branch: Branch;
  index: number;
  companyName: string;
  formData: FormData;
  actions: WizardStepActions;
  newlyAddedId: number | string | null;
  isSubmitting: boolean;
  allKnownBaristaNames: string[];
}

export const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  index,
  companyName,
  formData,
  actions,
  newlyAddedId,
  isSubmitting,
  allKnownBaristaNames,
  allKnownMachineNames = [],
  allKnownMachineTypes = [],
  allKnownMachineOptions = [],
}) => {
  const t = useT();

  return (
  <CollapsibleCard
    initiallyOpen={branch.id === newlyAddedId}
    onRemove={() => actions.removeListItem("branches", index)}
    wizardKey={`branch.${index}`}
    titleContent={
      <div className="min-w-0 pe-1">
        <div className="marquee-container w-full">
          <div className="inline-flex items-center gap-x-2 md:truncate md:animate-none lg:hover:animate-none animate-marquee-rtl pe-8">
            <span className="font-bold text-base whitespace-nowrap">{companyName || t.ui.wizard.companyFallback}</span>
            <span className="text-latte shrink-0">-</span>
            <span className="text-base whitespace-nowrap">{branch.branchName || t.ui.wizard.newBranch}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-latte mt-1.5">
          {branch.location && (
            <span className="flex items-center gap-1 truncate max-w-full" title={branch.location}>
              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{branch.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <UserGroupIcon className="w-3.5 h-3.5 shrink-0" />
            {t.ui.wizard.baristasCount.replace('{{count}}', String(branch.baristas.length))}
          </span>
        </div>
      </div>
    }
  >
    {/* Branch info fields */}
    <div className="space-y-4">
      <TextInput label={t.ui.wizard.branchNameLabel} name="branchName" value={branch.branchName || ""}
        data-field={`branch.${index}.branchName`}
        onChange={(e) => actions.handleListItemChange(e, "branches", index)}
        placeholder={t.ui.wizard.branchNamePlaceholder} icon={<BuildingStorefrontIcon />}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput label={t.ui.wizard.emailLabel} name="email" value={branch.email}
          data-field={`branch.${index}.email`}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)} icon={<EnvelopeIcon />}
        />
        <TextInput label={t.ui.wizard.taxNumberLabel} name="taxNumber" value={branch.taxNumber || ""}
          data-field={`branch.${index}.taxNumber`}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)} icon={<DocumentTextIcon />}
        />
        <TextInput label={t.ui.wizard.location} name="location" value={branch.location}
          data-field={`branch.${index}.location`}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)}
          className="md:col-span-2" icon={<MapPinIcon />}
        />
        <TextInput label={t.ui.wizard.coffeeConsumptionLabel} name="coffeeConsumptionKg" type="number"
          data-field={`branch.${index}.coffeeConsumptionKg`}
          value={branch.coffeeConsumptionKg || ""}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)}
          placeholder={t.ui.wizard.coffeeConsumptionPlaceholder} icon={<ScaleIcon />}
          helpText={t.tooltips.coffeeConsumption}
        />
        <div className="md:col-span-2 space-y-4">
          {/* NEW: mixed machine fleet toggle — asked BEFORE the single-machine status */}
          <RadioGroup label={t.ui.wizard.hasMultipleMachinesLabel} name={`hasMultipleMachines-${branch.id}`}
            value={branch.hasMultipleMachines}
            onChange={(val) => actions.handleListItemChange(
              { target: { name: "hasMultipleMachines", value: val } } as React.ChangeEvent<HTMLInputElement>, "branches", index)}
            options={[{ label: t.common.yes, value: true }, { label: t.common.no, value: false }]} inline
          />
          {/* Single machine flow (including legacy records without hasMultipleMachines) */}
          {branch.hasMultipleMachines !== true && (
            <RadioGroup label={t.ui.wizard.usesOurMachinesLabel} name={`usesOurMachines-${branch.id}`}
              value={branch.usesOurMachines}
              onChange={(val) => actions.handleListItemChange(
                { target: { name: "usesOurMachines", value: val } } as React.ChangeEvent<HTMLInputElement>, "branches", index)}
              options={[{ label: t.ui.wizard.ourMachine, value: true }, { label: t.ui.wizard.clientMachine, value: false }]} inline
            />
          )}
          {(branch.hasMultipleMachines === true || branch.usesOurMachines === true) && (
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-primary tracking-tight">{t.ui.wizard.machinesTitle}</h4>
                <Button onClick={() => actions.addNestedListItem(index, "machines")} variant="secondary">
                  <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addMachine}
                </Button>
              </div>

              {branch.machines && branch.machines.length > 0 ? (
                branch.machines.map((machine, idx) => (
                  <CollapsibleCard
                    key={machine.id}
                    initiallyOpen={machine.id === newlyAddedId}
                    onRemove={() => actions.removeNestedListItem(index, "machines", idx)}
                    wizardKey={`branch.${index}.machines.${idx}`}
                    titleContent={<span className="font-semibold">{machine.machineName || t.ui.wizard.newMachine}</span>}
                  >
                    <div className="space-y-4">
                      {/* NEW: per-machine ownership status — only in mixed mode */}
                      {branch.hasMultipleMachines === true && (
                        <RadioGroup label={t.ui.wizard.machineStatusLabel} name={`machineOwner-${machine.id}`}
                          value={machine.machineOwner === "client" ? "client" : "ours"}
                          onChange={(val) => actions.handleNestedListItemChange(
                            { target: { name: "machineOwner", value: val } } as React.ChangeEvent<HTMLInputElement>, index, "machines", idx)}
                          options={[{ label: t.ui.wizard.clientMachine, value: "client" }, { label: t.ui.wizard.midosMachine, value: "ours" }]} inline
                        />
                      )}
                      <TextInput
                        label={t.ui.wizard.machineNameLabel}
                        name="machineName"
                        data-field={`branch.${index}.machines.${idx}.machineName`}
                        value={machine.machineName || ""}
                        onChange={(e) => actions.handleNestedListItemChange(e, index, "machines", idx)}
                        placeholder={t.ui.wizard.machineNamePlaceholder}
                        suggestions={allKnownMachineNames}
                        helpText={t.tooltips.machineName}
                      />
                      <TextInput
                        label={t.ui.wizard.machineTypeLabel}
                        name="machineType"
                        data-field={`branch.${index}.machines.${idx}.machineType`}
                        value={machine.machineType || ""}
                        onChange={(e) => actions.handleNestedListItemChange(e, index, "machines", idx)}
                        placeholder={t.ui.wizard.machineTypePlaceholder}
                        suggestions={allKnownMachineTypes}
                        helpText={t.tooltips.machineType}
                      />
                      <TextInput
                        label={t.ui.wizard.machineOptionLabel}
                        name="machineOption"
                        data-field={`branch.${index}.machines.${idx}.machineOption`}
                        value={machine.machineOption || ""}
                        onChange={(e) => actions.handleNestedListItemChange(e, index, "machines", idx)}
                        placeholder={t.ui.wizard.machineOptionPlaceholder}
                        suggestions={allKnownMachineOptions}
                        helpText={t.tooltips.machineOption}
                      />
                      {/* Rent options only appear for Mido's machines (single mode, or mixed-mode machineOwner === ours) */}
                      {(branch.hasMultipleMachines !== true || machine.machineOwner !== "client") && (
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">{t.ui.wizard.machineAcquisitionLabel}</label>
                          <PortalSelect
                            name="machineOwnershipType"
                            dataField={`branch.${index}.machines.${idx}.machineOwnershipType`}
                            ariaLabel={t.ui.wizard.machineAcquisitionLabel}
                            value={machine.machineOwnershipType || "leased"}
                            options={[
                              { value: "leased", label: t.ui.wizard.lease },
                              { value: "consumption", label: t.ui.wizard.consumption },
                            ]}
                            onChange={(v) => actions.handleNestedListItemChange(
                              { target: { name: "machineOwnershipType", value: v } } as React.ChangeEvent<HTMLInputElement>, index, "machines", idx)}
                          />
                        </div>
                      )}
                      {(branch.hasMultipleMachines !== true || machine.machineOwner !== "client") &&
                        (machine.machineOwnershipType === "leased" || machine.machineOwnershipType === "consumption") && (
                        <TextInput
                          label={machine.machineOwnershipType === "leased" ? t.ui.wizard.dailyLeaseCostLabel : t.ui.wizard.dailyValueLabel}
                          name="dailyLeaseCost"
                          data-field={`branch.${index}.machines.${idx}.dailyLeaseCost`}
                          type="number"
                          value={machine.dailyLeaseCost || ""}
                          onChange={(e) => actions.handleNestedListItemChange(e, index, "machines", idx)}
                          placeholder="0.00"
                          icon={<CurrencyDollarIcon />}
                          helpText={t.tooltips.leaseValue}
                        />
                      )}
                    </div>
                  </CollapsibleCard>
                ))
              ) : (
                <EmptyState
                  variant="inline"
                  icon={<WrenchScrewdriverIcon />}
                  title={t.ui.wizard.noMachinesTitle}
                  message={t.ui.wizard.noMachinesBranchMsg}
                >
                  <Button variant="secondary" onClick={() => actions.addNestedListItem(index, "machines")}>
                    <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addMachine}
                  </Button>
                </EmptyState>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Branch Contacts */}
    <div className="mt-6 pt-6 border-t border-hairline">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-primary tracking-tight">{t.ui.wizard.contactsTitle}</h4>
        <Button onClick={() => actions.addContact(`branch-${index}`)}>
          <PlusCircleIcon className="w-4 h-4" /><span>{t.ui.wizard.addContact}</span>
        </Button>
      </div>
      <ContactsSection path={`branch-${index}`} formData={formData} actions={actions} newlyAddedId={newlyAddedId} fieldPrefix={`branch.${index}.contacts`} />
    </div>

    {/* Branch Baristas */}
    <BranchBaristaSection
      index={index} branch={branch} newlyAddedId={newlyAddedId}
      onAddNested={actions.addNestedListItem}
      onRemoveNested={(li, ii) => actions.removeNestedListItem(index, li, ii)}
      onNestedChange={(e, li, ii) => actions.handleNestedListItemChange(e, index, li as "baristas" | "clientBaristas", ii)}
       isSubmitting={isSubmitting}
      onAiNotesApplied={(baristaIndex, notes) => actions.onBranchAiNotesApplied(index, baristaIndex, notes)}
    />

    {/* Branch Client Baristas */}
    <div className="mt-6 pt-6 border-t border-hairline">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-primary tracking-tight">{t.ui.wizard.clientBaristasTitle}</h4>
        <Button onClick={() => actions.addNestedListItem(index, "clientBaristas")}>
          <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addClientBarista}
        </Button>
      </div>
      <div className="space-y-3">
        {(branch.clientBaristas || []).length > 0 ? (
          (branch.clientBaristas || []).map((cb, cbi) => (
            <CollapsibleCard key={cb.id}
              initiallyOpen={cb.id === newlyAddedId}
              onRemove={() => actions.removeNestedListItem(index, "clientBaristas", cbi)}
              wizardKey={`branch.${index}.clientBaristas.${cbi}`}
              titleContent={<span className="font-semibold">{cb.name || t.ui.wizard.newClientBarista}</span>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <TextInput label={t.ui.wizard.nameLabel} name="name" value={cb.name}
                    data-field={`branch.${index}.clientBaristas.${cbi}.name`}
                    onChange={(e) => actions.handleNestedListItemChange(e, index, "clientBaristas", cbi)} icon={<UserIcon />}
                  />
                  <TextInput label={t.ui.wizard.phoneLabel} name="phone" value={cb.phone}
                    data-field={`branch.${index}.clientBaristas.${cbi}.phone`}
                    onChange={(e) =>
                      actions.handleNestedListItemChange(
                        {
                          target: { name: "phone", value: formatEgyptianPhone(e.target.value) },
                        } as React.ChangeEvent<HTMLInputElement>,
                        index,
                        "clientBaristas",
                        cbi,
                      )
                    }
                    icon={<PhoneIcon />}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">{t.ui.wizard.notesLabel}</label>
                  <textarea name="notes" value={cb.notes || ""}
                    onChange={(e) => actions.handleNestedListItemChange(e, index, "clientBaristas", cbi)}
                    rows={3} className={CLASSES.textArea}
                  />
                </div>
              </div>
            </CollapsibleCard>
          ))
        ) : (
          <EmptyState icon={<UserGroupIcon className="w-8 h-8" />}
            title={t.ui.wizard.noClientBaristasTitle}
            message={t.ui.wizard.noClientBaristasBranchMsg}
          />
        )}
      </div>
    </div>

    {/* Branch Maintenance */}
    <div className="mt-6 pt-6 border-t border-hairline">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-primary tracking-tight">{t.ui.wizard.maintenanceLogTitle}</h4>
        <Button onClick={() => actions.addNestedListItem(index, "maintenanceHistory")}>
          <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addRecord}
        </Button>
      </div>
      <div className="space-y-3">
        {branch.maintenanceHistory.length > 0 ? (
          branch.maintenanceHistory.map((record, recordIndex) => (
            <MaintenanceRecordCard key={record.id}
              record={record}
              onChange={(updatedRecord) => actions.onBranchMaintenanceChange(index, recordIndex, updatedRecord)}
              onRemove={() => actions.removeNestedListItem(index, "maintenanceHistory", recordIndex)}
              onAddNewId={actions.setNewlyAddedId}
              partsList={partsList} servicesList={servicesList}
              problemCategories={problemCategories}
              allPredefinedProblems={allPredefinedProblems}
              newlyAddedId={newlyAddedId}
              baristas={branch.baristas}
              clientBaristas={branch.clientBaristas}
              onAddBarista={(name) => actions.handleQuickAddBarista(name, index)}
              onAddClientBarista={(name) => actions.handleQuickAddClientBarista(name, index)}
              suggestedNames={allKnownBaristaNames}
            />
          ))
        ) : (
          <EmptyState variant="inline" icon={<WrenchScrewdriverIcon />}
            title={t.ui.wizard.noRecordsTitle} message={t.ui.wizard.noRecordsBranchMsg}
          >
            <Button variant="secondary" onClick={() => actions.addNestedListItem(index, "maintenanceHistory")}>
              <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addRecord}
            </Button>
          </EmptyState>
        )}
      </div>
    </div>
  </CollapsibleCard>
);
};
