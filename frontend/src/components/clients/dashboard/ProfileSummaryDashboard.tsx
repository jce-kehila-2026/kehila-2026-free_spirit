"use client";

import { toast } from "sonner";
import { IconCheck, IconClock, IconCalendar } from "@/components/ui/Icons";

interface ProfileSummaryDashboardProps {
  isArchived: boolean;
  /** Called when the user clicks "Create Meeting". Provided by the parent to keep routing logic out of this presentation component. */
  onCreateMeeting?: () => void;
}

export default function ProfileSummaryDashboard({ isArchived, onCreateMeeting }: ProfileSummaryDashboardProps) {
  return (
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
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm p-6">
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

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-10">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
            <IconClock className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">No activity recorded yet</p>
          <p className="text-xs text-slate-500 text-center px-4">Timeline updates will appear automatically as actions are taken.</p>
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
              onClick={onCreateMeeting}
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

          {/* Empty state */}
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
  );
}