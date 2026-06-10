"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";
import { getEvents } from "@/firebase/eventsService";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract query parameters instantly during initialization to manage UI states safely
  const isEmailNotVerifiedParam = searchParams.get("emailNotVerified") === "1";
  const isAccessDeniedParam = searchParams.get("accessDenied") === "1";

  // Keeps track of the access denied error alert rendering state
  const [showAccessDenied, setShowAccessDenied] = useState(isAccessDeniedParam);

  // --- Dashboard Data State ---
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [metrics, setMetrics] = useState({
    totalClients: 0,
    pendingTasks: 0,
    urgentInfo: 0,
  });

  const [todos, setTodos] = useState([]);
  const [leads, setLeads] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    if (!showAccessDenied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowAccessDenied(false);
      router.replace("/home", { scroll: false });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [showAccessDenied, router]);

  useEffect(() => {
    if ((isEmailNotVerifiedParam || isAccessDeniedParam) && !showAccessDenied) {
      router.replace("/home", { scroll: false });
    }
  }, [isEmailNotVerifiedParam, isAccessDeniedParam, showAccessDenied, router]);

  // --- Authentication & Data Fetching Effect ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setShowAccessDenied(true);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const userDocRef = doc(db, "accounts", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().role === "Admin") {
          setIsAdmin(true);
          await fetchDashboardData();
        } else {
          setIsAdmin(false);
          setShowAccessDenied(true);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setIsAdmin(false);
        setShowAccessDenied(true);
      } finally {
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Todos
      const todosCol = collection(db, "todos");
      const todosSnap = await getDocs(todosCol);
      const fetchedTodos = todosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const pendingTasksCount = fetchedTodos.filter(t => !t.done).length;
      setTodos(fetchedTodos);

      // 2. Fetch Clients & Leads
      const clientsCol = collection(db, "clients");
      const clientsSnap = await getDocs(clientsCol);
      const clientsData = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const totalClientsCount = clientsData.length;
      let urgentInfoCount = 0;
      const interestedLeads = [];
      
      clientsData.forEach(client => {
        // Urgent info heuristic: Registered clients missing passport_id or having empty contacts array
        if (client.status === "registered" && (!client.passport_id || !client.contacts || client.contacts.length === 0)) {
          urgentInfoCount++;
        }
        
        // Collect leads
        if (client.status === "interested") {
          interestedLeads.push({
            id: client.id,
            name: `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Unknown",
            interest: "Interested", // Simplification since there's no specific program interest field
            phone: client.phone || "No phone",
            status: "New", // Default to New for now
            created_at: client.created_at?.toMillis ? client.created_at.toMillis() : 0,
          });
        }
      });
      
      // Sort leads by created_at descending and take top 5
      interestedLeads.sort((a, b) => b.created_at - a.created_at);
      setLeads(interestedLeads.slice(0, 5));
      
      // 3. Fetch Programs
      const programsCol = collection(db, "programs");
      const programsSnap = await getDocs(programsCol);
      const nowTime = new Date().getTime();
      
      const fetchedPrograms = programsSnap.docs.map(doc => {
        const data = doc.data();
        const participantsCount = data.participant_ids ? data.participant_ids.length : 0;
        const max = data.max_participants || 25;
        const endDate = (data.end_date?.toDate?.() || new Date(data.end_date || 0)).getTime();
        
        return {
          id: doc.id,
          name: data.name || "Unnamed Program",
          participants: participantsCount,
          max: max,
          status: endDate >= nowTime ? "Active" : "Completed",
          endDate: endDate
        };
      }).filter(p => p.status === "Active").slice(0, 5); // take up to 5 active programs
      
      setPrograms(fetchedPrograms);

      // 4. Fetch Meetings/Events
      const upcomingEvents = await getEvents();
      const fetchedMeetings = upcomingEvents.slice(0, 5).map(event => ({
        id: event.id,
        title: event.title || event.type || "Meeting",
        time: event.time || "TBD",
        location: event.location || "TBD"
      }));
      setMeetings(fetchedMeetings);

      // Set Metrics
      setMetrics({
        totalClients: totalClientsCount,
        pendingTasks: pendingTasksCount,
        urgentInfo: urgentInfoCount,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  // Toggle ToDo status
  const toggleTodo = async (id) => {
    // Optimistic update
    const todoToUpdate = todos.find(t => t.id === id);
    if (!todoToUpdate) return;
    
    const newStatus = !todoToUpdate.done;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: newStatus } : t)));
    
    // Update in Firestore
    try {
      const todoRef = doc(db, "todos", id);
      await updateDoc(todoRef, { done: newStatus });
    } catch (error) {
      console.error("Error updating todo:", error);
      // Revert optimistic update on failure
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !newStatus } : t)));
    }
  };

  if (isLoadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-xl font-bold text-slate-500 animate-pulse">Loading Dashboard...</div>
      </main>
    );
  }

  /* Internal comments in code are always in English */
  return (
    <main className={`min-h-screen bg-slate-50 px-6 py-8 text-slate-900 ${!isAdmin ? 'flex items-center justify-center' : ''}`}>
      {/* Access Denied Localized Toast Notice - Now completely stable for 2 full seconds */}
      {showAccessDenied && (
        <div
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,460px)] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-700 shadow-lg"
          role="alert"
        >
          אין לך הרשאה לגשת לדף זה
        </div>
      )}

      {isAdmin && (
        <div className="mx-auto max-w-7xl">
          
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              Manager Dashboard 📊
            </h1>
            <p className="mt-2 text-lg text-slate-600">Welcome back. Here is your daily overview.</p>
          </div>

          {/* Metrics Row */}
          <div className="grid gap-6 mb-8 sm:grid-cols-3">
            <div className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-sky-500">Total Clients 👥</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">{metrics.totalClients}</p>
            </div>
            <div className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-amber-500">Pending Tasks ⏳</p>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">{metrics.pendingTasks}</p>
            </div>
            <div className="rounded-[24px] bg-gradient-to-br from-rose-500 to-rose-600 p-6 shadow-md ring-1 ring-rose-300">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-rose-100">Urgent Missing Info ⚠️</p>
              <p className="mt-2 text-4xl font-extrabold text-white">{metrics.urgentInfo}</p>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid gap-8 lg:grid-cols-2">
            
            {/* LEFT COLUMN */}
            <div className="space-y-8">
              {/* Leads List */}
              <section className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">🎯 Interested Leads</h2>
                <div className="space-y-4">
                  {leads.length === 0 ? (
                    <p className="text-slate-500">No interested leads at the moment.</p>
                  ) : (
                    leads.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <div>
                          <p className="font-bold text-slate-900">{lead.name}</p>
                          <p className="text-sm text-slate-500">{lead.interest} • {lead.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${lead.status === "New" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                            {lead.status}
                          </span>
                          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300">📞</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* ToDo List */}
              <section className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">✅ Daily ToDo List</h2>
                <div className="space-y-3">
                  {todos.length === 0 ? (
                    <p className="text-slate-500">No tasks currently. You're all caught up!</p>
                  ) : (
                    todos.map((todo) => (
                      <label key={todo.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                        <input 
                          type="checkbox" 
                          checked={todo.done} 
                          onChange={() => toggleTodo(todo.id)}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={`text-lg font-medium transition-colors ${todo.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {todo.title}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-8">
              {/* Upcoming Meetings */}
              <section className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">🗓️ Upcoming Meetings</h2>
                <div className="divide-y divide-slate-100">
                  {meetings.length === 0 ? (
                    <p className="text-slate-500">No upcoming meetings scheduled.</p>
                  ) : (
                    meetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 font-bold text-indigo-600 ring-1 ring-indigo-100 text-sm text-center px-1">
                          {meeting.time?.split(" ")[0] || "TBD"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{meeting.title}</p>
                          <p className="text-sm text-slate-500">📍 {meeting.location}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Active Programs */}
              <section className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-4 text-2xl font-bold text-slate-900">🚀 Active Programs</h2>
                <div className="space-y-4">
                  {programs.length === 0 ? (
                    <p className="text-slate-500">No active programs at the moment.</p>
                  ) : (
                    programs.map((program) => (
                      <div key={program.id} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="font-bold text-slate-900">{program.name}</h3>
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-100 px-2 py-1 rounded-full">
                            {program.status}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-600">
                          <span>Participants:</span>
                          <span>{program.participants} / {program.max}</span>
                        </div>
                        {/* Simple progress bar */}
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div 
                            className="h-full bg-sky-500 transition-all" 
                            style={{ width: `${Math.min((program.participants / program.max) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}