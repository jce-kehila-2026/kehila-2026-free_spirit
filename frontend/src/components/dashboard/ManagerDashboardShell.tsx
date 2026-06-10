"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
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
} from "@/schemas/clientSchema";

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

function ProspectsLoadingState() {
  return (
    <div
      className="space-y-3 px-5 py-6 sm:px-6"
      role="status"
      aria-label="Loading interested prospects"
    >
      {[0, 1, 2].map((item) => (
        <div
          className="h-14 animate-pulse rounded-lg bg-slate-100"
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
    <div className="mt-auto border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
      <Link
        className="group inline-flex items-center rounded-sm text-sm font-bold text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        href={href}
      >
        {label}
        <span
          className="ml-2 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          →
        </span>
      </Link>
    </div>
  );
}

interface PlaceholderSummaryCardProps {
  title: string;
  description: string;
  emptyState: string;
  accentClassName: string;
  href?: string;
  linkLabel?: string;
  emphasized?: boolean;
}

/**
 * Presents a future dashboard integration without implying that live data is
 * already available. Links are limited to established protected routes.
 */
function PlaceholderSummaryCard({
  title,
  description,
  emptyState,
  accentClassName,
  href,
  linkLabel,
  emphasized = false,
}: PlaceholderSummaryCardProps) {
  return (
    <section
      className={[
        "flex min-h-56 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
        emphasized
          ? "border-blue-200 ring-1 ring-blue-100"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`mt-2 h-1.5 w-12 rounded-full ${accentClassName}`}
            aria-hidden="true"
          />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
            Integration pending
          </span>
        </div>
        <h2 className="mt-5 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-auto pt-6">
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
            {emptyState}
          </p>
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
      className="flex min-h-56 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      aria-labelledby="upcoming-meetings-title"
    >
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <h2
          className="text-sm font-semibold text-violet-700"
          id="upcoming-meetings-title"
        >
          Upcoming meetings
        </h2>
        <p
          className="mt-2 text-4xl font-bold tracking-tight text-slate-950"
        >
          {isLoading || errorMessage ? "..." : meetings.length}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {meetings.length === 1
            ? "scheduled meeting is coming up"
            : "scheduled meetings are coming up"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-5 py-6 sm:px-6" role="status">
          {[0, 1, 2].map((item) => (
            <div
              className="h-12 animate-pulse rounded-lg bg-slate-100"
              key={item}
            />
          ))}
          <span className="sr-only">Loading upcoming meetings...</span>
        </div>
      ) : errorMessage ? (
        <div className="px-5 py-8 sm:px-6">
          <p className="text-sm font-semibold text-red-700" role="alert">
            {errorMessage}
          </p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="px-5 py-8 sm:px-6">
          <p className="text-sm font-semibold text-slate-700">
            No upcoming meetings
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Scheduled meetings will appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 px-5 sm:px-6">
          {nextMeetings.map((meeting) => (
            <li className="py-3.5" key={meeting.id}>
              <p className="truncate font-semibold text-slate-900" dir="auto">
                {meeting.title}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {formatMeetingDateTime(meeting.scheduledAt)}
              </p>
              {meeting.clientName && (
                <p className="mt-1 truncate text-xs text-slate-500" dir="auto">
                  Participant: {meeting.clientName}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <DashboardCardCta href="/events" label="Open events" />
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
      className="flex min-h-56 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      aria-labelledby="client-overview-title"
    >
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <h2
          className="text-sm font-semibold text-amber-700"
          id="client-overview-title"
        >
          Client Overview &amp; Missing Items
        </h2>
        <p
          className="mt-2 text-4xl font-bold tracking-tight text-slate-950"
        >
          {isLoading || errorMessage ? "..." : overview.registeredCount}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          active registered clients
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-5 py-6 sm:px-6" role="status">
          {[0, 1, 2].map((item) => (
            <div
              className="h-10 animate-pulse rounded-lg bg-slate-100"
              key={item}
            />
          ))}
          <span className="sr-only">Loading client overview...</span>
        </div>
      ) : errorMessage ? (
        <div className="px-5 py-8 sm:px-6">
          <p className="text-sm font-semibold text-red-700" role="alert">
            {errorMessage}
          </p>
        </div>
      ) : overview.registeredCount === 0 ? (
        <div className="px-5 py-8 sm:px-6">
          <p className="text-sm font-semibold text-slate-700">
            No active registered clients
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Client onboarding summaries will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="px-5 py-5 sm:px-6">
          <dl className="grid gap-2 text-center sm:grid-cols-3">
            <div className="flex min-h-24 flex-col rounded-xl bg-red-50 px-3 py-3">
              <dt className="flex min-h-8 items-center justify-center text-xs font-medium text-red-700">
                Incomplete profiles
              </dt>
              <dd className="mt-auto pt-2 text-xl font-bold text-red-700">
                {overview.incompleteProfileCount}
              </dd>
            </div>
            <div className="flex min-h-24 flex-col rounded-xl bg-amber-50 px-3 py-3">
              <dt className="flex min-h-8 items-center justify-center text-xs font-medium text-amber-700">
                No active documents
              </dt>
              <dd className="mt-auto pt-2 text-xl font-bold text-amber-700">
                {overview.missingActiveDocumentsCount}
              </dd>
            </div>
            <div className="flex min-h-24 flex-col rounded-xl bg-blue-50 px-3 py-3">
              <dt className="flex min-h-8 items-center justify-center text-xs font-medium text-blue-700">
                Health review
              </dt>
              <dd className="mt-auto pt-2 text-xl font-bold text-blue-700">
                {overview.medicalAttentionCount}
              </dd>
            </div>
          </dl>

          {overview.attentionClients.length === 0 ? (
            <p className="mt-5 text-sm font-medium text-emerald-700">
              No onboarding gaps require attention.
            </p>
          ) : (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-900">
                Needs attention
              </h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {overview.attentionClients.map((client) => (
                  <li className="py-2.5" key={client.id}>
                    <p
                      className="truncate text-sm font-semibold text-slate-800"
                      dir="auto"
                    >
                      {client.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [meetings, setMeetings] = useState<DashboardEvent[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [meetingsErrorMessage, setMeetingsErrorMessage] = useState("");
  const [clientOverview, setClientOverview] =
    useState<ClientOverview>(emptyClientOverview);
  const [isLoadingClientOverview, setIsLoadingClientOverview] = useState(true);
  const [clientOverviewErrorMessage, setClientOverviewErrorMessage] =
    useState("");
  const newestProspects = prospects.slice(0, 3);

  useEffect(() => {
    // The status predicate limits the live query to the prospect workflow.
    const prospectsQuery = query(
      collection(db, "clients"),
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
        setErrorMessage(
          "We could not load interested prospects. Please refresh and try again.",
        );
        setIsLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      collection(db, "clients"),
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
        setClientOverviewErrorMessage(
          "We could not load the client overview. Please refresh and try again.",
        );
        setIsLoadingClientOverview(false);
      },
    );
  }, []);

  useEffect(() => {
    // Subscribe to the existing collection without compound query predicates,
    // then apply the legacy string date/time contract defensively in memory.
    return onSnapshot(
      collection(db, "events"),
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
        setMeetingsErrorMessage(
          "We could not load upcoming meetings. Please refresh and try again.",
        );
        setIsLoadingMeetings(false);
      },
    );
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Onboarding control center
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Manager Onboarding Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            See what needs attention across your onboarding workflow.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <PlaceholderSummaryCard
            accentClassName="bg-blue-500"
            description="Keep today's onboarding follow-ups and staff actions visible."
            emptyState="Task integration is not connected yet."
            emphasized
            title="Today To-Do"
          />

          <section
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md md:col-span-2"
            aria-labelledby="prospects-summary-title"
          >
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <h2
                className="text-sm font-semibold text-amber-700"
                id="prospects-summary-title"
              >
                Interested prospects
              </h2>
              <div>
                <p
                  className="mt-2 text-4xl font-bold tracking-tight text-slate-950"
                >
                  {isLoading || errorMessage ? "..." : prospects.length}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {prospects.length === 1
                    ? "contact is waiting for follow-up"
                    : "contacts are waiting for follow-up"}
                </p>
              </div>
            </div>

            {isLoading ? (
              <ProspectsLoadingState />
            ) : errorMessage ? (
              <div className="px-5 py-12 text-center sm:px-6">
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {errorMessage}
                </p>
              </div>
            ) : prospects.length === 0 ? (
              <div className="px-5 py-10 text-center sm:px-6">
                <p className="text-sm font-semibold text-slate-700">
                  No interested prospects found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  New interested contacts will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="flex-1">
                <div className="px-5 pt-5 sm:px-6">
                  <h3 className="text-sm font-bold text-slate-900">
                    Newest prospects
                  </h3>
                </div>

                {/* Limit the dashboard preview to the three newest validated records. */}
                <ul className="divide-y divide-slate-100 px-5 sm:px-6">
                  {newestProspects.map((prospect) => (
                    <li
                      className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                      key={prospect.id}
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate font-semibold text-slate-900"
                          dir="auto"
                        >
                          {prospect.first_name} {prospect.last_name}
                        </p>
                        <p
                          className="mt-0.5 truncate text-sm text-slate-500"
                          dir="auto"
                        >
                          {prospect.email}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs font-medium text-slate-500">
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
          {/* These cards remain presentation-only until integrations are supplied. */}
          <PlaceholderSummaryCard
            accentClassName="bg-emerald-500"
            description="Monitor programs currently moving through onboarding."
            emptyState="Program summary data is not connected yet."
            href="/manage-programs"
            linkLabel="Manage programs"
            title="Active Programs"
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
