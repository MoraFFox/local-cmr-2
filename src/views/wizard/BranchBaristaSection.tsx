/**
 * Branch Barista Section - extracted sub-component for rendering branch baristas with AI suggestion.
 */
import React from "react";
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
import type { Branch } from "../../../types";

interface BranchBaristaSectionProps {
  index: number;
  branch: Branch;
  newlyAddedId: number | string | null;
  onAddNested: (branchIndex: number, listName: "baristas") => void;
  onRemoveNested: (listName: string, itemIndex: number) => void;
  onNestedChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    listName: string,
    itemIndex: number,
  ) => void;
  isSubmitting: boolean;
  onAiNotesApplied: (baristaIndex: number, notes: string) => void;
}

export const BranchBaristaSection: React.FC<BranchBaristaSectionProps> = ({
  index,
  branch,
  newlyAddedId,
  onAddNested,
  onRemoveNested,
  onNestedChange,
  isSubmitting,
  onAiNotesApplied,
}) => (
  <div className="mt-6 pt-6 border-t border-hairline">
    <div className="flex justify-between items-center mb-4">
      <h4 className="text-lg font-bold text-primary tracking-tight">الباريستا</h4>
      <Button onClick={() => onAddNested(index, "baristas")}>
        <PlusCircleIcon className="w-4 h-4" /> إضافة باريستا
      </Button>
    </div>
    <div className="space-y-3">
      {branch.baristas.length > 0 ? (
        branch.baristas.map((barista, baristaIndex) => (
          <CollapsibleCard
            key={barista.id}
            initiallyOpen={barista.id === newlyAddedId}
            onRemove={() => onRemoveNested("baristas", baristaIndex)}
            titleContent={<span className="font-semibold">{barista.name || "باريستا جديد"}</span>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <TextInput
                  label="الاسم"
                  name="name"
                  value={barista.name}
                  onChange={(e) => onNestedChange(e, "baristas", baristaIndex)}
                  icon={<UserIcon />}
                />
                <TextInput
                  label="رقم الهاتف"
                  name="phone"
                  value={barista.phone}
                  onChange={(e) => onNestedChange(e, "baristas", baristaIndex)}
                  icon={<PhoneIcon />}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">ملاحظات</label>
                <textarea
                  name="notes"
                  value={barista.notes || ""}
                  onChange={(e) => onNestedChange(e, "baristas", baristaIndex)}
                  rows={3}
                  className={CLASSES.textArea}
                />
              </div>
            </div>
          </CollapsibleCard>
        ))
      ) : (
        <EmptyState
          icon={<UserGroupIcon className="w-8 h-8" />}
          title="لا يوجد باريستا"
          message="أضف الباريستا الذين يعملون في هذا الفرع."
        />
      )}
    </div>
  </div>
);
