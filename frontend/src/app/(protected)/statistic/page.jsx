"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CalendarCheck, 
  AlertCircle,
  Activity,
  UserX,
  ClipboardCheck,
  Megaphone,
  MapPin,
  HeartHandshake,
  Download,
  Settings2,
  Clock
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  LineChart, 
  Line,
  ResponsiveContainer 
} from 'recharts';

import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const COLORS = ['#2C6975', '#6BB2A0', '#9BCB8E', '#D2A94F', '#7FA7B2'];
const DONUT_COLORS = ['#E58A7A', '#7FA7B2', '#6BB2A0', '#2C6975'];

export default function StatisticsPage() {
  const [clients, setClients] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [activeAlertRules, setActiveAlertRules] = useState(['passport_id', 'dob']);
  const [isAlertMenuOpen, setIsAlertMenuOpen] = useState(false);
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState({
    kpis: true,
    growth: true,
    occupancy: true,
    demographics: true,
    gender: true,
    compliance: true,
    engagement: true,
    referrals: true,
    locations: true,
    intake: true,
    lengthOfStay: true, // הגרף החדש פעיל כברירת מחדל
  });

  const [isWidgetsConfigLoaded, setIsWidgetsConfigLoaded] = useState(false);

  // טעינה מהזיכרון כשהדף נפתח - מעודכן למניעת דריסת ווידג'טים חדשים
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const savedConfig = localStorage.getItem("dashboard_widgets_v1");
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            // מיזוג הגדרות כדי לשמור על ווידג'טים חדשים שהתווספו לקוד
            setVisibleWidgets(prev => ({ ...prev, ...parsed }));
          } catch (error) {
            console.error("Error parsing saved widget config:", error);
          }
        }
        setIsWidgetsConfigLoaded(true);
      }, 0);
    }
  }, []);

  // שמירה לזיכרון בכל פעם שהמנהל משנה משהו
  useEffect(() => {
    if (isWidgetsConfigLoaded && typeof window !== "undefined") {
      localStorage.setItem("dashboard_widgets_v1", JSON.stringify(visibleWidgets));
    }
  }, [visibleWidgets, isWidgetsConfigLoaded]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsSnap = await getDocs(collection(db, "clients"));
        const programsSnap = await getDocs(collection(db, "programs"));

        const clientsData = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const programsData = programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setClients(clientsData.filter(c => !c.is_archived));
        setPrograms(programsData);
      } catch (error) {
        console.error("Error fetching statistics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (!clients.length && !programs.length) return null;

    // 1. Demographics
    let ageGroups = { '<18': 0, '18-25': 0, '26-35': 0, '36+': 0, 'Unknown': 0 };
    const now = new Date();
    const currentYear = 2026;

    // 2. Action Items
    const actionItems = [];

    // 3. Growth Data
    const monthCounts = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthCounts[`${months[d.getMonth()]} ${d.getFullYear()}`] = 0;
    }

    let recentClients = 0;
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Counters
    let unassignedClientsCount = 0;
    const unassignedClientsList = [];
    let fullyCompliant = 0;
    let missingForms = 0;
    let statusCounts = { invited: 0, interested: 0, registered: 0 };
    let genderCounts = { male: 0, female: 0, other: 0, unknown: 0 };
    
    const sourceCounts = {};
    const locationCounts = {};

    let retentionCounts = {
      "not embedded": 0,
      "one program": 0,
      "two programs": 0,
      "returning clients": 0
    };

    // קבוצות משך שהייה מבוקשות
    let stayDurationGroups = {
      'Month & Under': 0,
      '1-3 Months': 0,
      '4-6 Months': 0,
      '7-12 Months': 0,
      '1-2 Years': 0,
      '2+ Years': 0
    };

    clients.forEach(client => {
      // Age calculation
      if (client.dob) {
        const dob = new Date(client.dob);
        if (!isNaN(dob.getTime())) {
          let age = currentYear - dob.getFullYear();
          if (age < 18) ageGroups['<18']++;
          else if (age >= 18 && age <= 25) ageGroups['18-25']++;
          else if (age >= 26 && age <= 35) ageGroups['26-35']++;
          else if (age >= 36) ageGroups['36+']++;
          else ageGroups['Unknown']++;
        } else {
          ageGroups['Unknown']++;
        }
      } else {
        ageGroups['Unknown']++;
      }

      // Action Items Checks
      const name = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client';

      if (activeAlertRules.includes('passport_id') && client.status === 'registered' && !client.passport_id) {
        actionItems.push({ id: `${client.id}-id`, client: name, issue: 'Missing ID/Passport', severity: 'high' });
      }
      if (activeAlertRules.includes('dob') && !client.dob) {
        actionItems.push({ id: `${client.id}-dob`, client: name, issue: 'Missing Date of Birth', severity: 'medium' });
      }
      if (activeAlertRules.includes('phone') && !client.phone) {
        actionItems.push({ id: `${client.id}-phone`, client: name, issue: 'Missing Phone Number', severity: 'medium' });
      }
      if (activeAlertRules.includes('email') && !client.email) {
        actionItems.push({ id: `${client.id}-email`, client: name, issue: 'Missing Email Address', severity: 'medium' });
      }
      if (activeAlertRules.includes('address') && !client.address) {
        actionItems.push({ id: `${client.id}-address`, client: name, issue: 'Missing Home Address', severity: 'low' });
      }
      if (activeAlertRules.includes('contacts') && (!client.contacts || client.contacts.length === 0)) {
        actionItems.push({ id: `${client.id}-contacts`, client: name, issue: 'No Emergency Contacts', severity: 'high' });
      }
      if (activeAlertRules.includes('medical') && !client.medical_profile) {
        actionItems.push({ id: `${client.id}-med`, client: name, issue: 'Missing Medical Profile', severity: 'high' });
      }

      // Growth Calculation
      let createdDate = null;
      if (client.created_at) {
        createdDate = client.created_at.toDate ? client.created_at.toDate() : new Date(client.created_at);
      }
      
      if (createdDate && !isNaN(createdDate.getTime())) {
        const monthKey = `${months[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
        if (monthCounts[monthKey] !== undefined) {
          monthCounts[monthKey]++;
        }
        if (createdDate > thirtyDaysAgo) {
          recentClients++;
        }
      }

      // Unassigned & Retention Logic
      const participatedPrograms = client.program_ids?.length || 0;
      
      if (participatedPrograms === 0) {
        unassignedClientsCount++;
        retentionCounts["not embedded"]++;
        unassignedClientsList.push({
          id: client.id,
          name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client'
        });
      } else if (participatedPrograms === 1) {
        retentionCounts["one program"]++;
      } else if (participatedPrograms === 2) {
        retentionCounts["two programs"]++;
      } else {
        retentionCounts["returning clients"]++;
      }

      // Compliance Logic
      if (client.medical_profile) {
        fullyCompliant++;
      } else {
        missingForms++;
      }

      // Referral Source Logic
      let source = client.referrer;
      if (source && source.trim() !== "") {
         sourceCounts[source.trim()] = (sourceCounts[source.trim()] || 0) + 1;
      }

      // Geographic Location Logic
      let rawAddress = client.address;
      if (rawAddress && rawAddress.trim() !== "") {
        const parts = rawAddress.split(',');
        const cityPart = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
        if (cityPart) {
          locationCounts[cityPart] = (locationCounts[cityPart] || 0) + 1;
        }
      }

      // Funnel Status Logic
      if (client.status) {
        const s = client.status.toLowerCase();
        if (statusCounts[s] !== undefined) {
          statusCounts[s]++;
        }
      }

      // Gender Logic
      if (client.gender) {
        const g = client.gender.toLowerCase();
        if (g === 'male') genderCounts.male++;
        else if (g === 'female') genderCounts.female++;
        else genderCounts.other++;
      } else {
        genderCounts.unknown++;
      }

      // חישוב אורך שהייה מצטבר מתוך מערך stays
      let totalDays = 0;
      if (client.stays && Array.isArray(client.stays)) {
        client.stays.forEach(stay => {
          if (stay.arrivedAt && stay.departedAt) {
            const arrived = new Date(stay.arrivedAt);
            const departed = new Date(stay.departedAt);
            if (!isNaN(arrived.getTime()) && !isNaN(departed.getTime())) {
              const diffTime = departed.getTime() - arrived.getTime();
              if (diffTime > 0) {
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDays += diffDays;
              }
            }
          }
        });
      }

      // חלוקה לקבוצות (Buckets) לפי סך ימי השהייה
      if (totalDays > 0) {
        if (totalDays <= 30) stayDurationGroups['Month & Under']++;
        else if (totalDays <= 90) stayDurationGroups['1-3 Months']++;
        else if (totalDays <= 180) stayDurationGroups['4-6 Months']++;
        else if (totalDays <= 365) stayDurationGroups['7-12 Months']++;
        else if (totalDays <= 730) stayDurationGroups['1-2 Years']++;
        else stayDurationGroups['2+ Years']++;
      }
    });

    const demographicsData = Object.entries(ageGroups)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const growthData = Object.entries(monthCounts).map(([month, signups]) => ({
      month,
      signups
    }));

    const statusFunnelData = [
      { name: 'Invited', value: statusCounts.invited },
      { name: 'Interested', value: statusCounts.interested },
      { name: 'Registered', value: statusCounts.registered }
    ];

    const genderData = [
      { name: 'Male', value: genderCounts.male },
      { name: 'Female', value: genderCounts.female },
      { name: 'Other/Unknown', value: genderCounts.other + genderCounts.unknown }
    ].filter(g => g.value > 0);

    const complianceData = [
      { name: 'Fully Compliant', value: fullyCompliant },
      { name: 'Missing Forms', value: missingForms }
    ];

    const referralData = Object.entries(sourceCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const retentionData = Object.entries(retentionCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const lengthOfStayData = Object.entries(stayDurationGroups)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const topLocations = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const programOccupancyData = programs.map(p => {
      const enrolled = Array.isArray(p.participant_ids) ? p.participant_ids.length : 0;
      const capacity = p.capacity || p.max_participants || p.min_members || 50; 
      return {
        name: p.name || 'Unnamed Program',
        capacity: capacity,
        enrolled: enrolled
      };
    }).filter(p => p.enrolled > 0 || p.capacity > 0);

    const activeProgramsList = programs.filter(p => {
      if (!p.start_date || !p.end_date) return false;
      const start = p.start_date.toDate ? p.start_date.toDate() : new Date(p.start_date);
      const end = p.end_date.toDate ? p.end_date.toDate() : new Date(p.end_date);
      return now >= start.getTime() && now <= end.getTime();
    });
    const activeProgramsCount = activeProgramsList.length;

    const kpiData = [
      { id: 1, title: 'Total Clients', value: clients.length, icon: Users, trend: `${recentClients} new clients in 30 days`, color: 'text-blue-600', bgColor: 'bg-blue-100' },
      { id: 2, title: 'Active Programs', value: activeProgramsCount, icon: CalendarCheck, trend: `${programs.length} total programs`, color: 'text-green-600', bgColor: 'bg-green-100' },
      { id: 3, title: 'Unassigned Clients', value: unassignedClientsCount, icon: UserX, trend: 'Needs program assignment', color: 'text-rose-600', bgColor: 'bg-rose-100' },
      { id: 4, title: 'Pending Actions', value: actionItems.length, icon: AlertCircle, trend: 'Needs attention', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    ];

    return {
      demographicsData,
      growthData,
      programOccupancyData,
      actionItems: actionItems.slice(0, 15),
      kpiData,
      complianceData,
      referralData,
      retentionData,
      lengthOfStayData,
      topLocations,
      activeProgramsList,
      unassignedClientsList,
      totalClients: clients.length,
      statusFunnelData, 
      genderData
    };
  }, [clients, programs, activeAlertRules]);

  const {
    kpiData = [],
    demographicsData = [],
    growthData = [],
    programOccupancyData = [],
    actionItems = [],
    complianceData = [],
    referralData = [],
    retentionData = [],
    lengthOfStayData = [],
    topLocations = [],
    activeProgramsList = [],
    unassignedClientsList = [],
    totalClients = 1,
    statusFunnelData = [], 
    genderData = [],
  } = stats || {};

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#F7FAF5_0%,#EEF5F7_100%)] p-6">
        <p className="rounded-full bg-white px-5 py-3 font-semibold text-[#5C7478] shadow-sm" role="status">Loading statistics...</p>
      </div>
    );
  }

  const exportToCSV = () => {
    if (!stats) return;

    let csvContent = "\uFEFF";

    const addSection = (title, headers, rows) => {
      csvContent += `${title}\n`;
      csvContent += `${headers.join(',')}\n`;
      rows.forEach(row => {
        const cleanRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
        csvContent += `${cleanRow.join(',')}\n`;
      });
      csvContent += `\n\n`; 
    };

    addSection(
      "--- SYSTEM KPIs ---",
      ["Metric", "Value", "Trend"],
      stats.kpiData.map(kpi => [kpi.title, kpi.value, kpi.trend])
    );

    addSection(
      "--- DEMOGRAPHICS (AGE GROUPS) ---",
      ["Age Group", "Count"],
      stats.demographicsData.map(d => [d.name, d.value])
    );

    addSection(
      "--- PROGRAM OCCUPANCY ---",
      ["Program Name", "Capacity", "Enrolled", "Available Spots"],
      stats.programOccupancyData.map(p => [p.name, p.capacity, p.enrolled, p.capacity - p.enrolled])
    );

    addSection(
      "--- COMPLIANCE STATUS ---",
      ["Status", "Count"],
      stats.complianceData.map(c => [c.name, c.value])
    );

    addSection(
      "--- CLIENT ENGAGEMENT ---",
      ["Programs Participated", "Clients Count"],
      stats.retentionData.map(r => [r.name, r.value])
    );

    if (stats.lengthOfStayData.length > 0) {
      addSection(
        "--- LENGTH OF STAY DISTRIBUTION ---",
        ["Duration Range", "Clients Count"],
        stats.lengthOfStayData.map(d => [d.name, d.value])
      );
    }

    if (stats.referralData.length > 0) {
      addSection(
        "--- REFERRAL SOURCES ---",
        ["Source", "Clients Count"],
        stats.referralData.map(r => [r.name, r.value])
      );
    }

    addSection(
      "--- TOP LOCATIONS ---",
      ["City", "Clients Count"],
      stats.topLocations.map(l => [l.name, l.count])
    );

    addSection(
      "--- GROWTH TRENDS (LAST 6 MONTHS) ---",
      ["Month", "New Signups"],
      stats.growthData.map(g => [g.month, g.signups])
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Kehila_Statistics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,234,214,0.72),_transparent_30%),linear-gradient(180deg,_#F7FAF5_0%,_#EEF5F7_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header */}
        <header className="relative z-20 mb-5 rounded-[1.75rem] bg-[#2C6975] px-5 py-4 text-white shadow-[0_14px_34px_rgba(44,105,117,0.10)] sm:px-6 sm:py-5">
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 -z-10 h-72 w-72 rounded-full border-[48px] border-[#6BB2A0]/25" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="max-w-3xl text-2xl font-bold tracking-[-0.035em] sm:text-3xl">Statistics &amp; reports</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-white/78">Overview of system metrics and program analytics</p>
            </div>
            
            <div className="relative z-30 flex flex-wrap items-center gap-2 sm:justify-end">
              <div>
                <button
                  onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}
                  className="flex items-center gap-2 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-sm font-bold text-[#15383E] shadow-sm transition hover:brightness-95 focus:outline-none"
                >
                  <Settings2 size={18} />
                  Customize
                </button>
                
                {isDisplayMenuOpen && (
                  <div className="absolute right-0 top-full z-[80] mt-3 w-64 rounded-2xl bg-white p-3 text-slate-800 shadow-xl ring-1 ring-slate-200">
                    <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Visible Widgets</p>
                    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                      {[
                        { key: 'kpis', label: 'Top KPIs Cards' },
                        { key: 'growth', label: 'Growth Trends (Line)' },
                        { key: 'occupancy', label: 'Program Occupancy (Bar)' },
                        { key: 'demographics', label: 'Client Demographics (Age)' },
                        { key: 'gender', label: 'Gender Distribution (Pie)' },    
                        { key: 'lengthOfStay', label: 'Length of Stay (Pie)' },    
                        { key: 'intake', label: 'Intake Status Pipeline (Bar)' },
                        { key: 'engagement', label: 'Client Engagement (Pie)' },
                        { key: 'referrals', label: 'Referral Sources (List)' },
                        { key: 'locations', label: 'Top Locations (List)' },
                      ].map((item) => (
                        <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={visibleWidgets[item.key]}
                            onChange={() => setVisibleWidgets(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className="h-4 w-4 rounded border-slate-300 text-[#2C6975] focus:ring-[#2C6975]"
                          />
                          <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-sm font-bold text-[#15383E] shadow-sm transition hover:brightness-95 focus:outline-none"
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>
        </header>

        {/* ROW 1: KPIs */}
        {visibleWidgets.kpis && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpiData.map((kpi) => {
              const Icon = kpi.icon;
              const isActivePrograms = kpi.id === 2; 
              const isUnassignedClients = kpi.id === 3;
              const isPendingActions = kpi.id === 4; 
              return (
                <article 
                  key={kpi.id} 
                  className="relative group flex flex-col justify-between rounded-[1.5rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_12px_30px_rgba(44,105,117,0.07)] transition-all hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-[#6A8589]">{kpi.title}</p>
                      <h3 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#15383E]">{kpi.value}</h3>
                    </div>
                    <div className={`p-3 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                      <Icon size={24} />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-[#5C7478]">
                    {kpi.trend}
                  </div>

                  {isActivePrograms && activeProgramsList.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-full z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                      <div className="bg-[#15383E] text-white text-sm rounded-xl p-4 shadow-xl border border-[#2C6975] max-h-56 overflow-y-auto">
                        <p className="font-semibold mb-2 border-b border-[#2C6975] pb-2 text-[#CDE0C9]">Currently Active Programs:</p>
                        <ul className="space-y-2 mt-2">
                          {activeProgramsList.map((prog) => (
                            <li 
                              key={prog.id} 
                              onClick={() => setSelectedProgram(prog)}
                              className="flex flex-col p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group/item"
                            >
                              <span className="font-medium truncate group-hover/item:text-cyan-300 transition-colors">
                                🔍 {prog.name || 'Untitled Program'}
                              </span>
                              {prog.location && (
                                <span className="text-[11px] text-[#8CA5A8] ml-5 truncate">
                                  📍 {prog.location}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {isUnassignedClients && unassignedClientsList.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-full z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                      <div className="bg-[#15383E] text-white text-sm rounded-xl p-4 shadow-xl border border-[#2C6975] max-h-56 overflow-y-auto">
                        <p className="font-semibold mb-2 border-b border-[#2C6975] pb-2 text-[#CDE0C9]">Clients Without Programs:</p>
                        <ul className="space-y-1.5 mt-2">
                          {unassignedClientsList.map((client) => (
                            <li 
                              key={client.id} 
                              onClick={() => window.location.href = `/clients?openClientId=${client.id}`}
                              className="flex items-center p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group/client text-slate-200"
                            >
                              <span className="font-medium truncate group-hover/client:text-cyan-300 transition-colors">
                                👤 {client.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {isPendingActions && (
  /* שינוי ה-z-index של כפתור גלגל השיניים והתפריט ל-z-[100] כדי לעקוף את כרטיס האב */
  <div className="absolute top-4 right-4 z-[100]">
    <button 
      onClick={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setIsAlertMenuOpen(!isAlertMenuOpen); 
      }}
      className="p-1.5 bg-black/10 hover:bg-black/20 rounded-md transition-colors text-white/80 hover:text-white"
      title="Alert Settings"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>
    
    {isAlertMenuOpen && (
      <div 
        onClick={(e) => e.stopPropagation()} 
        onMouseEnter={(e) => e.stopPropagation()} 
        className="fixed md:absolute top-16 right-4 md:top-full md:right-0 mt-2 w-56 bg-white rounded-xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 text-slate-700 text-sm font-medium z-[110]"
      >
        <p className="text-xs text-slate-400 mb-2 pb-1.5 border-b border-slate-100 uppercase tracking-wider">Alert Rules</p>
        {[
          { id: 'passport_id', label: 'Missing ID / Passport' },
          { id: 'dob', label: 'Missing Date of Birth' },
          { id: 'phone', label: 'Missing Phone Number' },
          { id: 'email', label: 'Missing Email Address' },
          { id: 'address', label: 'Missing Home Address' },
          { id: 'contacts', label: 'Missing Emergency Contacts' },
          { id: 'medical', label: 'Missing Medical Clearance' }
        ].map(rule => (
          <label key={rule.id} className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-1 transition-colors">
            <input 
              type="checkbox" 
              checked={activeAlertRules.includes(rule.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setActiveAlertRules([...activeAlertRules, rule.id]);
                } else {
                  setActiveAlertRules(activeAlertRules.filter(r => r !== rule.id));
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-[#2C6975] focus:ring-[#2C6975]"
            />
            <span className="text-[13px]">{rule.label}</span>
          </label>
        ))}
      </div>
    )}
  </div>
)}


                  {isPendingActions && actionItems.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-full z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                      <div className="bg-[#15383E] text-white text-sm rounded-xl p-4 shadow-xl border border-[#2C6975] max-h-56 overflow-y-auto">
                        <p className="font-semibold mb-2 border-b border-[#2C6975] pb-2 text-[#CDE0C9]">Action Items & Alerts:</p>
                        <ul className="space-y-1.5 mt-2">
                          {actionItems.map((item) => {
                            const realClientId = item.id.split('-')[0];
                            return (
                              <li 
                                key={item.id} 
                                onClick={() => window.location.href = `/clients?openClientId=${realClientId}`}
                                className="flex flex-col p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group/action"
                              >
                                <span className="font-medium text-slate-200 truncate group-hover/action:text-orange-300 transition-colors">
                                  • {item.client}
                                </span>
                                <span className="text-[11px] text-[#8CA5A8] ml-3 truncate group-hover/action:text-orange-200/70">
                                  {item.issue}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
       
        {/* ROW 2: Main Charts Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visibleWidgets.growth && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#15383E]">
                <Activity className="text-[#2C6975]" />
                Growth Trends
              </h2>
              <div className="min-h-[300px] w-full flex-1">
                {growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={growthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7E3D5" />
                      <XAxis dataKey="month" stroke="#6A8589" tick={{ fill: '#6A8589' }} tickLine={false} />
                      <YAxis stroke="#6A8589" tick={{ fill: '#6A8589' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="signups" stroke="#2C6975" strokeWidth={3} dot={{ fill: '#6BB2A0', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[#6A8589]">No growth data available</div>
                )}
              </div>
            </section>
          )}

          {visibleWidgets.occupancy && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#15383E]">
                <CalendarCheck className="text-[#3F7763]" />
                Program Occupancy
              </h2>
              <div className="min-h-[300px] w-full flex-1">
                {programOccupancyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={programOccupancyData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7E3D5" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="capacity" name="Total Capacity" fill="#C9DDE1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="enrolled" name="Enrolled" fill="#6BB2A0" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-[#6A8589]">No program occupancy data available</div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ROW 3: Pie Charts - 4 Columns Grid Layout */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          
          {/* 1. Client Demographics */}
          {visibleWidgets.demographics && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <div className="mb-2 flex items-center gap-2">
                <Users className="text-[#7FA7B2]" size={20} />
                <h2 className="text-lg font-bold text-[#15383E]">Client Demographics</h2>
              </div>
              <p className="mb-4 text-xs text-[#6A8589]">Age distribution across all clients</p>
              <div className="min-h-[250px] w-full flex-1">
                {demographicsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={demographicsData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value" isAnimationActive={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {demographicsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-sm text-[#6A8589]">No data available</div>
                )}
              </div>
            </section>
          )}

         
          {/* 3. Client Engagement */}
          {visibleWidgets.engagement && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <div className="mb-2 flex items-center gap-2">
                <HeartHandshake className="text-[#2C6975]" size={20} />
                <h2 className="text-lg font-bold text-[#15383E]">Client Engagement</h2>
              </div>
              <p className="mb-4 text-xs text-[#6A8589]">Number of programs participated in</p>
              <div className="min-h-[250px] w-full flex-1">
                {retentionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(300, referralData.length * 20)}>
                    <PieChart>
                      <Pie data={retentionData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value" isAnimationActive={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {retentionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-sm text-[#6A8589]">No data available</div>
                )}
              </div>
            </section>
          )}

          {/* 4. Length of Stay Distribution */}
          {visibleWidgets.lengthOfStay && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <div className="mb-2 flex items-center gap-2">
                <Clock className="text-[#D2A94F]" size={20} />
                <h2 className="text-lg font-bold text-[#15383E]">Length of Stay</h2>
              </div>
              <p className="mb-4 text-xs text-[#6A8589]">Total accumulated time in programs</p>
              <div className="min-h-[250px] w-full flex-1">
                {lengthOfStayData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={lengthOfStayData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value" isAnimationActive={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {lengthOfStayData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-sm text-[#6A8589]">No data available</div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ROW 4: Mixed Layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {visibleWidgets.referrals && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] lg:col-span-2 flex flex-col">
              <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-[#15383E]">
                <Megaphone className="text-[#D2A94F]" />
                Referral Sources
              </h2>
              <p className="mb-6 text-sm text-[#6A8589]">Where clients are discovering the platform</p>
             <div className="w-full">
                {referralData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(280, referralData.length * 40)}>
                    <BarChart data={referralData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#D7E3D5" />
                      <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" name="Clients" fill="#D2A94F" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-[#6A8589]">No referral data available</div>
                )}
              </div>
            </section>
          )}
              
          {visibleWidgets.locations && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-[#15383E]">
                <MapPin className="text-[#3F7763]" />
                Top Locations
              </h2>
              <p className="mb-6 text-sm text-[#6A8589]">Geographic segmentation of clients</p>
              <div className="flex-1 space-y-2.5">
                {topLocations.length > 0 ? (
                  topLocations.map((loc, index) => {
                    const percentage = Math.round((loc.count / totalClients) * 100);
                    return (
                      <div key={index} className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-[#15383E]">{loc.name}</span>
                          <span className="font-bold text-[#2C6975]">{loc.count} <span className="font-normal text-[#6A8589]">({percentage}%)</span></span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E4ECE2]">
                          <div className="h-full rounded-full bg-[#6BB2A0] transition-all duration-500 ease-in-out" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#6A8589]">No location data available</div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ROW 5: Demographics & Intake Pipeline */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visibleWidgets.gender && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#15383E]">
                Gender Distribution
              </h2>
              <div className="min-h-[250px] w-full flex-1">
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                        {genderData.map((entry, index) => {
                          const colors = ['#2C6975', '#E5C97D', '#8CA5A8'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} itemStyle={{ color: '#15383E', fontWeight: 'bold' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-sm text-[#6A8589]">No gender data available</div>
                )}
              </div>
            </section>
          )}

          {visibleWidgets.intake && (
            <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#15383E]">
                Intake Status Pipeline
              </h2>
              <div className="min-h-[250px] w-full flex-1">
                {statusFunnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={statusFunnelData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#5C7478', fontSize: 13, fontWeight: 500 }} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                        {statusFunnelData.map((entry, index) => {
                          const colors = ['#C9DDE1', '#E5C97D', '#C5DDC0']; 
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-sm text-[#6A8589]">No status data available</div>
                )}
              </div>
            </section>
          )}
        </div>

      </div>
      
      {/* Program Quick View Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a191c]/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedProgram(null)}
              className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <div className="mb-6 pr-8">
              <h2 className="text-2xl font-bold text-[#15383E]">🌟 {selectedProgram.name}</h2>
              <p className="text-[#5C7478] mt-1.5 text-sm font-medium">📍 {selectedProgram.location || "Unknown location"}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#EEF4EC] p-3.5 rounded-2xl">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C9194]">Starts</p>
                <p className="mt-1 font-bold text-[#15383E]">
                  {selectedProgram.start_date ? (selectedProgram.start_date.toDate ? selectedProgram.start_date.toDate() : new Date(selectedProgram.start_date)).toLocaleDateString('he-IL') : "N/A"}
                </p>
              </div>
              <div className="bg-[#E4F0EC] p-3.5 rounded-2xl">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C9194]">Ends</p>
                <p className="mt-1 font-bold text-[#15383E]">
                  {selectedProgram.end_date ? (selectedProgram.end_date.toDate ? selectedProgram.end_date.toDate() : new Date(selectedProgram.end_date)).toLocaleDateString('he-IL') : "N/A"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#15383E]">Enrolled Participants</p>
                <p className="text-xs text-slate-500 mt-0.5">Current program capacity</p>
              </div>
              <div className="text-3xl font-black text-[#2C6975]">
                {selectedProgram.participant_count || 0}
              </div>
            </div>
            
            <button 
              onClick={() => window.location.href = `/programs?openId=${selectedProgram.id}`} 
              className="w-full py-3.5 bg-[#2C6975] text-white font-bold rounded-xl hover:bg-[#1f4a53] transition-all shadow-lg shadow-[#2C6975]/20 hover:shadow-[#2C6975]/40 hover:-translate-y-0.5"
            >
              Manage in Programs Page ➔
            </button>
          </div>
        </div>
      )}
    </main>
  );
}