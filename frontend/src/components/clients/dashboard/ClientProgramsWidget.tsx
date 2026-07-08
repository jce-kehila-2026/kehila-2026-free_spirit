"use client";

import { useState, useRef, useEffect } from "react";
import { useClientPrograms } from "@/application/useClientPrograms";
import { IconPlus } from "@/components/ui/Icons";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientProgramsWidgetProps {
  /** The Firestore document ID of the client. */
  clientId: string;
  /**
   * The client's current `program_ids` array.
   * Defaults to `[]` so legacy client docs without this field don't crash.
   */
  programIds?: string[];
}

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

function IconSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-indigo-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}

function IconXMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function IconGridSquares() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-6 w-6 text-slate-400"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  );
}

// ─── Tier 1: UI Component ─────────────────────────────────────────────────────

/**
 * Displays the programs a client is enrolled in and provides controls
 * to assign or remove them from programs.
 *
 * UX pattern for removal:
 *   1st click on × → row enters inline confirmation state ("Remove? Yes • No")
 *   Click "Yes"    → triggers atomic writeBatch deletion
 *   Click "No"     → row resets to normal view
 *   Click anywhere outside the confirming row → row resets to normal view
 *
 * Usage:
 *   <ClientProgramsWidget
 *     clientId={client.id}
 *     programIds={client.program_ids ?? []}
 *   />
 */
export default function ClientProgramsWidget({
  clientId,
  programIds = [],
}: ClientProgramsWidgetProps) {
  const { enrolledPrograms, availablePrograms, isLoading, error, assign, remove } =
    useClientPrograms(clientId, programIds);

  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // ── Inline confirmation state ─────────────────────────────────────────────
  // Stores the ID of the program row currently showing the "Remove? Yes • No" prompt.
  // Only one row can be in confirming state at a time.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Ref attached to the confirming row's action area so we can detect outside clicks.
  const confirmingRef = useRef<HTMLDivElement | null>(null);

  // Dismiss the confirmation when the user clicks anywhere outside the confirming row.
  useEffect(() => {
    if (!confirmingId) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        confirmingRef.current &&
        !confirmingRef.current.contains(e.target as Node)
      ) {
        setConfirmingId(null);
      }
    };

    // Use mousedown so dismissal fires before any other click handlers
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [confirmingId]);

  const enrolledCount = enrolledPrograms.length;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!selectedProgramId || isAssigning) return;
    setIsAssigning(true);
    await assign(selectedProgramId);
    setSelectedProgramId("");
    setIsAssigning(false);
  };

  /** First click: enter confirming state. Does NOT trigger deletion yet. */
  const handleRemoveRequest = (programId: string) => {
    setConfirmingId(programId);
  };

  /** Second click ("Yes"): execute the atomic batch write. */
  const handleRemoveConfirm = async (programId: string) => {
    setConfirmingId(null);
    await remove(programId);
    if (selectedProgramId === programId) {
      setSelectedProgramId("");
    }
  };

  /** "No" click or outside click: cancel and reset the row. */
  const handleRemoveCancel = () => {
    setConfirmingId(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Client&apos;s Programs
          </h2>
          {enrolledCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
              {enrolledCount}
            </span>
          )}
        </div>
        {isLoading && <IconSpinner />}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── Enrolled Programs List ── */}
      <div className="flex-1 overflow-y-auto max-h-52">
        {!isLoading && enrolledCount === 0 ? (

          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center bg-slate-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <IconGridSquares />
            </div>
            <p className="text-sm font-medium text-slate-500">
              No programs assigned
            </p>
            <p className="text-xs text-slate-400">
              Use the dropdown below to enroll this client.
            </p>
          </div>

        ) : (
          <ul role="list" className="divide-y divide-slate-100">
            {enrolledPrograms.map((program) => {
              const isConfirming = confirmingId === program.id;

              return (
                <li
                  key={program.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80"
                >
                  {/* ── Program color dot ── */}
                  <span
                    className="flex-none h-2 w-2 rounded-full bg-indigo-400 shrink-0"
                    aria-hidden="true"
                  />

                  {/* ── Program Name ── */}
                  <span className="flex-1 text-sm leading-relaxed text-slate-800 break-words min-w-0">
                    {program.name}
                  </span>

                  {/* ── Action Area: toggles between remove button and confirmation prompt ── */}
                  <div ref={isConfirming ? confirmingRef : null} className="flex-none flex items-center">

                    {isConfirming ? (
                      /* ── Inline Confirmation Prompt ── */
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-slate-500 font-medium select-none">
                          Remove?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveConfirm(program.id)}
                          aria-label={`Confirm removal from ${program.name}`}
                          className="font-semibold text-red-500 hover:text-red-700 transition-colors focus:outline-none focus-visible:underline"
                        >
                          Yes
                        </button>
                        <span className="text-slate-300 select-none">•</span>
                        <button
                          type="button"
                          onClick={handleRemoveCancel}
                          aria-label="Cancel removal"
                          className="font-semibold text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:underline"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      /* ── Remove Button (always visible, muted until hovered) ── */
                      <button
                        type="button"
                        onClick={() => handleRemoveRequest(program.id)}
                        aria-label={`Remove from program: ${program.name}`}
                        className={[
                          "rounded-md p-1.5",
                          // Always visible at a muted slate — discoverable but not loud
                          "text-slate-300",
                          // On hover: shift to red to signal destructive intent
                          "hover:bg-red-50 hover:text-red-400",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
                          "transition-colors duration-150",
                        ].join(" ")}
                      >
                        <IconXMark />
                      </button>
                    )}

                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Assign New Program ── */}
      {/* Only rendered when there are un-enrolled programs remaining */}
      {!isLoading && availablePrograms.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            disabled={isAssigning}
            aria-label="Select a program to assign"
            id={`program-select-${clientId}`}
            className={[
              "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2",
              "text-sm",
              !selectedProgramId ? "text-slate-400" : "text-slate-800",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "transition-shadow",
            ].join(" ")}
          >
            <option value="" disabled>
              Assign to program…
            </option>
            {availablePrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAssign}
            disabled={!selectedProgramId || isAssigning}
            aria-label="Assign client to selected program"
            className={[
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2",
              "text-sm font-semibold text-white bg-indigo-600 shadow-sm",
              "hover:bg-indigo-700 active:bg-indigo-800",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-150",
            ].join(" ")}
          >
            {isAssigning ? <IconSpinner /> : <IconPlus className="h-4 w-4" />}
            Add
          </button>
        </div>
      )}

      {/* ── All-enrolled footer note ── */}
      {!isLoading && availablePrograms.length === 0 && enrolledCount > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5 text-center">
          <p className="text-xs text-slate-400">
            Client is enrolled in all available programs.
          </p>
        </div>
      )}

    </div>
  );
}
