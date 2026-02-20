
import React, { useState, useEffect } from 'react';
import { AppState, Day, TimetableEntry, EntryType } from '../types';
import { DAYS } from '../constants';
import { generateTimetable, detectAllConflicts, ConflictResult } from '../services/scheduler';
import { RefreshCw, Clock, Lock, Unlock, Trash2, AlertCircle, CheckCircle2, ChevronDown, Coffee, Settings2, Download, Plus, Minus, X, Info, Calendar, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MasterTimetableProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const MasterTimetable: React.FC<MasterTimetableProps> = ({ state, setState }) => {
  const [selectedSemId, setSelectedSemId] = useState(state.semesters[0]?.id);
  const [isBusy, setIsBusy] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResult>({ hard: [], warnings: [] });
  const [showSettings, setShowSettings] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  
  // Manual Assignment State
  const [editingSlot, setEditingSlot] = useState<{ sectionId: string; day: Day; slotIdx: number } | null>(null);
  const [slotFormData, setSlotFormData] = useState<Partial<TimetableEntry>>({ entryType: 'lecture' });

  const filteredSections = state.sections.filter(s => s.semesterId === selectedSemId);
  const currentSem = state.semesters.find(s => s.id === selectedSemId);

  useEffect(() => {
    setConflicts(detectAllConflicts(state.masterTimetable, state));
  }, [state.masterTimetable, state.assignments, state.sections, state.semesters]);

  const handleGenerate = () => {
    setIsBusy(true);
    setTimeout(() => {
      setState(prev => ({ ...prev, masterTimetable: generateTimetable(state) }));
      setIsBusy(false);
    }, 1000);
  };

  const toggleLock = (id: string) => {
    setState(prev => ({
      ...prev,
      masterTimetable: prev.masterTimetable.map(item => 
        item.id === id ? { ...item, isLocked: !item.isLocked } : item
      )
    }));
  };

  const removeItem = (id: string) => {
    setState(prev => ({
      ...prev,
      masterTimetable: prev.masterTimetable.filter(item => item.id !== id)
    }));
  };

  const updateProgramLunch = (semId: string, enabled: boolean, slotIndex: number) => {
    setState(prev => ({
      ...prev,
      semesters: prev.semesters.map(s => 
        s.id === semId ? { ...s, lunchEnabled: enabled, lunchSlotIndex: slotIndex } : s
      )
    }));
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

const downloadSchedule = () => {
  const shortName = (fullName: string | undefined): string => {
    if (!fullName) return '--';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const SUBJECT_COLORS = [
    'FFD9EAD3', 'FFCFE2F3', 'FFFFF2CC', 'FFFCE5CD',
    'FFE8D5F5', 'FFFFE0E0', 'FFD0ECE8', 'FFFFD6EC',
    'FFE2EFDA', 'FFD9D2E9', 'FFFFE599', 'FFB6D7A8',
  ];
  const subjectColorMap: Record<string, string> = {};
  let colorIdx = 0;
  state.subjects.forEach(s => {
    subjectColorMap[s.id] = SUBJECT_COLORS[colorIdx++ % SUBJECT_COLORS.length];
  });

  const data: any[] = [];
  DAYS.forEach(day => {
    filteredSections.forEach(sec => {
      const sem = state.semesters.find(s => s.id === sec.semesterId);
      const row: any = { Day: day, Class: sec.name };
      for (let i = 0; i < state.config.totalSlots; i++) {
        const e = state.masterTimetable.find(e => e.sectionId === sec.id && e.day === day && e.slotIndex === i);
        const sub = e?.subjectId ? state.subjects.find(s => s.id === e.subjectId) : null;
        const fac = e?.facultyId ? state.faculty.find(f => f.id === e.facultyId) : null;
        const isLunch = (sem?.lunchEnabled && sem?.lunchSlotIndex === i) || e?.entryType === 'lunch';
        row[`Period ${i + 1}`] = isLunch ? 'LUNCH' : (sub ? `${sub.name}\n${shortName(fac?.name)}` : (e?.title || '-'));
      }
      data.push(row);
    });
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  // Title row inserted at top
  XLSX.utils.sheet_add_aoa(ws, [['IMS Ghaziabad — Weekly Schedule']], { origin: 'A1' });
  XLSX.utils.sheet_add_json(ws, data, { origin: 'A2', skipHeader: false });

  // Rebuild cleanly with title row
  const wb2 = XLSX.utils.book_new();
  const wsData: any[][] = [['IMS Ghaziabad — Weekly Schedule']];
  const headers = ['Day', 'Class', ...Array.from({ length: state.config.totalSlots }, (_, i) => `Period ${i + 1}`)];
  wsData.push(headers);
  data.forEach(row => wsData.push(headers.map(h => row[h] ?? '')));

  const ws2 = XLSX.utils.aoa_to_sheet(wsData);

  // Merging title across all columns
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

  // Column widths
  ws2['!cols'] = [{ wch: 12 }, { wch: 10 }, ...Array(state.config.totalSlots).fill({ wch: 20 })];

  // Row heights
  const rowHeights: any[] = [{ hpt: 28 }, { hpt: 18 }];
  data.forEach(() => rowHeights.push({ hpt: 42 }));
  ws2['!rows'] = rowHeights;

  // Apply styles
  const totalCols = headers.length;
  const totalRows = wsData.length;

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws2[addr]) continue;

      if (r === 0) {
        ws2[addr].s = {
          font: { bold: true, sz: 14, color: { rgb: 'FFFFFFFF' }, name: 'Arial' },
          fill: { fgColor: { rgb: 'FF1F3864' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
        continue;
      }

      if (r === 1) {
        ws2[addr].s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFFFF' }, name: 'Arial' },
          fill: { fgColor: { rgb: 'FF2F5496' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        };
        continue;
      }

      // Data rows
      const dataRowIdx = r - 2;
      const dataRow = data[dataRowIdx];
      const cellVal = ws2[addr].v as string;
      const isLunch = cellVal === 'LUNCH';

      // Determine subject color
      let bgColor = 'FFEFEFEF';
      if (isLunch) {
        bgColor = 'FFFFF2CC';
      } else if (c >= 2) {
        const day = dataRow?.Day;
        const secName = dataRow?.Class;
        const sec = filteredSections.find(s => s.name === secName);
        const slotIdx = c - 2;
        const e = state.masterTimetable.find(e => e.sectionId === sec?.id && e.day === day && e.slotIndex === slotIdx);
        if (e?.subjectId) bgColor = subjectColorMap[e.subjectId] || 'FFEFEFEF';
      } else if (c === 0) {
        bgColor = 'FFD6DCE4';
      } else if (c === 1) {
        bgColor = 'FFD6DCE4';
      }

      ws2[addr].s = {
        font: { sz: 9, name: 'Arial', bold: isLunch },
        fill: { fgColor: { rgb: bgColor } },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
          wrapText: true,
          textRotation: isLunch ? 90 : 0,
        },
        border: {
          top: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
        },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb2, ws2, 'Weekly Schedule');
  XLSX.writeFile(wb2, `Weekly_Schedule_${currentSem?.name || 'Export'}.xlsx`);
};

  const handleManualAdd = () => {
    if (!editingSlot) return;

    if (slotFormData.entryType === 'lecture' && !slotFormData.facultyId) {
      alert("Please select a teacher for this lecture.");
      return;
    }

    if (slotFormData.facultyId) {
      const busyEntry = state.masterTimetable.find(e => 
        e.day === editingSlot.day && 
        e.slotIndex === editingSlot.slotIdx && 
        e.facultyId === slotFormData.facultyId &&
        e.sectionId !== editingSlot.sectionId
      );
      if (busyEntry) {
        const busySec = state.sections.find(s => s.id === busyEntry.sectionId);
        const busySem = state.semesters.find(s => s.id === busySec?.semesterId);
        alert(`This teacher is already busy in ${busySem?.name} Section ${busySec?.name} at this time.`);
        return;
      }
    }

    const newEntry: TimetableEntry = {
      id: `manual-${Date.now()}`,
      sectionId: editingSlot.sectionId,
      day: editingSlot.day,
      slotIndex: editingSlot.slotIdx,
      facultyId: slotFormData.facultyId,
      subjectId: slotFormData.subjectId,
      isLocked: true,
      entryType: slotFormData.entryType || 'lecture',
      title: slotFormData.entryType === 'lunch' ? 'LUNCH' : slotFormData.title
    };

    setState(prev => ({
      ...prev,
      masterTimetable: [...prev.masterTimetable, newEntry]
    }));
    setEditingSlot(null);
  };

  const getTeachersForSection = () => {
    if (!editingSlot) return [];
    const secAssignments = state.assignments.filter(a => a.sectionId === editingSlot.sectionId);
    return secAssignments.map(a => {
      const fac = state.faculty.find(f => f.id === a.facultyId);
      const sub = state.subjects.find(s => s.id === a.subjectId);
      const dailyLoad = state.masterTimetable.filter(e => e.day === editingSlot.day && e.facultyId === a.facultyId).length;
      
      const busyEntry = state.masterTimetable.find(e => 
        e.day === editingSlot.day && 
        e.slotIndex === editingSlot.slotIdx && 
        e.facultyId === a.facultyId &&
        e.sectionId !== editingSlot.sectionId
      );
      const busySection = busyEntry ? state.sections.find(s => s.id === busyEntry.sectionId) : null;
      const busySem = busySection ? state.semesters.find(s => s.id === busySection.semesterId) : null;

      return { ...fac, subject: sub, dailyLoad, busyIn: busySection ? `${busySem?.name}-${busySection.name}` : null };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-[72px] z-20 backdrop-blur-md bg-white/95">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Selected Program</label>
            <div className="relative">
              <select 
                className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer focus:border-blue-500"
                value={selectedSemId} 
                onChange={(e) => setSelectedSemId(e.target.value)}
              >
                {state.semesters.map(sem => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
            </div>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 h-11">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3 pl-1">Daily Periods</span>
            <button 
              onClick={() => adjustSlots(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Remove Slot"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-black text-slate-700">{state.config.totalSlots}</span>
            <button 
              onClick={() => adjustSlots(1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              title="Add Slot"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`h-11 px-4 rounded-lg border flex items-center gap-2 transition-all ${showSettings ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <Settings2 size={18} />
            <span className="text-xs font-bold hidden md:inline">Lunch Settings</span>
          </button>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={downloadSchedule}
            className="h-11 px-4 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
          >
            <Download size={16}/>
            <span className="hidden lg:inline">Download</span>
          </button>

          <button 
            onClick={handleGenerate} 
            disabled={isBusy} 
            className={`flex-1 sm:flex-none h-11 px-6 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100`}
          >
            <RefreshCw size={16} className={isBusy ? 'animate-spin' : ''}/> 
            {isBusy ? 'Creating...' : 'Auto-Generate'}
          </button>
          
          <button 
            onClick={() => conflicts.hard.length > 0 && setShowErrors(true)}
            className={`h-11 px-4 rounded-lg border flex items-center gap-2 transition-all ${conflicts.hard.length > 0 ? 'bg-red-50 border-red-100 text-red-600 cursor-pointer hover:bg-red-100' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}
          >
            {conflicts.hard.length > 0 ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
            <span className="text-xs font-bold whitespace-nowrap">
              {conflicts.hard.length > 0 ? `${conflicts.hard.length} Errors` : 'Schedule OK'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-32 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase">Section</th>
                {Array.from({ length: state.config.totalSlots }).map((_, i) => (
                  <th key={i} className="p-4 text-center min-w-[180px]">
                    <span className="text-xs font-bold text-slate-500 uppercase">Period {i + 1}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <React.Fragment key={day}>
                  <tr>
                    <td colSpan={state.config.totalSlots + 1} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest text-center">
                       {day}
                    </td>
                  </tr>
                  {filteredSections.map(section => {
                    const sem = state.semesters.find(s => s.id === section.semesterId);
                    return (
                      <tr key={`${day}-${section.id}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 sticky left-0 bg-white z-10 border-r border-slate-200 font-bold text-slate-900 text-lg">
                          {section.name}
                        </td>
                        {Array.from({ length: state.config.totalSlots }).map((_, slotIdx) => {
                          const e = state.masterTimetable.find(e => e.sectionId === section.id && e.day === day && e.slotIndex === slotIdx);
                          const isLunch = (sem?.lunchEnabled && sem?.lunchSlotIndex === slotIdx) || e?.entryType === 'lunch';
                          const sub = e?.subjectId ? state.subjects.find(s => s.id === e.subjectId) : null;
                          const fac = e?.facultyId ? state.faculty.find(f => f.id === e.facultyId) : null;

                          if (isLunch) return (
                            <td key={slotIdx} className="p-2">
                              <div className="h-20 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-300 border border-slate-100 border-dashed relative group">
                                <Coffee size={16} className="mb-1" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Break</span>
                                {e?.entryType === 'lunch' && (
                                   <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                      <button onClick={() => removeItem(e.id)} className="p-1 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600"><Trash2 size={10}/></button>
                                   </div>
                                )}
                              </div>
                            </td>
                          );

                          return (
                            <td key={slotIdx} className="p-2">
                              {e ? (
                                <div className={`p-3 rounded-xl border h-20 flex flex-col justify-between group relative transition-all ${
                                  e.entryType === 'workshop' ? 'bg-purple-50 border-purple-200 shadow-sm' :
                                  e.entryType === 'event' ? 'bg-indigo-50 border-indigo-200 shadow-sm' :
                                  e.isLocked ? 'bg-slate-900 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 shadow-sm'
                                }`}>
                                  <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                    <button onClick={() => toggleLock(e.id)} className={`p-1 rounded-md ${e.isLocked ? 'bg-slate-700 text-white' : 'bg-white text-slate-400 border border-slate-200 shadow-sm'}`}>
                                      {e.isLocked ? <Lock size={10}/> : <Unlock size={10}/>}
                                    </button>
                                    <button onClick={() => removeItem(e.id)} className="p-1 bg-red-500 text-white rounded-md shadow-sm hover:bg-red-600"><Trash2 size={10}/></button>
                                  </div>
                                  <div>
                                    <p className={`text-[8px] font-bold uppercase ${e.isLocked ? 'text-blue-400' : 'text-blue-600'}`}>
                                      {e.entryType === 'lecture' ? (sub?.code || 'LECT') : e.entryType}
                                    </p>
                                    <h4 className={`text-[10px] font-bold leading-tight line-clamp-1 ${e.isLocked ? 'text-white' : 'text-slate-900'}`}>
                                      {sub?.name || e.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 opacity-80">
                                    <Clock size={10} />
                                    <p className={`text-[9px] font-medium truncate ${e.isLocked ? 'text-slate-300' : 'text-slate-500'}`}>{fac?.name || '--'}</p>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setEditingSlot({ sectionId: section.id, day, slotIdx });
                                    setSlotFormData({ entryType: 'lecture' });
                                  }}
                                  className="w-full h-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50 transition-all group"
                                >
                                  <Plus size={16} className="group-hover:scale-125 transition-transform" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Assign Entry</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingSlot.day} • P{editingSlot.slotIdx + 1}</p>
                 </div>
                 <button onClick={() => setEditingSlot(null)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X size={18}/></button>
              </div>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Type</label>
                    <div className="grid grid-cols-4 gap-2">
                       {['lecture', 'lunch', 'workshop', 'event'].map(type => (
                         <button 
                          key={type}
                          onClick={() => setSlotFormData({ ...slotFormData, entryType: type as EntryType, facultyId: '', subjectId: '', title: '' })}
                          className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${slotFormData.entryType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}
                         >
                           {type}
                         </button>
                       ))}
                    </div>
                 </div>

                 {slotFormData.entryType === 'lunch' && (
                   <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                      <Coffee className="mx-auto text-blue-500 mb-2" size={32} />
                      <p className="text-sm font-bold text-blue-900">Mark this slot as a Lunch Break?</p>
                      <p className="text-[10px] font-medium text-blue-600 mt-1 uppercase tracking-wider">This will free up any teacher assigned here.</p>
                   </div>
                 )}

                 {slotFormData.entryType !== 'lecture' && slotFormData.entryType !== 'lunch' && (
                   <>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Event Title</label>
                        <input 
                          type="text" 
                          value={slotFormData.title || ''} 
                          onChange={e => setSlotFormData({ ...slotFormData, title: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                          placeholder="e.g. Guest Seminar"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Responsible Teacher (Optional)</label>
                        <select 
                          value={slotFormData.facultyId || ''} 
                          onChange={e => setSlotFormData({ ...slotFormData, facultyId: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                        >
                          <option value="">-- No Teacher --</option>
                          {state.faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                     </div>
                   </>
                 )} {slotFormData.entryType === 'lecture' && (
                   <div className="space-y-3">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Faculty & Course</label>
                     <div className="space-y-2">
                        {getTeachersForSection().map(cand => (
                          <button 
                             key={cand?.id}
                             disabled={!!cand.busyIn}
                             onClick={() => setSlotFormData({ ...slotFormData, facultyId: cand?.id, subjectId: cand.subject?.id })}
                             className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                               slotFormData.facultyId === cand?.id ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600' : 
                               cand.busyIn ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                             }`}
                          >
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="text-sm font-bold text-slate-800">{cand?.name}</p>
                                   <p className="text-[10px] font-bold text-blue-600 uppercase">{cand.subject?.name}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase">Load</p>
                                   <p className="text-sm font-black text-slate-700">{cand.dailyLoad} Periods</p>
                                </div>
                             </div>
                             {cand.busyIn && (
                               <div className="mt-2 flex items-center gap-1.5 text-red-500">
                                  <AlertCircle size={12} />
                                  <span className="text-[9px] font-bold uppercase tracking-tight">Busy in {cand.busyIn}</span>
                               </div>
                             )}
                          </button>
                        ))}
                     </div>
                   </div>
                 )}

                 <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleManualAdd} 
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      Assign Entry
                    </button>
                    <button onClick={() => setEditingSlot(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">Cancel</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Errors Modal */}
      {showErrors && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                 <div className="flex items-center gap-3">
                   <AlertTriangle className="text-red-500" size={24} />
                   <div>
                     <h3 className="text-lg font-bold text-red-800">Schedule Conflicts</h3>
                     <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{conflicts.hard.length} Critical Issues Detected</p>
                   </div>
                 </div>
                 <button onClick={() => setShowErrors(false)} className="p-2 hover:bg-red-100 rounded-full transition-all text-red-500"><X size={18}/></button>
              </div>
              <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                 {conflicts.hard.map((err, idx) => (
                   <div key={idx} className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                         {idx + 1}
                      </div>
                      <p className="text-sm font-bold text-red-900 leading-relaxed">{err}</p>
                   </div>
                 ))}
                 {conflicts.hard.length === 0 && (
                   <div className="text-center py-12 text-slate-400 italic">
                      No errors found in the current schedule.
                   </div>
                 )}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                 <button onClick={() => setShowErrors(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                    I'll Fix These Issues
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Lunch Settings Modal */}
      {showSettings && currentSem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-black text-slate-800 flex items-center gap-3">
                  <Coffee size={24} className="text-blue-500" />
                  Program Lunch Breaks
                </h4>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20}/></button>
              </div>
              
              <div className="space-y-6">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Selected Program</p>
                    <p className="text-sm font-black text-slate-900">{currentSem.name}</p>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div>
                       <p className="text-sm font-black text-blue-900">Lunch Break Status</p>
                       <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Enable automatic lunch for all sections</p>
                    </div>
                    <button 
                      onClick={() => updateProgramLunch(currentSem.id, !currentSem.lunchEnabled, currentSem.lunchSlotIndex || 3)}
                      className={`w-14 h-8 rounded-full transition-all relative ${currentSem.lunchEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${currentSem.lunchEnabled ? 'left-7' : 'left-1'}`}></div>
                    </button>
                 </div>

                 {currentSem.lunchEnabled && (
                   <div className="space-y-3">
                     <p className="text-xs font-black text-slate-700 uppercase tracking-widest px-1">Choose Global Period</p>
                     <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                       {Array.from({ length: state.config.totalSlots }).map((_, idx) => (
                         <button
                           key={idx}
                           onClick={() => updateProgramLunch(currentSem.id, true, idx)}
                           className={`h-12 rounded-xl text-xs font-black border transition-all ${currentSem.lunchSlotIndex === idx ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                         >
                           P{idx + 1}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
              </div>

              <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                Close Settings
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default MasterTimetable;
