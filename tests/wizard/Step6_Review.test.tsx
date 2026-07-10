/**
 * Tests for Step6_Review wizard step component.
 * Delegates to ReviewStep which renders company, branches, warehouse, baristas, and maintenance.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Step6_Review } from "../../src/views/wizard/Step6_Review";
import { createFormData } from "./helpers";

describe("Step6_Review", () => {
  it("renders company info section with Arabic field labels", () => {
    render(
      <Step6_Review
        formData={createFormData({
          companyName: "ACME Corp",
          email: "acme@test.com",
          taxNumber: "12345",
          location: "Cairo",
        })}
      />,
    );

    // Company details section uses Arabic labels with values
    expect(screen.getByText("اسم الشركة")).toBeInTheDocument();
    expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    expect(screen.getByText("الرقم الضريبي")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("Cairo")).toBeInTheDocument();
  });

  it("renders warehouse section with location", () => {
    render(
      <Step6_Review
        formData={createFormData({
          companyName: "Test Co",
          warehouse: {
            location: "Alexandria",
            contacts: [],
          },
        })}
      />,
    );

    // Warehouse section header
    expect(screen.getByText("Warehouse")).toBeInTheDocument();
    expect(screen.getByText("Alexandria")).toBeInTheDocument();
  });

  it("renders warehouse contacts with name, position, and phone", () => {
    render(
      <Step6_Review
        formData={createFormData({
          companyName: "Test Co",
          warehouse: {
            location: "",
            contacts: [
              {
                id: 1,
                name: "WH Manager",
                position: "manager",
                phoneNumbers: [{ id: 1, number: "0100000000" }],
              },
            ],
          },
        })}
      />,
    );

    expect(screen.getByText("WH Manager")).toBeInTheDocument();
    expect(screen.getByText("manager")).toBeInTheDocument();
    expect(screen.getByText("0100000000")).toBeInTheDocument();
  });

  it("renders maintenance section with records", () => {
    render(
      <Step6_Review
        formData={createFormData({
          companyName: "Test Co",
          maintenanceHistory: [],
        })}
      />,
    );

    // Maintenance section header
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
  });

  it("renders baristas section with individual names", () => {
    render(
      <Step6_Review
        formData={createFormData({
          companyName: "Test Co",
          baristas: [
            { id: 1, name: "Ahmed", phone: "0100", notes: "Senior" },
            { id: 2, name: "Sara", phone: "0200", notes: "" },
          ],
        })}
      />,
    );

    // Baristas section header + each name appears as a card
    expect(screen.getByText("Baristas (Main Office)")).toBeInTheDocument();
    expect(screen.getByText("Ahmed")).toBeInTheDocument();
    expect(screen.getByText("Sara")).toBeInTheDocument();
  });

  it("renders branches section when hasBranches is true", () => {
    render(
      <Step6_Review
        formData={createFormData({
          companyName: "MultiBranch Co",
          hasBranches: true,
          branches: [
            {
              id: 1,
              branchName: "Branch A",
              email: "a@test.com",
              location: "Giza",
              contacts: [],
              usesOurMachines: null,
              baristas: [],
              clientBaristas: [],
              maintenanceHistory: [],
            },
            {
              id: 2,
              branchName: "Branch B",
              email: "b@test.com",
              location: "Alex",
              contacts: [],
              usesOurMachines: null,
              baristas: [],
              clientBaristas: [],
              maintenanceHistory: [],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Branches")).toBeInTheDocument();
    expect(screen.getByText("Branch A")).toBeInTheDocument();
    expect(screen.getByText("Branch B")).toBeInTheDocument();
  });

  it("shows maintenance empty state when no records exist", () => {
    render(
      <Step6_Review
        formData={createFormData({
          companyName: "Test Co",
          maintenanceHistory: [],
          branches: [],
        })}
      />,
    );

    expect(screen.getByText("No maintenance records found.")).toBeInTheDocument();
  });
});
