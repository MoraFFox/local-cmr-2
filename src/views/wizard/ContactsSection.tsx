/**
 * Contacts Section - reusable contact list renderer for main office, warehouse, and branches.
 */
import React from "react";
import CollapsibleCard from "../../../components/CollapsibleCard";
import EmptyState from "../../../components/EmptyState";
import TextInput from "../../../components/TextInput";
import Button from "../../../components/ui/Button";
import { HelpTooltip } from "../../../components/form-ui/HelpTooltip";
import {
  UserIcon,
  PhoneIcon,
  BriefcaseIcon,
  PlusCircleIcon,
  UserGroupIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useContactPositions } from "../../../utils/contactPositions";
import ContactPositionManager from "../../../components/ContactPositionManager";
import PortalSelect from "../../../components/form-ui/PortalSelect";
import { useT } from "../../../utils/i18n";
import type { FormData, Contact } from "../../../types";
import type { ContactPath, WizardStepActions } from "./types";

interface ContactsSectionProps {
  path: ContactPath;
  formData: FormData;
  actions: WizardStepActions;
  newlyAddedId: number | string | null;
  /** Prefix used for data-field attributes (e.g. company.contacts, branch.0.contacts) */
  fieldPrefix?: string;
}

export const ContactsSection: React.FC<ContactsSectionProps> = ({
  path,
  formData,
  actions,
  newlyAddedId,
  fieldPrefix,
}) => {
  const t = useT();
  const { positions: contactPositions } = useContactPositions();
  const [isPositionManagerOpen, setIsPositionManagerOpen] = React.useState(false);
  let contacts: Contact[];
  if (path === "main") contacts = formData.contacts;
  else if (path === "warehouse") contacts = formData.warehouse.contacts;
  else {
    const branchIndex = parseInt(path.split("-")[1], 10);
    contacts = formData.branches[branchIndex].contacts;
  }

  return (
    <div className="space-y-4">
      {contacts.length > 0 ? (
        contacts.map((contact, contactIndex) => (
          <CollapsibleCard
            key={contact.id}
            initiallyOpen={contact.id === newlyAddedId}
            onRemove={() => actions.removeContact(path, contactIndex)}
            wizardKey={fieldPrefix ? `${fieldPrefix}.${contactIndex}` : undefined}
            titleContent={
              <span className="font-semibold text-primary">
                {contact.name || t.ui.wizard.newContact}
              </span>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label={t.ui.wizard.nameLabel}
                  name="name"
                  data-field={fieldPrefix ? `${fieldPrefix}.${contactIndex}.name` : undefined}
                  value={contact.name}
                  onChange={(e) => actions.handleContactChange(e, path, contactIndex)}
                  icon={<UserIcon />}
                />
                <div>
                  <label className="flex items-center justify-between gap-1.5 text-sm font-medium text-primary mb-1.5">
                    <span className="flex items-center gap-1.5">
                      {t.ui.wizard.positionLabel}
                      <HelpTooltip text={t.tooltips.contactPosition} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPositionManagerOpen(true)}
                      className="text-xs text-primary hover:text-hover underline"
                    >
                      {t.ui.wizard.managePositions}
                    </button>
                  </label>
                  <PortalSelect
                    name="position"
                    dataField={fieldPrefix ? `${fieldPrefix}.${contactIndex}.position` : undefined}
                    ariaLabel={t.ui.wizard.positionLabel}
                    value={contact.position}
                    options={contactPositions.map((pos) => ({ value: pos.value, label: pos.label }))}
                    onChange={(v) =>
                      actions.handleContactChange(
                        { target: { name: "position", value: v } } as React.ChangeEvent<HTMLInputElement>,
                        path,
                        contactIndex,
                      )
                    }
                  />
                </div>
                {contact.position === "custom" && (
                  <TextInput
                    label={t.ui.wizard.customPositionLabel}
                    name="customPosition"
                    data-field={fieldPrefix ? `${fieldPrefix}.${contactIndex}.customPosition` : undefined}
                    value={contact.customPosition || ""}
                    onChange={(e) => actions.handleContactChange(e, path, contactIndex)}
                    className="md:col-span-2"
                    icon={<BriefcaseIcon />}
                  />
                )}
              </div>
              <div className="pt-4 border-t border-hairline dark:border-hairline">
                <h5 className="text-sm font-semibold text-primary mb-2">{t.ui.wizard.phoneNumbersTitle}</h5>
                <div className="space-y-2">
                  {contact.phoneNumbers.map((phone, phoneIndex) => (
                    <div key={phone.id} className="flex items-center gap-2">
                      <div className="relative flex-grow">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                          <PhoneIcon className="h-5 w-5 text-latte" />
                        </div>
                        <input
                          type="tel"
                          value={phone.number}
                          data-field={fieldPrefix ? `${fieldPrefix}.${contactIndex}.phone` : undefined}
                          onChange={(e) =>
                            actions.handlePhoneNumberChange(e, path, contactIndex, phoneIndex)
                          }
                          className="input-base ps-10"
                          placeholder={t.ui.wizard.phonePlaceholder}
                          maxLength={20}
                        />
                      </div>
                      <button
                        onClick={() => actions.removePhoneNumber(path, contactIndex, phoneIndex)}
                        className="p-1.5 text-latte hover:text-ember-700 dark:hover:text-ember-300 rounded-full hover:bg-ember-500/10 dark:hover:bg-ember-500/20 transition-colors transform active:scale-95"
                        aria-label={t.ui.wizard.removePhoneNumber}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => actions.addPhoneNumber(path, contactIndex)}
                  className="mt-3 w-full justify-center flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-primary-400 hover:bg-primary/10 dark:hover:bg-primary/10 rounded-md py-2 transition-colors transform active:scale-95"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  {t.ui.wizard.addPhoneNumber}
                </button>
              </div>
            </div>
          </CollapsibleCard>
        ))
      ) : (
        <EmptyState
          variant="inline"
          icon={<UserGroupIcon />}
          title={t.ui.wizard.noContactsTitle}
          message={t.ui.wizard.noContactsMsg}
        >
          <Button variant="secondary" onClick={() => actions.addContact(path)}>
            <PlusCircleIcon className="w-4 h-4" /> {t.ui.wizard.addContact}
          </Button>
        </EmptyState>
      )}

      <ContactPositionManager
        isOpen={isPositionManagerOpen}
        onClose={() => setIsPositionManagerOpen(false)}
      />
    </div>
  );
};
