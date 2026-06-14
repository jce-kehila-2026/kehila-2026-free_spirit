"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { db, isFirebaseInitialized } from "@/firebase/firebase";
import ManagePrograms from "../manage-programs/page";

const formatProgramDate = (value) => {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearchError, setClientSearchError] = useState("");
  const [clientAddLoading, setClientAddLoading] = useState(false);
  const [clientAddSuccess, setClientAddSuccess] = useState("");
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const matchingClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return [];
    return allClients
      .filter((client) => {
        const fullName = `${client.first_name || ""} ${client.last_name || ""}`.toLowerCase();
        return (
          fullName.includes(q) ||
          (client.first_name || "").toLowerCase().includes(q) ||
          (client.last_name || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [allClients, clientQuery]);

  const registeredParticipants = useMemo(() => {
    if (!selectedProgram || !Array.isArray(selectedProgram.participant_ids)) return [];
    return selectedProgram.participant_ids
      .map((participantId) => allClients.find((client) => client.id === participantId))
      .filter(Boolean)
      .map((client) => ({
        id: client.id,
        name: `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Unnamed client",
      }));
  }, [allClients, selectedProgram]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        if (!isFirebaseInitialized || !db) {
          setAllClients([]);
          return;
        }
        const clientsCol = collection(db, "clients");
        const snapshot = await getDocs(clientsCol);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllClients(list);
      } catch (fetchError) {
        console.error("Error loading clients:", fetchError);
        setAllClients([]);
      }
    };

    fetchClients();
  }, []);

  const openProgramModal = (program) => {
    setSelectedProgram(program);
    setClientQuery("");
    setSelectedClient(null);
    setClientSearchError("");
    setClientAddSuccess("");
  };

  const closeProgramModal = () => {
    setSelectedProgram(null);
    setClientQuery("");
    setSelectedClient(null);
    setClientSearchError("");
    setClientAddSuccess("");
  };

  const selectClient = (client) => {
    setSelectedClient(client);
    setClientQuery(`${client.first_name || ""} ${client.last_name || ""}`.trim());
    setClientSearchError("");
  };

  const handleAddClientToProgram = async () => {
    if (!selectedProgram) return;
    if (!selectedClient) {
      setClientSearchError("Please choose a client from the list.");
      return;
    }

    setClientSearchError("");
    setClientAddSuccess("");
    setClientAddLoading(true);

    const currentParticipantIds = Array.isArray(selectedProgram.participant_ids)
      ? selectedProgram.participant_ids
      : [];

    if (currentParticipantIds.includes(selectedClient.id)) {
      setClientSearchError("This client is already registered for the program.");
      setClientAddLoading(false);
      return;
    }

    try {
      const updatedParticipantIds = [...currentParticipantIds, selectedClient.id];
      const programRef = doc(db, "programs", selectedProgram.id);
      await updateDoc(programRef, {
        participant_ids: updatedParticipantIds,
        participant_count: updatedParticipantIds.length,
      });

      setPrograms((prev) =>
        prev.map((program) =>
          program.id === selectedProgram.id
            ? {
                ...program,
                participant_ids: updatedParticipantIds,
                participant_count: updatedParticipantIds.length,
              }
            : program
        )
      );

      setSelectedProgram((prev) =>
        prev
          ? {
              ...prev,
              participant_ids: updatedParticipantIds,
              participant_count: updatedParticipantIds.length,
            }
          : prev
      );

      setClientAddSuccess("Client added to program successfully.");
      setSelectedClient(null);
      setClientQuery("");
    } catch (err) {
      console.error("Error adding client to program:", err);
      setClientSearchError("Unable to add the client to the program.");
    } finally {
      setClientAddLoading(false);
    }
  };

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        if (!isFirebaseInitialized || !db) {
          setError("Firebase is not initialized. Unable to load programs.");
          setPrograms([]);
          return;
        }

        const programsCol = collection(db, "programs");
        const snapshot = await getDocs(programsCol);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // מיון התוכניות - הקרובות ביותר (או מתקיימות) בראש, ואלו שעברו בתחתית.
        const now = new Date().getTime();
        
        list.sort((a, b) => {
          const startA = (a.start_date?.toDate?.() || new Date(a.start_date || 0)).getTime();
          const endA = (a.end_date?.toDate?.() || new Date(a.end_date || 0)).getTime();
          const startB = (b.start_date?.toDate?.() || new Date(b.start_date || 0)).getTime();
          const endB = (b.end_date?.toDate?.() || new Date(b.end_date || 0)).getTime();
          
          const isPastA = endA < now;
          const isPastB = endB < now;
          
          if (isPastA !== isPastB) return isPastA ? 1 : -1;
          
          if (isPastA) {
             return endB - endA;
          } else {
             return startA - startB;
          }
        });

        setPrograms(list);
      } catch (fetchError) {
        console.error("Error loading programs:", fetchError);
        setError("An error occurred while loading programs.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  useEffect(() => {
    if (!clientAddSuccess) return;

    const timer = setTimeout(() => {
      setClientAddSuccess("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [clientAddSuccess]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#E5EFE0_0%,#F3F6F0_30%,#DDEAD8_100%)] px-4 py-5 text-[#15383E] sm:px-6 sm:py-7 lg:px-8">
      <div aria-hidden="true" className="absolute -right-36 top-24 -z-10 h-96 w-96 rounded-full border-[70px] border-[#BFD9C1]/60" />
      <div className="relative mx-auto max-w-7xl">
        <section className="mb-6 overflow-hidden rounded-[1.75rem] bg-[#2C6975] text-white shadow-[0_14px_34px_rgba(44,105,117,0.10)]">
          <div className="flex flex-col gap-6 px-7 py-7 sm:px-10 sm:py-8 lg:flex-row lg:items-center lg:justify-between lg:px-11">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="h-px w-10 bg-[#CDE0C9]" />
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DCEAD6]">Program community</p>
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Programs</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
                Review program journeys, understand participation, and help each experience move forward.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#DCEAD6] px-5 py-3 text-sm font-bold text-[#245C66] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#CDE0C9]/50"
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
              Create New Program
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[1.75rem] border border-dashed border-[#B9CFCA] bg-[#FFFDF8] p-10 text-center shadow-[0_14px_34px_rgba(44,105,117,0.07)]">
            <p className="text-lg font-bold text-[#31585F]">Loading programs...</p>
            <p className="mt-2 text-sm text-[#6A8589]">Gathering the latest program information.</p>
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">{error}</div>
        ) : programs.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[#B9CFCA] bg-[#FFFDF8] p-10 text-center">
            <CalendarDays aria-hidden="true" className="mx-auto h-8 w-8 text-[#2C6975]" />
            <p className="mt-4 text-lg font-bold text-[#31585F]">No programs were found</p>
            <p className="mt-2 text-sm text-[#6A8589]">Create a program to begin building the community schedule.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program) => {
              const now = new Date().getTime();
              const start = program.start_date?.toDate?.() ? program.start_date.toDate() : new Date(program.start_date || 0);
              const end = program.end_date?.toDate?.() ? program.end_date.toDate() : new Date(program.end_date || 0);
              let statusText = "Upcoming";
              let statusClass = "bg-[#DCEAD6] text-[#2C6975]";
              if (now >= start.getTime() && now <= end.getTime()) {
                statusText = "In progress";
                statusClass = "bg-[#4F8B75] text-white";
              } else if (now > end.getTime()) {
                statusText = "Completed";
                statusClass = "bg-[#EEF1EE] text-[#687B7E]";
              }

              return (
                <article
                  key={program.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openProgramModal(program)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openProgramModal(program);
                  }}
                  className="group cursor-pointer rounded-[1.6rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_12px_28px_rgba(44,105,117,0.07)] transition hover:-translate-y-0.5 hover:border-[#AFC9BF] hover:shadow-[0_16px_34px_rgba(44,105,117,0.10)] focus:outline-none focus:ring-4 focus:ring-[#CDE0C9]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">Program</p>
                      <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#15383E]">{program.name || "Untitled Program"}</h2>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{statusText}</span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 border-y border-[#D7E3D5] py-3 text-sm font-semibold text-[#4E6C70]">
                    <MapPin aria-hidden="true" className="h-4 w-4 text-[#6BB2A0]" />
                    <span className="truncate">{program.location || "Unknown location"}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#EEF4EC] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#7C9194]">Starts</p>
                      <p className="mt-1 text-sm font-bold text-[#31585F]">{formatProgramDate(program.start_date)}</p>
                    </div>
                    <div className="rounded-xl bg-[#E4F0EC] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#7C9194]">Ends</p>
                      <p className="mt-1 text-sm font-bold text-[#31585F]">{formatProgramDate(program.end_date)}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#2C6975]">Open program details</p>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#15383E]/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/50 bg-[#F3F6F0] shadow-[0_24px_60px_rgba(21,56,62,0.24)]" role="dialog" aria-modal="true" aria-label="Program details">
            {clientAddSuccess && (
              <div className="absolute left-1/2 top-5 z-50 w-full max-w-md -translate-x-1/2 px-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-5 py-3 text-sm text-emerald-900 shadow-lg backdrop-blur-sm">
                  <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />{clientAddSuccess}</p>
                </div>
              </div>
            )}
            <div className="flex items-start justify-between gap-4 bg-[#2C6975] p-6 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CDE0C9]">Program details</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{selectedProgram.name || "Untitled Program"}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/72"><MapPin className="h-4 w-4" />{selectedProgram.location || "Location not set"}</p>
              </div>
              <button
                type="button"
                onClick={closeProgramModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition hover:bg-white/20"
                aria-label="Close program details"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.5fr_0.75fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#D7E3D5] bg-[#FFFDF8] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">Description</p>
                  <p className="mt-3 text-sm leading-6 text-[#5C7478]">{selectedProgram.description || "No description has been provided for this program."}</p>
                </div>

                <div className="rounded-2xl border border-[#D7E3D5] bg-[#FFFDF8] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6A8589]"><UsersRound className="h-4 w-4 text-[#6BB2A0]" />Participants</p>
                    <span className="rounded-full bg-[#DCEAD6] px-3 py-1 text-xs font-bold text-[#2C6975]">
                      {registeredParticipants.length}
                    </span>
                  </div>
                  {registeredParticipants.length === 0 ? (
                    <p className="mt-4 text-sm text-[#6A8589]">No participants have been added yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {registeredParticipants.map((participant) => (
                        <li key={participant.id} className="rounded-xl border border-[#D7E3D5] bg-[#F3F7F1] px-4 py-3 text-sm font-semibold text-[#31585F]">
                          {participant.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-[#C9D9D1] bg-[#EAF2EA] p-5">
                  <div className="mb-4">
                    <p className="text-lg font-bold text-[#15383E]">Add client to this program</p>
                    <p className="mt-1 text-sm text-[#60777B]">Search by first or last name, then select a client.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-[#31585F]">Client name</label>
                      <input
                        type="text"
                        value={clientQuery}
                        onChange={(e) => {
                          setClientQuery(e.target.value);
                          setSelectedClient(null);
                          setClientSearchError("");
                          setClientAddSuccess("");
                        }}
                        placeholder="Search by first or last name"
                        className="mt-2 w-full rounded-xl border border-[#C9D9D1] bg-white px-4 py-3 text-sm text-[#173A40] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]"
                      />
                      {clientSearchError && <p className="mt-2 text-base text-red-600">{clientSearchError}</p>}
                      {clientAddSuccess && <p className="mt-2 text-base text-emerald-700">{clientAddSuccess}</p>}
                    </div>

                    {matchingClients.length > 0 && !selectedClient && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C9194]">Matching clients</p>
                        <div className="mt-3 space-y-2">
                          {matchingClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => selectClient(client)}
                              className="w-full rounded-xl border border-[#D7E3D5] bg-[#F7FAF5] px-4 py-3 text-left text-sm text-[#31585F] transition hover:border-[#6BB2A0] hover:bg-[#EEF4EC]"
                            >
                              {client.first_name} {client.last_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedClient && (
                      <div className="rounded-xl border border-[#BFD9D2] bg-white px-4 py-3 text-sm text-[#31585F]">
                        Selected client: <span className="font-semibold">{selectedClient.first_name} {selectedClient.last_name}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddClientToProgram}
                      disabled={clientAddLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2C6975] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {clientAddLoading ? "Adding client..." : "Add to Program"}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-[#D7E3D5] bg-[#FFFDF8] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6BB2A0]">Program metrics</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-xl bg-[#EEF4EC] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Start</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatProgramDate(selectedProgram.start_date)}</p>
                    </div>
                    <div className="rounded-xl bg-[#E4F0EC] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">End</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatProgramDate(selectedProgram.end_date)}</p>
                    </div>
                    <div className="rounded-xl bg-[#EEF4EC] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">Registered</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{selectedProgram.participant_ids?.length ?? selectedProgram.participant_count ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-[#F4F3E8] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Minimum</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{selectedProgram.min_members || 0}</p>
                    </div>
                    <div className="rounded-xl bg-[#F7EEEE] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">Missing to minimum</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{Math.max(0, (selectedProgram.min_members || 0) - (selectedProgram.participant_ids?.length ?? selectedProgram.participant_count ?? 0))}</p>
                    </div>
                    <div className="rounded-xl bg-[#EEF1EE] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Remaining to maximum</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedProgram.max_members > 0
                          ? Math.max(0, selectedProgram.max_members - (selectedProgram.participant_ids?.length ?? selectedProgram.participant_count ?? 0))
                          : "Unlimited"}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#15383E]/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/50 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(21,56,62,0.24)]" role="dialog" aria-modal="true" aria-label="Manage program">
            <div className="sticky top-0 z-20 flex items-center justify-between bg-[#2C6975] px-6 py-4 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CDE0C9]">Program workspace</p>
                <p className="mt-1 text-lg font-bold">Create a new program</p>
              </div>
            <button
              type="button"
              onClick={() => setIsManageModalOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition hover:bg-white/20"
              aria-label="Close modal"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            </div>
            <div className="p-5 sm:p-6">
              <ManagePrograms onSuccess={() => setIsManageModalOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
