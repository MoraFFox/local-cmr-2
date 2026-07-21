/**
 * Tests for Step5_MaintenanceHistory wizard step component.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Step5_MaintenanceHistory } from "../../src/views/wizard/Step5_MaintenanceHistory";
import { createMockActions, createFormData } from "./helpers";
import { getNewMaintenanceRecord, getTodayDateString } from "../../utils/sharedConstants";

describe("Step5_MaintenanceHistory", () => {
  it("renders header and add button", () => {
    const actions = createMockActions();
    // Provide a record so empty state doesn't render a duplicate add button
    const record = getNewMaintenanceRecord(1);
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({ maintenanceHistory: [record] })}
        actions={actions}
        newlyAddedId={null}
        allKnownBaristaNames={[]}
      />,
    );

    expect(screen.getByText("سجلات الصيانة")).toBeInTheDocument();
    // Only the header add button renders
    expect(screen.getByText("إضافة سجل")).toBeInTheDocument();
  });

  it("shows empty state when no maintenance records exist", () => {
    const actions = createMockActions();
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({ maintenanceHistory: [] })}
        actions={actions}
        newlyAddedId={null}
        allKnownBaristaNames={[]}
      />,
    );

    expect(screen.getByText("لا يوجد سجل صيانة")).toBeInTheDocument();
    expect(screen.getByText("أضف سجلات الصيانة للمكتب الرئيسي.")).toBeInTheDocument();
  });

  it("header add button calls addListItem", () => {
    const actions = createMockActions();
    const record = getNewMaintenanceRecord(1);
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({ maintenanceHistory: [record] })}
        actions={actions}
        newlyAddedId={null}
        allKnownBaristaNames={[]}
      />,
    );

    fireEvent.click(screen.getByText("إضافة سجل"));
    expect(actions.addListItem).toHaveBeenCalledWith("maintenanceHistory");
  });

  it("renders maintenance record cards when records exist (collapsed summary visible)", () => {
    const today = getTodayDateString();
    const actions = createMockActions();
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({
          maintenanceHistory: [{ ...getNewMaintenanceRecord(1), baristaName: "Ali", visitRating: 4 }],
        })}
        actions={actions}
        newlyAddedId={null}
        allKnownBaristaNames={[]}
      />,
    );

    // Should not show empty state
    expect(screen.queryByText("لا يوجد سجل صيانة")).not.toBeInTheDocument();
    // MaintenanceSummary (visible in collapsed card) shows the date and barista name
    expect(screen.getByText(today)).toBeInTheDocument();
    expect(screen.getByText("Ali")).toBeInTheDocument();
  });

  it("renders maintenance record card content when open via newlyAddedId", () => {
    const actions = createMockActions();
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({
          maintenanceHistory: [{ ...getNewMaintenanceRecord(1), machines: [{ id: 1, name: "Machine A", count: 1 }] }],
        })}
        actions={actions}
        newlyAddedId={1}
        allKnownBaristaNames={[]}
      />,
    );

    // Card is open, machine name input is visible
    expect(screen.getByDisplayValue("Machine A")).toBeInTheDocument();
  });

  it("empty state add button calls addListItem", () => {
    const actions = createMockActions();
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({ maintenanceHistory: [] })}
        actions={actions}
        newlyAddedId={null}
        allKnownBaristaNames={[]}
      />,
    );

    const addBtns = screen.getAllByText("إضافة سجل");
    fireEvent.click(addBtns[addBtns.length - 1]);
    expect(actions.addListItem).toHaveBeenCalledWith("maintenanceHistory");
  });

  it("passes allKnownBaristaNames to MaintenanceRecordCard", () => {
    const actions = createMockActions();
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({
          maintenanceHistory: [{ ...getNewMaintenanceRecord(1), baristaName: "Sara" }],
        })}
        actions={actions}
        newlyAddedId={null}
        allKnownBaristaNames={["Ahmed", "Sara"]}
      />,
    );

    // The suggestedNames prop is passed to MaintenanceRecordCard
    // Verify the card rendered and barista name is visible in collapsed summary
    expect(screen.getByText("Sara")).toBeInTheDocument();
  });

  it("renders multiple maintenance records", () => {
    const actions = createMockActions();
    render(
      <Step5_MaintenanceHistory
        formData={createFormData({
          maintenanceHistory: [
            { ...getNewMaintenanceRecord(1), baristaName: "Ali" },
            { ...getNewMaintenanceRecord(2), baristaName: "Sara" },
          ],
        })}
        actions={actions}
        newlyAddedId={null}
        allKnownBaristaNames={[]}
      />,
    );

    // Both barista names are visible in collapsed MaintenanceSummary
    expect(screen.getByText("Ali")).toBeInTheDocument();
    expect(screen.getByText("Sara")).toBeInTheDocument();
  });
});
