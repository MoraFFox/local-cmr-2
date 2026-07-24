/**
 * Step 4.5: Client Baristas (Main Office)
 */
import React from "react";
import Card from "../../../components/Card";
import CollapsibleCard from "../../../components/CollapsibleCard";
import EmptyState from "../../../components/EmptyState";
import TextInput from "../../../components/TextInput";
import Button from "../../../components/ui/Button";
import { UserIcon, PhoneIcon, PlusCircleIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { CLASSES } from "../../../utils/sharedConstants";
import type { WizardStepProps } from "./types";
import { useT } from "../../../utils/i18n";
import { formatEgyptianPhone } from "../../../utils/phone";

export const Step4_5_ClientBaristas: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
}) => {
  const t = useT();

  return (
  <Card title="باريستا العميل (المكتب الرئيسي)">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold text-primary tracking-tight">باريستا العميل</h3>
      <Button onClick={() => actions.addBlankClientBarista(null)}>
        <PlusCircleIcon className="w-5 h-5" /> إضافة باريستا عميل
      </Button>
    </div>
    <div className="space-y-4">
      {(formData.clientBaristas?.length ?? 0) > 0 ? (
        formData.clientBaristas!.map((cb, index) => (
          <CollapsibleCard
            key={cb.id}
            initiallyOpen={cb.id === newlyAddedId}
            onRemove={() => actions.removeClientBarista(null, index)}
            wizardKey={`company.clientBaristas.${index}`}
            titleContent={<span className="font-semibold">{cb.name || "باريستا عميل جديد"}</span>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="الاسم" name="name" value={cb.name}
                  data-field={`company.clientBaristas.${index}.name`}
                  onChange={(e) => actions.handleClientBaristaChange(e, null, index)}
                  icon={<UserIcon />}
                />
                <TextInput
                  label="رقم الهاتف" name="phone" value={cb.phone}
                  data-field={`company.clientBaristas.${index}.phone`}
                  onChange={(e) =>
                    actions.handleClientBaristaChange(
                      {
                        target: { name: "phone", value: formatEgyptianPhone(e.target.value) },
                      } as React.ChangeEvent<HTMLInputElement>,
                      null,
                      index,
                    )
                  }
                  icon={<PhoneIcon />}
                  helpText={t.tooltips.contactPhone}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">ملاحظات</label>
                <textarea name="notes" value={cb.notes || ""}
                  onChange={(e) => actions.handleClientBaristaChange(e, null, index)}
                  rows={3} className={CLASSES.textArea}
                />
              </div>
            </div>
          </CollapsibleCard>
        ))
      ) : (
        <EmptyState variant="inline" icon={<UserGroupIcon />}
          title="لا يوجد باريستا للعميل"
          message="أضف باريستا شركة العميل الذين يعملون مع ماكيناتنا."
        >
          <Button variant="secondary" onClick={() => actions.addBlankClientBarista(null)}>
            <PlusCircleIcon className="w-4 h-4" /> إضافة باريستا عميل
          </Button>
        </EmptyState>
      )}
    </div>
  </Card>
);
};
