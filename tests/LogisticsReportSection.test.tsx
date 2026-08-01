import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import LogisticsReportSection from "../components/LogisticsReportSection";
import { formatCurrencyEn } from "../utils/costAggregation";
import type { LogisticsOperation } from "../types";

const operation: LogisticsOperation = {
  id: 1,
  customer_id: 7,
  operation_type: "pickup_only",
  status: "closed",
  machine_category: "coffee",
  machine_type: "automatic",
  maintenance_issues: ["Leak"],
  maintenance_services: [{ name: "Service B", count: 1, cost: 75 }],
  maintenance_parts: [
    { name: "Part A", count: 3, cost: 100 },
    { name: "Part B", count: 1, cost: 250 },
  ],
  work_done: "",
  total_rental_cost: 0,
  pickup_cost: 0,
  return_cost: 0,
  maintenance_cost: 550,
  total_logistics_cost: 550,
};

describe("LogisticsReportSection details", () => {
  it("renders quantity, item total, unit-price subtitle, and count ordering in HTML", () => {
    const { container } = render(<LogisticsReportSection operations={[operation]} />);
    const text = container.textContent || "";

    expect(text).toContain("3 Part A");
    expect(text).toContain(formatCurrencyEn(300));
    expect(text).toContain(`Part A = ${formatCurrencyEn(100)}`);
    expect(text).toContain("1 Part B");
    expect(text).toContain(formatCurrencyEn(250));
    expect(text.indexOf("3 Part A")).toBeLessThan(text.indexOf("1 Part B"));
    expect(text).toContain("1 Service B");
    expect(text).toContain(`Service B = ${formatCurrencyEn(75)}`);
  });

  it("keeps item quantities visible while hiding all logistics costs in client mode", () => {
    const { container } = render(
      <LogisticsReportSection operations={[operation]} hideCosts />,
    );
    const text = container.textContent || "";

    expect(text).toContain("3 Part A");
    expect(text).toContain("1 Part B");
    expect(text).toContain("1 Service B");
    expect(text).not.toContain("Part A =");
    expect(text).not.toContain("Service B =");
    expect(text).not.toContain(formatCurrencyEn(300));
    expect(text).not.toContain(formatCurrencyEn(75));
    expect(container.querySelector("th:last-child")?.textContent).toBe("Close Date");
  });
});
