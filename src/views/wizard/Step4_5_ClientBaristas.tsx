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
  <Card title={t.ui.wizard.clientBaristasTeamTitle}>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold text-primary tracking-tight">{t.ui.wizard.clientBaristasTitle}</h3>
      <Button onClick={() => actions.addBlankClientBarista(null)}>
        <PlusCircleIcon className="w-5 h-5" /> {t.ui.wizard.addClientBarista}
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
            titleContent={<span className="font-semibold">{cb.name || t.ui.wizard.newClientBarista}</span>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label={t.ui.wizard.nameLabel} name="name" value={cb.name}
                  data-field={`company.clientBaristas.${index}.name`}
                  onChange={(e) => actions.handleClientBaristaChange(e, null, index)}
                  icon={<UserIcon />}
                />
                <TextInput
                  label={t.ui.wizard.phoneLabel} name="phone" value={cb.phone}
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
                <label className="block text-sm font-medium text-primary mb-2">{t.ui.wizard.notesLabel}</label>
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
          title={t.ui.wizard.noClientBaristasTitle}
          message={t.ui.wizard.noClientBaristasMainMsg}
        >
          <Button variant="secondary" onClick={() => actions.addBlankClientBarista(null)}>
            <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addClientBarista}
          </Button>
        </EmptyState>
      )}
    </div>
  </Card>
);
};
