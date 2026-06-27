"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Plus, CalendarDays, UsersRound, CheckCircle2, X } from "lucide-react";
import { db, isFirebaseInitialized } from "@/firebase/firebase";
// Keep the manage-programs UI private to this route so it cannot register as a standalone URL.
import ManagePrograms from "./_components/ManagePrograms";

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
  const [selectedYear, setSelectedYear] = useState(null);

  const availableYears = useMemo(() => {
    const years = programs.map(p => {
      const date = p.start_date?.toDate?.() ? p.start_date.toDate() : new Date(p.start_date || 0);
      return date.getFullYear();
    }).filter(y => !isNaN(y) && y > 1900);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [programs]);

 const activeYear = useMemo(() => {
    if (selectedYear !== null) return selectedYear;
    if (availableYears.length === 0) return null;
    
    const currentYear = new Date().getFullYear();
    if (availableYears.includes(currentYear)) {
      return currentYear;
    }
    return availableYears.reduce((prev, curr) => 
      Math.abs(curr - currentYear) < Math.abs(prev - currentYear) ? curr : prev
    );
  }, [selectedYear, availableYears]);

  const filteredPrograms = useMemo(() => {
    if (!activeYear) return programs;
    return programs.filter(p => {
      const date = p.start_date?.toDate?.() ? p.start_date.toDate() : new Date(p.start_date || 0);
      return date.getFullYear() === activeYear;
    });
  }, [programs, activeYear]);

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
          <>
            {availableYears.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                      activeYear === year
                        ? "bg-[#2C6975] text-white shadow-md"
                        : "bg-white text-[#2C6975] ring-1 ring-[#CDE0C9] hover:bg-[#EEF4EC]"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
            {filteredPrograms.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[#B9CFCA] bg-[#FFFDF8] p-10 text-center">
                <p className="mt-4 text-lg font-bold text-[#31585F]">No programs found for {activeYear}</p>
              </div>
            ) : (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredPrograms.map((program) => {
                  const now = new Date().getTime();
                  const start = program.start_date?.toDate?.() ? program.start_date.toDate() : new Date(program.start_date || 0);
                  const end = program.end_date?.toDate?.() ? program.end_date.toDate() : new Date(program.end_date || 0);
                  let statusText = "Upcoming";
                  let statusClass = "bg-cyan-100 text-cyan-800";
                  let borderClass = "ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] bg-gradient-to-br from-cyan-50/50 to-white";
                  
                  if (now >= start.getTime() && now <= end.getTime()) {
                    statusText = "In progress";
                    statusClass = "bg-[#4F8B75] text-white";
                    borderClass = "ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] bg-gradient-to-br from-emerald-50/50 to-white";
                  } else if (now > end.getTime()) {
                    statusText = "Completed";
                    statusClass = "bg-[#EEF1EE] text-[#687B7E]";
                    borderClass = "border border-slate-200 bg-slate-50 opacity-90 shadow-sm hover:shadow-md";
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
                      className={`cursor-pointer rounded-[24px] p-6 transition hover:-translate-y-1 relative group ${borderClass}`}
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
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>

      {selectedProgram && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#15383E]/70 p-4 pt-24 backdrop-blur-sm">
          <div className="relative max-h-[calc(100vh-7rem)] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/50 bg-[#F3F6F0] shadow-[0_24px_60px_rgba(21,56,62,0.24)]" role="dialog" aria-modal="true" aria-label="Program details">
            {clientAddSuccess && (
              <div className="absolute left-1/2 top-5 z-50 w-full max-w-md -translate-x-1/2 px-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-5 py-3 text-sm text-emerald-900 shadow-lg backdrop-blur-sm">
                  <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />{clientAddSuccess}</p>
                </div>
              </div>
            )}
            <div className="flex items-start justify-between gap-4 bg-[#2C6975] p-6 text-white">
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition hover:bg-white/20"
                aria-label="Close program details"
              >
                <X aria-hidden="true" className="h-5 w-5" />
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
                    <div className="rounded-xl bg-[#EEF4EC] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">Registered</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{registeredParticipants.length}</p>
                    </div>
                    <div className="rounded-xl bg-[#F7EEEE] p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">Missing to minimum</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{Math.max(0, (selectedProgram.min_members || 0) - registeredParticipants.length)}</p>
                    </div>
                    <div className="rounded-xl bg-[#EEF1EE] p-4">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#15383E]/70 p-4 pt-24 backdrop-blur-sm">
          <div className="relative max-h-[calc(100vh-7rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/50 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(21,56,62,0.24)]" role="dialog" aria-modal="true" aria-label="Manage program">
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

      {participantToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 pt-24">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 pt-24">
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
