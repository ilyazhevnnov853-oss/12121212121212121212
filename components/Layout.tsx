import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { LayoutDashboard, PenTool, Database, Tag as TagIcon, Settings, Menu, X, User as UserIcon, LogOut, FileUp, Download, Upload, HardDrive, Library } from 'lucide-react';
import { DictionaryItem } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { 
      currentUser, logout,
      tags, templates, dictionaries, globalVariables, counters,
      loadProjectData, importDictionaryItems 
  } = useStore();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  
  const csvInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Статистика проекта', icon: LayoutDashboard },
    { id: 'registry', label: 'Реестр тегов', icon: Database },
    { id: 'builder', label: 'Конструктор шаблонов', icon: PenTool },
    { id: 'generator', label: 'Создание тега', icon: TagIcon },
    { id: 'dictionaries', label: 'Данные проекта', icon: Settings },
  ];

  if (isAdmin) {
      navItems.push({ id: 'admin_library', label: 'Системные стандарты', icon: Library });
  }

  // --- Global Tools Handlers ---
  const handleBackup = () => {
      const data = { tags, templates, dictionaries, globalVariables, counters };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TagEngine_Backup_${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (data.tags && data.templates) {
                  loadProjectData(data);
                  alert("База данных успешно восстановлена.");
              } else alert("Неверный формат файла бэкапа.");
          } catch (err) { alert("Ошибка чтения файла."); }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const newItems: Omit<DictionaryItem, 'projectId'>[] = [];
          lines.forEach((line, idx) => {
              if (idx === 0 && line.includes('Category')) return; 
              const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              if (cols.length >= 3) {
                  newItems.push({
                      id: crypto.randomUUID(),
                      category: cols[0],
                      code: cols[1],
                      value: cols[2],
                      description: cols[3] || ''
                  });
              }
          });
          if (newItems.length > 0) {
              importDictionaryItems(newItems);
              alert(`Импортировано ${newItems.length} записей.`);
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl z-20">
        <div className="p-6 border-b border-slate-700 flex items-center space-x-2">
          <TagIcon className="w-8 h-8 text-[#339A2D]" />
          <span className="text-xl font-bold tracking-tight">TagEngine</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-[#339A2D] text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
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
                    <TagIcon className="w-6 h-6 text-[#339A2D]" />
                    <span className="font-bold text-slate-900">TagEngine</span>
                </div>
              </div>

              {/* Title (Desktop) - REMOVED as per request */}
              <div className="hidden md:block"></div>

              {/* User Widget & Tools */}
              <div className="flex items-center space-x-4">
                  
                  {/* Project Tools Dropdown */}
                  <div className="relative">
                     <button
                        onClick={() => setIsToolsOpen(!isToolsOpen)}
                        className="p-2 text-slate-400 hover:text-[#339A2D] hover:bg-[#339A2D]/10 rounded-full transition-colors flex items-center justify-center"
                        title="Инструменты проекта"
                     >
                        <HardDrive size={20} />
                     </button>
                     {isToolsOpen && (
                         <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsToolsOpen(false)}></div>
                            <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Управление проектом</p>
                                </div>
                                <button onClick={() => { csvInputRef.current?.click(); setIsToolsOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                     <FileUp size={16} className="text-blue-500"/> 
                                     <span>Импорт справочников (CSV)</span>
                                </button>
                                <button onClick={() => { handleBackup(); setIsToolsOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                     <Download size={16} className="text-green-500"/> 
                                     <span>Скачать Бэкап (JSON)</span>
                                </button>
                                <button onClick={() => { backupInputRef.current?.click(); setIsToolsOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                     <Upload size={16} className="text-orange-500"/> 
                                     <span>Восстановить (JSON)</span>
                                </button>
                            </div>
                         </>
                     )}
                     <input type="file" accept=".csv" ref={csvInputRef} hidden onChange={handleImportCSV} />
                     <input type="file" accept=".json" ref={backupInputRef} hidden onChange={handleRestore} />
                  </div>

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
                    activeTab === item.id ? 'bg-[#339A2D] text-white' : 'text-slate-300'
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