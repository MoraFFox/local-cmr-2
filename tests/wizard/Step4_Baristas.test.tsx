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

    expect(screen.getByText("الباريستا")).toBeInTheDocument();
    // Only the header's add button renders (no empty state)
    expect(screen.getByText("إضافة باريستا")).toBeInTheDocument();
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

    expect(screen.getByText("لا يوجد باريستا")).toBeInTheDocument();
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

    fireEvent.click(screen.getByText("إضافة باريستا"));
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

  it("shows AI suggestion button when barista card is open", () => {
    const actions = createMockActions();
    render(
      <Step4_Baristas
        formData={createFormData({
          baristas: [{ id: 1, name: "Ahmed", phone: "0111111111", notes: "" }],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    expect(screen.getByText("✨ اقتراح بالذكاء الاصطناعي")).toBeInTheDocument();
  });

  it("clicking AI button calls suggestBaristaNotes", () => {
    const actions = createMockActions({
      suggestBaristaNotes: vi.fn().mockResolvedValue("Generated notes"),
    });
    render(
      <Step4_Baristas
        formData={createFormData({
          baristas: [{ id: 1, name: "Ahmed", phone: "0111111111", notes: "" }],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    fireEvent.click(screen.getByText("✨ اقتراح بالذكاء الاصطناعي"));
    expect(actions.suggestBaristaNotes).toHaveBeenCalledWith("Ahmed");
  });

  it("shows loading text on AI button when isSubmitting is true", () => {
    const actions = createMockActions();
    render(
      <Step4_Baristas
        formData={createFormData({
          baristas: [{ id: 1, name: "Ahmed", phone: "", notes: "" }],
        })}
        actions={actions}
        newlyAddedId={1}
        isSubmitting={true}
      />,
    );

    expect(screen.getByText("جاري الإنشاء...")).toBeInTheDocument();
    expect(screen.queryByText("✨ اقتراح بالذكاء الاصطناعي")).not.toBeInTheDocument();
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

    // When baristas is empty, both header and empty state render "إضافة باريستا"
    // The empty state one is the last rendered
    const addBtns = screen.getAllByText("إضافة باريستا");
    fireEvent.click(addBtns[addBtns.length - 1]);
    expect(actions.addListItem).toHaveBeenCalledWith("baristas");
  });
});
