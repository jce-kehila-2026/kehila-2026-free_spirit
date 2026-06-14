"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  AlertCircle,
  Activity,
  FileWarning
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF'];

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
    let ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46+': 0, 'Unknown': 0 };
    const now = new Date();

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

    clients.forEach(client => {
      // Age calculation
      if (client.dob) {
        const dob = new Date(client.dob);
        if (!isNaN(dob.getTime())) {
          let age = now.getFullYear() - dob.getFullYear();
          const m = now.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
            age--;
          }
          
          if (age >= 18 && age <= 25) ageGroups['18-25']++;
          else if (age >= 26 && age <= 35) ageGroups['26-35']++;
          else if (age >= 36 && age <= 45) ageGroups['36-45']++;
          else if (age >= 46) ageGroups['46+']++;
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
    });

    const demographicsData = Object.entries(ageGroups)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const growthData = Object.entries(monthCounts).map(([month, signups]) => ({
      month,
      signups
    }));

    // 4. Program Occupancy Data
    const programOccupancyData = programs.map(p => {
      const enrolled = Array.isArray(p.participant_ids) ? p.participant_ids.length : 0;
      // Use capacity, max_participants, or min_members, fallback to 50
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

    const overallGrowth = clients.length > 0 ? ((recentClients / clients.length) * 100).toFixed(1) : 0;

    const kpiData = [
      { id: 1, title: 'Total Clients', value: clients.length, icon: Users, trend: `${recentClients} new in 30 days`, color: 'text-blue-600', bgColor: 'bg-blue-100' },
      { id: 2, title: 'Active Programs', value: activeProgramsCount, icon: CalendarCheck, trend: `${programs.length} total programs`, color: 'text-green-600', bgColor: 'bg-green-100' },
      { id: 3, title: 'Overall Growth', value: `${overallGrowth}%`, icon: TrendingUp, trend: 'Last 30 days', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      { id: 4, title: 'Pending Actions', value: actionItems.length, icon: AlertCircle, trend: 'Needs attention', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    ];

    return {
      demographicsData,
      growthData,
      programOccupancyData,
      actionItems: actionItems.slice(0, 15), // Top 15 issues
      kpiData
    };
  }, [clients, programs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading statistics...</p>
      </div>
    );
  }

  const kpiData = stats?.kpiData || [
    { id: 1, title: 'Total Clients', value: 0, icon: Users, trend: `0 new in 30 days`, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { id: 2, title: 'Active Programs', value: 0, icon: CalendarCheck, trend: `0 total programs`, color: 'text-green-600', bgColor: 'bg-green-100' },
    { id: 3, title: 'Overall Growth', value: `0%`, icon: TrendingUp, trend: 'Last 30 days', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { id: 4, title: 'Pending Actions', value: 0, icon: AlertCircle, trend: 'Needs attention', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ];
  const demographicsData = stats?.demographicsData || [];
  const growthData = stats?.growthData || [];
  const programOccupancyData = stats?.programOccupancyData || [];
  const actionItems = stats?.actionItems || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Statistics & Reports</h1>
            <p className="text-slate-500 mt-1">Overview of system metrics and program analytics</p>
          </div>
        </div>

        {/* KPIs (Top 4 tabs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-2">{kpi.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-600">
                  {kpi.trend}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Growth Trends - Line Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity className="text-blue-500" />
              Growth Trends (New Signups - Last 6 Months)
            </h2>
            <div className="h-[300px] w-full">
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="signups" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No growth data available</div>
              )}
            </div>
          </div>

          {/* Program Analytics - Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <CalendarCheck className="text-green-500" />
              Program Occupancy
            </h2>
            <div className="h-[300px] w-full">
              {programOccupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programOccupancyData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="capacity" name="Total Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="enrolled" name="Enrolled" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No program occupancy data available</div>
              )}
            </div>
          </div>

          {/* Demographics - Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Users className="text-purple-500" />
              Client Demographics (Age)
            </h2>
            <div className="h-[300px] w-full">
              {demographicsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={demographicsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {demographicsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No demographics data available</div>
              )}
            </div>
          </div>

        </div>

        {/* Action Items List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <FileWarning className="text-orange-500" />
            Action Items & Alerts
          </h2>
          <div className="overflow-x-auto">
            {actionItems.length > 0 ? (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
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
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 font-medium text-slate-800">{item.client}</td>
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
                        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-6 text-center text-slate-500">
                No pending action items found!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
