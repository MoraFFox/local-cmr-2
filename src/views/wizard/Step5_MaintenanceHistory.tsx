/**
 * Step 5: Maintenance History (Main Office)
 */
import React from "react";
import Card from "../../../components/Card";
import EmptyState from "../../../components/EmptyState";
import MaintenanceRecordCard from "../../../components/MaintenanceRecordCard";
import Button from "../../../components/ui/Button";
import { PlusCircleIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { partsList, servicesList, problemCategories } from "../../../constants";
import { allPredefinedProblems } from "../../../utils/sharedConstants";
import type { WizardStepProps } from "./types";

export const Step5_MaintenanceHistory: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
  allKnownBaristaNames,
}) => (
  <Card title="سجل الصيانة (المكتب الرئيسي)">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold text-ink tracking-tight">سجلات الصيانة</h3>
      <Button onClick={() => actions.addListItem("maintenanceHistory")}>
        <PlusCircleIcon className="w-5 h-5" /> إضافة سجل
      </Button>
    </div>
    <div className="space-y-4">
      {formData.maintenanceHistory.length > 0 ? (
        formData.maintenanceHistory.map((record, index) => (
          <MaintenanceRecordCard
            key={record.id}
            record={record}
            onChange={(updatedRecord) => actions.onMainOfficeMaintenanceChange(index, updatedRecord)}
            onRemove={() => actions.removeListItem("maintenanceHistory", index)}
            onAddNewId={actions.setNewlyAddedId}
            partsList={partsList}
            servicesList={servicesList}
            problemCategories={problemCategories}
            allPredefinedProblems={allPredefinedProblems}
            newlyAddedId={newlyAddedId}
            baristas={formData.baristas}
            clientBaristas={formData.clientBaristas}
            onAddBarista={(name) => actions.handleQuickAddClientBarista(name, null)}
            onAddClientBarista={(name) => actions.handleQuickAddClientBarista(name, null)}
            suggestedNames={allKnownBaristaNames}
          />
        ))
      ) : (
        <EmptyState variant="inline" icon={<WrenchScrewdriverIcon />}
          title="لا يوجد سجل صيانة" message="أضف سجلات الصيانة للمكتب الرئيسي."
        >
          <Button variant="secondary" onClick={() => actions.addListItem("maintenanceHistory")}>
            <PlusCircleIcon className="w-4 h-4" /> إضافة سجل
          </Button>
        </EmptyState>
      )}
    </div>
  </Card>
);
