/**
 * Step 1: Company Information
 * Company name, email, tax number, location, contacts, branch toggle.
 */
import React from "react";
import Card from "../../../components/Card";
import TextInput from "../../../components/TextInput";
import RadioGroup from "../../../components/RadioGroup";
import Button from "../../../components/ui/Button";
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { ContactsSection } from "./ContactsSection";
import type { WizardStepProps } from "./types";

export const Step1_CompanyInfo: React.FC<WizardStepProps> = ({
  formData,
  actions,
  newlyAddedId,
}) => (
  <Card title="معلومات الشركة">
    <div className="space-y-6">
      <TextInput
        label="اسم الشركة"
        name="companyName"
        value={formData.companyName}
        onChange={actions.handleChange}
        placeholder="مثال: شركة كافيه ميدوز"
        icon={<BuildingOfficeIcon />}
      />
      <TextInput
        label="البريد الإلكتروني"
        name="email"
        type="email"
        value={formData.email}
        onChange={actions.handleChange}
        placeholder="مثال: manager@midoes.com"
        icon={<EnvelopeIcon />}
      />
      <TextInput
        label="الرقم الضريبي"
        name="taxNumber"
        value={formData.taxNumber}
        onChange={actions.handleChange}
        placeholder="مثال: 12-3456789"
        icon={<DocumentTextIcon />}
      />
      <TextInput
        label="الموقع"
        name="location"
        value={formData.location}
        onChange={actions.handleChange}
        placeholder="مثال: شارع التحرير، القاهرة"
        icon={<MapPinIcon />}
      />
      <TextInput
        label="استهلاك القهوة بالكيلو (كجم/شهر)"
        name="coffeeConsumptionKg"
        type="number"
        value={formData.coffeeConsumptionKg || ""}
        onChange={actions.handleChange}
        placeholder="مثال: 50"
        icon={<ScaleIcon />}
      />
      <div className="pt-8 mt-8 border-t border-hairline">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-ink tracking-tight">جهات الاتصال</h3>
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
        />
      </div>
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
      {formData.hasBranches === false && (
        <div className="pt-6 mt-6 border-t border-hairline space-y-6">
          <RadioGroup
            label="هل يستخدمون ماكيناتنا؟"
            name="usesOurMachines"
            value={formData.usesOurMachines}
            onChange={(val) => actions.handleRadioChange("usesOurMachines", val)}
            options={[
              { label: "نعم", value: true },
              { label: "لا", value: false },
            ]}
            inline
          />
          {formData.usesOurMachines === true && (
            <div className="pl-6 border-l-2 border-hairline">
              <RadioGroup
                label="كيف تم الحصول على الماكينة؟"
                name="machineOwnershipType"
                value={formData.machineOwnershipType}
                onChange={(val) => actions.handleRadioChange("machineOwnershipType", val)}
                options={[
                  { label: "شراء", value: "bought" },
                  { label: "إيجار", value: "leased" },
                ]}
                inline
              />
              {formData.machineOwnershipType === "leased" && (
                <div className="mt-4">
                  <TextInput
                    label="قيمة الإيجار اليومي (ج.م)"
                    name="dailyLeaseCost"
                    type="number"
                    value={formData.dailyLeaseCost || ""}
                    onChange={actions.handleChange}
                    placeholder="0.00"
                    icon={<CurrencyDollarIcon />}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </Card>
);
