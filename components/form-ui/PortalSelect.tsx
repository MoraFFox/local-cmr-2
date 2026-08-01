/**
 * PortalSelect — a <select> replacement that renders its options through a
 * portal to <body>, so the popup can never be clipped by an ancestor with
 * overflow:hidden (e.g. CollapsibleCard's collapse wrapper) or a stacking
 * context. Mirrors the native select API: value + options + onChange(value).
 *
 * Uses useFloatingMenu for positioning (viewport-flip, outside-click/Escape
 * close) and exposes combobox/listbox roles for accessibility.
 */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useFloatingMenu } from "../../hooks/useFloatingMenu";

export interface PortalSelectOption {
  value: string;
  label: string;
}

interface PortalSelectProps {
  /** Currently selected value ("" = nothing selected). */
  value: string;
  /** Called with the chosen option's value. */
  onChange: (value: string) => void;
  options: PortalSelectOption[];
  /** Passed through for form handlers that read e.target.name. */
  name?: string;
  /** data-field marker used by the wizard section-jump feature. */
  dataField?: string;
  /** Accessible name (visible labels stay in the calling component). */
  ariaLabel?: string;
  /** Optional id for <label htmlFor> association. */
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const TRIGGER_BASE =
  "relative w-full ps-3 pe-10 py-3 bg-cream dark:bg-espresso-light text-base text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline text-start cursor-pointer transition-colors hover:border-primary/40";

const PortalSelect: React.FC<PortalSelectProps> = ({
  value,
  onChange,
  options,
  name,
  dataField,
  ariaLabel,
  id,
  className = "",
  disabled = false,
  placeholder = "اختر...",
}) => {
  const [menuWidth, setMenuWidth] = useState(224);
  const menu = useFloatingMenu({ menuWidth });
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((o) => o.value === value);

  const measure = () => {
    if (menu.triggerRef.current) {
      setMenuWidth(Math.max(menu.triggerRef.current.offsetWidth, 200));
    }
  };

  const open = () => {
    if (disabled) return;
    measure();
    menu.setOpen(true);
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
  };

  const selectOption = (v: string) => {
    onChange(v);
    menu.setOpen(false);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!menu.open) {
        open();
        return;
      }
      setActiveIndex((i) =>
        e.key === "ArrowDown"
          ? Math.min(options.length - 1, i + 1)
          : Math.max(0, i - 1),
      );
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!menu.open) {
        open();
      } else if (activeIndex >= 0 && options[activeIndex]) {
        selectOption(options[activeIndex].value);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        id={id}
        name={name}
        data-field={dataField}
        aria-label={ariaLabel}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        aria-disabled={disabled}
        disabled={disabled}
        ref={menu.triggerRef as React.RefObject<HTMLButtonElement>}
        onClick={() => (menu.open ? menu.setOpen(false) : open())}
        onKeyDown={handleTriggerKeyDown}
        className={`${TRIGGER_BASE} ${className}`}
      >
        <span className="block truncate pe-1">
          {selected ? selected.label : value || placeholder}
        </span>
        <ChevronDownIcon
          className={`pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-transform duration-200 ${
            menu.open ? "rotate-180" : ""
          } ${disabled ? "opacity-40" : "text-latte"}`}
        />
      </button>
      {menu.open &&
        createPortal(
          <ul
            ref={menu.contentRef as React.RefObject<HTMLUListElement>}
            role="listbox"
            aria-label={ariaLabel}
            style={{ ...menu.style, width: menuWidth }}
            className="fixed z-[9999] max-h-72 overflow-y-auto py-1 bg-white dark:bg-espresso-light border border-hairline dark:border-hairline rounded-lg shadow-xl animate-scale-in"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectOption(o.value)}
                className={`w-full px-3 py-2 text-base text-primary dark:text-white cursor-pointer transition-colors ${
                  o.value === value
                    ? "bg-primary/10 dark:bg-primary/20 font-semibold"
                    : i === activeIndex
                      ? "bg-cream-2 dark:bg-espresso"
                      : "hover:bg-cream-2 dark:hover:bg-espresso"
                }`}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
};

export default PortalSelect;
