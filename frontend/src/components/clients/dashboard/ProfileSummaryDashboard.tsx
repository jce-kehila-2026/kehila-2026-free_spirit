"use client";

import { useState } from "react";
import { IconCheck } from "@/components/ui/Icons";

import TimelineWidget from "@/components/clients/dashboard/TimelineWidget";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import { createNoteEvent } from "@/firebase/clientEventsService";
import { getTodayString, getCurrentTimeString } from "@/utils/dateUtils";

// Import Noa's existing form component
import ScheduleMeetingForm from "@/components/Events/ScheduleMeetingForm";
import TodoListWidget from "@/components/todos/TodoListWidget";
import ProgramAssignmentModal from "@/components/clients/dashboard/ProgramAssignmentModal";

interface ProfileSummaryDashboardProps {
  client: ClientDoc;
  isArchived: boolean;
  onCreateMeeting?: () => void; // We keep this for backward compatibility, but we won't use it for the button anymore
}

export default function ProfileSummaryDashboard({ client, isArchived }: ProfileSummaryDashboardProps) {
  // ── UI State (Tier 1) ────────────────────────────────────────────────────────
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);

  const todayStr = getTodayString();
  const currentTimeStr = getCurrentTimeString();

  // ── Note entry state ─────────────────────────────────────────────────────
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDate, setNoteDate] = useState(todayStr);
  const [noteTime, setNoteTime] = useState(currentTimeStr);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Incrementing this prop triggers a data refetch in TimelineWidget
  // without remounting the component (no loading flash).
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);

  // ── Note submit handler ──────────────────────────────────────────────────
  async function handleSaveNote() {
    const trimmedContent = noteContent.trim();
    if (!trimmedContent) return;

    if (noteDate > todayStr) {
      alert("You cannot log a note for a future date.");
      return;
    }

    setIsSavingNote(true);
    try {
      const clientName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
      await createNoteEvent(client.id, clientName, trimmedContent, noteTitle.trim(), noteDate, noteTime);
      // Close the modal and clear draft
      closeNoteModal();
      // Trigger TimelineWidget refetch
      setTimelineRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("[ProfileSummaryDashboard] handleSaveNote failed:", err);
    } finally {
      setIsSavingNote(false);
    }
  }

  function closeNoteModal() {
    setIsNoteModalOpen(false);
    setNoteContent("");
    setNoteTitle("");
    setNoteDate(todayStr);
    setNoteTime(currentTimeStr);
  }

  if (!client) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* ── Alert banner (full-width) ── */}
        <div className="flex items-center gap-4 rounded-[1.5rem] border border-[#C5DDC0] bg-[#E5F0E2] px-5 py-4 shadow-sm lg:col-span-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#3F7763]">
            <IconCheck className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#31585F]">
              Quick Glance Alerts &amp; Notifications
            </p>
            <p className="mt-1 text-xs leading-5 text-[#527078]">
              All core client documents are currently up to date. No pending actions required.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#3F7763] ring-1 ring-[#C5DDC0] sm:inline-flex">
            All Clear
          </span>
        </div>

        {/* ── Timeline card (col-span-2) ── */}
        <div className="flex flex-col rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(44,105,117,0.08)] sm:p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold tracking-[-0.02em] text-[#15383E]">
                Activity Timeline
              </h3>
            </div>
          </div>

          <div className="flex-1">
            <TimelineWidget
              clientId={client.id}
              refreshTrigger={timelineRefreshKey}
            />
          </div>
        </div>

        {/* ── Right rail (col-span-1): Actions + Todos stacked ── */}
        <div className="flex flex-col gap-4 lg:col-span-1">

          {/* Timeline Actions card */}
          <div className="rounded-[1.5rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
            <h3 className="mb-1 text-lg font-bold text-[#15383E]">Timeline Actions</h3>
            <p className="mb-4 text-sm text-[#6A8589]">Add events and notes to this client&apos;s timeline.</p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isArchived}
                onClick={() => setIsMeetingModalOpen(true)}
                className="w-full rounded-full bg-[#245C66] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#173A40] disabled:cursor-not-allowed disabled:bg-[#E4ECE2] disabled:text-[#8BA0A3]"
              >
                Create Meeting
              </button>
              <button
                type="button"
                disabled={isArchived}
                onClick={() => setIsNoteModalOpen(true)}
                className="w-full rounded-full border border-[#D7E3D5] bg-white px-4 py-2.5 text-sm font-bold text-[#31585F] transition-colors hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:bg-[#F7FAF5] disabled:text-[#8BA0A3]"
              >
                Add Note
              </button>
              <button
                type="button"
                disabled={isArchived}
                onClick={() => setIsProgramModalOpen(true)}
                className="w-full rounded-full border border-[#D7E3D5] bg-white px-4 py-2.5 text-sm font-bold text-[#31585F] transition-colors hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:bg-[#F7FAF5] disabled:text-[#8BA0A3]"
              >
                Assign Program
              </button>
            </div>
          </div>

          {/* Client Tasks / Todo List Widget */}
          <TodoListWidget
            clientId={client.id}
            title="Client Tasks"
          />

        </div>
      </div>

      {/* Meeting Modal Overlay */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-white/50 bg-[#F3F6F0] shadow-[0_24px_60px_rgba(21,56,62,0.28)]">

            {/* Close Button */}
            <div className="sticky top-0 z-10 flex justify-end bg-[#F3F6F0] p-4 pb-0">
              <button
                onClick={() => setIsMeetingModalOpen(false)}
                className="rounded-full px-3 py-1 text-xl font-bold text-[#6A8589] transition hover:bg-white hover:text-[#173A40]"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="p-6 pt-2">
              {/* Noa's Component - we pass the client details directly into it! */}
              <ScheduleMeetingForm
                clientId={client.id}
                clientName={`${client.first_name} ${client.last_name}`}
                onClose={() => {
                  setIsMeetingModalOpen(false);
                  setTimelineRefreshKey((k) => k + 1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Note Modal Overlay */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

            {/* Modal Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#15383E]">Add Timeline Note</h2>
              <button
                type="button"
                onClick={closeNoteModal}
                disabled={isSavingNote}
                className="flex h-7 w-7 items-center justify-center rounded-full text-lg font-bold text-[#6A8589] transition hover:bg-slate-100 hover:text-[#173A40] disabled:opacity-50"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Date + Time row */}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#527078]">Date</label>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  max={todayStr}
                  disabled={isSavingNote}
                  className="w-full rounded-xl border border-[#BFD0CA] bg-[#FAFAFA] px-3 py-2 text-sm text-[#31585F] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#527078]">Time</label>
                <input
                  type="time"
                  value={noteTime}
                  onChange={(e) => setNoteTime(e.target.value)}
                  disabled={isSavingNote}
                  className="w-full rounded-xl border border-[#BFD0CA] bg-[#FAFAFA] px-3 py-2 text-sm text-[#31585F] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </div>

            {/* Title input */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-bold text-[#527078]">Title (Optional)</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Follow-up notes, Call notes..."
                disabled={isSavingNote}
                className="w-full rounded-xl border border-[#BFD0CA] bg-[#FAFAFA] px-4 py-2 text-sm text-[#31585F] outline-none transition placeholder:text-[#829497] focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            {/* Content textarea */}
            <div className="mb-5">
              <label className="mb-1 block text-xs font-bold text-[#527078]">Note Content</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Paste a message or write a client update here..."
                rows={5}
                disabled={isSavingNote}
                className="w-full resize-y rounded-xl border border-[#BFD0CA] bg-[#FAFAFA] px-4 py-3 text-sm leading-6 text-[#31585F] outline-none transition placeholder:text-[#829497] focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeNoteModal}
                disabled={isSavingNote}
                className="rounded-full border border-[#BFD0CA] bg-white px-4 py-1.5 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteContent.trim()}
                className="rounded-full bg-[#2C6975] px-5 py-1.5 text-sm font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program Assignment Modal */}
      {isProgramModalOpen && (
        <ProgramAssignmentModal
          clientId={client.id}
          programIds={client.program_ids ?? []}
          onClose={() => setIsProgramModalOpen(false)}
        />
      )}
    </>
  );
}
