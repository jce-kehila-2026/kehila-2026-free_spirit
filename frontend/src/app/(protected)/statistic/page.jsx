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
  Download
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

    // 3. Growth Data (Signups per month for the last 6 months)
    const monthCounts = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Initialize last 6 months to ensure chart displays correctly
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthCounts[`${months[d.getMonth()]} ${d.getFullYear()}`] = 0;
    }

    let recentClients = 0;
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // New metrics counters
    let unassignedClientsCount = 0;
    const unassignedClientsList = [];
    let fullyCompliant = 0;
    let missingForms = 0;
    
    const sourceCounts = {};
    const locationCounts = {};

    let retentionCounts = {
      "0 (not embedded)": 0,
      "1 (one program)": 0,
      "2 (two programs)": 0,
      "3+ (returning customers)": 0
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
      if (client.status === 'registered' && !client.passport_id) {
        actionItems.push({
          id: `missing_id_${client.id}`,
          clientId: client.id,
          client: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown',
          issue: 'Missing Passport/ID',
          program: 'N/A',
          severity: 'high'
        });
      }
      if (!client.dob || client.dob === "") {
        actionItems.push({
          id: `missing_dob_${client.id}`,
          clientId: client.id,
          client: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown',
          issue: 'Missing Date of Birth',
          program: 'N/A',
          severity: 'medium'
        });
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

      // 1. Unassigned & Retention Logic
      const participatedPrograms = client.program_ids?.length || 0;
      
      if (participatedPrograms === 0) {
        unassignedClientsCount++;
        retentionCounts["0 (not embedded)"]++;
        unassignedClientsList.push({
          id: client.id,
          name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client'
        });
      } else if (participatedPrograms === 1) {
        retentionCounts["1 (one program)"]++;
      } else if (participatedPrograms === 2) {
        retentionCounts["2 (two programs)"]++;
      } else {
        retentionCounts["3+ (returning customers)"]++;
      }

      // 2. Compliance Logic
      const medicalStatus = client.medical_profile?.medical_clearance_status;

      if (medicalStatus === 'Approved' || medicalStatus === 'approved') {
        fullyCompliant++;
      } else {
        missingForms++;
      }

      // 3. Referral Source Logic
      let source = client.referrer;
      if (source && source.trim() !== "") {
         sourceCounts[source.trim()] = (sourceCounts[source.trim()] || 0) + 1;
      }

      // 4. Geographic Location Logic
      let rawAddress = client.address;
      if (rawAddress && rawAddress.trim() !== "") {
        const parts = rawAddress.split(',');
        const cityPart = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
        if (cityPart) {
          locationCounts[cityPart] = (locationCounts[cityPart] || 0) + 1;
        }
      }
    });

    const demographicsData = Object.entries(ageGroups)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const growthData = Object.entries(monthCounts).map(([month, signups]) => ({
      month,
      signups
    }));

    const complianceData = [
      { name: 'Fully Compliant', value: fullyCompliant },
      { name: 'Missing Forms', value: missingForms }
    ];

    const referralData = Object.entries(sourceCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Retention data for donut chart
    const retentionData = Object.entries(retentionCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    // Top 5 Locations
    const topLocations = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Program Occupancy Data
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
      // אם חסרים תאריכים, אי אפשר להחשיב את התוכנית כפעילה כרגע
      if (!p.start_date || !p.end_date) return false;
      
      const start = p.start_date.toDate ? p.start_date.toDate() : new Date(p.start_date);
      const end = p.end_date.toDate ? p.end_date.toDate() : new Date(p.end_date);
      
      // תוכנית נספרת כפעילה *אך ורק* אם אנחנו נמצאים כעת בין תאריך ההתחלה לסיום
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
      topLocations,
      activeProgramsList,
      unassignedClientsList,
      totalClients: clients.length
    };
  }, [clients, programs]);

  const {
    kpiData = [],
    demographicsData = [],
    growthData = [],
    programOccupancyData = [],
    actionItems = [],
    complianceData = [],
    referralData = [],
    retentionData = [],
    topLocations = [],
    activeProgramsList = [],
    unassignedClientsList = [],
    totalClients = 1,
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

    // Byte Order Mark (BOM) - קריטי כדי שאקסל יזהה עברית כמו שצריך
    let csvContent = "\uFEFF";

    // פונקציית עזר ליצירת בלוקים (פסקאות) בתוך הקובץ
    const addSection = (title, headers, rows) => {
      csvContent += `${title}\n`;
      csvContent += `${headers.join(',')}\n`;
      rows.forEach(row => {
        // עוטפים במרכאות כדי למנוע שבירת שורות אם יש פסיקים בטקסט
        const cleanRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
        csvContent += `${cleanRow.join(',')}\n`;
      });
      csvContent += `\n\n`; // רווח בין טבלה לטבלה
    };

    // 1. מדדים כלליים (KPIs)
    addSection(
      "--- SYSTEM KPIs ---",
      ["Metric", "Value", "Trend"],
      stats.kpiData.map(kpi => [kpi.title, kpi.value, kpi.trend])
    );

    // 2. דמוגרפיה
    addSection(
      "--- DEMOGRAPHICS (AGE GROUPS) ---",
      ["Age Group", "Count"],
      stats.demographicsData.map(d => [d.name, d.value])
    );

    // 3. תפוסת תוכניות
    addSection(
      "--- PROGRAM OCCUPANCY ---",
      ["Program Name", "Capacity", "Enrolled", "Available Spots"],
      stats.programOccupancyData.map(p => [p.name, p.capacity, p.enrolled, p.capacity - p.enrolled])
    );

    // 4. סטטוס מסמכים רפואיים ומשפטיים
    addSection(
      "--- COMPLIANCE STATUS ---",
      ["Status", "Count"],
      stats.complianceData.map(c => [c.name, c.value])
    );

    // 5. מעורבות / נאמנות
    addSection(
      "--- CLIENT ENGAGEMENT ---",
      ["Programs Participated", "Clients Count"],
      stats.retentionData.map(r => [r.name, r.value])
    );

    // 6. מקורות הגעה
    if (stats.referralData.length > 0) {
      addSection(
        "--- REFERRAL SOURCES ---",
        ["Source", "Clients Count"],
        stats.referralData.map(r => [r.name, r.value])
      );
    }

    // 7. ערים מובילות
    addSection(
      "--- TOP LOCATIONS ---",
      ["City", "Clients Count"],
      stats.topLocations.map(l => [l.name, l.count])
    );

    // 8. צמיחה לפי חודשים
    addSection(
      "--- GROWTH TRENDS (LAST 6 MONTHS) ---",
      ["Month", "New Signups"],
      stats.growthData.map(g => [g.month, g.signups])
    );

    // יצירת הקובץ והורדתו לדפדפן
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
        <header className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#245C66] px-6 py-8 text-white shadow-[0_18px_45px_rgba(36,92,102,0.16)] sm:px-9 sm:py-10">
        
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CDE0C9]">Operational insight</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Statistics &amp; reports</h1>
              <p className="mt-3 text-sm leading-6 text-white/75">Overview of system metrics and program analytics</p>
            </div>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-white/10 px-5 py-3.5 text-sm font-bold text-white shadow-sm ring-1 ring-white/30 backdrop-blur-sm transition-all hover:bg-white/20 hover:ring-white/50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#245C66]"
            >
              <Download size={18} />
              Export to CSV
            </button>
          </div>
        </header>

        {/* ROW 1: KPIs (Top 4 tabs) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon;
            const isActivePrograms = kpi.id === 2; // בודק אם זו הכרטיסייה השנייה
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

                {/* חלונית צפה (Tooltip) שמופיעה רק בריחוף על "Active Programs" */}
                {isActivePrograms && activeProgramsList.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-full z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div className="bg-[#15383E] text-white text-sm rounded-xl p-4 shadow-xl border border-[#2C6975] max-h-56 overflow-y-auto">
                      <p className="font-semibold mb-2 border-b border-[#2C6975] pb-2 text-[#CDE0C9]">Currently Active Programs:</p>
                      <ul className="space-y-2 mt-2">
                        {activeProgramsList.map((prog) => (
                          <li key={prog.id} className="flex flex-col">
                            <span className="font-medium truncate">• {prog.name || 'Untitled Program'}</span>
                            {prog.location && <span className="text-[11px] text-[#8CA5A8] ml-3 truncate">📍 {prog.location}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              {/* חלונית צפה (Tooltip) שמופיעה רק בריחוף על "Unassigned Clients" */}
                {isUnassignedClients && unassignedClientsList.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-full z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div className="bg-[#15383E] text-white text-sm rounded-xl p-4 shadow-xl border border-[#2C6975] max-h-56 overflow-y-auto">
                      <p className="font-semibold mb-2 border-b border-[#2C6975] pb-2 text-[#CDE0C9]">Clients Without Programs:</p>
                      <ul className="space-y-1.5 mt-2">
                        {unassignedClientsList.map((client) => (
                          <li key={client.id} className="flex items-center text-slate-200">
                            <span className="font-medium truncate">• {client.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {/* חלונית צפה (Tooltip) שמופיעה רק בריחוף על "Pending Actions" */}
                {isPendingActions && actionItems.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-full z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div className="bg-[#15383E] text-white text-sm rounded-xl p-4 shadow-xl border border-[#2C6975] max-h-56 overflow-y-auto">
                      <p className="font-semibold mb-2 border-b border-[#2C6975] pb-2 text-[#CDE0C9]">Action Items & Alerts:</p>
                      <ul className="space-y-2 mt-2">
                        {actionItems.map((item) => (
                          <li key={item.id} className="flex flex-col">
                            <span className="font-medium text-slate-200 truncate">• {item.client}</span>
                            <span className="text-[11px] text-[#8CA5A8] ml-3 truncate">{item.issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* ROW 2: Main Charts Grid (Large) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          
          {/* Growth Trends - Line Chart */}
          <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#15383E]">
              <Activity className="text-[#2C6975]" />
              Growth Trends
            </h2>
            <div className="h-[300px] w-full">
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7E3D5" />
                    <XAxis dataKey="month" stroke="#6A8589" tick={{ fill: '#6A8589' }} tickLine={false} />
                    <YAxis stroke="#6A8589" tick={{ fill: '#6A8589' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="signups" 
                      stroke="#2C6975"
                      strokeWidth={3}
                      dot={{ fill: '#6BB2A0', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[#6A8589]">No growth data available</div>
              )}
            </div>
          </section>

          {/* Program Occupancy - Bar Chart */}
          <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#15383E]">
              <CalendarCheck className="text-[#3F7763]" />
              Program Occupancy
            </h2>
            <div className="h-[300px] w-full">
              {programOccupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programOccupancyData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7E3D5" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="capacity" name="Total Capacity" fill="#C9DDE1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="enrolled" name="Enrolled" fill="#6BB2A0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[#6A8589]">No program occupancy data available</div>
              )}
            </div>
          </section>

        </div>

        {/* ROW 3: Medium Charts Grid (3 Columns) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Demographics - Pie Chart */}
          <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-[#15383E]">
              <Users className="text-[#7FA7B2]" size={20} />
              Client Demographics
            </h2>
            <p className="mb-4 text-xs text-[#6A8589]">Age distribution across all clients</p>
            
            {/* שיניתי את העטיפה כאן כדי לוודא שהיא לא קורסת */}
            <div className="flex justify-center items-center w-full min-h-[250px]">
              {demographicsData.length > 0 ? (
                // הורדנו את ה-ResponsiveContainer והגדרנו רוחב וגובה ישירות לגרף
                <PieChart width={300} height={250}>
                  <Pie
                    data={demographicsData}
                    cx="50%"
                    cy="55%"
                    innerRadius={45}
                    outerRadius={75}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={false}
                    label={({ value, percent }) => `${(percent * 100).toFixed(0)}% (${value})`}
                  >
                    {demographicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                </PieChart>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#6A8589]">No data available</div>
              )}
            </div>
          </section>

          {/* Compliance Status - Pie Chart */}
          <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-[#15383E]">
              <ClipboardCheck className="text-[#6BB2A0]" size={20} />
              Compliance Status
            </h2>
            <p className="mb-4 text-xs text-[#6A8589]">Medical & Legal form completion</p>
            <div className="h-[250px] w-full flex-1">
              {complianceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={complianceData}
                      cx="50%"
                      cy="55%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={false}
                      label={({ value, percent }) => `${(percent * 100).toFixed(0)}% (${value})`}
                    >
                      {complianceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === 'Fully Compliant' ? '#6BB2A0' : '#E58A7A'} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#6A8589]">No data available</div>
              )}
            </div>
          </section>

          {/* Client Retention / Engagement - Donut Chart */}
          <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <HeartHandshake className="text-[#2C6975]" size={20} />
              <h2 className="text-lg font-bold text-[#15383E]">Client Engagement</h2>
            </div>
            <p className="mb-4 text-xs text-[#6A8589]">Number of programs participated in (loyalty metric)</p>
            <div className="h-[250px] w-full flex-1">
              {retentionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={retentionData}
                      cx="50%"
                      cy="55%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={false}
                      label={({ value, percent }) => `${(percent * 100).toFixed(0)}% (${value})`}
                    >
                      {retentionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#6A8589]">No data available</div>
              )}
            </div>
          </section>

        </div>

        {/* ROW 4: Mixed Layout (Referral Sources & Top Locations) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          
          {/* Referral Sources - Horizontal Bar Chart (Spans 2 cols) */}
          <section className="rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-6 shadow-[0_14px_34px_rgba(44,105,117,0.08)] lg:col-span-2 flex flex-col">
            <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-[#15383E]">
              <Megaphone className="text-[#D2A94F]" />
              Referral Sources
            </h2>
            <p className="mb-6 text-sm text-[#6A8589]">Where clients are discovering the platform</p>
            <div className="h-[280px] w-full flex-1">
              {referralData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={referralData} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#D7E3D5" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" name="Clients" fill="#D2A94F" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#6A8589]">No referral data available</div>
              )}
            </div>
          </section>

          {/* Top Locations - Custom List with Progress Bars */}
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
                        <div 
                          className="h-full rounded-full bg-[#6BB2A0] transition-all duration-500 ease-in-out" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#6A8589]">No location data available</div>
              )}
            </div>
          </section>

        </div>

    

      </div>
    </main>
  );
}
