"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
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
  const [participantToRemove, setParticipantToRemove] = useState(null);
  const [programToRemove, setProgramToRemove] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null); // null | 'name' | 'location' | 'description'
  const [editingValue, setEditingValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

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

  const handleStartEditing = (field, value) => {
    if (field === 'start_date' || field === 'end_date') {
      const date = value?.toDate ? value.toDate() : new Date(value);
      if (!isNaN(date.getTime())) {
        setEditingValue(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD for input type="date"
      } else {
        setEditingValue('');
      }
    } else if (field === 'min_members') {
      setEditingValue(value !== undefined && value !== null ? String(value) : '');
    } else {
      setEditingValue(value);
    }
    setEditingField(field);
    setUpdateError('');
  };

  const handleCancelEditing = () => {
    setEditingField(null);
    setEditingValue('');
    setUpdateError('');
  };

  const handleSaveEditing = async () => {
    if (isUpdating || !editingField || !selectedProgram) return;

    setIsUpdating(true);
    setUpdateError('');

    let newValue = editingValue;

    if (editingField === 'start_date' || editingField === 'end_date') {
      newValue = new Date(editingValue);
      if (isNaN(newValue.getTime())) {
        setUpdateError(`Invalid date for ${editingField.replace('_', ' ')}. Please use YYYY-MM-DD format.`);
        setIsUpdating(false);
        return;
      }
    } else if (editingField === 'min_members') {
      newValue = parseInt(editingValue, 10);
      if (isNaN(newValue) || newValue < 0) { // Assuming min_members cannot be negative
        setUpdateError(`Invalid number for minimum members. Please enter a non-negative number.`);
        setIsUpdating(false);
        return;
      }
    }

    const programRef = doc(db, "programs", selectedProgram.id);

    try {
      await updateDoc(programRef, {
        [editingField]: newValue,
      });

      const updatedProgram = { ...selectedProgram, [editingField]: newValue };
      setSelectedProgram(updatedProgram);

      setPrograms(prevPrograms =>
        prevPrograms.map(p => (p.id === selectedProgram.id ? updatedProgram : p))
      );

      setEditingField(null);
    } catch (err) {
      console.error("Error updating program:", err);
      setUpdateError(`Failed to update ${editingField}. Please try again.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSaveEditing();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

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

  const handleRemoveClientFromProgram = async (clientIdToRemove) => {
    if (!selectedProgram) return;

    try {
      const currentParticipantIds = Array.isArray(selectedProgram.participant_ids)
        ? selectedProgram.participant_ids
        : [];
      
      const updatedParticipantIds = currentParticipantIds.filter(id => id !== clientIdToRemove);

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

    } catch (err) {
      console.error("Error removing client from program:", err);
    }
  };

  const handleDeleteProgram = async () => {
    if (!programToRemove) return;
    try {
      await deleteDoc(doc(db, "programs", programToRemove.id));
      setPrograms(prev => prev.filter(p => p.id !== programToRemove.id));
      setProgramToRemove(null);
    } catch (err) {
      console.error("Error deleting program:", err);
      // Optional: set some error state if you want to display an error
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
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[24px] bg-white px-8 py-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-base font-semibold uppercase tracking-[0.25em] text-sky-600">
                Kehila Programs ✨
              </p>
              <h1 className="text-6xl font-bold tracking-tight md:text-7xl text-slate-950">
                All Created Programs
              </h1>
              <p className="mt-3 max-w-2xl text-lg leading-7 text-slate-700">
                Review existing programs, inspect details, and manage participant registration from a clean control panel.
              </p>
            </div>
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              ➕ Create New Program
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-lg text-slate-700 shadow-sm">
            Loading programs...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-lg text-red-700 shadow-sm">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {programs.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-lg text-slate-700 shadow-sm">
                No programs were found.
              </div>
            ) : (
              programs.map((program) => {
                const now = new Date().getTime();
                const start = program.start_date?.toDate?.() ? program.start_date.toDate() : new Date(program.start_date || 0);
                const end = program.end_date?.toDate?.() ? program.end_date.toDate() : new Date(program.end_date || 0);
                
                let statusText = "📅 UPCOMING";
                let statusClass = "bg-sky-100 text-sky-800 ring-1 ring-sky-300";
                
                if (now >= start.getTime() && now <= end.getTime()) {
                  statusText = "🔥 RIGHT NOW";
                  statusClass = "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse border-none";
                } else if (now > end.getTime()) {
                  statusText = "🛑 PASSED";
                  statusClass = "bg-rose-100 text-rose-700 ring-1 ring-rose-300";
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
                    className="cursor-pointer rounded-[24px] bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm ring-1 ring-blue-200 transition hover:-translate-y-1 hover:shadow-lg relative group"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProgramToRemove(program);
                      }}
                      className="absolute top-4 right-4 z-10 p-2 bg-white/50 hover:bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Program"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-blue-950">🌟 {program.name || "Untitled Program"}</h2>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold uppercase tracking-[0.1em] ${statusClass}`}>
                          {statusText}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-white/60 px-3 py-1 text-base font-bold text-blue-800 ring-1 ring-blue-200 backdrop-blur-sm">
                          📍 {program.location || "Unknown location"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mt-2">
                      <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-blue-100 backdrop-blur-sm">
                        <p className="text-base font-bold text-blue-500">🕒 Start Date</p>
                        <p className="mt-2 text-lg font-bold text-blue-900">{formatProgramDate(program.start_date)}</p>
                      </div>
                      <div className="rounded-3xl bg-white/60 p-4 ring-1 ring-blue-100 backdrop-blur-sm">
                        <p className="text-base font-bold text-blue-500">⏳ End Date</p>
                        <p className="mt-2 text-lg font-bold text-blue-900">{formatProgramDate(program.end_date)}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4">
          <div className="relative w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl md:max-h-[90vh] md:overflow-y-auto">
            {clientAddSuccess && (
              <div className="absolute left-1/2 top-5 z-50 w-full max-w-md -translate-x-1/2 px-4">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/95 px-5 py-3 text-base text-emerald-900 shadow-xl backdrop-blur-sm">
                  <p className="font-semibold">✅ {clientAddSuccess}</p>
                </div>
              </div>
            )}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-sky-600">Program details 📌</p>
                {editingField === 'name' ? (
                  <div onKeyDown={handleEditKeyDown}>
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-5xl font-extrabold tracking-tight text-slate-950 outline-none ring-2 ring-blue-100"
                      autoFocus
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={handleSaveEditing} disabled={isUpdating} className="rounded-lg bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={handleCancelEditing} className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-300">
                        Cancel
                      </button>
                    </div>
                    {updateError && editingField === 'name' && <p className="mt-1 text-sm text-red-600">{updateError}</p>}
                  </div>
                ) : (
                  <div className="group relative" onClick={() => handleStartEditing('name', selectedProgram.name || '')}>
                    <h2 className="mt-2 cursor-pointer text-5xl font-extrabold tracking-tight text-slate-950">{selectedProgram.name || "Untitled Program"}</h2>
                    <span className="absolute -right-8 top-1/2 -translate-y-1/2 hidden cursor-pointer rounded-full p-1 text-2xl group-hover:inline-block">
                      ✏️
                    </span>
                  </div>
                )}
                {editingField === 'location' ? (
                  <div onKeyDown={handleEditKeyDown} className="mt-2">
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-base font-medium text-slate-900 outline-none ring-2 ring-blue-100"
                      autoFocus
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={handleSaveEditing} disabled={isUpdating} className="rounded-lg bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={handleCancelEditing} className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-300">
                        Cancel
                      </button>
                    </div>
                    {updateError && editingField === 'location' && <p className="mt-1 text-sm text-red-600">{updateError}</p>}
                  </div>
                ) : (
                  <div className="group relative" onClick={() => handleStartEditing('location', selectedProgram.location || '')}>
                    <p className="mt-2 cursor-pointer text-base font-medium text-slate-600">{selectedProgram.location || "Location not set"}</p>
                    <span className="absolute -right-8 top-1/2 -translate-y-1/2 hidden cursor-pointer rounded-full p-1 text-lg group-hover:inline-block">
                      ✏️
                    </span>
                  </div>
                )}
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

            <div className="grid gap-6 p-6 lg:grid-cols-[3fr_1fr]">
              <div className="space-y-6">
                <div className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  {editingField === 'description' ? (
                    <div onKeyDown={handleEditKeyDown}>
                      <p className="text-base font-semibold uppercase tracking-[0.22em] text-sky-500">Description 🧾</p>
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="mt-4 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-base leading-7 text-slate-600 outline-none ring-2 ring-blue-100"
                        rows="4"
                        autoFocus
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={handleSaveEditing} disabled={isUpdating} className="rounded-lg bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={handleCancelEditing} className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-300">
                          Cancel
                        </button>
                      </div>
                      {updateError && <p className="mt-1 text-sm text-red-600">{updateError}</p>}
                    </div>
                  ) : (
                    <div className="group relative" onClick={() => handleStartEditing('description', selectedProgram.description || '')}>
                      <p className="text-base font-semibold uppercase tracking-[0.22em] text-sky-500">Description 🧾</p>
                      <p className="mt-4 cursor-pointer text-base leading-7 text-slate-600">{selectedProgram.description || "No description has been provided for this program."}</p>
                      <span className="absolute -right-8 top-0 hidden cursor-pointer rounded-full p-1 text-lg group-hover:inline-block">✏️</span>
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-base font-semibold uppercase tracking-[0.22em] text-slate-500">Participants 👥</p>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                      {registeredParticipants.length}
                    </span>
                  </div>
                  {registeredParticipants.length === 0 ? (
                    <p className="mt-4 text-base text-slate-500">No participants have been added yet. 🙏</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {registeredParticipants.map((participant) => (
                        <li key={participant.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800">
                          <span>{participant.name}</span>
                          <button
                            type="button"
                            onClick={() => setParticipantToRemove(participant)}
                            className="text-red-500 hover:text-red-700 transition"
                            title="Remove participant"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-[24px] bg-slate-50 p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-950">Add client to this program ➕</p>
                    <p className="mt-1 text-base font-medium text-slate-600">Search a client by first or last name and add them to the program.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-base font-medium text-slate-700">Client name</label>
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
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                      {clientSearchError && <p className="mt-2 text-base text-red-600">{clientSearchError}</p>}
                      {clientAddSuccess && <p className="mt-2 text-base text-emerald-700">{clientAddSuccess}</p>}
                    </div>

                    {matchingClients.length > 0 && !selectedClient && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Matching clients</p>
                        <div className="mt-3 space-y-2">
                          {matchingClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => selectClient(client)}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-base text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                            >
                              {client.first_name} {client.last_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedClient && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-base text-slate-800">
                        Selected client: <span className="font-semibold">{selectedClient.first_name} {selectedClient.last_name}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddClientToProgram}
                      disabled={clientAddLoading}
                      className="inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {clientAddLoading ? "Adding client..." : "Add to Program"}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-base font-semibold uppercase tracking-[0.22em] text-sky-500">Program metrics 📊</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-3xl bg-sky-50 p-4" onKeyDown={handleEditKeyDown}>
                      {editingField === 'start_date' ? (
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Start</p>
                          <input
                            type="date"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none ring-2 ring-blue-100"
                            autoFocus
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button onClick={handleSaveEditing} disabled={isUpdating} className="rounded-lg bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                              {isUpdating ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEditing} className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-300">
                              Cancel
                            </button>
                          </div>
                          {updateError && editingField === 'start_date' && <p className="mt-1 text-sm text-red-600">{updateError}</p>}
                        </div>
                      ) : (
                        <div className="group relative" onClick={() => handleStartEditing('start_date', selectedProgram.start_date)}>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Start</p>
                          <p className="mt-2 cursor-pointer text-lg font-semibold text-slate-900">{formatProgramDate(selectedProgram.start_date)}</p>
                          <span className="absolute -right-8 top-1/2 -translate-y-1/2 hidden cursor-pointer rounded-full p-1 text-lg group-hover:inline-block">✏️</span>
                        </div>
                      )}
                    </div>
                    <div className="rounded-3xl bg-emerald-50 p-4" onKeyDown={handleEditKeyDown}>
                      {editingField === 'end_date' ? (
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">End</p>
                          <input
                            type="date"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none ring-2 ring-blue-100"
                            autoFocus
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button onClick={handleSaveEditing} disabled={isUpdating} className="rounded-lg bg-sky-600 px-3 py-1 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                              {isUpdating ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEditing} className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-300">
                              Cancel
                            </button>
                          </div>
                          {updateError && editingField === 'end_date' && <p className="mt-1 text-sm text-red-600">{updateError}</p>}
                        </div>
                      ) : (
                        <div className="group relative" onClick={() => handleStartEditing('end_date', selectedProgram.end_date)}>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">End</p>
                          <p className="mt-2 cursor-pointer text-lg font-semibold text-slate-900">{formatProgramDate(selectedProgram.end_date)}</p>
                          <span className="absolute -right-8 top-1/2 -translate-y-1/2 hidden cursor-pointer rounded-full p-1 text-lg group-hover:inline-block">✏️</span>
                        </div>
                      )}
                    </div>
                    <div className="rounded-3xl bg-indigo-50 p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">Registered</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{registeredParticipants.length}</p>
                    </div>
                    <div className="rounded-3xl bg-rose-50 p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">Missing to minimum</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{Math.max(0, (selectedProgram.min_members || 0) - registeredParticipants.length)}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Remaining to maximum</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedProgram.max_members > 0
                          ? Math.max(0, selectedProgram.max_members - registeredParticipants.length)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4">
          <div className="relative w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsManageModalOpen(false)}
              className="absolute right-6 top-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="max-h-[80vh] overflow-y-auto mt-4 px-2">
              <ManagePrograms onSuccess={() => setIsManageModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {participantToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-2xl font-bold text-slate-950">Confirm Removal</h3>
            <p className="mb-6 text-base text-slate-600">
              Are you sure you want to delete participant <span className="font-bold text-slate-900">{participantToRemove.name}</span> in program <span className="font-bold text-slate-900">{selectedProgram?.name}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setParticipantToRemove(null)}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveClientFromProgram(participantToRemove.id);
                  setParticipantToRemove(null);
                }}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {programToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-2xl font-bold text-slate-950">Confirm Delete Program</h3>
            <p className="mb-6 text-base text-slate-600">
              Are you sure you want to delete the program <span className="font-bold text-slate-900">{programToRemove.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProgramToRemove(null)}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProgram}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
