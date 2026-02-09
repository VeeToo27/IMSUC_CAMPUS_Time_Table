
import React, { useState } from 'react';
import { AppState, Day } from '../types';
import { DAYS } from '../constants';
import { User, Clock, MapPin, Calendar, ChevronDown } from 'lucide-react';

interface FacultyViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const FacultyView: React.FC<FacultyViewProps> = ({ state, setState }) => {
  const [selectedFacId, setSelectedFacId] = useState(state.faculty[0]?.id);
  const faculty = state.faculty.find(f => f.id === selectedFacId);

  const getSchedule = (day: Day) => 
    state.masterTimetable
      .filter(e => e.facultyId === selectedFacId && e.day === day)
      .sort((a,b) => a.slotIndex - b.slotIndex);

  const totalLoad = state.masterTimetable.filter(e => e.facultyId === selectedFacId).length;

  return (
    <div className="space-y-6">
      {/* Selector Header */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
          <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
            {faculty?.name.charAt(0)}
          </div>
          <div className="space-y-3 w-full md:w-80">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-1">Select Teacher</label>
             <div className="relative">
               <select 
                value={selectedFacId} 
                onChange={e => setSelectedFacId(e.target.value)} 
                className="w-full bg-slate-50 py-3 px-4 rounded-lg border border-slate-200 font-bold text-sm text-slate-700 outline-none appearance-none cursor-pointer focus:border-blue-500"
               >
                  {state.faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
             </div>
          </div>
        </div>

        <div className="bg-blue-50 px-6 py-4 rounded-xl border border-blue-100 text-center md:text-right">
           <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Weekly Load</p>
           <div className="flex items-center gap-2 justify-center md:justify-end">
             <span className="text-2xl font-black text-blue-700">{totalLoad}</span>
             <span className="text-xs font-bold text-blue-600 uppercase">Classes</span>
           </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {DAYS.map(day => {
          const schedule = getSchedule(day);
          return (
            <div key={day} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-4 bg-slate-900 text-white">
                <h3 className="font-bold text-xs uppercase tracking-widest text-center">{day}</h3>
              </div>
              <div className="p-3 space-y-3 flex-1 bg-slate-50/50">
                {schedule.length === 0 ? (
                  <div className="py-12 text-center opacity-30 flex flex-col items-center gap-2">
                    <Calendar size={24} />
                    <p className="text-[10px] font-bold uppercase tracking-tight">No Classes</p>
                  </div>
                ) : (
                  schedule.map(e => {
                    const sub = state.subjects.find(s => s.id === e.subjectId);
                    const sec = state.sections.find(s => s.id === e.sectionId);
                    return (
                      <div key={e.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1.5 text-blue-600">
                              <Clock size={12} />
                              <span className="text-[10px] font-bold">P{e.slotIndex + 1}</span>
                           </div>
                           <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold uppercase">SEC {sec?.name}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs leading-tight line-clamp-2">{sub?.name}</h4>
                        <div className="pt-2 border-t border-slate-50 flex items-center gap-2 text-slate-400">
                           <MapPin size={10} />
                           <span className="text-[9px] font-medium uppercase tracking-tighter">Main Building</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FacultyView;
