"use client";

import { useState } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCopy() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      {/* Back square */}
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      {/* Front square (clipped path) */}
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface QuickCopyProps {
  /** The value that will be written to the clipboard. */
  text: string;
  /** Optional accessible label — used for the button's aria-label. */
  label?: string;
}

/**
 * QuickCopy
 *
 * A small, subtle inline button that copies `text` to the clipboard.
 * Shows a checkmark + "Copied!" tooltip for 2 seconds after a successful copy.
 */
export function QuickCopy({ text, label }: QuickCopyProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard API not available or denied — silently ignore.
    }
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        id={`btn-quick-copy-${label ?? text}`}
        onClick={handleCopy}
        aria-label={label ? `Copy ${label}` : "Copy to clipboard"}
        title={isCopied ? "Copied!" : "Copy to clipboard"}
        className={[
          "inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1",
          isCopied
            ? "text-emerald-500"
            : "text-slate-400 hover:text-slate-600",
        ].join(" ")}
      >
        {isCopied ? (
          <>
            <IconCheck />
            <span className="text-[10px] font-semibold tracking-wide">
              Copied!
            </span>
          </>
        ) : (
          <IconCopy />
        )}
      </button>
    </span>
  );
}
