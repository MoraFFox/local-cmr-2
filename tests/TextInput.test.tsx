import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "./testUtils";
import TextInput from "../components/TextInput";

describe("TextInput autocomplete", () => {
  it("renders suggestions outside an overflow-hidden card container", () => {
    const { container } = render(
      <div className="overflow-hidden">
        <TextInput
          label="نظام تشغيل الماكينة"
          name="machineOption"
          value=""
          onChange={vi.fn()}
          suggestions={["Manual, Automatic", "Automatic", "Semi-automatic"]}
        />
      </div>,
    );

    fireEvent.focus(screen.getByRole("combobox", { name: "نظام تشغيل الماكينة" }));

    const suggestion = screen.getByRole("option", { name: "Manual, Automatic" });
    expect(suggestion).toBeInTheDocument();
    expect(container.contains(suggestion)).toBe(false);
    expect(suggestion.closest("body")).toBe(document.body);
  });

  it("flips the portal menu above an input near the viewport bottom", () => {
    render(
      <TextInput
        label="نظام تشغيل الماكينة"
        name="machineOption"
        value=""
        onChange={vi.fn()}
        suggestions={["Manual, Automatic", "Automatic", "Semi-automatic"]}
      />,
    );

    const input = screen.getByRole("combobox", { name: "نظام تشغيل الماكينة" });
    vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
      top: 900,
      bottom: 950,
      left: 100,
      right: 500,
      width: 400,
      height: 50,
      x: 100,
      y: 900,
      toJSON: () => ({}),
    });

    fireEvent.focus(input);

    const menu = screen.getByRole("listbox", { name: "نظام تشغيل الماكينة" });
    const top = Number.parseFloat((menu as HTMLElement).style.top);
    expect(top).toBeLessThan(900);
  });

  it("supports keyboard selection and closes with Escape", () => {
    const onChange = vi.fn();
    render(
      <TextInput
        label="اسم الماكينة"
        name="machineName"
        value=""
        onChange={onChange}
        suggestions={["La Marzocco", "Linea Classic"]}
      />,
    );

    const input = screen.getByRole("combobox", { name: "اسم الماكينة" });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ name: "machineName", value: "Linea Classic" }),
      }),
    );

    fireEvent.focus(input);
    expect(screen.getByRole("listbox", { name: "اسم الماكينة" })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "اسم الماكينة" })).not.toBeInTheDocument();
  });

  it("selects a suggestion and closes the portal menu", () => {
    const onChange = vi.fn();
    render(
      <TextInput
        label="اسم الماكينة"
        name="machineName"
        value="La"
        onChange={onChange}
        suggestions={["La Marzocco", "Linea Classic"]}
      />,
    );

    fireEvent.focus(screen.getByRole("combobox", { name: "اسم الماكينة" }));
    fireEvent.click(screen.getByRole("option", { name: "La Marzocco" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ name: "machineName", value: "La Marzocco" }),
      }),
    );
    expect(screen.queryByRole("option", { name: "La Marzocco" })).not.toBeInTheDocument();
  });
});
