/**
 * Step 6: Review Step - shows a summary before submission.
 */
import React from "react";import ReviewStep from "../../../components/ReviewStep";
import { HelpTooltip } from "../../../components/form-ui/HelpTooltip";
import { useT } from "../../../utils/i18n";
import { partsList, servicesList } from "../../../constants";
import { MissingFieldsPanel } from "../../../components/MissingFieldsPanel";
import type { WizardStepProps } from "./types";

export const Step6_Review: React.FC<WizardStepProps> = ({ formData }) => {
  const t = useT();
  return (
    <div className="space-y-6">
      <MissingFieldsPanel formData={formData} mode="dynamic" scope="company" />
      <ReviewStep
        formData={formData}
        partsList={partsList}
        servicesList={servicesList}
        cardTitle={
          <span className="inline-flex items-center gap-2">
            Review Your Submission
            <HelpTooltip text={t.tooltips.reviewSubmission} />
          </span>
        }
      />
    </div>
  );
};
