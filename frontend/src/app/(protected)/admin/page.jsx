"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";

export default function AdminDashboardPage() {
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const [programs, setPrograms] = useState([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);

  const [leads, setLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);

  // 4. Fetch Leads
  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoadingLeads(true);
      try {
        const clientsCol = collection(db, "clients");
        const clientsSnap = await getDocs(clientsCol);
        
        let fetchedLeads = [];
        
        clientsSnap.forEach((doc) => {
          const data = doc.data();
          // Filter logic
          if (data.status === "interested" && data.is_archived !== true) {
             let timeStr = "Unknown date";
             let createdDateObj = null;
             
             if (data.created_at && typeof data.created_at.toDate === 'function') {
               createdDateObj = data.created_at.toDate();
             } else if (data.created_at) {
               createdDateObj = new Date(data.created_at);
             }
             
             if (createdDateObj && !isNaN(createdDateObj.getTime())) {
               timeStr = createdDateObj.toLocaleDateString('en-GB', {
                 year: 'numeric',
                 month: '2-digit',
                 day: '2-digit'
               });
             }
             
             const firstName = data.first_name || "";
             const lastName = data.last_name || "";
             const fullName = `${firstName} ${lastName}`.trim() || "Unknown Lead";
             
             fetchedLeads.push({
               id: doc.id,
               name: fullName,
               phone: data.phone || "No phone provided",
               email: data.email || "No email provided",
               time: timeStr,
               createdDateObj: createdDateObj
             });
          }
        });
        
        // Sort leads by createdDateObj descending (newest first)
        fetchedLeads.sort((a, b) => {
           if (!a.createdDateObj) return 1;
           if (!b.createdDateObj) return -1;
           return b.createdDateObj - a.createdDateObj;
        });

        setLeads(fetchedLeads);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    
    fetchLeads();
  }, []);

  // Update kpis object to dynamically show pendingLeads count
  const kpis = {
    incompleteRegs: 14,
    activePlans: 8,
    pendingLeads: isLoadingLeads ? "..." : leads.length,
  };

  // Incomplete Registrations Data
  const incompletes = [
    { id: 201, name: "James Smith", stage: "Medical Profile", tagClass: "stage-medical" },
    { id: 202, name: "Olivia Martinez", stage: "Upload Documents", tagClass: "stage-documents" },
    { id: 203, name: "William Taylor", stage: "Payment Details", tagClass: "stage-payment" },
    { id: 204, name: "Sophia Anderson", stage: "Upload Documents", tagClass: "stage-documents" },
  ];

  // --- Database Fetching Logic (Events, Tasks, Programs & Leads) ---
  
  // 1. Fetch Todos for the KPI
  useEffect(() => {
    const fetchTodosForKPI = async () => {
      try {
        const todosCol = collection(db, "todos");
        const todosSnap = await getDocs(todosCol);
        const tasks = todosSnap.docs.map((d) => d.data());
        setPendingTasksCount(tasks.filter(t => !t.done).length);
      } catch (error) {
        console.error("Error fetching tasks for KPI:", error);
      } finally {
        setIsLoadingTasks(false);
      }
    };
    fetchTodosForKPI();
  }, []);

  // 2. Fetch Events for the Weekly Calendar
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const eventsCol = collection(db, "events");
        const eventsSnap = await getDocs(eventsCol);
        
        const fetchedEvents = eventsSnap.docs.map(doc => {
          const data = doc.data();
          
          // Calculate dayIndex (0 for Sunday, 1 for Monday, etc.)
          const dateObj = data.date ? new Date(data.date) : new Date(); 
          const dayIndex = dateObj.getDay();

          // Calculate startHour (e.g. "17:05" -> 17 + 5/60 = 17.0833)
          let startHour = 8; // Default fallback to 08:00
          if (data.time) {
            const [hh, mm] = data.time.split(":");
            startHour = parseInt(hh, 10) + (parseInt(mm, 10) / 60);
          }

          return {
            id: doc.id,
            title: data.title || "Untitled Meeting",
            date: data.date || "Unknown Date",
            time: data.time || "TBD",
            clientName: data.clientName || "",
            priority: data.priority || "normal",
            status: data.status || "scheduled",
            notes: data.notes || "",
            dayIndex: dayIndex,
            startHour: startHour,
            duration: 1 // Default 1 hour as requested
          };
        });

        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  // 3. Fetch Programs
  useEffect(() => {
    const fetchPrograms = async () => {
      setIsLoadingPrograms(true);
      try {
        // Try the lowercase collection name as it's the standard for this project
        const programsCol = collection(db, "programs");
        const programsSnap = await getDocs(programsCol);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today to avoid missing today's programs

        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(now.getMonth() + 3);

        const fetchedPrograms = programsSnap.docs
          .map(doc => {
            const data = doc.data();
            let startDateStr = "TBD";
            let programDate = null;
            
            // Format Firestore Timestamp or Date String
            if (data.start_date && typeof data.start_date.toDate === 'function') {
              programDate = data.start_date.toDate();
            } else if (data.start_date) {
               programDate = new Date(data.start_date);
            }
            
            if (programDate && !isNaN(programDate.getTime())) {
              startDateStr = programDate.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              });
            }

            // Safe fallbacks for both new schema and old schema
            return {
              id: doc.id,
              name: data.name || "Unnamed Program",
              startDate: startDateStr,
              programDate: programDate,
              location: data.location || "TBA",
              participantCount: data.participant_count ?? (data.participant_ids ? data.participant_ids.length : 0),
              maxMembers: data.max_members ?? data.max_participants ?? 0,
              status: data.status || "Upcoming"
            };
          })
          .filter(prog => {
             const statusLower = (prog.status || "").trim().toLowerCase();
             
             // Keep if explicitly marked as active (in English or Hebrew)
             if (statusLower === "active" || statusLower === "פעיל") return true;
             
             // Keep if starting within the next 3 months (including today)
             if (prog.programDate && !isNaN(prog.programDate.getTime())) {
               return prog.programDate >= now && prog.programDate <= threeMonthsFromNow;
             }
             
             return false;
          });

        setPrograms(fetchedPrograms);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setIsLoadingPrograms(false);
      }
    };
    
    fetchPrograms();
  }, []);

  // Weekly Calendar configuration constants
  const CALENDAR_START_HOUR = 8;
  const CALENDAR_END_HOUR = 20; // Show until 8 PM
  const HOUR_HEIGHT = 60; // 60 pixels per hour
  const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      {/* 
        NO EXTERNAL FRAMEWORKS / NO TAILWIND 
        Clean, vanilla CSS specifically structured for this dashboard.
      */}
      <style>{`
        .dashboard-container {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 32px;
          color: #1f2937;
          direction: ltr;
        }
        
        .header-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 32px 0;
          color: #111827;
          letter-spacing: -0.02em;
        }

        /* Top Summary Row (KPIs) */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        .kpi-card {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
          border: 1px solid #f1f5f9;
        }
        .kpi-title {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
        }

        /* Main Content Layout */
        .main-layout {
          display: flex;
          gap: 32px;
        }
        .left-col {
          flex: 0 0 60%;
          display: flex;
          flex-direction: column;
          gap: 32px;
          min-width: 0;
        }
        .right-col {
          flex: 0 0 calc(40% - 32px);
          display: flex;
          flex-direction: column;
          gap: 32px;
          min-width: 0;
        }

        /* Generic Widget Panel */
        .widget-panel {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
        }
        .widget-header {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        /* Left Column: Programs */
        .programs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .program-card {
          padding: 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .program-active {
          background-color: #ecfdf5; /* soft green bg */
          border-left: 4px solid #10b981;
        }
        .program-upcoming {
          background-color: #eff6ff; /* soft blue bg */
          border-left: 4px solid #3b82f6;
        }
        .program-name {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        .program-participants {
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .program-meta {
          font-size: 12px;
          color: #475569;
          margin: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .program-upcoming .program-meta span:last-child {
          font-weight: 700;
          color: #1e40af;
        }

        /* Left Column: Custom Weekly Calendar */
        .calendar-loading {
          padding: 40px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
        }
        .calendar-wrapper {
          display: flex;
          flex-direction: column;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          background: #ffffff;
          overflow: hidden;
          flex-grow: 1;
        }
        .calendar-header {
          display: flex;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .time-axis-header {
          width: 50px;
          flex-shrink: 0;
          border-right: 1px solid #f1f5f9;
        }
        .day-column-header {
          flex: 1;
          text-align: center;
          padding: 12px 0;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          border-right: 1px solid #f1f5f9;
        }
        .day-column-header:last-child {
          border-right: none;
        }
        .calendar-body {
          display: flex;
          position: relative;
          height: 480px; /* Fixed height for scrolling */
          overflow-y: auto;
        }
        .time-axis {
          width: 50px;
          flex-shrink: 0;
          border-right: 1px solid #f1f5f9;
          background: #ffffff;
        }
        .time-label-cal {
          height: 60px; /* Maps to HOUR_HEIGHT */
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-size: 11px;
          color: #94a3b8;
          padding-top: 4px;
          border-bottom: 1px solid #f8fafc;
          box-sizing: border-box;
        }
        .days-container {
          display: flex;
          flex: 1;
          position: relative;
          background-image: linear-gradient(to bottom, #f8fafc 1px, transparent 1px);
          background-size: 100% 60px; /* Matches HOUR_HEIGHT */
        }
        .day-column {
          flex: 1;
          position: relative;
          border-right: 1px solid #f1f5f9;
        }
        .day-column:last-child {
          border-right: none;
        }
        
        /* Calendar Event Card Styles */
        .calendar-event {
          position: absolute;
          left: 4px;
          right: 4px;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 11px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
          cursor: pointer;
        }
        .calendar-event:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 20;
        }
        .event-default {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          color: #1e3a8a;
        }
        .event-high {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #7f1d1d;
        }
        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 4px;
        }
        .event-title {
          font-weight: 700;
          font-size: 12px;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .event-icon {
          font-size: 12px;
          flex-shrink: 0;
        }
        .event-time {
          font-size: 10px;
          font-weight: 600;
          opacity: 0.8;
        }
        .event-client {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        /* Custom Tooltip */
        .custom-tooltip {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 6px;
          min-width: 200px;
          background-color: #f0f9ff;
          border: 1px solid #7dd3fc;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease;
          pointer-events: none;
          text-align: left;
          cursor: default;
        }
        /* Keep it on screen for rightmost columns */
        .day-column:nth-child(n+5) .custom-tooltip {
          left: auto;
          right: 0;
        }
        .calendar-event:hover .custom-tooltip {
          opacity: 1;
          visibility: visible;
        }
        .tooltip-title {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 6px;
          color: #0369a1;
          border-bottom: 1px solid #bae6fd;
          padding-bottom: 4px;
        }
        .tooltip-content {
          font-size: 12px;
          line-height: 1.4;
          white-space: pre-wrap;
          color: #334155;
          font-weight: 400;
        }

        /* Right Column: Leads */
        .list-container {
          display: flex;
          flex-direction: column;
        }
        .lead-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .lead-item:last-child {
          border-bottom: none;
        }
        .lead-info h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
        }
        .lead-info p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
        }
        .lead-actions {
          display: flex;
          gap: 10px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .btn-outline {
          background-color: transparent;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .btn-outline:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
        }
        .btn-primary {
          background-color: #ffffff;
          border: 1px solid #3b82f6;
          color: #3b82f6;
        }
        .btn-primary:hover {
          background-color: #eff6ff;
        }

        /* Right Column: Incomplete Registrations */
        .reg-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .reg-item:last-child {
          border-bottom: none;
        }
        .reg-name {
          font-size: 15px;
          font-weight: 500;
          color: #0f172a;
          margin: 0;
        }
        .status-tag {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        /* Soft Red/Orange for urgent/medical items */
        .stage-medical {
          background-color: #fee2e2;
          color: #991b1b;
        }
        /* Soft Yellow/Orange for documents */
        .stage-documents {
          background-color: #fef3c7;
          color: #92400e;
        }
        /* Soft Blue for payment/logistics */
        .stage-payment {
          background-color: #e0e7ff;
          color: #1e40af;
        }

        /* Responsive Layout */
        @media (max-width: 1024px) {
          .main-layout {
            flex-direction: column;
          }
          .left-col, .right-col {
            flex: 1 1 auto;
          }
          .kpi-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .kpi-row {
            grid-template-columns: 1fr;
          }
          .programs-grid {
            grid-template-columns: 1fr;
          }
          .lead-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .calendar-header .day-column-header {
            font-size: 10px;
          }
        }
      `}</style>

      <div className="dashboard-container">
        <h1 className="header-title">Admin Dashboard</h1>

        {/* 1. Top Summary Row (4 KPI cards) */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-title">Incomplete Registrations</div>
            <div className="kpi-value">{kpis.incompleteRegs}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Active Plans</div>
            <div className="kpi-value">{kpis.activePlans}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Pending Leads</div>
            <div className="kpi-value">{kpis.pendingLeads}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Today's Tasks</div>
            <div className="kpi-value">{isLoadingTasks ? "..." : pendingTasksCount}</div>
          </div>
        </div>

        {/* 2. Main Content Body */}
        <div className="main-layout">
          
          {/* LEFT COLUMN (~60%) */}
          <div className="left-col">
            
            {/* Widget A: Active and Future Programs */}
            <div className="widget-panel">
              <h2 className="widget-header">Active and Future Programs</h2>
              {isLoadingPrograms ? (
                <div style={{ padding: '20px', color: '#64748b', fontSize: '14px' }}>Loading programs...</div>
              ) : programs.length === 0 ? (
                <div style={{ padding: '20px', color: '#64748b', fontSize: '14px' }}>No active or upcoming programs found.</div>
              ) : (
                <div className="programs-grid">
                  {programs.map((prog) => (
                    <div 
                      key={prog.id} 
                      className={`program-card ${prog.status.toLowerCase() === 'active' ? 'program-active' : 'program-upcoming'}`}
                    >
                      <h3 className="program-name">{prog.name}</h3>
                      <p className="program-participants">
                        👥 {prog.participantCount} / {prog.maxMembers} Participants
                      </p>
                      <div className="program-meta">
                        <span>{prog.location}</span>
                        <span>
                          {prog.startDate} {prog.endDate ? `- ${prog.endDate}` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget B: Custom Weekly Calendar */}
            <div className="widget-panel" style={{ flexGrow: 1 }}>
              <h2 className="widget-header">Weekly Schedule</h2>
              {isLoadingEvents ? (
                <div className="calendar-loading">Loading schedule...</div>
              ) : (
                <div className="calendar-wrapper">
                  
                  {/* Calendar Header: Days of the week */}
                  <div className="calendar-header">
                    <div className="time-axis-header"></div>
                    {WEEK_DAYS.map(day => (
                      <div key={day} className="day-column-header">{day}</div>
                    ))}
                  </div>

                  {/* Calendar Body: Grid of times and events */}
                  <div className="calendar-body">
                    
                    {/* Time labels axis */}
                    <div className="time-axis">
                      {Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 }).map((_, i) => (
                        <div key={i} className="time-label-cal">
                          {`${(CALENDAR_START_HOUR + i).toString().padStart(2, '0')}:00`}
                        </div>
                      ))}
                    </div>

                    {/* Columns for each day */}
                    <div className="days-container">
                      {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                        // Filter events belonging to this specific day of the week
                        const dayEvents = events.filter(e => e.dayIndex === dayIndex);
                        
                        return (
                          <div key={dayIndex} className="day-column">
                            {dayEvents.map(event => {
                              // Calculate pixel positions
                              const topPx = (event.startHour - CALENDAR_START_HOUR) * HOUR_HEIGHT;
                              const heightPx = event.duration * HOUR_HEIGHT;
                              
                              // Ensure events before 08:00 don't fly out of the container top
                              const clampedTop = Math.max(0, topPx);

                              return (
                                <div 
                                  key={event.id} 
                                  className={`calendar-event ${event.priority === 'high' ? 'event-high' : 'event-default'}`}
                                  style={{ 
                                    top: `${clampedTop}px`, 
                                    height: `${heightPx}px` 
                                  }}
                                >
                                  <div className="event-header">
                                    <span className="event-title">{event.title}</span>
                                    {event.notes && <span className="event-icon">📝</span>}
                                  </div>
                                  <div className="event-time">{event.time}</div>
                                  {event.clientName && (
                                    <div className="event-client">{event.clientName}</div>
                                  )}
                                  
                                  {/* Custom Tooltip */}
                                  {event.notes && (
                                    <div className="custom-tooltip">
                                      <div className="tooltip-title">Meeting details</div>
                                      <div className="tooltip-content">{event.notes}</div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>

                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (~40%) */}
          <div className="right-col">
            
            {/* Widget A: Leads to conversation */}
            <div className="widget-panel">
              <h2 className="widget-header">Leads to Conversation</h2>
              {isLoadingLeads ? (
                <div style={{ padding: '20px', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>Loading leads...</div>
              ) : leads.length === 0 ? (
                <div style={{ padding: '20px', color: '#64748b', fontSize: '14px', textAlign: 'center' }}>No pending leads at the moment.</div>
              ) : (
                <div className="list-container">
                  {leads.map((lead) => (
                    <div key={lead.id} className="lead-item">
                      <div className="lead-info">
                        <h4>{lead.name}</h4>
                        <p>📞 {lead.phone}</p>
                        <p>✉️ {lead.email}</p>
                        <p style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>Created: {lead.time}</p>
                      </div>
                      <div className="lead-actions" style={{ flexDirection: 'column', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ width: '100%' }}>Conversation</button>
                        <Link href={`/admin/clients?id=${lead.id}`} className="btn btn-outline" style={{ width: '100%' }}>
                          Update status
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget B: Incomplete Registrations */}
            <div className="widget-panel">
              <h2 className="widget-header">Incomplete Registrations</h2>
              <div className="list-container">
                {incompletes.map((reg) => (
                  <div key={reg.id} className="reg-item">
                    <p className="reg-name">{reg.name}</p>
                    <span className={`status-tag ${reg.tagClass}`}>
                      {reg.stage}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
