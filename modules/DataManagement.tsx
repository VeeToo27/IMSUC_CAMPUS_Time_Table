
import React, { useState, useMemo, useRef } from 'react';
import { AppState, Semester, Section, Subject, Faculty, Assignment } from '../types';
import { 
  Plus, Search, Edit3, Trash2, Download, Upload, 
  School, Layout, Users, Book, Link as LinkIcon, Database, X, ChevronDown, FileText, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DataManagementProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type TabType = 'semesters' | 'sections' | 'faculty' | 'subjects' | 'assignments';

const DataManagement: React.FC<DataManagementProps> = ({ state, setState }) => {
  const [activeTab, setActiveTab] = useState<TabType>('semesters');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showHelp, setShowHelp] = useState(false);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let data: any[] = (state as any)[activeTab] || [];
    
    if (activeTab === 'assignments') {
      return data.filter((a: Assignment) => {
        const sec = state.sections.find(s => s.id === a.sectionId);
        const sub = state.subjects.find(s => s.id === a.subjectId);
        const fac = state.faculty.find(f => f.id === a.facultyId);
        return (
          sec?.name.toLowerCase().includes(term) ||
          sub?.name.toLowerCase().includes(term) ||
          fac?.name.toLowerCase().includes(term)
        );
      });
    }

    return data.filter((item: any) => {
      const name = item.name?.toLowerCase() || '';
      const code = item.code?.toLowerCase() || '';
      return name.includes(term) || code.includes(term);
    });
  }, [activeTab, searchTerm, state]);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // Programs Template
    const programsData = [
      { Name: "BCA Semester 1" },
      { Name: "BCA Semester 3" },
      { Name: "BCA Semester 5" }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(programsData), "Programs");

    // Faculty Template
    const facultyData = [
      { Name: "DR. ABHISHEK MISHRA" },
      { Name: "DR. MANISHA CHAUDHRY" },
      { Name: "MS. SHIKHA TIWARI" }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(facultyData), "Faculty");

    // Courses Template
    const coursesData = [
      { Name: "MATHS-I", Code: "BCA101", WeeklyFrequency: 4 },
      { Name: "PPA", Code: "BCA102", WeeklyFrequency: 5 },
      { Name: "CFOA", Code: "BCA103", WeeklyFrequency: 5 }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coursesData), "Courses");

    // Mappings Template
    const mappingsData = [
      { Program: "BCA Semester 1", Section: "A", SubjectCode: "BCA101", FacultyName: "DR. ABHISHEK MISHRA" },
      { Program: "BCA Semester 1", Section: "B", SubjectCode: "BCA101", FacultyName: "DR. ABHISHEK MISHRA" },
      { Program: "BCA Semester 1", Section: "A", SubjectCode: "BCA102", FacultyName: "MS. SHIKHA TIWARI" }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mappingsData), "Mappings");

    XLSX.writeFile(wb, `Campus_Data_Template_v2.xlsx`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const humanAssignments = state.assignments.map(a => {
      const sec = state.sections.find(s => s.id === a.sectionId);
      const sem = state.semesters.find(s => s.id === sec?.semesterId);
      const sub = state.subjects.find(s => s.id === a.subjectId);
      const fac = state.faculty.find(f => f.id === a.facultyId);
      return {
        Program: sem?.name || '',
        Section: sec?.name || '',
        SubjectCode: sub?.code || '',
        FacultyName: fac?.name || ''
      };
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.semesters.map(s => ({ Name: s.name }))), "Programs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.faculty.map(f => ({ Name: f.name }))), "Faculty");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.subjects.map(s => ({ Name: s.name, Code: s.code, WeeklyFrequency: s.weeklyFrequency }))), "Courses");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(humanAssignments), "Mappings");

    XLSX.writeFile(wb, `Current_Academic_Data.xlsx`);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const rawSems = XLSX.utils.sheet_to_json(workbook.Sheets["Programs"]) as any[];
        if (rawSems.length === 0) throw new Error("Programs sheet is empty");
        const newSemesters: Semester[] = rawSems.map((s, i) => ({ 
          id: `sem-${i}-${Date.now()}`, 
          name: String(s.Name).trim() 
        }));

        const rawFac = XLSX.utils.sheet_to_json(workbook.Sheets["Faculty"]) as any[];
        const newFaculty: Faculty[] = rawFac.map((f, i) => ({ 
          id: `fac-${i}-${Date.now()}`, 
          name: String(f.Name).trim(), 
          status: 'Present' 
        }));

        const rawSubs = XLSX.utils.sheet_to_json(workbook.Sheets["Courses"]) as any[];
        const newSubjects: Subject[] = rawSubs.map((s, i) => ({ 
          id: `sub-${i}-${Date.now()}`, 
          name: String(s.Name).trim(), 
          code: String(s.Code).trim(), 
          weeklyFrequency: Number(s.WeeklyFrequency) || 4 
        }));

        const rawMappings = XLSX.utils.sheet_to_json(workbook.Sheets["Mappings"]) as any[];
        const newSections: Section[] = [];
        const newAssignments: Assignment[] = [];

        rawMappings.forEach((m, i) => {
          const sem = newSemesters.find(s => s.name === String(m.Program).trim());
          const sub = newSubjects.find(s => s.code === String(m.SubjectCode).trim());
          const fac = newFaculty.find(f => f.name === String(m.FacultyName).trim());
          
          if (sem && sub && fac) {
            let sec = newSections.find(s => s.name === String(m.Section).trim() && s.semesterId === sem.id);
            if (!sec) {
              sec = { id: `sec-${newSections.length}-${Date.now()}`, name: String(m.Section).trim(), semesterId: sem.id };
              newSections.push(sec);
            }
            newAssignments.push({ 
              id: `asg-${i}-${Date.now()}`, 
              sectionId: sec.id, 
              subjectId: sub.id, 
              facultyId: fac.id 
            });
          }
        });

        if (newAssignments.length === 0) {
          alert("Import warned: No valid mappings found. Ensure 'SubjectCode' and 'Program' names match exactly.");
        }

        setState(prev => ({
          ...prev,
          semesters: newSemesters,
          faculty: newFaculty,
          subjects: newSubjects,
          sections: newSections,
          assignments: newAssignments,
          masterTimetable: [],
          dailyAdjustments: {},
          facultyAvailability: {}
        }));
        
        alert(`Success! Imported ${newSemesters.length} Programs, ${newFaculty.length} Faculty, and ${newAssignments.length} Assignments.`);
      } catch (err) {
        alert("Import failed. Ensure you used the template structure (Sheets: Programs, Faculty, Courses, Mappings).");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeSave = () => {
    setState(prev => {
      const list = [...((prev as any)[activeTab] || [])];
      if (modalMode === 'create') {
        const id = `${activeTab}-${Date.now()}`;
        return { ...prev, [activeTab]: [...list, { ...formData, id }] };
      } else {
        return { ...prev, [activeTab]: list.map(item => item.id === activeItem.id ? { ...formData } : item) };
      }
    });
    setModalMode(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Utility Sidebar */}
      <div className="w-full lg:w-72 shrink-0 space-y-6">
        <div className="bg-white p-3 rounded-[32px] border border-slate-200 shadow-sm flex lg:flex-col overflow-x-auto scrollbar-none gap-2">
          {[
            { id: 'semesters', label: 'Programs', icon: School },
            { id: 'sections', label: 'Sections', icon: Layout },
            { id: 'faculty', label: 'Faculty', icon: Users },
            { id: 'subjects', label: 'Subjects', icon: Book },
            { id: 'assignments', label: 'Assignments', icon: LinkIcon },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all flex-1 lg:flex-none whitespace-nowrap text-[11px] font-black uppercase tracking-widest ${
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sync Panel */}
        <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Database size={80} />
           </div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
                 <Database className="text-blue-400" size={20} />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Sync</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-bold mb-6">
                Manage your campus data in bulk. Use our Excel templates for zero-error imports.
              </p>
              <div className="space-y-3">
                <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest border border-white/5">
                  <FileText size={16} /> Download Template
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={exportToExcel} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-[9px] font-black uppercase tracking-widest border border-white/5">
                    <Download size={14} /> Export
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 transition-all text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/50">
                    <Upload size={14} /> Import
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
              </div>
           </div>
        </div>

        {/* Instructions */}
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-6 rounded-[32px] bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-all group"
        >
          <div className="flex items-center gap-4">
            <Info size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Excel Guide</span>
          </div>
          <ChevronDown size={18} className={`transition-transform ${showHelp ? 'rotate-180' : ''}`} />
        </button>
        {showHelp && (
          <div className="p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
             <div className="space-y-3">
               <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Data Structure:</p>
               <ul className="space-y-2">
                 <li className="flex gap-3 text-[10px] font-bold text-slate-500">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                   1. Fill 'Programs', 'Faculty', & 'Courses' sheets first.
                 </li>
                 <li className="flex gap-3 text-[10px] font-bold text-slate-500">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                   2. Use the exact 'Program' name and 'SubjectCode' in 'Mappings'.
                 </li>
                 <li className="flex gap-3 text-[10px] font-bold text-slate-500">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                   3. Import file to overwrite current setup.
                 </li>
               </ul>
             </div>
          </div>
        )}
      </div>

      {/* Registry Display */}
      <div className="flex-1 space-y-6">
        <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search registry...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              let initial: any = {};
              if (activeTab === 'subjects') initial = { weeklyFrequency: 4 };
              if (activeTab === 'sections' && state.semesters.length > 0) initial = { semesterId: state.semesters[0].id };
              if (activeTab === 'assignments') {
                initial = { sectionId: state.sections[0]?.id || '', subjectId: state.subjects[0]?.id || '', facultyId: state.faculty[0]?.id || '' };
              }
              setFormData(initial);
              setModalMode('create');
            }} 
            className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 active:scale-95"
          >
            <Plus size={18} /> New Record
          </button>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-10">Details</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:table-cell">Context</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right pr-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item: any) => {
                  let subText = 'Institutional Record';
                  if (activeTab === 'sections') {
                    const sem = state.semesters.find(s => s.id === item.semesterId);
                    subText = `Under ${sem?.name || '---'}`;
                  } else if (activeTab === 'assignments') {
                    const sec = state.sections.find(s => s.id === item.sectionId);
                    const sub = state.subjects.find(s => s.id === item.subjectId);
                    const fac = state.faculty.find(f => f.id === item.facultyId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="p-6 pl-10">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                              <LinkIcon size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{sub?.name || '---'}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{sub?.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase">Sec {sec?.name}</span>
                            <span className="px-3 py-1 bg-blue-50 rounded-lg text-[9px] font-black text-blue-600 uppercase">{fac?.name}</span>
                          </div>
                        </td>
                        <td className="p-6 text-right pr-10">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setActiveItem(item); setFormData({...item}); setModalMode('edit'); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                              <button onClick={() => setState(p => ({...p, [activeTab]: (p as any)[activeTab].filter((i: any) => i.id !== item.id) }))} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                           </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="p-6 pl-10">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black uppercase shadow-lg group-hover:rotate-6 transition-all">
                            {(item.name || item.code || '?').charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{item.name || item.code}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {item.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 hidden sm:table-cell">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{subText}</span>
                      </td>
                      <td className="p-6 text-right pr-10">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setActiveItem(item); setFormData({...item}); setModalMode('edit'); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                            <button onClick={() => setState(prev => ({ ...prev, [activeTab]: (prev as any)[activeTab].filter((i: any) => i.id !== item.id) }))} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{modalMode === 'create' ? 'Add Record' : 'Edit Record'}</h3>
                 <button onClick={() => setModalMode(null)} className="p-3 hover:bg-slate-200 rounded-full transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-6">
                 {activeTab === 'semesters' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Program Name</label>
                       <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner" placeholder="e.g. BCA Semester 1" />
                    </div>
                 )}
                 {activeTab === 'sections' && (
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Section Letter</label>
                          <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none shadow-inner" placeholder="e.g. A" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Program</label>
                          <div className="relative">
                             <select value={formData.semesterId || ''} onChange={e => setFormData({...formData, semesterId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer">
                                {state.semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                             <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                          </div>
                       </div>
                    </div>
                 )}
                 {activeTab === 'assignments' && (
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Class</label>
                          <select value={formData.sectionId || ''} onChange={e => setFormData({...formData, sectionId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none appearance-none">
                            {state.sections.map(s => {
                              const sem = state.semesters.find(sem => sem.id === s.semesterId);
                              return <option key={s.id} value={s.id}>{sem?.name} • Sec {s.name}</option>
                            })}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Subject</label>
                          <select value={formData.subjectId || ''} onChange={e => setFormData({...formData, subjectId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none appearance-none">
                            {state.subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Faculty</label>
                          <select value={formData.facultyId || ''} onChange={e => setFormData({...formData, facultyId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none appearance-none">
                            {state.faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                       </div>
                    </div>
                 )}
                 {activeTab === 'faculty' && (
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Teacher Name</label>
                       <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none shadow-inner" placeholder="e.g. Dr. Vikas Kumar" />
                    </div>
                 )}
                 {activeTab === 'subjects' && (
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Subject Name</label>
                          <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none shadow-inner" placeholder="e.g. Data Structures" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Code</label>
                             <input type="text" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none shadow-inner" placeholder="BCA101" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Lectures/Week</label>
                             <input type="number" value={formData.weeklyFrequency || 4} onChange={e => setFormData({...formData, weeklyFrequency: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none shadow-inner" />
                          </div>
                       </div>
                    </div>
                 )}
                 <button onClick={executeSave} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 active:scale-95 transition-all mt-8">
                    Commit Record
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
