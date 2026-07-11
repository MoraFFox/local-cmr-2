/**
 * Contacts Section - reusable contact list renderer for main office, warehouse, and branches.
 */
import React from "react";
import CollapsibleCard from "../../../components/CollapsibleCard";
import EmptyState from "../../../components/EmptyState";
import TextInput from "../../../components/TextInput";
import Button from "../../../components/ui/Button";
import {
  UserIcon,
  PhoneIcon,
  BriefcaseIcon,
  PlusCircleIcon,
  UserGroupIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { contactPositions } from "../../../constants";
import type { FormData, Contact } from "../../../types";
import type { ContactPath, WizardStepActions } from "./types";

interface ContactsSectionProps {
  path: ContactPath;
  formData: FormData;
  actions: WizardStepActions;
  newlyAddedId: number | string | null;
}

export const ContactsSection: React.FC<ContactsSectionProps> = ({
  path,
  formData,
  actions,
  newlyAddedId,
}) => {
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
            titleContent={
              <span className="font-semibold text-primary dark:text-cream">
                {contact.name || "جهة اتصال جديدة"}
              </span>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="الاسم"
                  name="name"
                  value={contact.name}
                  onChange={(e) => actions.handleContactChange(e, path, contactIndex)}
                  icon={<UserIcon />}
                />
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">المسمى الوظيفي</label>
                  <div className="relative group focus-within:text-brand-red">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-secondary">
                      <BriefcaseIcon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <select
                      name="position"
                      value={contact.position}
                      onChange={(e) => actions.handleContactChange(e, path, contactIndex)}
                      className="block w-full pr-10 h-[50px] bg-surface text-primary rounded-lg placeholder-latte focus:outline-none focus:ring-2 border border-default focus:border-brand-red focus:ring-brand-red/20 transition-colors appearance-none"
                    >
                      {contactPositions.map((pos) => (
                        <option key={pos.value} value={pos.value}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {contact.position === "custom" && (
                  <TextInput
                    label="مسمى وظيفي مخصص"
                    name="customPosition"
                    value={contact.customPosition || ""}
                    onChange={(e) => actions.handleContactChange(e, path, contactIndex)}
                    className="md:col-span-2"
                    icon={<BriefcaseIcon />}
                  />
                )}
              </div>
              <div className="pt-4 border-t border-default dark:border-default">
                <h5 className="text-sm font-semibold text-primary dark:text-secondary mb-2">أرقام الهواتف</h5>
                <div className="space-y-2">
                  {contact.phoneNumbers.map((phone, phoneIndex) => (
                    <div key={phone.id} className="flex items-center gap-2">
                      <div className="relative flex-grow">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <PhoneIcon className="h-5 w-5 text-secondary" />
                        </div>
                        <input
                          type="tel"
                          value={phone.number}
                          onChange={(e) =>
                            actions.handlePhoneNumberChange(e, path, contactIndex, phoneIndex)
                          }
                          className="input-base pl-10"
                          placeholder="مثال: 0100-123-4567"
                          maxLength={13}
                        />
                      </div>
                      <button
                        onClick={() => actions.removePhoneNumber(path, contactIndex, phoneIndex)}
                        className="p-1.5 text-secondary hover:text-ember-700 dark:hover:text-ember-300 rounded-full hover:bg-ember-500/10 dark:hover:bg-ember-500/20 transition-colors transform active:scale-95"
                        aria-label="إزالة رقم الهاتف"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => actions.addPhoneNumber(path, contactIndex)}
                  className="mt-3 w-full justify-center flex items-center gap-1.5 text-sm font-semibold text-brand-red dark:text-brand-red-400 hover:bg-brand-red/10 dark:hover:bg-brand-red/10 rounded-md py-2 transition-colors transform active:scale-95"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  إضافة رقم هاتف
                </button>
              </div>
            </div>
          </CollapsibleCard>
        ))
      ) : (
        <EmptyState
          variant="inline"
          icon={<UserGroupIcon />}
          title="لا توجد جهات اتصال"
          message="أضف الأفراد الرئيسيين لهذا الموقع للتواصل معهم لاحقاً."
        >
          <Button variant="secondary" onClick={() => actions.addContact(path)}>
            <PlusCircleIcon className="w-4 h-4" /> إضافة جهة اتصال
          </Button>
        </EmptyState>
      )}
    </div>
  );
};
