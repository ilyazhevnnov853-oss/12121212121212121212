import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Folder, Plus, LogOut, Settings, MoreVertical, Briefcase, ArrowRight, Copy, ShieldAlert } from 'lucide-react';

export const ProjectsDashboard: React.FC = () => {
    const { projects, currentUser, setCurrentProject, addProject, deleteProject, logout, importProjectConfig } = useStore();
    
    // Modal States
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    
    // Form States
    const [newProjName, setNewProjName] = useState('');
    const [newProjDesc, setNewProjDesc] = useState('');
    
    // Migration States
    const [targetImportId, setTargetImportId] = useState<string>('');
    const [sourceImportId, setSourceImportId] = useState<string>('');
    const [importOpts, setImportOpts] = useState({ templates: true, dictionaries: true });

    const isAdmin = currentUser?.role === 'admin';

    const handleCreateProject = () => {
        if (!newProjName) return;
        const newProject = {
            id: `proj_${crypto.randomUUID().slice(0,8)}`,
            name: newProjName,
            description: newProjDesc,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Unknown'
        };
        addProject(newProject);
        setNewProjName('');
        setNewProjDesc('');
        setCreateModalOpen(false);
    };

    const handleImport = () => {
        if (!sourceImportId || !targetImportId) return;
        if (sourceImportId === targetImportId) {
            alert("Нельзя импортировать из проекта в тот же самый проект.");
            return;
        }
        importProjectConfig(sourceImportId, targetImportId, importOpts);
        alert("Конфигурация успешно скопирована!");
        setImportModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                        <Briefcase size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Мои Проекты</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1 justify-end">
                            {currentUser?.name}
                            {isAdmin && <ShieldAlert size={14} className="text-red-500" />}
                        </p>
                        <p className="text-xs text-slate-500 uppercase font-bold">{currentUser?.role}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={logout} icon={<LogOut size={16}/>}>Выйти</Button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
                
                <div className="flex justify-between items-end mb-6">
                    <div>
                         <h2 className="text-2xl font-bold text-slate-800">Доступные проекты</h2>
                         <p className="text-slate-500 mt-1">Выберите проект для работы.</p>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setImportModalOpen(true)} icon={<Copy size={16}/>}>Миграция настроек</Button>
                            <Button onClick={() => setCreateModalOpen(true)} icon={<Plus size={16}/>}>Новый проект</Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(proj => (
                        <div key={proj.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
                                    <Folder size={24} />
                                </div>
                                {isAdmin && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteProject(proj.id)} className="text-slate-400 hover:text-red-500 p-1" title="Удалить проект">
                                            <Settings size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{proj.name}</h3>
                            <p className="text-sm text-slate-500 flex-1">{proj.description || 'Нет описания'}</p>
                            
                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs text-slate-400">ID: {proj.id.slice(0,6)}</span>
                                <button 
                                    onClick={() => setCurrentProject(proj.id)}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    Открыть <ArrowRight size={14}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Empty State Create Button */}
                    {isAdmin && (
                        <button 
                            onClick={() => setCreateModalOpen(true)}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[200px]"
                        >
                            <Plus size={32} className="mb-2"/>
                            <span className="font-medium">Создать проект</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Новый проект</h3>
                        <div className="space-y-4">
                            <Input label="Название" value={newProjName} onChange={e => setNewProjName(e.target.value)} placeholder="Например: Амурский ГПЗ" />
                            <Input label="Описание" value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} placeholder="Краткое описание" />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Отмена</Button>
                            <Button onClick={handleCreateProject}>Создать</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Copy size={20} className="text-blue-600"/>
                            Миграция конфигурации
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">Копирование шаблонов и справочников из существующего проекта в новый.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Откуда (Источник)</label>
                                <Select 
                                    options={projects.map(p => ({value: p.id, label: p.name}))}
                                    value={sourceImportId}
                                    onChange={e => setSourceImportId(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Куда (Цель)</label>
                                <Select 
                                    options={projects.map(p => ({value: p.id, label: p.name}))}
                                    value={targetImportId}
                                    onChange={e => setTargetImportId(e.target.value)}
                                />
                            </div>
                            
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs font-bold text-slate-500 uppercase mb-2 block">Что копировать?</span>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={importOpts.templates} onChange={e => setImportOpts({...importOpts, templates: e.target.checked})} className="rounded border-slate-300 text-blue-600"/>
                                        Шаблоны и Переменные
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={importOpts.dictionaries} onChange={e => setImportOpts({...importOpts, dictionaries: e.target.checked})} className="rounded border-slate-300 text-blue-600"/>
                                        Справочники
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>Отмена</Button>
                            <Button onClick={handleImport}>Начать миграцию</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};