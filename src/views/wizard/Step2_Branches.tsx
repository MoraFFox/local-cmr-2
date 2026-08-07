/**
 * Step 2: Branches
 * Delegates each branch's editable card to BranchCard.
 */
import React from "react";
import Card from "../../../components/Card";
import EmptyState from "../../../components/EmptyState";
import Button from "../../../components/ui/Button";
import { BranchCard } from "./BranchCard";
import { HelpTooltip } from "../../../components/form-ui/HelpTooltip";import { PlusCircleIcon, BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { useT } from "../../../utils/i18n";
import type { WizardStepProps } from "./types";

export const Step2_Branches: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
  isSubmitting = false,
  allKnownBaristaNames,
  allKnownMachineNames = [],
  allKnownMachineTypes = [],
  allKnownMachineOptions = [],
}) => {
  const t = useT();

  if (formData.hasBranches !== true) return null;

  return (
    <Card title={t.ui.wizard.branchDetailsTitle}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-primary tracking-tight">{t.ui.wizard.branchesTitle}</h3>
          <HelpTooltip text={t.tooltips.branchDetails} />
        </div>
        <Button onClick={() => actions.addListItem("branches")}>
          <PlusCircleIcon className="w-5 h-5" /> {t.ui.wizard.addBranch}
        </Button>
      </div>
      <div className="space-y-4">
        {formData.branches.length > 0 ? (
          formData.branches.map((branch, index) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              index={index}
              companyName={formData.companyName}
              formData={formData}
              actions={actions}
              newlyAddedId={newlyAddedId}
              isSubmitting={isSubmitting}
              allKnownBaristaNames={allKnownBaristaNames}
              allKnownMachineNames={allKnownMachineNames}
              allKnownMachineTypes={allKnownMachineTypes}
              allKnownMachineOptions={allKnownMachineOptions}
            />
          ))
        ) : (
          <EmptyState variant="inline" icon={<BuildingOffice2Icon />}
            title={t.ui.wizard.noBranchesTitle} message={t.ui.wizard.noBranchesMsg}
          >
            <Button variant="secondary" onClick={() => actions.addListItem("branches")}>
              <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addBranch}
            </Button>
          </EmptyState>
        )}
      </div>
    </Card>
  );
};
