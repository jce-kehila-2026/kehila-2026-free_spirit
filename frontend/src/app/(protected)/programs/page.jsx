"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, isFirebaseInitialized } from "@/firebase/firebase";

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
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[24px] bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
                Kehila Programs ✨
              </p>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl text-slate-950">
                All Created Programs
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
                Review existing programs, inspect details, and manage participant registration from a clean control panel.
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-700 shadow-sm">
            Loading programs...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {programs.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-700 shadow-sm">
                No programs were found.
              </div>
            ) : (
              programs.map((program) => (
                <article
                  key={program.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openProgramModal(program)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openProgramModal(program);
                  }}
                  className="cursor-pointer rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">{program.name || "Untitled Program"}</h2>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      {program.location || "Unknown location"}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Start Date</p>
                      <p className="mt-2 text-base font-medium text-slate-900">{formatProgramDate(program.start_date)}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">End Date</p>
                      <p className="mt-2 text-base font-medium text-slate-900">{formatProgramDate(program.end_date)}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>

      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4">
          <div className="relative w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl md:max-h-[90vh] md:overflow-y-auto">
            {clientAddSuccess && (
              <div className="absolute left-1/2 top-5 z-50 w-full max-w-md -translate-x-1/2 px-4">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/95 px-5 py-3 text-sm text-emerald-900 shadow-xl backdrop-blur-sm">
                  <p className="font-semibold">✅ {clientAddSuccess}</p>
                </div>
              </div>
            )}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sky-600">Program details 📌</p>
                <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">{selectedProgram.name || "Untitled Program"}</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">{selectedProgram.location || "Location not set"}</p>
              </div>
              <button
                type="button"
                onClick={closeProgramModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Close program details"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <div className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-500">Description 🧾</p>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{selectedProgram.description || "No description has been provided for this program."}</p>
                </div>

                <div className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Participants 👥</p>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      {registeredParticipants.length}
                    </span>
                  </div>
                  {registeredParticipants.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No participants have been added yet. 🙏</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {registeredParticipants.map((participant) => (
                        <li key={participant.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                          {participant.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-[24px] bg-slate-50 p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-4">
                    <p className="text-xl font-bold text-slate-950">Add client to this program ➕</p>
                    <p className="mt-1 text-sm font-medium text-slate-600">Search a client by first or last name and add them to the program.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Client name</label>
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
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                      {clientSearchError && <p className="mt-2 text-sm text-red-600">{clientSearchError}</p>}
                      {clientAddSuccess && <p className="mt-2 text-sm text-emerald-700">{clientAddSuccess}</p>}
                    </div>

                    {matchingClients.length > 0 && !selectedClient && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Matching clients</p>
                        <div className="mt-3 space-y-2">
                          {matchingClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => selectClient(client)}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                            >
                              {client.first_name} {client.last_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedClient && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-800">
                        Selected client: <span className="font-semibold">{selectedClient.first_name} {selectedClient.last_name}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddClientToProgram}
                      disabled={clientAddLoading}
                      className="inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {clientAddLoading ? "Adding client..." : "Add to Program"}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-500">Program metrics 📊</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-3xl bg-sky-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Start</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{formatProgramDate(selectedProgram.start_date)}</p>
                    </div>
                    <div className="rounded-3xl bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">End</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{formatProgramDate(selectedProgram.end_date)}</p>
                    </div>
                    <div className="rounded-3xl bg-indigo-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Registered</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{selectedProgram.participant_ids?.length ?? selectedProgram.participant_count ?? 0}</p>
                    </div>
                    <div className="rounded-3xl bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Minimum</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{selectedProgram.min_members || 0}</p>
                    </div>
                    <div className="rounded-3xl bg-rose-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">Missing to minimum</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{Math.max(0, (selectedProgram.min_members || 0) - (selectedProgram.participant_ids?.length ?? selectedProgram.participant_count ?? 0))}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Remaining to maximum</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
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
    </main>
  );
}
