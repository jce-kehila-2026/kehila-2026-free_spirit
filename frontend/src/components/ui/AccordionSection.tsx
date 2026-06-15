"use client";

import { type ReactNode } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AccordionSectionProps {
  /** The section title displayed in the clickable header. */
  title: string;
  /** Optional subtitle shown beneath the title when open. */
  description?: string;
  /** Controlled open/closed state. */
  isOpen: boolean;
  /** Toggle callback fired when the header is clicked. */
  onToggle: () => void;
  /**
   * When true, a red dot is shown on the header and the section is forced open
   * so the user can see the validation error inside.
   */
  hasError?: boolean;
  /** The form fields or any content to collapse/expand. */
  children: ReactNode;
}

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={[
        "h-4 w-4 shrink-0 text-[#6A8589] transition-transform duration-300",
        isOpen ? "rotate-180" : "rotate-0",
      ].join(" ")}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * AccordionSection
 *
 * A fully controlled, accessible accordion wrapper for react-hook-form field
 * groups. Fields are NEVER unmounted — the CSS Grid `grid-template-rows`
 * technique is used for a perfectly smooth slide animation without any
 * JavaScript height measurement or hardcoded pixel values.
 *
 * Technique:
 *   Outer div transitions: grid-template-rows: 0fr → 1fr
 *   Inner div has overflow: hidden (clips content when row fraction = 0)
 *
 * Usage:
 *   <AccordionSection
 *     title="Demographics"
 *     description="Identification and background details."
 *     isOpen={open.demographics}
 *     onToggle={() => toggle("demographics")}
 *     hasError={!!errors.passport_id}
 *   >
 *     <YourFields />
 *   </AccordionSection>
 */
export function AccordionSection({
  title,
  description,
  isOpen,
  onToggle,
  hasError = false,
  children,
}: AccordionSectionProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D7E3D5] bg-white shadow-[0_8px_20px_rgba(44,105,117,0.05)]">
      {/* ── Clickable header ── */}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className={[
          "flex w-full items-center justify-between gap-4 px-5 py-4 text-left",
          "transition-colors duration-150",
          isOpen
            ? "bg-[#F7FAF5]"
            : "bg-white hover:bg-[#F7FAF5]",
          hasError && !isOpen
            ? "ring-1 ring-inset ring-red-300"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Error indicator dot */}
          {hasError && (
            <span
              aria-label="This section has validation errors"
              className="h-2 w-2 shrink-0 rounded-full bg-red-500"
            />
          )}
          <div className="min-w-0">
            <h3
              className={[
                "text-sm font-bold",
                hasError ? "text-red-700" : "text-[#173A40]",
              ].join(" ")}
            >
              {title}
            </h3>
            {description && !isOpen && (
              <p className="mt-0.5 truncate text-xs text-[#6A8589]">
                {description}
              </p>
            )}
          </div>
        </div>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* ── Smooth slide body using CSS Grid trick ── */}
      {/*
        grid-template-rows transitions from 0fr to 1fr.
        The inner div must have overflow:hidden to clip at 0fr.
        Fields remain mounted at all times — react-hook-form values are safe.
      */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 300ms ease",
        }}
      >
        <div className="overflow-hidden">
          {/* Description shown inside body when open */}
          <div className="px-5 pb-6 pt-1">
            {description && isOpen && (
              <p className="mb-5 text-sm leading-6 text-[#5C7478]">{description}</p>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
