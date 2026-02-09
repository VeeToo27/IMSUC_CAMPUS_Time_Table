
import React, { useState, useMemo } from 'react';
import { Users, Clock, Calendar, CheckCircle, AlertCircle, BarChart3, ArrowRight, TrendingUp, ChevronDown } from 'lucide-react';
import { AppState, Day } from '../types';
import { DAYS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { detectAllConflicts } from '../services/scheduler';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, setActiveTab }) => {
  const [selectedDay, setSelectedDay] = useState<Day>(Day.Monday);
  const conflicts = detectAllConflicts(state.masterTimetable, state);
  
  const stats = [
    { label: 'Total Teachers', value: state.faculty.length, icon: Users, color: 'blue' },
    { label: 'Total Classes', value: state.sections.length, icon: BarChart3, color: 'purple' },
    { label: 'Weekly Lectures', value: state.masterTimetable.length, icon: Clock, color: 'amber' },
    { label: 'Programs', value: state.semesters.length, icon: Calendar, color: 'emerald' },
  ];

  const teacherDailyLoad = useMemo(() => {
    return state.faculty.map(f => ({
      name: f.name,
      load: state.masterTimetable.filter(e => e.facultyId === f.id && e.day === selectedDay && e.entryType === 'lecture').length,
    })).sort((a, b) => b.load - a.load).slice(0, 10);
  }, [state.faculty, state.masterTimetable, selectedDay]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              Welcome to <span className="text-blue-600">IMSUC Campus Ghaziabad</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium max-w-lg">
              Manage weekly teaching schedules, track daily attendance, and organize substitutions from one simple place.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('master')}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Manage Weekly Schedule <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-${stat.color}-50 text-${stat.color}-600`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Load Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Teacher Daily Load</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Number of lectures assigned to top teachers on {selectedDay}.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select 
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value as Day)}
                  className="pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-all"
                >
                  {DAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                <TrendingUp size={12} /> Analytics
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teacherDailyLoad}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} Lectures`, 'Load']}
                />
                <Bar dataKey="load" name="Daily Lectures" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={32}>
                  {teacherDailyLoad.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.load >= 4 ? '#ef4444' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Schedule Health Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800">Schedule Check</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Are there any overlaps in the current plan?</p>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            {conflicts.hard.length === 0 ? (
              <>
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle size={48} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">Everything looks perfect!</p>
                  <p className="text-xs text-slate-500 font-medium px-4 mt-2">The weekly schedule is clean with no teacher clashes or room overlaps.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner">
                  <AlertCircle size={48} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{conflicts.hard.length} Clashes Detected</p>
                  <p className="text-xs text-slate-500 font-medium px-4 mt-2">Some teachers are scheduled in two places at once. Please review.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('master')}
                  className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                >
                  View and Fix Errors
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
