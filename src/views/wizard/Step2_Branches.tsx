/**
 * Step 2: Branches
 * Delegates each branch's editable card to BranchCard.
 */
import React from "react";
import Card from "../../../components/Card";
import EmptyState from "../../../components/EmptyState";
import Button from "../../../components/ui/Button";
import { BranchCard } from "./BranchCard";
import {
  PlusCircleIcon, BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import type { WizardStepProps } from "./types";

export const Step2_Branches: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
  isSubmitting,
  allKnownBaristaNames,
}) => {
  if (!formData.hasBranches) return null;

  return (
    <Card title="تفاصيل الفرع">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-ink tracking-tight">الفروع</h3>
        <Button onClick={() => actions.addListItem("branches")}>
          <PlusCircleIcon className="w-5 h-5" /> إضافة فرع
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
            />
          ))
        ) : (
          <EmptyState variant="inline" icon={<BuildingOffice2Icon />}
            title="لم تتم إضافة فروع" message="اضغط الزر لإضافة أول فرع."
          >
            <Button variant="secondary" onClick={() => actions.addListItem("branches")}>
              <PlusCircleIcon className="w-4 h-4" /> إضافة فرع
            </Button>
          </EmptyState>
        )}
      </div>
    </Card>
  );
};
