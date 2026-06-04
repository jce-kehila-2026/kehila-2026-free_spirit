"use client";

import type { ClientDoc } from "@/components/clients/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientProgressBannerProps {
  client: ClientDoc;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function isClearedStatus(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim().toLowerCase();
  return v === "approved" || v === "cleared";
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCritical() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}

function IconSuccess() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    </svg>
  );
}

// ─── Reusable badge pill ──────────────────────────────────────────────────────

function MissingPill({
  label,
  dotColor,
  pillStyle,
}: {
  label: string;
  dotColor: string;
  pillStyle: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all",
        pillStyle,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full animate-pulse", dotColor].join(" ")} />
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientProgressBanner({ client }: ClientProgressBannerProps) {
  // ── Critical checks ─────────────────────────────────────────────────────────
  const criticalChecks: { id: string; label: string; isComplete: boolean }[] = [
    {
      id:         "first_name",
      label:      "First Name",
      isComplete: isNonEmpty(client.first_name),
    },
    {
      id:         "last_name",
      label:      "Last Name",
      isComplete: isNonEmpty(client.last_name),
    },
    {
      id:         "dob",
      label:      "Date of Birth",
      isComplete: isNonEmpty(client.dob),
    },
    {
      id:         "passport_number",
      label:      "Passport Number",
      isComplete: isNonEmpty(client.passport_number) || isNonEmpty(client.passport_id),
    },
    {
      id:         "phone",
      label:      "Mobile Phone",
      isComplete: isNonEmpty(client.phone),
    },
    {
      id:         "email",
      label:      "Email Address",
      isComplete: isNonEmpty(client.email),
    },
    {
      id:         "contacts",
      label:      "Emergency Contact",
      isComplete: Array.isArray(client.contacts) && client.contacts.length > 0,
    },
    {
      id:         "medical_clearance",
      label:      "Medical Clearance",
      isComplete: isClearedStatus(client.medical_profile?.medical_clearance_status),
    },
  ];

  // ── Recommended checks ──────────────────────────────────────────────────────
  const recommendedChecks: { id: string; label: string; isComplete: boolean }[] = [
    {
      id:         "visit_waiver_signatures",
      label:      "Visit Waiver Signatures",
      isComplete:
        Array.isArray(client.legal_consents?.visit_waiver_signatures) &&
        client.legal_consents.visit_waiver_signatures.length > 0,
    },
    {
      id:         "favorite_foods",
      label:      "Favorite Foods",
      isComplete: isNonEmpty(client.questionnaire?.favorite_foods),
    },
  ];

  const missingCritical    = criticalChecks.filter((c) => !c.isComplete);
  const missingRecommended = recommendedChecks.filter((c) => !c.isComplete);

  const hasMissingCritical    = missingCritical.length > 0;
  const hasMissingRecommended = missingRecommended.length > 0;

  // ── State 1: Critical items missing (amber/orange warning) ──────────────────
  if (hasMissingCritical) {
    return (
      <div
        id="profile-critical-banner"
        className="group overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-orange-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md"
        role="alert"
        aria-live="polite"
      >
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition-colors group-hover:bg-amber-200">
              <IconCritical />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Action Required: Profile missing critical information.
              </h3>
              <p className="mt-0.5 text-xs font-medium text-amber-800/80">
                These fields are required before this client can be fully registered.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-amber-200 bg-amber-100/60 px-3.5 py-1 text-xs font-extrabold text-amber-800 sm:self-center">
            {missingCritical.length} field{missingCritical.length !== 1 ? "s" : ""} missing
          </span>
        </div>

        {/* Missing pills */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Missing:
          </span>
          <div className="flex flex-wrap gap-2">
            {missingCritical.map((item) => (
              <MissingPill
                key={item.id}
                label={item.label}
                dotColor="bg-amber-500"
                pillStyle="border-amber-200 bg-white/90 text-amber-800 hover:border-amber-300 hover:bg-white"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── State 2: Critical met, recommended items missing (blue/indigo info) ──────
  if (hasMissingRecommended) {
    return (
      <div
        id="profile-recommended-banner"
        className="group overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md"
        role="status"
        aria-live="polite"
      >
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition-colors group-hover:bg-blue-200">
              <IconInfo />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900">
                Basic requirements met! Add these details to strengthen this profile.
              </h3>
              <p className="mt-0.5 text-xs font-medium text-blue-800/80">
                All critical fields are complete. The items below are recommended for a fuller record.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-blue-200 bg-blue-100/60 px-3.5 py-1 text-xs font-extrabold text-blue-800 sm:self-center">
            {missingRecommended.length} recommended
          </span>
        </div>

        {/* Missing pills */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Optional:
          </span>
          <div className="flex flex-wrap gap-2">
            {missingRecommended.map((item) => (
              <MissingPill
                key={item.id}
                label={item.label}
                dotColor="bg-blue-500"
                pillStyle="border-blue-200 bg-white/90 text-blue-800 hover:border-blue-300 hover:bg-white"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── State 3: 100% complete (emerald/teal success) ────────────────────────────
  return (
    <div
      id="profile-complete-banner"
      className="group overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 p-4 shadow-sm transition-all duration-300 hover:shadow-md"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-200">
            <IconSuccess />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">Profile 100% Complete</h3>
            <p className="mt-0.5 text-xs font-medium text-emerald-700/90">
              All critical and recommended fields are filled in. This client record is fully complete.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-end rounded-full border border-emerald-200 bg-emerald-100/70 px-3.5 py-1 text-xs font-bold text-emerald-800 sm:self-center">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Verified Complete
        </span>
      </div>
    </div>
  );
}
