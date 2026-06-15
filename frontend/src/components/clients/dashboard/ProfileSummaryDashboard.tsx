"use client";

import { useState } from "react"; // 1. Added useState
import { toast } from "sonner";
import { IconCheck } from "@/components/ui/Icons";

import TimelineWidget from "@/components/clients/dashboard/TimelineWidget";
import { type ClientDoc } from "@/components/clients/list/ClientList";

// 2. Import Noa's existing form component
import ScheduleMeetingForm from "@/components/Events/ScheduleMeetingForm"; 
import TodoListWidget from "@/components/todos/TodoListWidget";

interface ProfileSummaryDashboardProps {
  client: ClientDoc;
  isArchived: boolean;
  onCreateMeeting?: () => void; // We keep this for backward compatibility, but we won't use it for the button anymore
}

export default function ProfileSummaryDashboard({ client, isArchived }: ProfileSummaryDashboardProps) {
  // 3. UI State for the modal (Tier 1)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

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
                Activity Timeline &amp; Progress Tracking
              </h3>
              <p className="mt-1 text-sm text-[#6A8589]">
                Client journey milestones and recorded events
              </p>
            </div>
          </div>
          <div className="flex-1">
            <TimelineWidget clientId={client.id} />
          </div>
        </div>

        {/* ── Right rail (col-span-1): Actions + Todos stacked ── */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          
          {/* Action Buttons card */}
          <div className="rounded-[1.5rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
            <h3 className="mb-1 text-lg font-bold text-[#15383E]">Quick actions</h3>
            <p className="mb-4 text-sm text-[#6A8589]">Continue the client workflow.</p>
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
                onClick={() => toast.info("Reminder feature coming soon!")}
                className="w-full rounded-full border border-[#D7E3D5] bg-white px-4 py-2.5 text-sm font-bold text-[#31585F] transition-colors hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:bg-[#F7FAF5] disabled:text-[#8BA0A3]"
              >
                Add Reminder
              </button>
              <button
                type="button"
                disabled={isArchived}
                onClick={() => toast.info("Email client feature coming soon!")}
                className="w-full rounded-full border border-[#D7E3D5] bg-white px-4 py-2.5 text-sm font-bold text-[#31585F] transition-colors hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:bg-[#F7FAF5] disabled:text-[#8BA0A3]"
              >
                Send Email
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

      {/* 5. The Modal Overlay (Only renders when isMeetingModalOpen is true) */}
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
                 // Optional: if Noa's form has an onSuccess or onClose prop, hook it up here so the modal closes automatically!
                 onClose={() => setIsMeetingModalOpen(false)} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
