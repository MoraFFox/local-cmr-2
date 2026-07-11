/**
 * Step 4: Main Office Baristas
 */
import React from "react";
import Card from "../../../components/Card";
import CollapsibleCard from "../../../components/CollapsibleCard";
import EmptyState from "../../../components/EmptyState";
import TextInput from "../../../components/TextInput";
import Button from "../../../components/ui/Button";
import {
  UserIcon,
  PhoneIcon,
  PlusCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CLASSES } from "../../../utils/sharedConstants";
import type { WizardStepProps } from "./types";

export const Step4_Baristas: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
  isSubmitting,
}) => (
  <Card title="الفريق / الباريستا (المكتب الرئيسي)">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold text-primary tracking-tight">الباريستا</h3>
      <Button onClick={() => actions.addListItem("baristas")}>
        <PlusCircleIcon className="w-5 h-5" /> إضافة باريستا
      </Button>
    </div>
    <div className="space-y-4">
      {formData.baristas.length > 0 ? (
        formData.baristas.map((barista, index) => (
          <CollapsibleCard
            key={barista.id}
            initiallyOpen={barista.id === newlyAddedId}
            onRemove={() => actions.removeListItem("baristas", index)}
            titleContent={<span className="font-semibold">{barista.name || "باريستا جديد"}</span>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="الاسم"
                  name="name"
                  value={barista.name}
                  onChange={(e) => actions.handleListItemChange(e, "baristas", index)}
                  icon={<UserIcon />}
                />
                <TextInput
                  label="رقم الهاتف"
                  name="phone"
                  value={barista.phone}
                  onChange={(e) => actions.handleListItemChange(e, "baristas", index)}
                  icon={<PhoneIcon />}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">ملاحظات</label>
                <textarea
                  name="notes"
                  value={barista.notes || ""}
                  onChange={(e) => actions.handleListItemChange(e, "baristas", index)}
                  rows={3}
                  className={CLASSES.textArea}
                />
              </div>
            </div>
          </CollapsibleCard>
        ))
      ) : (
        <EmptyState
          variant="inline"
          icon={<UserGroupIcon />}
          title="لا يوجد باريستا"
          message="أضف الباريستا الذين يعملون في المكتب الرئيسي."
        >
          <Button variant="secondary" onClick={() => actions.addListItem("baristas")}>
            <PlusCircleIcon className="w-4 h-4" /> إضافة باريستا
          </Button>
        </EmptyState>
      )}
    </div>
  </Card>
);
