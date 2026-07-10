/**
 * Step 3: Warehouse Information
 * Location + contacts.
 */
import React from "react";
import Card from "../../../components/Card";
import TextInput from "../../../components/TextInput";
import Button from "../../../components/ui/Button";
import { MapPinIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { ContactsSection } from "./ContactsSection";
import type { WizardStepProps } from "./types";

export const Step3_Warehouse: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
}) => (
  <Card title="معلومات المخزن">
    <div className="space-y-6">
      <TextInput
        label="Location"
        name="warehouse.location"
        value={formData.warehouse.location}
        onChange={actions.handleChange}
        icon={<MapPinIcon />}
      />
      <div className="pt-8 mt-8 border-t dark:border-hairline">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-ink tracking-tight">جهات اتصال المخزن</h3>
          <Button onClick={() => actions.addContact("warehouse")}>
            <PlusCircleIcon className="w-5 h-5" />
            <span>إضافة جهة اتصال</span>
          </Button>
        </div>
        <ContactsSection
          path="warehouse"
          formData={formData}
          actions={actions}
          newlyAddedId={newlyAddedId}
        />
      </div>
    </div>
  </Card>
);
