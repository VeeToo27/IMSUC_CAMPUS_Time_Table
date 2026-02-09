
import React from 'react';
import { Home, Calendar, Users, ClipboardCheck, Database, X, Landmark } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'master', label: 'Weekly Schedule', icon: Calendar },
    { id: 'faculty_view', label: 'Teacher View', icon: Users },
    { id: 'adjustment', label: 'Daily Changes', icon: ClipboardCheck },
    { id: 'database', label: 'Settings & Data', icon: Database },
  ];

  const sidebarClasses = `
    w-64 bg-slate-900 h-screen text-slate-300 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `;

  return (
    <div className={sidebarClasses}>
      {/* Branding */}
      <div className="p-8 flex flex-col items-center border-b border-slate-800">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
            <Landmark size={24} />
          </div>
          <div className="text-center mt-2">
            <h1 className="text-lg font-bold text-white tracking-tight">Campus Planner</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">IMSUC Ghaziabad</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 mt-6 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'hover:bg-slate-800 hover:text-white text-slate-400'
            }`}
          >
            <item.icon 
              size={18} 
              className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} 
            />
            <span className="text-sm font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">
            v4
          </div>
          <div>
            <p className="text-xs font-bold text-white">IMSUC Campus</p>
            <p className="text-[10px] text-slate-500">Academic Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
