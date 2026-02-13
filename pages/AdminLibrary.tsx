import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Globe, Package, LayoutTemplate, Search, LogOut, Tag, ArrowLeft, Save, Trash2, FolderOpen, AlertCircle } from 'lucide-react';
import { Builder } from './Builder';
import { AbstractAssembly, AbstractComponent } from '../types';

export const AdminLibrary: React.FC = () => {
    const { globalLibrary, globalAssemblies, addGlobalAssembly, setCurrentProject, logout } = useStore();
    
    // UI State
    const [view, setView] = useState<'list' | 'template_builder' | 'assembly_builder'>('list');
    const [activeTab, setActiveTab] = useState<'templates' | 'assemblies'>('templates');
    const [filter, setFilter] = useState('');

    // Assembly Builder State
    const [asmName, setAsmName] = useState('');
    const [asmCat, setAsmCat] = useState('');
    const [asmDesc, setAsmDesc] = useState('');
    const [rootComponent, setRootComponent] = useState<AbstractComponent>({
        id: 'root', name: 'Корневой узел', defaultPrefix: 'TAG', children: []
    });

    // Helper to update the recursive tree structure
    const updateComponentInTree = (
        node: AbstractComponent, 
        targetId: string, 
        updater: (n: AbstractComponent) => AbstractComponent
    ): AbstractComponent => {
        if (node.id === targetId) {
            return updater(node);
        }
        if (node.children) {
            return {
                ...node,
                children: node.children.map(child => updateComponentInTree(child, targetId, updater))
            };
        }
        return node;
    };

    const deleteComponentInTree = (node: AbstractComponent, targetId: string): AbstractComponent => {
        if (!node.children) return node;
        return {
            ...node,
            children: node.children.filter(c => c.id !== targetId).map(c => deleteComponentInTree(c, targetId))
        };
    };

    const handleAddComponent = (parentId: string) => {
        const newComp: AbstractComponent = {
            id: crypto.randomUUID(),
            name: 'Новый компонент',
            defaultPrefix: 'X',
            children: []
        };
        setRootComponent(prev => updateComponentInTree(prev, parentId, (node) => ({
            ...node,
            children: [...(node.children || []), newComp]
        })));
    };

    const handleUpdateComponent = (id: string, field: keyof AbstractComponent, value: string) => {
        setRootComponent(prev => updateComponentInTree(prev, id, (node) => ({ ...node, [field]: value })));
    };

    const handleDeleteComponent = (id: string) => {
        if (id === rootComponent.id) return; // Cannot delete root
        setRootComponent(prev => deleteComponentInTree(prev, id));
    };

    const handleSaveAssembly = () => {
        if (!asmName || !asmCat) {
            alert('Название и Категория обязательны.');
            return;
        }
        const newAsm: AbstractAssembly = {
            id: crypto.randomUUID(),
            type: 'assembly',
            name: asmName,
            category: asmCat,
            description: asmDesc,
            rootComponent,
            createdAt: new Date().toISOString(),
            createdBy: 'Admin'
        };
        addGlobalAssembly(newAsm);
        setView('list');
        // Reset
        setAsmName(''); setAsmCat(''); setAsmDesc('');
        setRootComponent({ id: 'root', name: 'Корневой узел', defaultPrefix: 'TAG', children: [] });
    };

    // Recursive Tree Renderer
    const renderTree = (node: AbstractComponent) => {
        const isRoot = node.id === rootComponent.id;
        
        return (
            <div key={node.id} className="relative">
                {/* The Node Row */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all relative group
                    ${isRoot ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}
                `}>
                    {/* Icon */}
                    <div className={`p-2 rounded-lg flex-shrink-0 ${isRoot ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {isRoot ? <Package size={20}/> : (node.children && node.children.length > 0 ? <FolderOpen size={18}/> : <Tag size={18}/>)}
                    </div>

                    {/* Inputs */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-1">
                        <div className="flex-1">
                             <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Роль / Название</label>
                             <input 
                                className="text-sm font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full placeholder-slate-300"
                                value={node.name}
                                onChange={e => handleUpdateComponent(node.id, 'name', e.target.value)}
                                placeholder="Название узла"
                             />
                        </div>
                        <div className="w-full sm:w-24">
                             <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Префикс</label>
                             <input 
                                className="text-sm font-mono text-indigo-600 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full placeholder-slate-300"
                                value={node.defaultPrefix}
                                onChange={e => handleUpdateComponent(node.id, 'defaultPrefix', e.target.value)}
                                placeholder="TAG"
                             />
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleAddComponent(node.id)} 
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" 
                            title="Добавить дочерний элемент"
                        >
                            <Plus size={18}/>
                        </button>
                        {!isRoot && (
                            <button 
                                onClick={() => handleDeleteComponent(node.id)} 
                                className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" 
                                title="Удалить элемент"
                            >
                                <Trash2 size={18}/>
                            </button>
                        )}
                    </div>
                </div>

                {/* Children Container - The Tree Line */}
                {node.children && node.children.length > 0 && (
                    <div className="pl-8 ml-5 border-l-2 border-slate-200 mt-3 space-y-3 relative">
                        {node.children.map(child => (
                            <div key={child.id} className="relative">
                                {/* Horizontal connector line */}
                                <div className="absolute top-9 -left-8 w-8 h-0.5 bg-slate-200 pointer-events-none"></div>
                                {renderTree(child)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (view === 'template_builder') {
        return <Builder mode="global" onClose={() => setView('list')} />;
    }

    // --- Main Layout ---
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            
            {/* Admin Header */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500 p-2 rounded-lg">
                        <Globe size={24} className="text-white"/>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Системная Библиотека</h1>
                        <p className="text-xs text-slate-400">Панель администратора</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentProject(null)} className="text-sm text-slate-300 hover:text-white flex items-center gap-2">
                        <ArrowLeft size={16}/> Назад к проектам
                    </button>
                    <div className="h-6 w-px bg-slate-700"></div>
                    <Button variant="ghost" size="sm" onClick={logout} className="text-slate-300 hover:text-white hover:bg-slate-800">
                        <LogOut size={16} className="mr-2"/> Выйти
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                
                {/* Sidebar Navigation */}
                <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                    <div className="p-4">
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            <button 
                                onClick={() => setActiveTab('templates')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'templates' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Шаблоны
                            </button>
                            <button 
                                onClick={() => setActiveTab('assemblies')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'assemblies' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Сборки
                            </button>
                        </div>
                    </div>

                    <div className="px-4 pb-4">
                         <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Фильтр..." 
                                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                            />
                         </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-1">
                        {activeTab === 'templates' 
                            ? globalLibrary.map(item => (
                                <div key={item.id} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 cursor-pointer">
                                    <div className="font-bold text-slate-800">{item.name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">{item.category}</div>
                                </div>
                              ))
                            : globalAssemblies.map(item => (
                                <div key={item.id} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 cursor-pointer">
                                    <div className="font-bold text-slate-800">{item.name}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">{item.category}</div>
                                </div>
                              ))
                        }
                    </div>

                    <div className="p-4 border-t border-slate-200">
                        {activeTab === 'templates' ? (
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" icon={<Plus size={16}/>} onClick={() => setView('template_builder')}>
                                Новый шаблон
                            </Button>
                        ) : (
                            <Button className="w-full bg-orange-600 hover:bg-orange-700" icon={<Plus size={16}/>} onClick={() => setView('assembly_builder')}>
                                Новая сборка
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                    {view === 'list' && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Globe size={64} className="mb-4 opacity-20"/>
                            <h2 className="text-xl font-bold text-slate-600">Глобальная библиотека</h2>
                            <p>Выберите элемент в меню или создайте новый стандарт.</p>
                        </div>
                    )}

                    {view === 'assembly_builder' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6 flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Новая сборка</h2>
                                    <p className="text-slate-500">Определение иерархии оборудования.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={() => setView('list')}>Отмена</Button>
                                    <Button onClick={handleSaveAssembly} icon={<Save size={16}/>}>Сохранить</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Details Panel */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
                                    <Input label="Название сборки" value={asmName} onChange={e => setAsmName(e.target.value)} placeholder="Напр. Приточная установка" />
                                    <Input label="Категория" value={asmCat} onChange={e => setAsmCat(e.target.value)} placeholder="Напр. ОВиК" />
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">Описание</label>
                                        <textarea 
                                            className="w-full border border-slate-300 rounded-md p-2 text-sm h-24"
                                            value={asmDesc}
                                            onChange={e => setAsmDesc(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>

                                {/* Tree Builder Panel */}
                                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[500px]">
                                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                                        <FolderOpen className="text-indigo-500" size={20}/>
                                        <h3 className="font-bold text-slate-800">Иерархия компонентов</h3>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 min-h-[400px]">
                                        <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
                                            <AlertCircle size={14}/>
                                            <span>Определите структуру и префиксы. Любой блок может иметь потомков (дерево).</span>
                                        </div>
                                        {renderTree(rootComponent)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};