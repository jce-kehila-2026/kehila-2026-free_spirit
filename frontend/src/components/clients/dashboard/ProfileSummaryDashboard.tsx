"use client";

import { useState } from "react"; // 1. Added useState
import { toast } from "sonner";
import { IconCheck, IconCalendar } from "@/components/ui/Icons";

import TimelineWidget from "@/components/clients/dashboard/TimelineWidget";
import { type ClientDoc } from "@/components/clients/list/ClientList";

// 2. Import Noa's existing form component
import ScheduleMeetingForm from "@/components/Events/ScheduleMeetingForm"; 

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Alert banner (full-width) ── */}
        <div className="lg:col-span-3 flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <IconCheck className="h-5 w-5 text-emerald-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">
              Quick Glance Alerts &amp; Notifications
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              All core client documents are currently up to date. No pending actions required.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            All Clear
          </span>
        </div>

        {/* ── Timeline card (col-span-2) ── */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Activity Timeline &amp; Progress Tracking
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Client journey milestones and recorded events
              </p>
            </div>
          </div>
          <div className="flex-1">
            <TimelineWidget clientId={client.id} />
          </div>
        </div>

        {/* ── Right rail (col-span-1): Actions + Meetings stacked ── */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Action Buttons card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isArchived}
                onClick={() => setIsMeetingModalOpen(true)} // 4. Open modal instead of navigating!
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold shadow-sm"
              >
                Create Meeting
              </button>
              <button
                type="button"
                disabled={isArchived}
                onClick={() => toast.info("Reminder feature coming soon!")}
                className="w-full py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-lg transition-colors text-sm font-medium"
              >
                Add Reminder
              </button>
              <button
                type="button"
                disabled={isArchived}
                onClick={() => toast.info("Email client feature coming soon!")}
                className="w-full py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 rounded-lg transition-colors text-sm font-medium"
              >
                Send Email
              </button>
            </div>
          </div>

          {/* Recent Meetings & Logs card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Recent Meetings &amp; Logs
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interaction history
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                <IconCalendar className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1">No meetings logged</p>
              <p className="text-xs text-slate-500 text-center px-4">Click &lsquo;Create Meeting&rsquo; above to schedule or log an interaction.</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* 5. The Modal Overlay (Only renders when isMeetingModalOpen is true) */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
            
            {/* Close Button */}
            <div className="sticky top-0 z-10 flex justify-end p-4 pb-0 bg-slate-50">
               <button 
                 onClick={() => setIsMeetingModalOpen(false)}
                 className="text-slate-400 hover:text-slate-700 font-bold text-xl px-2 rounded-md hover:bg-slate-200 transition"
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