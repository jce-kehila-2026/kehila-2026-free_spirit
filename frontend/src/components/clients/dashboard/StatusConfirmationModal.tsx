"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfirmableStatus = "interested" | "registered";

interface StatusConfirmationModalProps {
  /** The client's current status — drives all copy and action label. */
  currentStatus: ConfirmableStatus;
  clientName: string;
  /** Called when the user clicks the primary confirm button. */
  onConfirm: () => void;
  onClose: () => void;
  /** Disables both buttons while the async write is in-flight. */
  isLoading?: boolean;
}

// ─── Copy map (Tier 3 presentation logic) ─────────────────────────────────────

const COPY: Record<
  ConfirmableStatus,
  { title: string; body: string; actionLabel: string; actionClass: string }
> = {
  interested: {
    title: "Register Client",
    body: "Are you sure you want to officially register this client? This will update their status in the system.",
    actionLabel: "Confirm Registration",
    // Solid teal — a positive, forward-moving action
    actionClass:
      "bg-[#245C66] text-white hover:bg-[#173A40] focus:ring-[#6BB2A0]",
  },
  registered: {
    title: "Client Registered",
    body: "This client is already registered. Registered clients cannot be reverted to Interested.",
    actionLabel: "Already Registered",
    // Amber-tinted — a cautionary, reversing action
    actionClass:
      "bg-[#8A6822] text-white hover:bg-[#6D520F] focus:ring-[#E5C97D]",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Confirmation modal for toggling a client's journey status.
 *
 * Rendered by ClientProfileDashboard; all async logic lives in the parent
 * (handleStatusChange) which calls the Tier 2 service and handles toasts.
 * This component is purely presentational — it fires onConfirm / onClose.
 */
export default function StatusConfirmationModal({
  currentStatus,
  clientName,
  onConfirm,
  onClose,
  isLoading = false,
}: StatusConfirmationModalProps) {
  const { title, body, actionLabel, actionClass } = COPY[currentStatus];
  const isReverseTransitionBlocked = currentStatus === "registered";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click only (not on the card itself)
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-[1.75rem] border border-white/50 bg-[#F3F6F0] shadow-[0_24px_60px_rgba(21,56,62,0.28)]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#D7E3D5]">
          <div>
            <h2 className="text-base font-bold text-[#15383E]">{title}</h2>
            <p className="mt-0.5 text-xs text-[#6A8589]">{clientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold text-[#6A8589] transition hover:bg-white hover:text-[#173A40] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-[#31585F]">{body}</p>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full border border-[#BFD0CA] bg-white px-5 py-2 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || isReverseTransitionBlocked}
            className={[
              "rounded-full px-5 py-2 text-sm font-bold shadow-sm transition",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
              actionClass,
            ].join(" ")}
          >
            {isReverseTransitionBlocked
              ? "Already Registered"
              : isLoading
                ? "Updating..."
                : actionLabel}
          </button>
        </div>

      </div>
    </div>
  );
}
