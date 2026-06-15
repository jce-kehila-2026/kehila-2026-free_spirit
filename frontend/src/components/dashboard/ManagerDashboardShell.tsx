"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare2,
  CircleDashed,
  Clock3,
  FolderKanban,
  HeartPulse,
  MapPin,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { z } from "zod";

import { db } from "@/firebase/firebase";
import {
  basicInfoSchema,
  CLIENT_STATUS,
  DOCUMENT_STATUS_OPTIONS,
  MEDICAL_CLEARANCE_STATUS,
} from "@/schema/clientSchema";

const prospectSchema = basicInfoSchema
  .pick({
    first_name: true,
    last_name: true,
    email: true,
    phone: true,
    status: true,
  })
  .extend({
    created_at: z.instanceof(Timestamp).optional(),
    is_archived: z.boolean().optional(),
  });

interface Prospect extends z.infer<typeof prospectSchema> {
  id: string;
}

const dashboardEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.literal("scheduled"),
  clientName: z.string().trim().max(200).optional().or(z.literal("")),
  is_archived: z.boolean().optional(),
  archived: z.boolean().optional(),
});

interface DashboardEvent extends z.infer<typeof dashboardEventSchema> {
  id: string;
  scheduledAt: Date;
}

const prospectsLoadError =
  "We could not load interested prospects. Please refresh and try again.";
const clientOverviewLoadError =
  "We could not load the client overview. Please refresh and try again.";
const meetingsLoadError =
  "We could not load upcoming meetings. Please refresh and try again.";
const programsLoadError =
  "We could not load programs. Please refresh and try again.";

const optionalDashboardString = z.string().trim().max(500).optional().or(z.literal(""));

const dashboardClientSchema = z.object({
  first_name: z.string().trim().min(1).max(50),
  last_name: z.string().trim().min(1).max(50),
  status: z.enum(CLIENT_STATUS),
  is_archived: z.boolean().optional(),
  dob: optionalDashboardString,
  phone: optionalDashboardString,
  passport_id: optionalDashboardString,
  passport_number: optionalDashboardString,
  client_documents: z
    .array(
      z.object({
        status: z.enum(DOCUMENT_STATUS_OPTIONS),
      }).passthrough(),
    )
    .optional(),
  medical_profile: z
    .object({
      medical_clearance_status: z
        .enum(MEDICAL_CLEARANCE_STATUS)
        .optional()
        .or(z.literal("")),
      insurance_company: optionalDashboardString,
      medications: optionalDashboardString,
      allergies: optionalDashboardString,
      healthcare_providers: z.array(z.unknown()).optional(),
    })
    .optional(),
});

interface DashboardClientAttention {
  id: string;
  name: string;
  gaps: string[];
}

interface ClientOverview {
  registeredCount: number;
  incompleteProfileCount: number;
  missingActiveDocumentsCount: number;
  medicalAttentionCount: number;
  attentionClients: DashboardClientAttention[];
}

interface DashboardProgram {
  id: string;
  name: string;
  location: string;
  participantCount: number | null;
  startDate: Date | null;
  endDate: Date | null;
}

const emptyClientOverview: ClientOverview = {
  registeredCount: 0,
  incompleteProfileCount: 0,
  missingActiveDocumentsCount: 0,
  medicalAttentionCount: 0,
  attentionClients: [],
};

function formatDate(timestamp?: Timestamp) {
  if (!timestamp) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(timestamp.toDate());
}

function parseEventDateTime(date: string, time: string) {
  const scheduledAt = new Date(`${date}T${time}`);

  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}

function formatMeetingDateTime(scheduledAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(scheduledAt);
}

/**
 * Normalizes the date shapes already stored by the Programs workflows.
 * Invalid or missing values stay null so they cannot exclude a program.
 */
function parseProgramDate(value: unknown) {
  let date: Date | null = null;

  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (value instanceof Timestamp) {
    date = value.toDate();
  } else if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    date = new Date(value);
  } else if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const timestampLikeDate = value.toDate();
    date = timestampLikeDate instanceof Date ? timestampLikeDate : null;
  }

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatProgramDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatProgramDateRange(program: DashboardProgram) {
  if (program.startDate && program.endDate) {
    return `${formatProgramDate(program.startDate)} - ${formatProgramDate(program.endDate)}`;
  }

  if (program.startDate) {
    return `Starts ${formatProgramDate(program.startDate)}`;
  }

  if (program.endDate) {
    return `Ends ${formatProgramDate(program.endDate)}`;
  }

  return "Dates not available";
}

function ProspectsLoadingState() {
  return (
    <div
      className="space-y-3 px-5 py-6 sm:px-7"
      role="status"
      aria-label="Loading interested prospects"
    >
      {[0, 1, 2].map((item) => (
        <div
          className="h-14 animate-pulse rounded-2xl bg-[#EEF4EC]"
          key={item}
        />
      ))}
      <span className="sr-only">Loading interested prospects...</span>
    </div>
  );
}

interface DashboardCardCtaProps {
  href: string;
  label: string;
}

/**
 * Keeps dashboard navigation actions visually and positionally consistent.
 */
function DashboardCardCta({ href, label }: DashboardCardCtaProps) {
  return (
    <div className="mt-auto border-t border-[#D7E3D5] bg-[#F7FAF5] px-5 py-3.5 sm:px-7">
      <Link
        className="group inline-flex items-center gap-2 rounded-full bg-[#E5F0E2] px-4 py-2 text-sm font-bold text-[#245C66] ring-1 ring-[#D0E1CD] transition hover:bg-[#D8E9D5] hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] focus-visible:ring-offset-2"
        href={href}
      >
        {label}
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

interface PlaceholderSummaryCardProps {
  title: string;
  description: string;
  emptyStateTitle: string;
  emptyStateHelper: string;
  variant: "blue" | "green";
  href?: string;
  linkLabel?: string;
}

/**
 * Presents a future dashboard integration without implying that live data is
 * already available, while keeping it visually equal to connected cards.
 */
function PlaceholderSummaryCard({
  title,
  description,
  emptyStateTitle,
  emptyStateHelper,
  variant,
  href,
  linkLabel,
}: PlaceholderSummaryCardProps) {
  const isBlue = variant === "blue";
  const Icon = isBlue ? CheckSquare2 : FolderKanban;

  return (
    <section
      className="flex min-h-64 flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] shadow-[0_14px_34px_rgba(44,105,117,0.08)]"
    >
      <div className="flex flex-1 flex-col p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              isBlue
                ? "bg-[#DCEBEF] text-[#2C6975]"
                : "bg-[#DCEAD6] text-[#3F7763]"
            }`}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9DDE1] bg-[#EEF5F7] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#527078]">
            <CircleDashed aria-hidden="true" className="h-3.5 w-3.5" />
            Coming soon
          </span>
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-[-0.02em] text-[#15383E]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#5C7478]">{description}</p>

        {/* A titled empty state makes the disconnected feature feel intentional. */}
        <div className="mt-auto pt-5">
          <div
            className={`rounded-2xl border border-dashed px-4 py-4 text-sm font-semibold leading-6 ${
              isBlue
                ? "border-[#B9CFD5] bg-[#EEF5F7] text-[#527078]"
                : "border-[#B9CFCA] bg-[#EEF4EC] text-[#5C7478]"
            }`}
          >
            <p className="font-bold text-[#31585F]">{emptyStateTitle}</p>
            <p className="mt-1 font-normal leading-5 text-[#607B80]">
              {emptyStateHelper}
            </p>
          </div>
        </div>
      </div>
      {href && linkLabel && (
        <DashboardCardCta href={href} label={linkLabel} />
      )}
    </section>
  );
}

interface UpcomingMeetingsCardProps {
  meetings: DashboardEvent[];
  isLoading: boolean;
  errorMessage: string;
}

/**
 * Renders the dashboard-safe meeting projection without exposing notes,
 * reminder settings, calendar identifiers, or other event metadata.
 */
function UpcomingMeetingsCard({
  meetings,
  isLoading,
  errorMessage,
}: UpcomingMeetingsCardProps) {
  const nextMeetings = meetings.slice(0, 3);

  return (
    <section
      className="flex min-h-64 flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] shadow-[0_14px_34px_rgba(44,105,117,0.08)]"
      aria-labelledby="upcoming-meetings-title"
    >
      <div className="border-b border-[#D7E3D5] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
              Schedule
            </p>
            <h2
              className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#15383E]"
              id="upcoming-meetings-title"
            >
              Upcoming meetings
            </h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E6E4F5] text-[#625B91]">
            <CalendarDays aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-5 flex items-end gap-3">
          <p className="text-4xl font-bold tracking-[-0.04em] text-[#15383E]">
            {isLoading || errorMessage ? "..." : meetings.length}
          </p>
          <p className="pb-1 text-sm text-[#6A8589]">
            {meetings.length === 1 ? "meeting ahead" : "meetings ahead"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-5 py-6 sm:px-7" role="status">
          {[0, 1, 2].map((item) => (
            <div
              className="h-12 animate-pulse rounded-2xl bg-[#EEF4EC]"
              key={item}
            />
          ))}
          <span className="sr-only">Loading upcoming meetings...</span>
        </div>
      ) : errorMessage ? (
        <div className="px-5 py-8 sm:px-7">
          <p className="text-sm font-semibold text-red-700" role="alert">
            {errorMessage}
          </p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="px-5 py-8 sm:px-7">
          <p className="text-sm font-semibold text-[#31585F]">
            No upcoming meetings
          </p>
          <p className="mt-1 text-sm text-[#6A8589]">
            Scheduled meetings will appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E4ECE2] px-5 sm:px-7">
          {nextMeetings.map((meeting) => (
            <li className="flex gap-3 py-4" key={meeting.id}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF4EC] text-[#4E807F]">
                <Clock3 aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#173A40]" dir="auto">
                  {meeting.title}
                </p>
                <p className="mt-1 text-[13px] font-medium leading-5 text-[#607B80]">
                  {formatMeetingDateTime(meeting.scheduledAt)}
                </p>
                {meeting.clientName && (
                  <p
                    className="mt-0.5 truncate text-[13px] leading-5 text-[#607B80]"
                    dir="auto"
                  >
                    Participant: {meeting.clientName}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DashboardCardCta href="/events" label="Open events" />
    </section>
  );
}

interface ProgramsSummaryCardProps {
  programs: DashboardProgram[];
  isLoading: boolean;
  errorMessage: string;
}

/**
 * Summarizes current and upcoming programs using the established end-date
 * definition. The preview contains only non-sensitive program metadata.
 */
function ProgramsSummaryCard({
  programs,
  isLoading,
  errorMessage,
}: ProgramsSummaryCardProps) {
  const previewPrograms = programs.slice(0, 3);

  return (
    <section
      className="flex min-h-64 flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] shadow-[0_14px_34px_rgba(44,105,117,0.08)]"
      aria-labelledby="programs-summary-title"
    >
      <div className="border-b border-[#D7E3D5] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
              Programs
            </p>
            <h2
              className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#15383E]"
              id="programs-summary-title"
            >
              Current &amp; upcoming programs
            </h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DCEAD6] text-[#3F7763]">
            <FolderKanban aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <p className="text-4xl font-bold tracking-[-0.04em] text-[#15383E]">
            {isLoading || errorMessage ? "..." : programs.length}
          </p>
          <p className="pb-1 text-sm font-medium text-[#5C7478]">
            {programs.length === 1 ? "program in motion" : "programs in motion"}
          </p>
        </div>
        <p className="mt-1.5 text-sm text-[#6A8589]">
          Current and upcoming programs
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-5 py-6 sm:px-7" role="status">
          {[0, 1, 2].map((item) => (
            <div
              className="h-14 animate-pulse rounded-2xl bg-[#EEF4EC]"
              key={item}
            />
          ))}
          <span className="sr-only">Loading programs...</span>
        </div>
      ) : errorMessage ? (
        <div className="px-5 py-8 sm:px-7">
          <p className="text-sm font-semibold text-red-700" role="alert">
            {errorMessage}
          </p>
        </div>
      ) : programs.length === 0 ? (
        <div className="px-5 py-8 sm:px-7">
          <p className="text-sm font-semibold text-[#31585F]">
            No current or upcoming programs
          </p>
          <p className="mt-1 text-sm text-[#6A8589]">
            Programs will appear here when they are scheduled.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E4ECE2] px-5 sm:px-7">
          {previewPrograms.map((program) => (
            <li className="py-3.5" key={program.id}>
              <p className="truncate font-semibold text-[#173A40]" dir="auto">
                {program.name}
              </p>
              <p className="mt-1 text-[13px] font-medium leading-5 text-[#607B80]">
                {formatProgramDateRange(program)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-5 text-[#607B80]">
                {program.location && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate" dir="auto">
                      {program.location}
                    </span>
                  </span>
                )}
                {program.participantCount !== null && (
                  <span className="inline-flex items-center gap-1">
                    <UsersRound
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    />
                    {program.participantCount} participants
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DashboardCardCta href="/programs" label="View programs" />
    </section>
  );
}

interface ClientOverviewCardProps {
  overview: ClientOverview;
  isLoading: boolean;
  errorMessage: string;
}

/**
 * Shows aggregate onboarding gaps and minimal client identifiers only.
 * Medical, legal, document, and contact details never enter component state.
 */
function ClientOverviewCard({
  overview,
  isLoading,
  errorMessage,
}: ClientOverviewCardProps) {
  return (
    <section
      className="flex min-h-64 flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] shadow-[0_14px_34px_rgba(44,105,117,0.08)]"
      aria-labelledby="client-overview-title"
    >
      <div className="border-b border-[#D7E3D5] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
              Onboarding health
            </p>
            <h2
              className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#15383E]"
              id="client-overview-title"
            >
              Client Overview &amp; Missing Items
            </h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5E9CF] text-[#8A6B25]">
            <HeartPulse aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-5 flex items-end gap-3">
          <p className="text-4xl font-bold tracking-[-0.04em] text-[#15383E]">
            {isLoading || errorMessage ? "..." : overview.registeredCount}
          </p>
          <p className="pb-1 text-sm text-[#6A8589]">
            active registered clients
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-5 py-6 sm:px-7" role="status">
          {[0, 1, 2].map((item) => (
            <div
              className="h-10 animate-pulse rounded-2xl bg-[#EEF4EC]"
              key={item}
            />
          ))}
          <span className="sr-only">Loading client overview...</span>
        </div>
      ) : errorMessage ? (
        <div className="px-5 py-8 sm:px-7">
          <p className="text-sm font-semibold text-red-700" role="alert">
            {errorMessage}
          </p>
        </div>
      ) : overview.registeredCount === 0 ? (
        <div className="px-5 py-8 sm:px-7">
          <p className="text-sm font-semibold text-[#31585F]">
            No active registered clients
          </p>
          <p className="mt-1 text-sm text-[#6A8589]">
            Client onboarding summaries will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="px-5 py-5 sm:px-7">
          <dl className="grid gap-2 text-center sm:grid-cols-3">
            <div className="flex min-h-24 flex-col rounded-2xl border border-[#F1D6D0] bg-[#FFF2EF] px-3 py-3">
              <dt className="flex min-h-8 items-center justify-center text-xs font-semibold text-[#9A5549]">
                Incomplete profiles
              </dt>
              <dd className="mt-auto pt-2 text-xl font-bold text-[#9A5549]">
                {overview.incompleteProfileCount}
              </dd>
            </div>
            <div className="flex min-h-24 flex-col rounded-2xl border border-[#EBDDB5] bg-[#FFF8E8] px-3 py-3">
              <dt className="flex min-h-8 items-center justify-center text-xs font-semibold text-[#80691B]">
                No active documents
              </dt>
              <dd className="mt-auto pt-2 text-xl font-bold text-[#80691B]">
                {overview.missingActiveDocumentsCount}
              </dd>
            </div>
            <div className="flex min-h-24 flex-col rounded-2xl border border-[#C9DEE2] bg-[#EEF5F7] px-3 py-3">
              <dt className="flex min-h-8 items-center justify-center text-xs font-semibold text-[#376B75]">
                Health review
              </dt>
              <dd className="mt-auto pt-2 text-xl font-bold text-[#376B75]">
                {overview.medicalAttentionCount}
              </dd>
            </div>
          </dl>

          {overview.attentionClients.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-[#E8F3E5] px-4 py-3 text-sm font-semibold text-[#3F7763]">
              No onboarding gaps require attention.
            </p>
          ) : (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-[#173A40]">
                Needs attention
              </h3>
              <ul className="mt-2 divide-y divide-[#E4ECE2]">
                {overview.attentionClients.map((client) => (
                  <li className="py-2.5" key={client.id}>
                    <p
                      className="truncate text-sm font-semibold text-[#31585F]"
                      dir="auto"
                    >
                      {client.name}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] leading-5 text-[#607B80]">
                      {client.gaps.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <DashboardCardCta href="/clients" label="Review clients" />
    </section>
  );
}

/**
 * Manager dashboard view for the onboarding team.
 * Subscribes to prospects, meetings, and aggregate client onboarding signals.
 */
export default function ManagerDashboardShell() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(db));
  const [errorMessage, setErrorMessage] = useState(() =>
    db ? "" : prospectsLoadError,
  );
  const [meetings, setMeetings] = useState<DashboardEvent[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(Boolean(db));
  const [meetingsErrorMessage, setMeetingsErrorMessage] = useState(() =>
    db ? "" : meetingsLoadError,
  );
  const [programs, setPrograms] = useState<DashboardProgram[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(Boolean(db));
  const [programsErrorMessage, setProgramsErrorMessage] = useState(() =>
    db ? "" : programsLoadError,
  );
  const [clientOverview, setClientOverview] =
    useState<ClientOverview>(emptyClientOverview);
  const [isLoadingClientOverview, setIsLoadingClientOverview] =
    useState(Boolean(db));
  const [clientOverviewErrorMessage, setClientOverviewErrorMessage] =
    useState(() => (db ? "" : clientOverviewLoadError));
  const newestProspects = prospects.slice(0, 3);

  useEffect(() => {
    if (!db) {
      return;
    }

    const activeDb = db;

    // The status predicate limits the live query to the prospect workflow.
    const prospectsQuery = query(
      collection(activeDb, "clients"),
      where("status", "==", "interested"),
    );

    return onSnapshot(
      prospectsQuery,
      (snapshot) => {
        const nextProspects = snapshot.docs
          .map((prospectDocument) => {
            // Validate Firestore data before rendering private contact details.
            const parsedProspect = prospectSchema.safeParse(
              prospectDocument.data(),
            );

            return parsedProspect.success
              ? { id: prospectDocument.id, ...parsedProspect.data }
              : null;
          })
          .filter(
            (prospect): prospect is Prospect =>
              prospect !== null && prospect.is_archived !== true,
          )
          .sort(
            (firstProspect, secondProspect) =>
              (secondProspect.created_at?.toMillis() ?? 0) -
              (firstProspect.created_at?.toMillis() ?? 0),
          );

        setProspects(nextProspects);
        setErrorMessage("");
        setIsLoading(false);
      },
      () => {
        setProspects([]);
        setErrorMessage(prospectsLoadError);
        setIsLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!db) {
      return;
    }

    const activeDb = db;

    return onSnapshot(
      collection(activeDb, "clients"),
      (snapshot) => {
        let registeredCount = 0;
        let incompleteProfileCount = 0;
        let missingActiveDocumentsCount = 0;
        let medicalAttentionCount = 0;
        const attentionClients: DashboardClientAttention[] = [];

        snapshot.docs.forEach((clientDocument) => {
          const parsedClient = dashboardClientSchema.safeParse(
            clientDocument.data(),
          );

          if (
            !parsedClient.success ||
            parsedClient.data.is_archived === true ||
            parsedClient.data.status !== "registered"
          ) {
            return;
          }

          registeredCount += 1;

          const client = parsedClient.data;
          const gaps: string[] = [];
          const hasIncompleteProfile =
            !client.dob ||
            !client.phone ||
            (!client.passport_id && !client.passport_number);
          const hasActiveDocument = client.client_documents?.some(
            (document) => document.status === "active",
          );
          const needsMedicalAttention =
            client.medical_profile?.medical_clearance_status !== "approved" ||
            !client.medical_profile?.insurance_company ||
            !client.medical_profile?.medications ||
            !client.medical_profile?.allergies ||
            !client.medical_profile?.healthcare_providers?.length;

          if (hasIncompleteProfile) {
            incompleteProfileCount += 1;
            gaps.push("Incomplete profile");
          }

          if (!hasActiveDocument) {
            missingActiveDocumentsCount += 1;
            gaps.push("No active documents");
          }

          if (needsMedicalAttention) {
            medicalAttentionCount += 1;
            gaps.push("Health review");
          }

          if (gaps.length > 0) {
            attentionClients.push({
              id: clientDocument.id,
              name: `${client.first_name} ${client.last_name}`,
              gaps,
            });
          }
        });

        setClientOverview({
          registeredCount,
          incompleteProfileCount,
          missingActiveDocumentsCount,
          medicalAttentionCount,
          attentionClients: attentionClients
            .sort(
              (firstClient, secondClient) =>
                secondClient.gaps.length - firstClient.gaps.length,
            )
            .slice(0, 3),
        });
        setClientOverviewErrorMessage("");
        setIsLoadingClientOverview(false);
      },
      () => {
        setClientOverview(emptyClientOverview);
        setClientOverviewErrorMessage(clientOverviewLoadError);
        setIsLoadingClientOverview(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!db) {
      return;
    }

    const activeDb = db;

    // Subscribe to the existing collection without compound query predicates,
    // then apply the legacy string date/time contract defensively in memory.
    return onSnapshot(
      collection(activeDb, "events"),
      (snapshot) => {
        const now = new Date();
        const nextMeetings = snapshot.docs
          .map((eventDocument) => {
            const parsedEvent = dashboardEventSchema.safeParse(
              eventDocument.data(),
            );

            if (!parsedEvent.success) {
              return null;
            }

            const scheduledAt = parseEventDateTime(
              parsedEvent.data.date,
              parsedEvent.data.time,
            );

            if (
              !scheduledAt ||
              scheduledAt <= now ||
              parsedEvent.data.is_archived === true ||
              parsedEvent.data.archived === true
            ) {
              return null;
            }

            return {
              id: eventDocument.id,
              ...parsedEvent.data,
              scheduledAt,
            };
          })
          .filter(
            (meeting): meeting is DashboardEvent => meeting !== null,
          )
          .sort(
            (firstMeeting, secondMeeting) =>
              firstMeeting.scheduledAt.getTime() -
              secondMeeting.scheduledAt.getTime(),
          );

        setMeetings(nextMeetings);
        setMeetingsErrorMessage("");
        setIsLoadingMeetings(false);
      },
      () => {
        setMeetings([]);
        setMeetingsErrorMessage(meetingsLoadError);
        setIsLoadingMeetings(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!db) {
      return;
    }

    const activeDb = db;
    let shouldIgnore = false;

    const fetchPrograms = async () => {
      try {
        const snapshot = await getDocs(collection(activeDb, "programs"));
        const now = new Date();

        const currentAndUpcomingPrograms = snapshot.docs
          .map((programDocument) => {
            const program = programDocument.data();
            const startDate = parseProgramDate(program.start_date);
            const endDate = parseProgramDate(program.end_date);
            const participantCount =
              typeof program.participant_count === "number" &&
              Number.isFinite(program.participant_count) &&
              program.participant_count >= 0
                ? program.participant_count
                : Array.isArray(program.participant_ids)
                  ? program.participant_ids.length
                  : null;

            return {
              id: programDocument.id,
              name:
                typeof program.name === "string" && program.name.trim()
                  ? program.name.trim()
                  : "Untitled program",
              location:
                typeof program.location === "string"
                  ? program.location.trim()
                  : "",
              participantCount,
              startDate,
              endDate,
            };
          })
          // Match the existing Statistics behavior: unknown end dates remain active.
          .filter(
            (program) => !program.endDate || program.endDate > now,
          )
          .sort((firstProgram, secondProgram) => {
            const firstIsUpcoming =
              Boolean(firstProgram.startDate) &&
              firstProgram.startDate!.getTime() > now.getTime();
            const secondIsUpcoming =
              Boolean(secondProgram.startDate) &&
              secondProgram.startDate!.getTime() > now.getTime();

            if (firstIsUpcoming !== secondIsUpcoming) {
              return firstIsUpcoming ? 1 : -1;
            }

            if (firstIsUpcoming && secondIsUpcoming) {
              return (
                firstProgram.startDate!.getTime() -
                secondProgram.startDate!.getTime()
              );
            }

            return (
              (firstProgram.endDate?.getTime() ?? Number.POSITIVE_INFINITY) -
              (secondProgram.endDate?.getTime() ?? Number.POSITIVE_INFINITY)
            );
          });

        if (!shouldIgnore) {
          setPrograms(currentAndUpcomingPrograms);
          setProgramsErrorMessage("");
        }
      } catch {
        if (!shouldIgnore) {
          setPrograms([]);
          setProgramsErrorMessage(programsLoadError);
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoadingPrograms(false);
        }
      }
    };

    fetchPrograms();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#E5EFE0_0%,#F3F6F0_28%,#DDEAD8_100%)] px-4 py-5 text-[#15383E] sm:px-6 sm:py-7 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute -right-36 top-28 -z-10 h-96 w-96 rounded-full border-[70px] border-[#BFD9C1]/60"
      />
      <div
        aria-hidden="true"
        className="absolute -left-40 top-[44rem] -z-10 h-96 w-96 rounded-full bg-[#C9DFC5]/70"
      />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[1.75rem] bg-[#2C6975] text-white shadow-[0_14px_34px_rgba(44,105,117,0.10)]">
          <div className="grid lg:grid-cols-[1fr_auto]">
            <div className="relative overflow-hidden px-7 py-8 sm:px-10 sm:py-9 lg:px-11">
              <div
                aria-hidden="true"
                className="absolute -left-20 -top-24 h-72 w-72 rounded-full border-[48px] border-[#6BB2A0]/25"
              />
              <div className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px w-10 bg-[#CDE0C9]" />
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DCEAD6]">
                    Onboarding control center
                  </p>
                </div>
                <h1 className="max-w-3xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                  Manager Onboarding Dashboard
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
                  See what needs attention across your onboarding workflow.
                </p>
              </div>
            </div>

            {/* Reuse loaded state for orientation without introducing requests. */}
            <div className="grid border-t border-white/15 bg-[#245C66] sm:grid-cols-3 lg:w-[28rem] lg:border-l lg:border-t-0">
              <div className="flex items-center gap-3.5 px-5 py-4 sm:justify-center lg:justify-start">
                <UsersRound
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[#CDE0C9]"
                />
                <div>
                  <p className="text-2xl font-bold leading-none tracking-[-0.03em]">
                    {isLoading || errorMessage ? "..." : prospects.length}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-white/75">
                    Prospects
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 border-t border-white/10 px-5 py-4 sm:border-l sm:border-t-0 sm:justify-center lg:justify-start">
                <CalendarDays
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[#CDE0C9]"
                />
                <div>
                  <p className="text-2xl font-bold leading-none tracking-[-0.03em]">
                    {isLoadingMeetings || meetingsErrorMessage
                      ? "..."
                      : meetings.length}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-white/75">
                    Meetings
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 border-t border-white/10 px-5 py-4 sm:border-l sm:border-t-0 sm:justify-center lg:justify-start">
                <UserRoundCheck
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[#CDE0C9]"
                />
                <div>
                  <p className="text-2xl font-bold leading-none tracking-[-0.03em]">
                    {isLoadingClientOverview || clientOverviewErrorMessage
                      ? "..."
                      : clientOverview.registeredCount}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-white/75">
                    Active clients
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PlaceholderSummaryCard
            description="A focused home for daily onboarding follow-ups and staff actions."
            emptyStateHelper="Daily follow-ups will appear here once task data is connected."
            emptyStateTitle="Task list coming soon"
            title="Today To-Do"
            variant="blue"
          />

          <section
            className="flex flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] shadow-[0_14px_34px_rgba(44,105,117,0.08)] md:col-span-2"
            aria-labelledby="prospects-summary-title"
          >
            <div className="border-b border-[#D7E3D5] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">
                    New interest
                  </p>
                  <h2
                    className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#15383E]"
                    id="prospects-summary-title"
                  >
                    Interested prospects
                  </h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DCEAD6] text-[#3F7763]">
                  <UsersRound aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-5 flex items-end gap-3">
                <p className="text-4xl font-bold tracking-[-0.04em] text-[#15383E]">
                  {isLoading || errorMessage ? "..." : prospects.length}
                </p>
                <p className="pb-1 text-sm text-[#6A8589]">
                  {prospects.length === 1
                    ? "contact awaiting follow-up"
                    : "contacts awaiting follow-up"}
                </p>
              </div>
            </div>

            {isLoading ? (
              <ProspectsLoadingState />
            ) : errorMessage ? (
              <div className="px-5 py-12 text-center sm:px-7">
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {errorMessage}
                </p>
              </div>
            ) : prospects.length === 0 ? (
              <div className="px-5 py-10 text-center sm:px-7">
                <p className="text-sm font-semibold text-[#31585F]">
                  No interested prospects found
                </p>
                <p className="mt-1 text-sm text-[#6A8589]">
                  New interested contacts will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="flex-1">
                <div className="px-5 pt-5 sm:px-7">
                  <h3 className="text-sm font-bold text-[#173A40]">
                    Newest prospects
                  </h3>
                </div>

                {/* Limit the dashboard preview to the three newest validated records. */}
                <ul className="divide-y divide-[#E4ECE2] px-5 sm:px-7">
                  {newestProspects.map((prospect) => (
                    <li
                      className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                      key={prospect.id}
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate font-semibold text-[#173A40]"
                          dir="auto"
                        >
                          {prospect.first_name} {prospect.last_name}
                        </p>
                        <p
                          className="mt-0.5 truncate text-sm text-[#6A8589]"
                          dir="auto"
                        >
                          {prospect.email}
                        </p>
                      </div>
                      <p className="shrink-0 rounded-full bg-[#EEF4EC] px-3 py-1.5 text-[13px] font-semibold text-[#5C7478]">
                        Added {formatDate(prospect.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Replace this interim destination when a prospects-only route exists. */}
            <DashboardCardCta href="/clients" label="Review prospects" />
          </section>

          <UpcomingMeetingsCard
            errorMessage={meetingsErrorMessage}
            isLoading={isLoadingMeetings}
            meetings={meetings}
          />
          <ProgramsSummaryCard
            errorMessage={programsErrorMessage}
            isLoading={isLoadingPrograms}
            programs={programs}
          />
          <ClientOverviewCard
            errorMessage={clientOverviewErrorMessage}
            isLoading={isLoadingClientOverview}
            overview={clientOverview}
          />
        </div>
      </div>
    </main>
  );
}
