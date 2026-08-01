/**
 * Tests for Step1_CompanyInfo wizard step component.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "../testUtils";
import { Step1_CompanyInfo } from "../../src/views/wizard/Step1_CompanyInfo";
import { createMockActions, createFormData, createMachine } from "./helpers";

describe("Step1_CompanyInfo", () => {
  it("renders company name, email, tax number, and location fields", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo formData={createFormData()} actions={actions} newlyAddedId={null} />,
    );

    expect(screen.getByLabelText("اسم الشركة")).toBeInTheDocument();
    expect(screen.getByLabelText("البريد الإلكتروني")).toBeInTheDocument();
    expect(screen.getByLabelText("الرقم الضريبي")).toBeInTheDocument();
    expect(screen.getByLabelText("الموقع")).toBeInTheDocument();
  });

  it("renders contacts section with add button that calls addContact", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo formData={createFormData()} actions={actions} newlyAddedId={null} />,
    );

    const addBtns = screen.getAllByText("إضافة جهة اتصال");
    expect(addBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(addBtns[0]);
    expect(actions.addContact).toHaveBeenCalledWith("main");
  });

  it("renders branch toggle radio group", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo formData={createFormData()} actions={actions} newlyAddedId={null} />,
    );

    expect(screen.getByText("هل لدى الشركة عدة فروع؟")).toBeInTheDocument();
  });

  it("shows machine ownership section when hasBranches is false", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({ hasBranches: false })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByText("حالة الماكينة")).toBeInTheDocument();
  });

  it("shows the multiple-machines question before the single-machine status", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({ hasBranches: false })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByText("هل لدى العميل أكثر من ماكينة؟")).toBeInTheDocument();
    // The single-machine status radio still shows when the multi toggle is unanswered
    expect(screen.getByText("حالة الماكينة")).toBeInTheDocument();
  });

  it("hides the single-machine status and shows per-machine owner radios in mixed mode", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          hasMultipleMachines: true,
          usesOurMachines: null,
          machines: [createMachine({ id: 1, machineName: "La Marzocco" })],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    // The single-machine status radio disappears in mixed mode
    expect(screen.queryByText("هل يستخدمون ماكيناتنا؟")).not.toBeInTheDocument();
    // Per-machine owner radios appear: client's machine / Midos machine
    expect(screen.getByText("مكينة العميل")).toBeInTheDocument();
    expect(screen.getByText("مكينة ميدوز")).toBeInTheDocument();
  });

  it("shows rent options for a Midos-owned machine in mixed mode", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          hasMultipleMachines: true,
          usesOurMachines: null,
          machines: [createMachine({ id: 1, machineOwner: "ours", machineOwnershipType: "leased", dailyLeaseCost: 150 })],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    expect(screen.getByText("كيف تم الحصول على الماكينة؟")).toBeInTheDocument();
    expect(screen.getByLabelText("قيمة الإيجار اليومي (ج.م)")).toBeInTheDocument();
  });

  it("hides rent options for a client-owned machine in mixed mode", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          hasMultipleMachines: true,
          usesOurMachines: null,
          machines: [createMachine({ id: 1, machineOwner: "client", machineOwnershipType: "leased", dailyLeaseCost: 150 })],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    expect(screen.queryByText("كيف تم الحصول على الماكينة؟")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("قيمة الإيجار اليومي (ج.م)")).not.toBeInTheDocument();
  });

  it("shows the machine list in mixed mode even when usesOurMachines is null", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          hasMultipleMachines: true,
          usesOurMachines: null,
        })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByText("الماكينات")).toBeInTheDocument();
    expect(screen.getByText("لا توجد ماكينات")).toBeInTheDocument();
  });

  it("hides machine ownership when hasBranches is true", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({ hasBranches: true })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.queryByText("حالة الماكينة")).not.toBeInTheDocument();
  });

  it("shows ownership type radios when usesOurMachines is true", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machines: [createMachine()],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    expect(screen.getByText("كيف تم الحصول على الماكينة؟")).toBeInTheDocument();
  });

  it("hides ownership type when usesOurMachines is false", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({ hasBranches: false, usesOurMachines: false })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.queryByText("كيف تم الحصول على الماكينة؟")).not.toBeInTheDocument();
  });

  it("shows daily lease cost input when machineOwnershipType is leased", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machines: [createMachine({ dailyLeaseCost: 150 })],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    expect(screen.getByLabelText("قيمة الإيجار اليومي (ج.م)")).toBeInTheDocument();
  });

  it("hides machine ownership controls when the machine card is collapsed", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machines: [createMachine()],
        })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.queryByText("كيف تم الحصول على الماكينة؟")).not.toBeInTheDocument();
  });

  it("hides daily lease cost when ownership is bought", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machineOwnershipType: "bought",
        })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.queryByLabelText("قيمة الإيجار اليومي (ج.م)")).not.toBeInTheDocument();
  });

  it("shows machine type select with fixed options and saved types", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machines: [createMachine()],
        })}
        actions={actions}
        newlyAddedId={1}
        allKnownMachineTypes={["جرايندر", "Delonghi Magnifica S", "ماكينة"]}
      />,
    );

    // The type is now a portal-based select, not a free-text input
    const select = screen.getByRole("combobox", { name: "نوع الماكينة (اختياري)" });
    expect(select).toBeInTheDocument();

    // Options render once the menu is opened (portal to body)
    fireEvent.click(select);
    expect(screen.getByRole("option", { name: "ماكينة" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "جرايندر" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Delonghi Magnifica S" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "أخرى (اكتب نوع جديد)" })).toBeInTheDocument();

    // Picking a value calls handleListItemChange
    fireEvent.click(screen.getByRole("option", { name: "Delonghi Magnifica S" }));
    expect(actions.handleListItemChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ name: "machineType", value: "Delonghi Magnifica S" }) }),
      "machines",
      0,
    );
  });

  it("reveals a free-text input when 'أخرى' is picked for machine type", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machines: [createMachine()],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    const select = screen.getByRole("combobox", { name: "نوع الماكينة (اختياري)" });
    fireEvent.click(select);
    fireEvent.click(screen.getByRole("option", { name: "أخرى (اكتب نوع جديد)" }));

    // Custom type input appears; typing stores it as machineType
    const customInput = screen.getByPlaceholderText("اكتب نوع الماكينة الجديد...");
    fireEvent.change(customInput, { target: { value: "Rancilio Silvia" } });
    expect(actions.handleListItemChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ name: "machineType", value: "Rancilio Silvia" }) }),
      "machines",
      0,
    );
  });

  it("pre-fills the custom type input when editing a record with a custom type", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machines: [createMachine({ machineType: "Rancilio Silvia" })],
        })}
        actions={actions}
        newlyAddedId={1}
        allKnownMachineTypes={["ماكينة", "جرايندر"]}
      />,
    );

    const select = screen.getByRole("combobox", { name: "نوع الماكينة (اختياري)" });
    // The trigger shows the "أخرى" option while the custom value is kept in state
    expect(select).toHaveTextContent("أخرى (اكتب نوع جديد)");
    expect(screen.getByDisplayValue("Rancilio Silvia")).toBeInTheDocument();
  });

  it("shows saved machine names as suggestions in the Machine Name field", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          hasBranches: false,
          usesOurMachines: true,
          machines: [createMachine()],
        })}
        actions={actions}
        newlyAddedId={1}
        allKnownMachineNames={["La Marzocco Linea", "Mazzer Super Jolly"]}
      />,
    );

    // Focus the machine name combobox → saved names appear in the dropdown
    const nameInput = screen.getByPlaceholderText("مثال: La Marzocco");
    fireEvent.focus(nameInput);
    expect(screen.getByText("Mazzer Super Jolly")).toBeInTheDocument();

    // Selecting a saved name fills the field via handleListItemChange
    fireEvent.click(screen.getByText("Mazzer Super Jolly"));
    expect(actions.handleListItemChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ name: "machineName", value: "Mazzer Super Jolly" }),
      }),
      "machines",
      0,
    );
  });

  it("passes formData values to inputs", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({
          companyName: "Test Company",
          email: "test@example.com",
          taxNumber: "12345",
          location: "Cairo",
        })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByDisplayValue("Test Company")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12345")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cairo")).toBeInTheDocument();
  });
});
