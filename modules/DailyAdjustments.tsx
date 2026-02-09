
import React, { useState, useMemo } from 'react';
import { AppState, Day, DailyAvailability, TimetableEntry, EntryType } from '../types';
import { DAYS } from '../constants';
import { cloneMasterToDaily } from '../services/scheduler';
import { RefreshCw, Search, Calendar, Download, UserCheck, UserMinus, Clock, Plus, Minus, X, Trash2, GraduationCap, AlertTriangle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DailyAdjustmentsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const DailyAdjustments: React.FC<DailyAdjustmentsProps> = ({ state, setState }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'status' | 'schedule'>('status');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Slot Editor State
  const [editingSlot, setEditingSlot] = useState<{ sectionId: string; slotIdx: number } | null>(null);
  const [slotFormData, setSlotFormData] = useState<Partial<TimetableEntry>>({});

  const dateDay = useMemo(() => {
    const d = new Date(selectedDate);
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const res = names[d.getDay()];
    return (DAYS.includes(res as Day) ? res as Day : Day.Monday);
  }, [selectedDate]);

  const currentAvails = state.facultyAvailability[selectedDate] || [];
  const dailySheet = state.dailyAdjustments[selectedDate] || [];

  const updateAttendance = (fId: string, status: 'Present' | 'Absent') => {
    setState(prev => {
      const existing = prev.facultyAvailability[selectedDate] || [];
      const idx = existing.findIndex(a => a.facultyId === fId);
      const newAvails = idx > -1 
        ? existing.map((a, i) => i === idx ? {...a, status} : a) 
        : [...existing, { facultyId: fId, date: selectedDate, status, unavailableSlots: [] } as DailyAvailability];
      
      return { 
        ...prev, 
        facultyAvailability: { ...prev.facultyAvailability, [selectedDate]: newAvails }
      };
    });
  };

  const adjustSlots = (delta: number) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        totalSlots: Math.max(1, Math.min(12, prev.config.totalSlots + delta))
      }
    }));
  };

  const handleSync = () => {
    if (dailySheet.length > 0 && !confirm("Overwrite today's changes with the Master Plan?")) return;
    setState(prev => ({ 
      ...prev, 
      dailyAdjustments: { ...prev.dailyAdjustments, [selectedDate]: cloneMasterToDaily(selectedDate, dateDay, state) } 
    }));
    setViewMode('schedule');
  };

  const downloadDaily = () => {
    const data: any[] = [];
    state.sections.forEach(sec => {
      const row: any = { Date: selectedDate, Day: dateDay, Class: sec.name };
      for (let i = 0; i < state.config.totalSlots; i++) {
        const entry = dailySheet.find(e => e.sectionId === sec.id && e.slotIndex === i);
        const sub = state.subjects.find(s => s.id === entry?.subjectId);
        const fac = state.faculty.find(f => f.id === entry?.facultyId);
        row[`Period ${i + 1}`] = entry?.title || (sub ? `${sub.code} (${fac?.name})` : '-');
      }
      data.push(row);
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Schedule");
    XLSX.writeFile(wb, `Daily_Schedule_${selectedDate}.xlsx`);
  };

  const openSlotEditor = (sectionId: string, slotIdx: number) => {
    const existing = dailySheet.find(e => e.sectionId === sectionId && e.slotIndex === slotIdx);
    setEditingSlot({ sectionId, slotIdx });
    setSlotFormData(existing || { 
      sectionId, 
      slotIndex: slotIdx, 
      entryType: 'lecture', 
      isLocked: false,
      day: dateDay 
    });
  };

  const saveSlot = () => {
    if (!editingSlot) return;

    if (slotFormData.facultyId) {
      const busyEntry = dailySheet.find(e => 
        e.slotIndex === editingSlot.slotIdx && 
        e.facultyId === slotFormData.facultyId &&
        e.sectionId !== editingSlot.sectionId
      );
      if (busyEntry) {
        const busySec = state.sections.find(s => s.id === busyEntry.sectionId);
        const busySem = state.semesters.find(s => s.id === busySec?.semesterId);
        alert(`This teacher is busy in ${busySem?.name} Section ${busySec?.name} today at this period.`);
        return;
      }
    }

    setState(prev => {
      const currentDaily = prev.dailyAdjustments[selectedDate] || [];
      const filtered = currentDaily.filter(e => !(e.sectionId === editingSlot.sectionId && e.slotIndex === editingSlot.slotIdx));
      
      const newEntry: TimetableEntry = {
        id: slotFormData.id || `daily-manual-${Date.now()}`,
        sectionId: editingSlot.sectionId,
        slotIndex: editingSlot.slotIdx,
        day: dateDay,
        facultyId: slotFormData.facultyId,
        subjectId: slotFormData.subjectId,
        entryType: slotFormData.entryType || 'lecture',
        title: slotFormData.title,
        isLocked: !!slotFormData.isLocked
      };

      return {
        ...prev,
        dailyAdjustments: {
          ...prev.dailyAdjustments,
          [selectedDate]: [...filtered, newEntry]
        }
      };
    });
    setEditingSlot(null);
  };

  const removeSlot = () => {
    if (!editingSlot) return;
    setState(prev => ({
      ...prev,
      dailyAdjustments: {
        ...prev.dailyAdjustments,
        [selectedDate]: (prev.dailyAdjustments[selectedDate] || []).filter(e => !(e.sectionId === editingSlot.sectionId && e.slotIndex === editingSlot.slotIdx))
      }
    }));
    setEditingSlot(null);
  };

  const getEligibleTeachers = (sectionId: string, slotIdx: number) => {
    const assignments = state.assignments.filter(a => a.sectionId === sectionId);
    return assignments.map(a => {
      const fac = state.faculty.find(f => f.id === a.facultyId);
      const sub = state.subjects.find(s => s.id === a.subjectId);
      const isAbsent = currentAvails.find(av => av.facultyId === a.facultyId)?.status === 'Absent';
      const todayLoad = dailySheet.filter(e => e.facultyId === a.facultyId).length;
      
      // Real-time conflict check for today
      const busyEntry = dailySheet.find(e => e.slotIndex === slotIdx && e.facultyId === a.facultyId && e.sectionId !== sectionId);
      const busySection = busyEntry ? state.sections.find(s => s.id === busyEntry.sectionId) : null;
      const busySem = busySection ? state.semesters.find(s => s.id === busySection.semesterId) : null;

      return { ...fac, subject: sub, todayLoad, isAbsent, busyIn: busySection ? `${busySem?.name}-${busySection.name}` : null };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sticky top-[72px] z-20 backdrop-blur-md bg-white/95">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-3 h-11">
             <Calendar size={18} className="text-slate-400" />
             <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 cursor-pointer" 
             />
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 h-11">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3 pl-1">Slots</span>
            <button 
              onClick={() => adjustSlots(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-black text-slate-700">{state.config.totalSlots}</span>
            <button 
              onClick={() => adjustSlots(1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="bg-slate-100 p-1 rounded-lg flex h-11">
             {[
               { id: 'status', label: 'Availability' },
               { id: 'schedule', label: 'Daily Grid' }
             ].map(mode => (
               <button 
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)} 
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === mode.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                {mode.label}
               </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
           <button onClick={downloadDaily} className="h-11 px-4 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
             <Download size={16}/> Download
           </button>
           <button onClick={handleSync} className="flex-1 md:flex-none h-11 px-6 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700">
             <RefreshCw size={16}/> Sync Plan
           </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Find teacher or class..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500 shadow-sm transition-all" 
              />
           </div>
           <div className="text-right flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">{dateDay}</span>
              <p className="text-sm font-bold text-slate-700">{selectedDate}</p>
           </div>
        </div>

        {viewMode === 'status' && (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100 text-left">
                  <th className="p-4 w-48 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">Faculty</th>
                  <th className="p-4 w-40 text-center">Status</th>
                  <th className="p-4">Timeline (Periods 1-{state.config.totalSlots})</th>
                  <th className="p-4 w-24 text-center">Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.faculty.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(f => {
                  const avail = currentAvails.find(a => a.facultyId === f.id);
                  const isAbsent = avail?.status === 'Absent';
                  const teacherLects = dailySheet.filter(e => e.facultyId === f.id);
                  
                  return (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 sticky left-0 bg-white z-10 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] text-white ${isAbsent ? 'bg-red-500 shadow-red-100 shadow-lg' : 'bg-slate-900 shadow-slate-100 shadow-lg'}`}>
                             {f.name.charAt(0)}
                           </div>
                           <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{f.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => updateAttendance(f.id, isAbsent ? 'Present' : 'Absent')} 
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${isAbsent ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                        >
                          {isAbsent ? <UserMinus size={12}/> : <UserCheck size={12}/>}
                          {isAbsent ? 'MARK AWAY' : 'MARK HERE'}
                        </button>
                      </td>
                      <td className="p-4">
                         <div className="flex gap-2">
                            {Array.from({ length: state.config.totalSlots }).map((_, i) => {
                              const entry = teacherLects.find(e => e.slotIndex === i);
                              const sec = entry ? state.sections.find(s => s.id === entry.sectionId) : null;
                              return (
                                <div key={i} className={`h-10 flex-1 rounded-lg border flex flex-col items-center justify-center text-[7px] font-black uppercase transition-all ${entry ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                   {entry ? (
                                     <>
                                       <span>{sec?.name}</span>
                                       <span className="opacity-50 mt-0.5">LECT</span>
                                     </>
                                   ) : `P${i+1}`}
                                </div>
                              );
                            })}
                         </div>
                      </td>
                      <td className="p-4 text-center">
                         <span className={`text-sm font-black ${teacherLects.length > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                           {teacherLects.length}
                         </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'schedule' && (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                  <th className="p-4 text-left sticky left-0 bg-slate-50 z-10 border-r border-slate-100">Section</th>
                  {Array.from({ length: state.config.totalSlots }).map((_, i) => (
                    <th key={i} className="p-4 text-center">Period {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.sections.map(sec => (
                  <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 text-xs sticky left-0 bg-white z-10 border-r border-slate-100">
                      {state.semesters.find(s => s.id === sec.semesterId)?.name} • {sec.name}
                    </td>
                    {Array.from({ length: state.config.totalSlots }).map((_, slotIdx) => {
                      const entry = dailySheet.find(e => e.sectionId === sec.id && e.slotIndex === slotIdx);
                      const sub = state.subjects.find(s => s.id === entry?.subjectId);
                      const fac = state.faculty.find(f => f.id === entry?.facultyId);
                      const isAbsent = currentAvails.find(av => av.facultyId === entry?.facultyId)?.status === 'Absent';
                      
                      const typeColor = {
                        lecture: isAbsent ? 'bg-red-50 border-red-300 ring-2 ring-red-100 shadow-lg' : 'bg-white border-slate-200 shadow-sm',
                        substitution: 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm',
                        workshop: 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm',
                        event: 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm',
                        lunch: 'bg-slate-50 border-slate-100'
                      }[entry?.entryType || 'lecture'];

                      return (
                        <td key={slotIdx} className="p-2 min-w-[160px]">
                          <button 
                            onClick={() => openSlotEditor(sec.id, slotIdx)}
                            className={`w-full h-20 p-3 rounded-xl border flex flex-col items-center justify-center text-center group transition-all relative ${typeColor} hover:border-blue-500 hover:shadow-xl active:scale-95`}
                          >
                             {entry ? (
                               <>
                                 <span className={`text-[9px] font-black uppercase tracking-tight truncate w-full ${isAbsent ? 'text-red-700' : 'text-slate-900'}`}>
                                   {entry.title || sub?.name || entry.entryType}
                                 </span>
                                 <div className="flex items-center gap-1.5 mt-2 truncate w-full justify-center">
                                    <span className={`text-[9px] font-bold truncate ${isAbsent ? 'text-red-600 bg-red-100 px-1.5 py-0.5 rounded' : 'opacity-70'}`}>
                                      {fac?.name || 'NOT ASSIGNED'}
                                    </span>
                                    {isAbsent && <AlertTriangle size={10} className="text-red-500 animate-pulse" />}
                                 </div>
                               </>
                             ) : (
                               <div className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-slate-300 tracking-widest flex items-center gap-2">
                                 <Plus size={14} /> ADD
                               </div>
                             )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Edit Today's Slot</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">P{editingSlot.slotIdx + 1} • {state.sections.find(s => s.id === editingSlot.sectionId)?.name}</p>
                 </div>
                 <button onClick={() => setEditingSlot(null)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X size={18}/></button>
              </div>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Entry Category</label>
                    <div className="grid grid-cols-4 gap-2">
                       {['lecture', 'substitution', 'workshop', 'event'].map(type => (
                         <button 
                          key={type}
                          onClick={() => setSlotFormData({...slotFormData, entryType: type as EntryType, title: '', facultyId: '', subjectId: ''})}
                          className={`py-2 px-1 rounded-lg border text-[8px] font-black uppercase transition-all shadow-sm ${slotFormData.entryType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                         >
                           {type}
                         </button>
                       ))}
                    </div>
                 </div>

                 {(slotFormData.entryType === 'workshop' || slotFormData.entryType === 'event') && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Activity Title</label>
                      <input 
                        type="text" 
                        value={slotFormData.title || ''} 
                        onChange={e => setSlotFormData({...slotFormData, title: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                        placeholder="e.g. Technical Workshop"
                      />
                   </div>
                 )}

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Choose Faculty (From Class Roster)</label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                       {getEligibleTeachers(editingSlot.sectionId, editingSlot.slotIdx).length > 0 ? getEligibleTeachers(editingSlot.sectionId, editingSlot.slotIdx).map(cand => (
                         <button 
                            key={cand?.id}
                            disabled={!!cand.busyIn || cand.isAbsent}
                            onClick={() => {
                              setSlotFormData({
                                ...slotFormData, 
                                facultyId: cand?.id, 
                                subjectId: cand.subject?.id,
                                title: cand.subject?.name
                              });
                            }}
                            className={`w-full p-4 rounded-xl border text-left transition-all group ${
                              slotFormData.facultyId === cand?.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 
                              (cand.busyIn || cand.isAbsent) ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' : 'bg-white border-slate-100 hover:border-blue-400 hover:shadow-md'
                            }`}
                         >
                            <div className="flex justify-between items-center">
                               <div>
                                  <p className={`text-xs font-black uppercase ${slotFormData.facultyId === cand?.id ? 'text-white' : 'text-slate-800'}`}>{cand?.name}</p>
                                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${slotFormData.facultyId === cand?.id ? 'text-blue-200' : 'text-blue-600'}`}>
                                    {cand.subject?.name}
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className={`text-[8px] font-black uppercase ${slotFormData.facultyId === cand?.id ? 'text-blue-200' : 'text-slate-400'}`}>Load Today</p>
                                  <p className={`text-xs font-black ${slotFormData.facultyId === cand?.id ? 'text-white' : 'text-slate-700'}`}>{cand.todayLoad} P</p>
                               </div>
                            </div>
                            {cand.isAbsent && (
                              <div className="mt-2 pt-2 border-t border-red-200/50 flex items-center gap-2 text-red-500">
                                <AlertCircle size={12}/>
                                <span className="text-[9px] font-black uppercase tracking-tight">Teacher Marked Absent</span>
                              </div>
                            )}
                            {cand.busyIn && (
                              <div className="mt-2 pt-2 border-t border-amber-200/50 flex items-center gap-2 text-amber-600">
                                <AlertTriangle size={12}/>
                                <span className="text-[9px] font-black uppercase tracking-tight">Busy in {cand.busyIn}</span>
                              </div>
                            )}
                         </button>
                       )) : (
                         <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                           <p className="text-xs font-bold text-slate-400 italic">No assigned teachers found for this section.</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                    <button onClick={saveSlot} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">Update Entry</button>
                    <button onClick={removeSlot} className="px-5 py-4 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition-all"><Trash2 size={20} /></button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DailyAdjustments;
