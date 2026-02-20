import React, { useState } from 'react';
import { AppState, Day } from '../types';
import { DAYS } from '../constants';
import { User, Clock, MapPin, Calendar, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

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
      .sort((a, b) => a.slotIndex - b.slotIndex);

  const totalLoad = state.masterTimetable.filter(e => e.facultyId === selectedFacId).length;

  const downloadFacultySchedule = () => {
    const wsData: any[][] = [];

    wsData.push(['IMS Ghaziabad — Faculty-wise Timetable']);
    wsData.push([]);
    wsData.push(['Teacher', ...DAYS]);

    state.faculty.forEach(fac => {
      const row: any[] = [fac.name];
      DAYS.forEach(day => {
        const entries = state.masterTimetable
          .filter(e => e.facultyId === fac.id && e.day === day)
          .sort((a, b) => a.slotIndex - b.slotIndex);

        if (entries.length === 0) {
          row.push('-');
        } else {
          const cell = entries.map(e => {
            const sub = state.subjects.find(s => s.id === e.subjectId);
            const sec = state.sections.find(s => s.id === e.sectionId);
            return `P${e.slotIndex + 1}: ${sub?.name || e.title || '?'} (${sec?.name || '?'})`;
          }).join('\n');
          row.push(cell);
        }
      });
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: DAYS.length } }];
    ws['!cols'] = [{ wch: 22 }, ...DAYS.map(() => ({ wch: 30 }))];

    const rowHeights: any[] = [{ hpt: 28 }, { hpt: 8 }];
    wsData.slice(2).forEach(() => rowHeights.push({ hpt: 60 }));
    ws['!rows'] = rowHeights;

    const totalRows = wsData.length;
    const totalCols = DAYS.length + 1;

    const DAY_COLORS: Record<string, string> = {
      Monday:    'FFD9EAD3',
      Tuesday:   'FFCFE2F3',
      Wednesday: 'FFFFF2CC',
      Thursday:  'FFFCE5CD',
      Friday:    'FFE8D5F5',
    };

    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) continue;

        if (r === 0) {
          ws[addr].s = {
            font: { bold: true, sz: 14, color: { rgb: 'FFFFFFFF' }, name: 'Arial' },
            fill: { fgColor: { rgb: 'FF1F3864' } },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
          continue;
        }

        if (r === 2) {
          ws[addr].s = {
            font: { bold: true, sz: 10, color: { rgb: 'FFFFFFFF' }, name: 'Arial' },
            fill: { fgColor: { rgb: c === 0 ? 'FF1F3864' : 'FF2F5496' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' },
            },
          };
          continue;
        }

        if (r > 2) {
          const isTeacherCol = c === 0;
          const day = DAYS[c - 1];
          const bgColor = isTeacherCol ? 'FFD6DCE4' : (DAY_COLORS[day] || 'FFEFEFEF');
          const isEmpty = ws[addr].v === '-';

          ws[addr].s = {
            font: {
              sz: 9,
              name: 'Arial',
              bold: isTeacherCol,
              color: { rgb: isEmpty ? 'FFAAAAAA' : '00000000' },
            },
            fill: { fgColor: { rgb: isEmpty ? 'FFF9F9F9' : bgColor } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
            },
          };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Schedule');
    XLSX.writeFile(wb, 'IMS_Ghaziabad_Faculty_Schedule.xlsx');
  };

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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 px-6 py-4 rounded-xl border border-blue-100 text-center md:text-right">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Weekly Load</p>
            <div className="flex items-center gap-2 justify-center md:justify-end">
              <span className="text-2xl font-black text-blue-700">{totalLoad}</span>
              <span className="text-xs font-bold text-blue-600 uppercase">Classes</span>
            </div>
          </div>

          <button
            onClick={downloadFacultySchedule}
            className="h-11 px-4 rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-bold transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
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
