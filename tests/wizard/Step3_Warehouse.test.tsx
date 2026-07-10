/**
 * Tests for Step3_Warehouse wizard step component.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Step3_Warehouse } from "../../src/views/wizard/Step3_Warehouse";
import { createMockActions, createFormData } from "./helpers";

describe("Step3_Warehouse", () => {
  it("renders warehouse location input", () => {
    const actions = createMockActions();
    render(
      <Step3_Warehouse formData={createFormData()} actions={actions} newlyAddedId={null} />,
    );

    expect(screen.getByLabelText("Location")).toBeInTheDocument();
  });

  it("renders warehouse contacts add button that calls addContact", () => {
    const actions = createMockActions();
    render(
      <Step3_Warehouse formData={createFormData()} actions={actions} newlyAddedId={null} />,
    );

    expect(screen.getByText("جهات اتصال المخزن")).toBeInTheDocument();
    // Header has an "إضافة جهة اتصال" button (may also appear in empty state)
    const addBtns = screen.getAllByText("إضافة جهة اتصال");
    expect(addBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(addBtns[0]);
    expect(actions.addContact).toHaveBeenCalledWith("warehouse");
  });

  it("passes formData warehouse location to input", () => {
    const actions = createMockActions();
    render(
      <Step3_Warehouse
        formData={createFormData({ warehouse: { location: "Alexandria", contacts: [] } })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByDisplayValue("Alexandria")).toBeInTheDocument();
  });

  it("renders existing warehouse contacts when card is open", () => {
    const actions = createMockActions();
    render(
      <Step3_Warehouse
        formData={createFormData({
          warehouse: {
            location: "",
            contacts: [
              { id: 1, name: "Warehouse Manager", role: "Manager", phoneNumbers: [{ id: 1, number: "0100000000" }] },
            ],
          },
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    // Card is open because newlyAddedId matches the contact id
    expect(screen.getByDisplayValue("Warehouse Manager")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0100000000")).toBeInTheDocument();
  });
});
