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
import { basicInfoSchema } from "@/schemas/clientSchema";

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

function formatDate(timestamp?: Timestamp) {
  if (!timestamp) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(timestamp.toDate());
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
        "flex min-h-56 flex-col rounded-xl border bg-white p-5 shadow-sm sm:p-6",
        emphasized
          ? "border-blue-200 ring-1 ring-blue-100"
          : "border-slate-200",
      ].join(" ")}
    >
      <div
        className={`mb-5 h-1.5 w-12 rounded-full ${accentClassName}`}
        aria-hidden="true"
      />
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-auto pt-6">
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
          {emptyState}
        </p>
        {href && linkLabel && (
          <Link
            className="mt-4 inline-flex items-center text-sm font-bold text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            href={href}
          >
            {linkLabel}
            <span className="ml-2" aria-hidden="true">
              -&gt;
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * Manager dashboard view for the onboarding team.
 * Subscribes only to interested client records and exposes display fields.
 */
export default function ManagerDashboardShell() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Manager Onboarding Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
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
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:col-span-2"
            aria-labelledby="prospects-summary-title"
          >
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <p className="text-sm font-semibold text-amber-700">
                Interested prospects
              </p>
              <div>
                <h2
                  className="mt-2 text-4xl font-bold tracking-tight text-slate-950"
                  id="prospects-summary-title"
                >
                  {isLoading || errorMessage ? "..." : prospects.length}
                </h2>
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
              <div>
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

                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                  {/* Replace this interim destination when a prospects-only route exists. */}
                  <Link
                    className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                    href="/clients"
                  >
                    Review prospects
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* These cards are intentionally presentation-only until integrations are supplied. */}
          <PlaceholderSummaryCard
            accentClassName="bg-violet-500"
            description="Keep the next staff and participant conversations in view."
            emptyState="Meeting data is not connected yet."
            href="/events"
            linkLabel="Open events"
            title="Upcoming Meetings"
          />
          <PlaceholderSummaryCard
            accentClassName="bg-emerald-500"
            description="Monitor programs currently moving through onboarding."
            emptyState="Program summary data is not connected yet."
            href="/manage-programs"
            linkLabel="Manage programs"
            title="Active Programs"
          />
          <PlaceholderSummaryCard
            accentClassName="bg-amber-500"
            description="Review client progress and identify missing onboarding items."
            emptyState="Missing-item summaries are not connected yet."
            href="/clients"
            linkLabel="Review clients"
            title="Client Overview & Missing Items"
          />
        </div>
      </div>
    </main>
  );
}
