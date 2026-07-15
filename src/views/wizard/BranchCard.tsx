/**
 * BranchCard — renders a single branch's editable card with all sub-sections:
 * info fields, contacts, baristas, client baristas, and maintenance history.
 * Extracted from Step2_Branches to reduce component size.
 */
import React from "react";
import CollapsibleCard from "../../../components/CollapsibleCard";
import EmptyState from "../../../components/EmptyState";
import TextInput from "../../../components/TextInput";
import RadioGroup from "../../../components/RadioGroup";
import Button from "../../../components/ui/Button";
import MaintenanceRecordCard from "../../../components/MaintenanceRecordCard";
import { ContactsSection } from "./ContactsSection";
import { BranchBaristaSection } from "./BranchBaristaSection";
import {
  BuildingStorefrontIcon, EnvelopeIcon, DocumentTextIcon, MapPinIcon,
  CurrencyDollarIcon, ScaleIcon, PlusCircleIcon, UserGroupIcon, WrenchScrewdriverIcon,
  PhoneIcon, UserIcon,
} from "@heroicons/react/24/outline";
import { partsList, servicesList, problemCategories } from "../../../constants";
import { allPredefinedProblems, CLASSES } from "../../../utils/sharedConstants";
import type { Branch, FormData } from "../../../types";
import type { WizardStepActions } from "./types";

interface BranchCardProps {
  branch: Branch;
  index: number;
  companyName: string;
  formData: FormData;
  actions: WizardStepActions;
  newlyAddedId: number | string | null;
  isSubmitting: boolean;
  allKnownBaristaNames: string[];
}

export const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  index,
  companyName,
  formData,
  actions,
  newlyAddedId,
  isSubmitting,
  allKnownBaristaNames,
}) => (
  <CollapsibleCard
    initiallyOpen={branch.id === newlyAddedId}
    onRemove={() => actions.removeListItem("branches", index)}
    titleContent={
      <div className="min-w-0 pr-1">
        <div className="marquee-container w-full">
          <div className="inline-flex items-center gap-x-2 md:truncate md:animate-none lg:hover:animate-none animate-marquee-rtl pr-8">
            <span className="font-bold text-base whitespace-nowrap">{companyName || "الشركة"}</span>
            <span className="text-latte shrink-0">-</span>
            <span className="text-base whitespace-nowrap">{branch.branchName || "فرع جديد"}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-latte mt-1.5">
          {branch.location && (
            <span className="flex items-center gap-1 truncate max-w-full" title={branch.location}>
              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{branch.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <UserGroupIcon className="w-3.5 h-3.5 shrink-0" />
            {branch.baristas.length} باريستا
          </span>
        </div>
      </div>
    }
  >
    {/* Branch info fields */}
    <div className="space-y-4">
      <TextInput label="اسم الفرع" name="branchName" value={branch.branchName || ""}
        onChange={(e) => actions.handleListItemChange(e, "branches", index)}
        placeholder="مثال: المعادي" icon={<BuildingStorefrontIcon />}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput label="البريد الإلكتروني" name="email" value={branch.email}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)} icon={<EnvelopeIcon />}
        />
        <TextInput label="الرقم الضريبي" name="taxNumber" value={branch.taxNumber || ""}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)} icon={<DocumentTextIcon />}
        />
        <TextInput label="الموقع" name="location" value={branch.location}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)}
          className="md:col-span-2" icon={<MapPinIcon />}
        />
        <TextInput label="استهلاك القهوة بالكيلو (كجم/شهر)" name="coffeeConsumptionKg" type="number"
          value={branch.coffeeConsumptionKg || ""}
          onChange={(e) => actions.handleListItemChange(e, "branches", index)}
          placeholder="مثال: 50" icon={<ScaleIcon />}
        />
        <div className="md:col-span-2">
          <RadioGroup label="هل يستخدمون ماكيناتنا؟" name={`usesOurMachines-${branch.id}`}
            value={branch.usesOurMachines}
            onChange={(val) => actions.handleListItemChange(
              { target: { name: "usesOurMachines", value: val } } as React.ChangeEvent<HTMLInputElement>, "branches", index)}
            options={[{ label: "نعم", value: true }, { label: "لا", value: false }]} inline
          />
          {branch.usesOurMachines === true && (
            <div className="pl-6 mt-4 border-l-2 border-hairline">
              <RadioGroup label="كيف تم الحصول على الماكينة؟" name={`machineOwnershipType-${branch.id}`}
                value={branch.machineOwnershipType}
                onChange={(val) => actions.handleListItemChange(
                  { target: { name: "machineOwnershipType", value: val } } as React.ChangeEvent<HTMLInputElement>, "branches", index)}
                options={[{ label: "شراء", value: "bought" }, { label: "إيجار", value: "leased" }]} inline
              />
              {branch.machineOwnershipType === "leased" && (
                <div className="mt-4">
                  <TextInput label="قيمة الإيجار اليومي (ج.م)" name="dailyLeaseCost" type="number"
                    value={branch.dailyLeaseCost || ""}
                    onChange={(e) => actions.handleListItemChange(e, "branches", index)}
                    placeholder="0.00" icon={<CurrencyDollarIcon />}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Branch Contacts */}
    <div className="mt-6 pt-6 border-t border-hairline">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-primary tracking-tight">جهات الاتصال</h4>
        <Button onClick={() => actions.addContact(`branch-${index}`)}>
          <PlusCircleIcon className="w-4 h-4" /><span>إضافة جهة اتصال</span>
        </Button>
      </div>
      <ContactsSection path={`branch-${index}`} formData={formData} actions={actions} newlyAddedId={newlyAddedId} />
    </div>

    {/* Branch Baristas */}
    <BranchBaristaSection
      index={index} branch={branch} newlyAddedId={newlyAddedId}
      onAddNested={actions.addNestedListItem}
      onRemoveNested={(li, ii) => actions.removeNestedListItem(index, li, ii)}
      onNestedChange={(e, li, ii) => actions.handleNestedListItemChange(e, index, li as "baristas" | "clientBaristas", ii)}
       isSubmitting={isSubmitting}
      onAiNotesApplied={(baristaIndex, notes) => actions.onBranchAiNotesApplied(index, baristaIndex, notes)}
    />

    {/* Branch Client Baristas */}
    <div className="mt-6 pt-6 border-t border-hairline">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-primary tracking-tight">باريستا العميل</h4>
        <Button onClick={() => actions.addNestedListItem(index, "clientBaristas")}>
          <PlusCircleIcon className="w-4 h-4" /> إضافة باريستا عميل
        </Button>
      </div>
      <div className="space-y-3">
        {(branch.clientBaristas || []).length > 0 ? (
          (branch.clientBaristas || []).map((cb, cbi) => (
            <CollapsibleCard key={cb.id}
              initiallyOpen={cb.id === newlyAddedId}
              onRemove={() => actions.removeNestedListItem(index, "clientBaristas", cbi)}
              titleContent={<span className="font-semibold">{cb.name || "باريستا عميل جديد"}</span>}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <TextInput label="الاسم" name="name" value={cb.name}
                    onChange={(e) => actions.handleNestedListItemChange(e, index, "clientBaristas", cbi)} icon={<UserIcon />}
                  />
                  <TextInput label="رقم الهاتف" name="phone" value={cb.phone}
                    onChange={(e) => actions.handleNestedListItemChange(e, index, "clientBaristas", cbi)} icon={<PhoneIcon />}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">ملاحظات</label>
                  <textarea name="notes" value={cb.notes || ""}
                    onChange={(e) => actions.handleNestedListItemChange(e, index, "clientBaristas", cbi)}
                    rows={3} className={CLASSES.textArea}
                  />
                </div>
              </div>
            </CollapsibleCard>
          ))
        ) : (
          <EmptyState icon={<UserGroupIcon className="w-8 h-8" />}
            title="لا يوجد باريستا للعميل"
            message="أضف باريستا شركة العميل الذين يعملون في هذا الفرع."
          />
        )}
      </div>
    </div>

    {/* Branch Maintenance */}
    <div className="mt-6 pt-6 border-t border-hairline">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-primary tracking-tight">سجل الصيانة</h4>
        <Button onClick={() => actions.addNestedListItem(index, "maintenanceHistory")}>
          <PlusCircleIcon className="w-4 h-4" /> إضافة سجل
        </Button>
      </div>
      <div className="space-y-3">
        {branch.maintenanceHistory.length > 0 ? (
          branch.maintenanceHistory.map((record, recordIndex) => (
            <MaintenanceRecordCard key={record.id}
              record={record}
              onChange={(updatedRecord) => actions.onBranchMaintenanceChange(index, recordIndex, updatedRecord)}
              onRemove={() => actions.removeNestedListItem(index, "maintenanceHistory", recordIndex)}
              onAddNewId={actions.setNewlyAddedId}
              partsList={partsList} servicesList={servicesList}
              problemCategories={problemCategories}
              allPredefinedProblems={allPredefinedProblems}
              newlyAddedId={newlyAddedId}
              baristas={branch.baristas}
              clientBaristas={branch.clientBaristas}
              onAddBarista={(name) => actions.handleQuickAddBarista(name, index)}
              onAddClientBarista={(name) => actions.handleQuickAddClientBarista(name, index)}
              suggestedNames={allKnownBaristaNames}
            />
          ))
        ) : (
          <EmptyState variant="inline" icon={<WrenchScrewdriverIcon />}
            title="لا يوجد سجل صيانة" message="أضف سجلات الصيانة لهذا الفرع."
          >
            <Button variant="secondary" onClick={() => actions.addNestedListItem(index, "maintenanceHistory")}>
              <PlusCircleIcon className="w-4 h-4" /> إضافة سجل
            </Button>
          </EmptyState>
        )}
      </div>
    </div>
  </CollapsibleCard>
);
