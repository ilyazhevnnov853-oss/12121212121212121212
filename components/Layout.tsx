import React, { useState } from 'react';
import { useStore } from '../store';
import { LayoutDashboard, PenTool, Database, Tag as TagIcon, Settings, Menu, X, User as UserIcon, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, logout } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Статистика проекта', icon: LayoutDashboard },
    { id: 'registry', label: 'Реестр тегов', icon: Database },
    { id: 'builder', label: 'Конструктор шаблонов', icon: PenTool },
    { id: 'generator', label: 'Создание тега', icon: TagIcon },
    { id: 'dictionaries', label: 'Данные проекта', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl z-20">
        <div className="p-6 border-b border-slate-700 flex items-center space-x-2">
          <TagIcon className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold tracking-tight">TagEngine</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-400 text-center">
          v1.0.0 &bull; Инженерный режим
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
                <div className="flex items-center space-x-2 ml-4">
                    <TagIcon className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-slate-900">TagEngine</span>
                </div>
              </div>

              {/* Title (Desktop) */}
              <div className="hidden md:block">
                  <h2 className="text-lg font-semibold text-slate-700">
                      {navItems.find(i => i.id === activeTab)?.label}
                  </h2>
              </div>

              {/* User Widget */}
              <div className="flex items-center space-x-4">
                  {currentUser && (
                      <div className="flex items-center pl-4 border-l border-slate-200">
                          <div className="text-right mr-3 hidden sm:block">
                              <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{currentUser.role}</p>
                          </div>
                          <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                              <UserIcon className="text-slate-500" size={20}/>
                          </div>
                          <button 
                            onClick={logout}
                            className="ml-3 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Выйти"
                          >
                              <LogOut size={20} />
                          </button>
                      </div>
                  )}
              </div>
          </header>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 bg-slate-900 z-40 pt-20 px-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 text-lg font-medium rounded-lg ${
                    activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-300'
                  }`}
                >
                  <item.icon className="w-6 h-6 mr-3" />
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable Main Content */}
          <main className="flex-1 overflow-auto md:p-8 p-4 bg-slate-50">
            <div className="max-w-7xl mx-auto h-full">
                {children}
            </div>
          </main>
      </div>
    </div>
  );
};