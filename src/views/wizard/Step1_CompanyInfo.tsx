/**
 * Step 1: Company Information
 * Company name, email, tax number, location, contacts, branch toggle.
 */
import React from "react";
import Card from "../../../components/Card";
import TextInput from "../../../components/TextInput";
import RadioGroup from "../../../components/RadioGroup";
import Button from "../../../components/ui/Button";
import CollapsibleCard from "../../../components/CollapsibleCard";
import EmptyState from "../../../components/EmptyState";
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  PlusCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { ContactsSection } from "./ContactsSection";
import MachineTypeField from "./MachineTypeField";
import PortalSelect from "../../../components/form-ui/PortalSelect";
import type { WizardStepProps } from "./types";
import { useT } from "../../../utils/i18n";

export const Step1_CompanyInfo: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
  allKnownMachineNames = [],
  allKnownMachineTypes = [],
  allKnownMachineOptions = [],
}) => {
  const t = useT();

  return (
  <Card title="معلومات الشركة">
    <div className="space-y-6">
      <TextInput
        label="اسم الشركة"
        name="companyName"
        data-field="company.companyName"
        value={formData.companyName}
        onChange={actions.handleChange}
        placeholder="مثال: شركة كافيه ميدوز"
        icon={<BuildingOfficeIcon />}
      />
      <TextInput
        label="البريد الإلكتروني"
        name="email"
        data-field="company.email"
        type="email"
        value={formData.email}
        onChange={actions.handleChange}
        placeholder="مثال: manager@midoes.com"
        icon={<EnvelopeIcon />}
      />
      <TextInput
        label="الرقم الضريبي"
        name="taxNumber"
        data-field="company.taxNumber"
        value={formData.taxNumber}
        onChange={actions.handleChange}
        placeholder="مثال: 12-3456789"
        icon={<DocumentTextIcon />}
      />
      <TextInput
        label="الموقع"
        name="location"
        data-field="company.location"
        value={formData.location}
        onChange={actions.handleChange}
        placeholder="مثال: شارع التحرير، القاهرة"
        icon={<MapPinIcon />}
      />
      <TextInput
        label="استهلاك القهوة بالكيلو (كجم/شهر)"
        name="coffeeConsumptionKg"
        data-field="company.coffeeConsumptionKg"
        type="number"
        value={formData.coffeeConsumptionKg || ""}
        onChange={actions.handleChange}
        placeholder="مثال: 50"
        icon={<ScaleIcon />}
        helpText={t.tooltips.coffeeConsumption}
      />
      <div className="pt-8 mt-8 border-t border-hairline">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-primary tracking-tight">جهات الاتصال</h3>
          <Button onClick={() => actions.addContact("main")}>
            <PlusCircleIcon className="w-5 h-5" />
            <span>إضافة جهة اتصال</span>
          </Button>
        </div>
        <ContactsSection
          path="main"
          formData={formData}
          actions={actions}
          newlyAddedId={newlyAddedId}
          fieldPrefix="company.contacts"
        />
      </div>
      <div data-field="company.hasBranches">
        <RadioGroup
          label="هل لدى الشركة عدة فروع؟"
          name="hasBranches"
          value={formData.hasBranches}
          onChange={(val) => actions.handleRadioChange("hasBranches", val)}
            options={[
            { label: "نعم", value: true },
            { label: "لا", value: false },
          ]}
          inline
        />
      </div>
      {formData.hasBranches === false && (
        <div className="pt-6 mt-6 border-t border-hairline space-y-6">
          {/* NEW: mixed machine fleet toggle — asked BEFORE the single-machine status */}
          <RadioGroup
            label="هل لدى العميل أكثر من ماكينة؟"
            name="hasMultipleMachines"
            value={formData.hasMultipleMachines}
            onChange={(val) => actions.handleRadioChange("hasMultipleMachines", val)}
            options={[
              { label: "نعم", value: true },
              { label: "لا", value: false },
            ]}
            inline
          />
          {/* Single machine flow (including legacy records without hasMultipleMachines) */}
          {formData.hasMultipleMachines !== true && (
            <RadioGroup
              label="حالة الماكينة"
              name="usesOurMachines"
              value={formData.usesOurMachines}
              onChange={(val) => actions.handleRadioChange("usesOurMachines", val)}
              options={[
                { label: "مكينتنا", value: true },
                { label: "مكينة العميل", value: false },
              ]}
              inline
            />
          )}
          {/* Machine list shows directly in mixed mode, or under usesOurMachines === true in single mode */}
          {(formData.hasMultipleMachines === true || formData.usesOurMachines === true) && (
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-primary tracking-tight">الماكينات</h4>
                <Button onClick={() => actions.addListItem("machines")} variant="secondary">
                  <PlusCircleIcon className="w-4 h-4" /> إضافة ماكينة
                </Button>
              </div>

              {formData.machines && formData.machines.length > 0 ? (
                formData.machines.map((machine, idx) => (
                  <CollapsibleCard
                    key={machine.id}
                    initiallyOpen={machine.id === newlyAddedId}
                    onRemove={() => actions.removeListItem("machines", idx)}
                    titleContent={<span className="font-semibold">{machine.machineName || "ماكينة جديدة"}</span>}
                  >
                    <div className="space-y-4">
                      {/* NEW: per-machine ownership status — only in mixed mode */}
                      {formData.hasMultipleMachines === true && (
                        <RadioGroup
                          label="حالة الماكينة"
                          name={`machineOwner-${machine.id}`}
                          value={machine.machineOwner === "client" ? "client" : "ours"}
                          onChange={(v) =>
                            actions.handleListItemChange(
                              { target: { name: "machineOwner", value: v } } as React.ChangeEvent<HTMLInputElement>,
                              "machines",
                              idx,
                            )
                          }
                          options={[
                            { label: "مكينة العميل", value: "client" },
                            { label: "مكينة ميدوز", value: "ours" },
                          ]}
                          inline
                        />
                      )}
                      <TextInput
                        label="اسم الماكينة (اختياري)"
                        name="machineName"
                        data-field={`company.machines.${idx}.machineName`}
                        value={machine.machineName || ""}
                        onChange={(e) => actions.handleListItemChange(e, "machines", idx)}
                        placeholder="مثال: La Marzocco"
                        suggestions={allKnownMachineNames}
                        helpText={t.tooltips.machineName}
                      />
                      <MachineTypeField
                        value={machine.machineType || ""}
                        onChange={(v) =>
                          actions.handleListItemChange(
                            { target: { name: "machineType", value: v } } as React.ChangeEvent<HTMLInputElement>,
                            "machines",
                            idx,
                          )
                        }
                        knownTypes={allKnownMachineTypes}
                        data-field={`company.machines.${idx}.machineType`}
                        helpText={t.tooltips.machineType}
                      />
                      <TextInput
                        label="نظام تشغيل الماكينة (اختياري)"
                        name="machineOption"
                        data-field={`company.machines.${idx}.machineOption`}
                        value={machine.machineOption || ""}
                        onChange={(e) => actions.handleListItemChange(e, "machines", idx)}
                        placeholder="مثال: Manual, Automatic..."
                        suggestions={allKnownMachineOptions}
                        helpText={t.tooltips.machineOption}
                      />
                      {/* Rent options only appear for Mido's machines (single mode, or mixed-mode machineOwner === ours) */}
                      {(formData.hasMultipleMachines !== true || machine.machineOwner !== "client") && (
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">كيف تم الحصول على الماكينة؟</label>
                          <PortalSelect
                            name="machineOwnershipType"
                            dataField={`company.machines.${idx}.machineOwnershipType`}
                            ariaLabel="كيف تم الحصول على الماكينة؟"
                            value={machine.machineOwnershipType || "leased"}
                            options={[
                              { value: "leased", label: "إيجار" },
                              { value: "consumption", label: "مقابل الاستهلاك" },
                            ]}
                            onChange={(v) =>
                              actions.handleListItemChange(
                                { target: { name: "machineOwnershipType", value: v } } as React.ChangeEvent<HTMLInputElement>,
                                "machines",
                                idx,
                              )
                            }
                          />
                        </div>
                      )}
                      {(formData.hasMultipleMachines !== true || machine.machineOwner !== "client") &&
                        (machine.machineOwnershipType === "leased" || machine.machineOwnershipType === "consumption") && (
                        <TextInput
                          label={machine.machineOwnershipType === "leased" ? "قيمة الإيجار اليومي (ج.م)" : "القيمة اليومية (ج.م)"}
                          name="dailyLeaseCost"
                          data-field={`company.machines.${idx}.dailyLeaseCost`}
                          type="number"
                          value={machine.dailyLeaseCost || ""}
                          onChange={(e) => actions.handleListItemChange(e, "machines", idx)}
                          placeholder="0.00"
                          icon={<CurrencyDollarIcon />}
                          helpText={t.tooltips.leaseValue}
                        />
                      )}
                    </div>
                  </CollapsibleCard>
                ))
              ) : (
                <EmptyState
                  variant="inline"
                  icon={<WrenchScrewdriverIcon />}
                  title="لا توجد ماكينات"
                  message="أضف الماكينات الموجودة في المكتب الرئيسي."
                >
                  <Button variant="secondary" onClick={() => actions.addListItem("machines")}>
                    <PlusCircleIcon className="w-4 h-4" /> إضافة ماكينة
                  </Button>
                </EmptyState>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </Card>
);
};
