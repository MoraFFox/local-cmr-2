/**
 * Tests for Step1_CompanyInfo wizard step component.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Step1_CompanyInfo } from "../../src/views/wizard/Step1_CompanyInfo";
import { createMockActions, createFormData } from "./helpers";

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

    expect(screen.getByText("هل يستخدمون ماكيناتنا؟")).toBeInTheDocument();
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

    expect(screen.queryByText("هل يستخدمون ماكيناتنا؟")).not.toBeInTheDocument();
  });

  it("shows ownership type radios when usesOurMachines is true", () => {
    const actions = createMockActions();
    render(
      <Step1_CompanyInfo
        formData={createFormData({ hasBranches: false, usesOurMachines: true })}
        actions={actions}
        newlyAddedId={null}
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
          machineOwnershipType: "leased",
          dailyLeaseCost: 150,
        })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByLabelText("قيمة الإيجار اليومي (ج.م)")).toBeInTheDocument();
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
