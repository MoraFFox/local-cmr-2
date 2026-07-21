/**
 * Step 6: Review Step - shows a summary before submission.
 */
import React from "react";
import ReviewStep from "../../../components/ReviewStep";
import { partsList, servicesList } from "../../../constants";
import type { WizardStepProps } from "./types";

export const Step6_Review: React.FC<WizardStepProps> = ({ formData }) => (
  <ReviewStep
    formData={formData}
    partsList={partsList}
    servicesList={servicesList}
  />
);
