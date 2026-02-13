import React, { useState } from 'react';
import { useStore } from '../store';
import { Project } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Folder, Plus, LogOut, Info, Tag, ArrowRight, Copy, ShieldAlert, Trash2, Save, Globe } from 'lucide-react';

export const ProjectsDashboard: React.FC = () => {
    const { projects, currentUser, setCurrentProject, addProject, updateProject, deleteProject, logout, importProjectConfig } = useStore();
    
    // Modal States
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    
    // Edit Modal State
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    // Form States (Create)
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

    // Edit Handlers
    const openEditModal = (project: Project) => {
        setEditingProject(project);
        setEditName(project.name);
        setEditDesc(project.description || '');
    };

    const handleUpdateProject = () => {
        if (!editingProject || !editName) return;
        updateProject(editingProject.id, { name: editName, description: editDesc });
        setEditingProject(null);
    };

    const handleDeleteProject = () => {
        if (!editingProject) return;
        if (confirm('Вы уверены, что хотите удалить этот проект? Все данные будут потеряны.')) {
            deleteProject(editingProject.id);
            setEditingProject(null);
        }
    };

    // Special Route Trigger
    const goToAdminLibrary = () => {
        // We use a hacky way to switch routing context without a router lib in this simple demo
        // Ideally we would use react-router.
        // For now, we rely on App.tsx checking `currentProjectId` which is null here.
        // We need a way to signal App.tsx to show Admin Library.
        // Since we are adding "admin_library" to the App tab state, we can use a temporary project ID or similar mechanism.
        // BUT, App.tsx logic is: if (!currentProjectId) show ProjectsDashboard.
        // So we need to modify App.tsx to handle a specific "admin-mode" state or route.
        // 
        // SIMPLIFICATION: We will dispatch a custom event or use a window global, 
        // OR better: we add a `viewMode` to the Store or App state.
        // 
        // ACTUALLY: Let's assume the App.tsx has been updated to handle a 'ADMIN_LIBRARY' pseudo-project-id 
        // or we simply render the AdminLibrary component here conditionally if a state is set.
        
        // Let's modify the Store to allow 'ADMIN_LIB' as a currentProjectId 
        // and handle it in App.tsx
        setCurrentProject('ADMIN_LIB');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <Tag className="w-8 h-8 text-[#339A2D]" />
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">TagEngine</h1>
                </div>
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <Button onClick={goToAdminLibrary} className="bg-indigo-600 hover:bg-indigo-700" icon={<Globe size={16}/>}>
                            Системная Библиотека
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={logout} icon={<LogOut size={16}/>}>Выйти</Button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
                
                <div className="flex justify-between items-end mb-6">
                    <div>
                         <h2 className="text-2xl font-bold text-slate-800">Доступные проекты</h2>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <Button onClick={() => setCreateModalOpen(true)} icon={<Plus size={16}/>}>Новый проект</Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(proj => (
                        <div key={proj.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-[#339A2D]/10 text-[#339A2D] p-3 rounded-lg">
                                    <Folder size={24} />
                                </div>
                                {isAdmin && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(proj)} className="text-slate-400 hover:text-[#339A2D] p-1" title="Настройки проекта">
                                            <Info size={20} />
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
                                    className="text-sm font-bold text-[#339A2D] hover:text-[#267c21] flex items-center gap-1"
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
                            className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-[#339A2D] hover:text-[#339A2D] transition-colors min-h-[200px]"
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

            {/* Edit Modal */}
            {editingProject && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold text-slate-800">Настройки проекта</h3>
                             <button onClick={() => handleDeleteProject()} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors" title="Удалить проект">
                                <Trash2 size={18} />
                             </button>
                        </div>
                        
                        <div className="space-y-4">
                            <Input label="Название" value={editName} onChange={e => setEditName(e.target.value)} />
                            <Input label="Описание" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                            <div className="text-xs text-slate-400">
                                ID: {editingProject.id} <br/>
                                Создан: {new Date(editingProject.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setEditingProject(null)}>Отмена</Button>
                            <Button onClick={handleUpdateProject} icon={<Save size={16}/>}>Сохранить</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Copy size={20} className="text-[#339A2D]"/>
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
                                        <input type="checkbox" checked={importOpts.templates} onChange={e => setImportOpts({...importOpts, templates: e.target.checked})} className="rounded border-slate-300 text-[#339A2D]"/>
                                        Шаблоны и Переменные
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={importOpts.dictionaries} onChange={e => setImportOpts({...importOpts, dictionaries: e.target.checked})} className="rounded border-slate-300 text-[#339A2D]"/>
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