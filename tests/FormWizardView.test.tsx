import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "./testUtils";
import FormWizardView from "../src/views/FormWizardView";
import { initialFormData } from "../utils/sharedConstants";

describe("FormWizardView", () => {
  const baseProps = {
    formData: initialFormData,
    setFormData: vi.fn(),
    currentStep: 1,
    setCurrentStep: vi.fn(),
    currentDraftId: null,
    setCurrentDraftId: vi.fn(),
    drafts: [],
    setDrafts: vi.fn(),
    setView: vi.fn(),
    refreshSubmissions: vi.fn(),
    createSubmission: vi.fn(),
    allKnownMachineNames: [],
    allKnownMachineTypes: [],
    allKnownMachineOptions: [],
  };

  const getFormProgress = () => {
    const region = screen.getByRole("region", { name: /تقدم النموذج/ });
    return within(region);
  };

  it("renders a horizontal FormProgress with wizard steps", () => {
    render(<FormWizardView {...baseProps} />);

    const progress = getFormProgress();
    expect(progress.getByText("تقدم النموذج")).toBeInTheDocument();
    expect(progress.getByText("معلومات الشركة")).toBeInTheDocument();
    expect(progress.getByText("المخزن")).toBeInTheDocument();
    expect(progress.getByText("المراجعة")).toBeInTheDocument();
  });

  it("jumps to a step when its section is clicked", () => {
    const setCurrentStep = vi.fn();
    render(<FormWizardView {...baseProps} setCurrentStep={setCurrentStep} />);

    const progress = getFormProgress();
    const warehouseButton = progress.getByRole("button", { name: /المخزن -/ });
    fireEvent.click(warehouseButton);

    expect(setCurrentStep).toHaveBeenCalledWith(3);
  });

  it("does not render skipped steps when hasBranches is true", () => {
    render(
      <FormWizardView
        {...baseProps}
        formData={{ ...initialFormData, hasBranches: true }}
      />
    );

    const progress = getFormProgress();
    // When branches are enabled, steps 4 (main team) and 5 (main maintenance) are hidden;
    // branches (2) and branch client baristas (4.5) are visible.
    expect(progress.queryByText("فريق Midoe's")).not.toBeInTheDocument();
    expect(progress.queryByText("الصيانة")).not.toBeInTheDocument();
    expect(progress.getByText("الفروع")).toBeInTheDocument();
    expect(progress.getByText("باريستا العميل")).toBeInTheDocument();
  });

  it("jumps to the next visible step via the jump-to-next-incomplete button", () => {
    const setCurrentStep = vi.fn();
    render(<FormWizardView {...baseProps} setCurrentStep={setCurrentStep} />);

    const progress = getFormProgress();
    const jumpButton = progress.getByRole("button", {
      name: /الانتقال للقسم التالي غير المكتمل/,
    });
    fireEvent.click(jumpButton);

    // Without branches, the wizard skips the "branches" step, so company info (1) → warehouse (3).
    expect(setCurrentStep).toHaveBeenCalledWith(3);
  });

  it("hides the jump-to-next button on the last visible step", () => {
    render(<FormWizardView {...baseProps} currentStep={6} />);

    expect(
      screen.queryByRole("button", { name: /الانتقال للقسم التالي غير المكتمل/ })
    ).not.toBeInTheDocument();
  });

  it("marks the active step with aria-current and completed steps visually", () => {
    render(<FormWizardView {...baseProps} currentStep={3} />);

    const progress = getFormProgress();
    const currentButton = progress.getByRole("button", { name: /المخزن -/ });
    expect(currentButton).toHaveAttribute("aria-current", "step");

    const completedButton = progress.getByRole("button", { name: /معلومات الشركة -/ });
    expect(completedButton).not.toHaveAttribute("aria-current", "step");
  });

  it("marks completed steps based on currentStep", () => {
    render(<FormWizardView {...baseProps} currentStep={3} />);

    const progress = getFormProgress();
    // Without branches, 6 visible steps are shown; company info (1) is completed before warehouse (3).
    expect(progress.getByText(/1\s*\/\s*6\s*مكتمل/)).toBeInTheDocument();
  });

  it("switching to multiple machines resets usesOurMachines and tags existing machines", () => {
    const setFormData = vi.fn();
    render(
      <FormWizardView
        {...baseProps}
        setFormData={setFormData}
        formData={{
          ...initialFormData,
          hasBranches: false,
          hasMultipleMachines: null,
          usesOurMachines: true,
          machines: [{ id: 1, machineName: "La Marzocco" }],
        }}
      />,
    );

    // Trigger the multi-machine radio "نعم" (value true) — index 1 because
    // the "hasBranches" radio group also has a "نعم" option rendered earlier.
    const yesRadio = screen.getAllByRole("radio", { name: "نعم" })[1];
    fireEvent.click(yesRadio);

    expect(setFormData).toHaveBeenCalled();
    const updater = setFormData.mock.calls[0][0];
    // Invoke the updater with the same machine-bearing formData that was rendered
    const next = updater({
      ...initialFormData,
      hasBranches: false,
      hasMultipleMachines: null,
      usesOurMachines: true,
      machines: [{ id: 1, machineName: "La Marzocco" }],
    });
    expect(next.hasMultipleMachines).toBe(true);
    expect(next.usesOurMachines).toBeNull();
    // Existing machine gets a default machineOwner of "ours"
    expect(next.machines[0].machineOwner).toBe("ours");
  });

  it("switching away from multiple machines clears the machine list", () => {
    const setFormData = vi.fn();
    render(
      <FormWizardView
        {...baseProps}
        setFormData={setFormData}
        formData={{
          ...initialFormData,
          hasBranches: false,
          hasMultipleMachines: true,
          usesOurMachines: null,
          machines: [{ id: 1, machineName: "La Marzocco", machineOwner: "ours" }],
        }}
      />,
    );

    // Trigger the multi-machine radio "لا" (value false) — index 1 because
    // the "hasBranches" radio group also has a "لا" option rendered earlier.
    const noRadio = screen.getAllByRole("radio", { name: "لا" })[1];
    fireEvent.click(noRadio);

    expect(setFormData).toHaveBeenCalled();
    const updater = setFormData.mock.calls[0][0];
    // Invoke the updater with the same machine-bearing formData that was rendered
    const next = updater({
      ...initialFormData,
      hasBranches: false,
      hasMultipleMachines: true,
      usesOurMachines: null,
      machines: [{ id: 1, machineName: "La Marzocco", machineOwner: "ours" }],
    });
    expect(next.hasMultipleMachines).toBe(false);
    expect(next.machines).toEqual([]);
  });
});
