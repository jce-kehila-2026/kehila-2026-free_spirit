"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  AlertCircle,
  Activity,
  FileWarning,
  UserX,
  ClipboardCheck,
  Megaphone,
  MapPin,
  HeartHandshake
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
          client: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown',
          issue: 'Missing Passport/ID',
          program: 'N/A',
          severity: 'high'
        });
      }
      if (!client.dob || client.dob === "") {
        actionItems.push({
          id: `missing_dob_${client.id}`,
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
      .filter(([_, value]) => value > 0)
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
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    // Top 5 Locations
    const topLocations = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

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

    const activeProgramsCount = programs.filter(p => {
      if (!p.end_date) return true;
      const end = p.end_date.toDate ? p.end_date.toDate() : new Date(p.end_date);
      return end > now;
    }).length;

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
    totalClients = 1,
  } = stats || {};

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#F7FAF5_0%,#EEF5F7_100%)] p-6">
        <p className="rounded-full bg-white px-5 py-3 font-semibold text-[#5C7478] shadow-sm" role="status">Loading statistics...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,234,214,0.72),_transparent_30%),linear-gradient(180deg,_#F7FAF5_0%,_#EEF5F7_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header */}
        <header className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#245C66] px-6 py-8 text-white shadow-[0_18px_45px_rgba(36,92,102,0.16)] sm:px-9 sm:py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CDE0C9]">Operational insight</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Statistics &amp; reports</h1>
            <p className="mt-3 text-sm leading-6 text-white/75">Overview of system metrics and program analytics</p>
          </div>
        </header>

        {/* ROW 1: KPIs (Top 4 tabs) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <article key={kpi.id} className="flex flex-col justify-between rounded-[1.5rem] border border-white/80 bg-[#FFFDF8] p-5 shadow-[0_12px_30px_rgba(44,105,117,0.07)]">
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
            <div className="h-[250px] w-full flex-1">
              {demographicsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={demographicsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {demographicsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
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
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            <div className="flex-1 space-y-5">
              {topLocations.length > 0 ? (
                topLocations.map((loc, index) => {
                  const percentage = Math.round((loc.count / totalClients) * 100);
                  return (
                    <div key={index} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-[#15383E]">{loc.name}</span>
                        <span className="font-bold text-[#2C6975]">{loc.count} <span className="font-normal text-[#6A8589]">({percentage}%)</span></span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E4ECE2]">
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

        {/* Action Items List */}
        <section className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] shadow-[0_14px_34px_rgba(44,105,117,0.08)]">
          <h2 className="flex items-center gap-2 border-b border-[#D7E3D5] px-6 py-5 text-xl font-bold text-[#15383E]">
            <FileWarning className="text-[#D2A94F]" />
            Action Items & Alerts
          </h2>
          <div className="overflow-x-auto p-4 sm:p-6">
            {actionItems.length > 0 ? (
              <table className="w-full text-left text-sm text-[#5C7478]">
                <thead className="border-b border-[#D7E3D5] bg-[#F7FAF5] text-[#607B80]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Issue</th>
                    <th className="px-4 py-3 font-medium">Program</th>
                    <th className="px-4 py-3 font-medium">Severity</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {actionItems.map((item) => (
                    <tr key={item.id} className="border-b border-[#E4ECE2] transition-colors hover:bg-[#F7FAF5]">
                      <td className="px-4 py-4 font-semibold text-[#173A40]">{item.client}</td>
                      <td className="px-4 py-4">{item.issue}</td>
                      <td className="px-4 py-4 text-slate-400">{item.program}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                          ${item.severity === 'high' ? 'bg-red-100 text-red-700' : 
                            item.severity === 'medium' ? 'bg-orange-100 text-orange-700' : 
                            'bg-green-100 text-green-700'}`}>
                          {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-sm font-bold text-[#2C6975] hover:text-[#173A40]">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] py-10 text-center text-[#607B80]">
                No pending action items found!
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}