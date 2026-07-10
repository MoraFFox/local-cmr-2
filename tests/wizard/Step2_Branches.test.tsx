/**
 * Tests for Step2_Branches wizard step component.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Step2_Branches } from "../../src/views/wizard/Step2_Branches";
import { createMockActions, createFormData } from "./helpers";
import type { Branch } from "../../types";

function createBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 1,
    branchName: "الفرع الرئيسي",
    email: "branch@test.com",
    location: "Cairo",
    contacts: [],
    usesOurMachines: null,
    baristas: [],
    clientBaristas: [],
    maintenanceHistory: [],
    ...overrides,
  };
}

describe("Step2_Branches", () => {
  it("returns null when hasBranches is false", () => {
    const actions = createMockActions();
    const { container } = render(
      <Step2_Branches
        formData={createFormData({ hasBranches: false })}
        actions={actions}
        newlyAddedId={null}
        isSubmitting={false}
        allKnownBaristaNames={[]}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("shows empty state when hasBranches is true but no branches exist", () => {
    const actions = createMockActions();
    render(
      <Step2_Branches
        formData={createFormData({ hasBranches: true, branches: [] })}
        actions={actions}
        newlyAddedId={null}
        isSubmitting={false}
        allKnownBaristaNames={[]}
      />,
    );

    expect(screen.getByText("لم تتم إضافة فروع")).toBeInTheDocument();
    expect(screen.getByText("اضغط الزر لإضافة أول فرع.")).toBeInTheDocument();
  });

  it("calls addListItem when empty-state add branch button is clicked", () => {
    const actions = createMockActions();
    render(
      <Step2_Branches
        formData={createFormData({ hasBranches: true, branches: [] })}
        actions={actions}
        newlyAddedId={null}
        isSubmitting={false}
        allKnownBaristaNames={[]}
      />,
    );

    const buttons = screen.getAllByText("إضافة فرع");
    expect(buttons.length).toBe(2); // header + empty state
    fireEvent.click(buttons[0]);
    expect(actions.addListItem).toHaveBeenCalledWith("branches");
  });

  it("renders branch card title with company and branch name", () => {
    const actions = createMockActions();
    const branch = createBranch({ id: 1, branchName: "Test Branch", location: "Giza" });
    render(
      <Step2_Branches
        formData={createFormData({ hasBranches: true, companyName: "ACME", branches: [branch] })}
        actions={actions}
        newlyAddedId={1}
        isSubmitting={false}
        allKnownBaristaNames={[]}
      />,
    );

    expect(screen.getByText("Test Branch")).toBeInTheDocument();
    expect(screen.getByText("ACME")).toBeInTheDocument();
  });

  it("renders branch card content when initially open", () => {
    const actions = createMockActions();
    const branch = createBranch({
      id: 1,
      branchName: "My Branch",
      location: "Cairo",
      baristas: [{ id: 10, name: "احمد", phone: "0100" }],
      maintenanceHistory: [],
    });
    render(
      <Step2_Branches
        formData={createFormData({ hasBranches: true, companyName: "ACME", branches: [branch] })}
        actions={actions}
        newlyAddedId={1}
        isSubmitting={false}
        allKnownBaristaNames={["احمد"]}
      />,
    );

    // The branch card is open, so sub-section headers are visible
    expect(screen.getByText("1 باريستا")).toBeInTheDocument();
  });

  it("calls addNestedListItem for client baristas when card is open", () => {
    const actions = createMockActions();
    const branch = createBranch({ id: 1 });
    render(
      <Step2_Branches
        formData={createFormData({ hasBranches: true, branches: [branch] })}
        actions={actions}
        newlyAddedId={1}
        isSubmitting={false}
        allKnownBaristaNames={[]}
      />,
    );

    const buttons = screen.getAllByText("إضافة باريستا عميل");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(buttons[0]);
    expect(actions.addNestedListItem).toHaveBeenCalledWith(0, "clientBaristas");
  });

  it("calls addNestedListItem for maintenance history when card is open", () => {
    const actions = createMockActions();
    const branch = createBranch({ id: 1, maintenanceHistory: [] });
    render(
      <Step2_Branches
        formData={createFormData({ hasBranches: true, branches: [branch] })}
        actions={actions}
        newlyAddedId={1}
        isSubmitting={false}
        allKnownBaristaNames={[]}
      />,
    );

    const buttons = screen.getAllByText("إضافة سجل");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(buttons[0]);
    expect(actions.addNestedListItem).toHaveBeenCalledWith(0, "maintenanceHistory");
  });

  it("renders branch name input when card is open", () => {
    const actions = createMockActions();
    const branch = createBranch({ id: 1, branchName: "Custom Branch" });
    render(
      <Step2_Branches
        formData={createFormData({ hasBranches: true, branches: [branch] })}
        actions={actions}
        newlyAddedId={1}
        isSubmitting={false}
        allKnownBaristaNames={[]}
      />,
    );

    expect(screen.getByDisplayValue("Custom Branch")).toBeInTheDocument();
  });
});
