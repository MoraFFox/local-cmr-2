/**
 * Tests for Step4_5_ClientBaristas wizard step component.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Step4_5_ClientBaristas } from "../../src/views/wizard/Step4_5_ClientBaristas";
import { createMockActions, createFormData } from "./helpers";

describe("Step4_5_ClientBaristas", () => {
  it("renders header and add button", () => {
    const actions = createMockActions();
    // Provide client barista so empty state doesn't render a duplicate add button
    render(
      <Step4_5_ClientBaristas
        formData={createFormData({
          clientBaristas: [{ id: 1, name: "CB1", phone: "", notes: "" }],
        })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByText("باريستا العميل")).toBeInTheDocument();
    // Only the header add button renders (no empty state)
    expect(screen.getByText("إضافة باريستا عميل")).toBeInTheDocument();
  });

  it("shows empty state when no client baristas exist", () => {
    const actions = createMockActions();
    render(
      <Step4_5_ClientBaristas
        formData={createFormData({ clientBaristas: [] })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    expect(screen.getByText("لا يوجد باريستا للعميل")).toBeInTheDocument();
  });

  it("header add button calls addBlankClientBarista", () => {
    const actions = createMockActions();
    render(
      <Step4_5_ClientBaristas
        formData={createFormData({
          clientBaristas: [{ id: 1, name: "CB1", phone: "", notes: "" }],
        })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    fireEvent.click(screen.getByText("إضافة باريستا عميل"));
    expect(actions.addBlankClientBarista).toHaveBeenCalledWith(null);
  });

  it("renders client barista cards when they exist", () => {
    const actions = createMockActions();
    render(
      <Step4_5_ClientBaristas
        formData={createFormData({
          clientBaristas: [
            { id: 1, name: "Client Barista 1", phone: "0100000000", notes: "" },
            { id: 2, name: "Client Barista 2", phone: "0200000000", notes: "VIP" },
          ],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    expect(screen.getByText("Client Barista 1")).toBeInTheDocument();
    expect(screen.getByText("Client Barista 2")).toBeInTheDocument();
    expect(screen.queryByText("لا يوجد باريستا للعميل")).not.toBeInTheDocument();
  });

  it("shows client barista name, phone, and notes inputs inside open card", () => {
    const actions = createMockActions();
    render(
      <Step4_5_ClientBaristas
        formData={createFormData({
          clientBaristas: [
            { id: 1, name: "Ali", phone: "0111111111", notes: "Specialty coffee" },
          ],
        })}
        actions={actions}
        newlyAddedId={1}
      />,
    );

    expect(screen.getByDisplayValue("Ali")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0111111111")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Specialty coffee")).toBeInTheDocument();
  });

  it("handles undefined clientBaristas gracefully (shows empty state)", () => {
    const actions = createMockActions();
    // clientBaristas omitted entirely from overrides
    const formData = createFormData();
    // @ts-expect-error - testing edge case where clientBaristas is undefined
    delete (formData as any).clientBaristas;

    render(
      <Step4_5_ClientBaristas formData={formData} actions={actions} newlyAddedId={null} />,
    );

    // Should show empty state since (undefined?.length ?? 0) > 0 is false
    expect(screen.getByText("لا يوجد باريستا للعميل")).toBeInTheDocument();
  });

  it("empty state add button calls addBlankClientBarista", () => {
    const actions = createMockActions();
    render(
      <Step4_5_ClientBaristas
        formData={createFormData({ clientBaristas: [] })}
        actions={actions}
        newlyAddedId={null}
      />,
    );

    const addBtns = screen.getAllByText("إضافة باريستا عميل");
    fireEvent.click(addBtns[addBtns.length - 1]);
    expect(actions.addBlankClientBarista).toHaveBeenCalledWith(null);
  });
});
