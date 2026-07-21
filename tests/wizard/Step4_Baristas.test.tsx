/**
 * Tests for Step4_Baristas wizard step component.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Step4_Baristas } from "../../src/views/wizard/Step4_Baristas";
import { createMockActions, createFormData } from "./helpers";

describe("Step4_Baristas", () => {
  it("renders header and add button", () => {
    const actions = createMockActions();
    // Provide baristas so empty state doesn't render a duplicate add button
    render(
      <Step4_Baristas
        formData={createFormData({ baristas: [{ id: 1, name: "Ahmed", phone: "", notes: "" }] })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByText("فريق Midoe's (المكتب الرئيسي)")).toBeInTheDocument();
    // Only the header's add button renders (no empty state)
    expect(screen.getByText("إضافة فرد صيانة (Midoe's)")).toBeInTheDocument();
  });

  it("shows empty state when no baristas exist", () => {
    const actions = createMockActions();
    render(
      <Step4_Baristas
        formData={createFormData({ baristas: [] })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByText("لا يوجد فريق صيانة")).toBeInTheDocument();
  });

  it("header add button calls addListItem", () => {
    const actions = createMockActions();
    render(
      <Step4_Baristas
        formData={createFormData({ baristas: [{ id: 1, name: "Ahmed", phone: "", notes: "" }] })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    fireEvent.click(screen.getByText("إضافة فرد صيانة (Midoe's)"));
    expect(actions.addListItem).toHaveBeenCalledWith("baristas");
  });

  it("renders barista cards when baristas exist", () => {
    const actions = createMockActions();
    render(
      <Step4_Baristas
        formData={createFormData({
          baristas: [
            { id: 1, name: "Ahmed", phone: "0111111111", notes: "Experienced" },
            { id: 2, name: "Sara", phone: "0222222222", notes: "" },
          ],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    // Both barista names appear in card titles (CollapsibleCard renders titleContent)
    expect(screen.getByText("Ahmed")).toBeInTheDocument();
    expect(screen.getByText("Sara")).toBeInTheDocument();
    expect(screen.queryByText("لا يوجد باريستا")).not.toBeInTheDocument();
  });

  it("shows barista name and phone inputs inside open card", () => {
    const actions = createMockActions();
    render(
      <Step4_Baristas
        formData={createFormData({
          baristas: [{ id: 1, name: "Ahmed", phone: "0111111111", notes: "Test note" }],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    // Card is open because newlyAddedId matches
    expect(screen.getByDisplayValue("Ahmed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0111111111")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test note")).toBeInTheDocument();
  });

  it("empty state add button calls addListItem", () => {
    const actions = createMockActions();
    render(
      <Step4_Baristas
        formData={createFormData({ baristas: [] })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    // When baristas is empty, the header and empty state both render add buttons.
    // The empty state button is the last rendered.
    const addBtns = screen.getAllByText("إضافة فرد صيانة (Midoe's)");
    fireEvent.click(addBtns[addBtns.length - 1]);
    expect(actions.addListItem).toHaveBeenCalledWith("baristas");
  });
});
