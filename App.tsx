
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './modules/Dashboard';
import MasterTimetable from './modules/MasterTimetable';
import DailyAdjustments from './modules/DailyAdjustments';
import DataManagement from './modules/DataManagement';
import FacultyView from './modules/FacultyView';
import { AppState } from './types';
import { Menu, Bell } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [state, setState] = useState<AppState>({
    semesters: [],
    sections: [],
    faculty: [],
    subjects: [],
    assignments: [],
    masterTimetable: [],
    dailyAdjustments: {},
    facultyAvailability: {},
    config: {
      totalSlots: 5
    }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard state={state} setState={setState} setActiveTab={setActiveTab} />;
      case 'master': return <MasterTimetable state={state} setState={setState} />;
      case 'faculty_view': return <FacultyView state={state} setState={setState} />;
      case 'adjustment': return <DailyAdjustments state={state} setState={setState} />;
      case 'database': return <DataManagement state={state} setState={setState} />;
      default: return <div className="p-10 text-center text-slate-400 font-medium">Coming soon...</div>;
    }
  };

  const getPageTitle = () => {
    const item = {
      'dashboard': 'Home Overview',
      'master': 'Weekly Schedule',
      'faculty_view': 'Teacher Schedules',
      'adjustment': 'Daily Substitutions',
      'database': 'Settings & Data'
    }[activeTab];
    return item || 'Campus Planner';
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* Mobile Background Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 lg:ml-64 w-full">
        {/* Simple Header */}
        <header className="px-6 py-4 lg:px-10 flex justify-between items-center bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-600 lg:hidden hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-none">{getPageTitle()}</h2>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">IMSUC Campus Ghaziabad</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex px-3 py-1.5 bg-slate-100 rounded-full items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Active Session</span>
             </div>
             <button className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell size={20} />
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 lg:p-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
