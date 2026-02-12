import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { DictionaryItem, GlobalVariable } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, BookOpen, Search, Lock, PenLine, Check, X, Variable } from 'lucide-react';

export const Dictionaries: React.FC = () => {
  const { 
      dictionaries, addDictionaryItem, updateDictionaryItem, deleteDictionaryItem, 
      globalVariables, addGlobalVariable, deleteGlobalVariable,
      currentUser
  } = useStore();
  
  const isAdmin = currentUser?.role === 'admin';

  // Derived state for categories (Lists)
  // Ensure 'Проект' is always present as a default category
  const categories = useMemo(() => {
      const cats = new Set(dictionaries.map(d => d.category));
      cats.add('Проект');
      const sorted = Array.from(cats).sort((a: string, b: string) => {
          if (a === 'Проект') return -1;
          if (b === 'Проект') return 1;
          return a.localeCompare(b);
      });
      return sorted;
  }, [dictionaries]);

  const [selectedCategory, setSelectedCategory] = useState<string>('Проект');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // New Item States
  const [newItem, setNewItem] = useState<Partial<DictionaryItem>>({ code: '', value: '', description: '' });
  const [newVar, setNewVar] = useState<Partial<GlobalVariable>>({ key: '', value: '', description: '' });

  // Editing State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{code: string, value: string, description: string}>({code:'', value:'', description:''});

  const filteredDicts = dictionaries.filter(d => d.category === selectedCategory);
  const isProjectCode = selectedCategory === 'Проект';
  const isGlobalVars = selectedCategory === 'GlobalVars';

  // --- Handlers ---

  const handleCreateCategory = () => {
      if (newCategoryName && !categories.includes(newCategoryName)) {
          setSelectedCategory(newCategoryName);
          setNewCategoryName('');
          setIsCreatingCategory(false);
      }
  };

  const handleAddDict = () => {
    if (selectedCategory && newItem.code && newItem.value) {
      addDictionaryItem({
        id: crypto.randomUUID(),
        category: selectedCategory,
        code: newItem.code,
        value: newItem.value,
        description: newItem.description || '',
      });
      setNewItem({ code: '', value: '', description: '' });
    }
  };

  const handleStartEdit = (item: DictionaryItem) => {
      setEditingItemId(item.id);
      setEditValues({ code: item.code, value: item.value, description: item.description || '' });
  };

  const handleSaveEdit = () => {
      if (editingItemId) {
          updateDictionaryItem(editingItemId, editValues);
          setEditingItemId(null);
      }
  };

  const handleAddVar = () => {
      if (newVar.key && newVar.value) {
          addGlobalVariable({
              id: crypto.randomUUID(),
              key: newVar.key.toUpperCase(),
              value: newVar.value,
              description: newVar.description
          });
          setNewVar({ key: '', value: '', description: '' });
      }
  };

  const handleNewItemCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (isProjectCode) {
          // Only allow digits for Project Code
          if (/^\d*$/.test(val)) {
              setNewItem({...newItem, code: val});
          }
      } else {
          setNewItem({...newItem, code: val.toUpperCase()});
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar: Categories */}
            <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">КАТЕГОРИИ</h3>
                    {isAdmin && <button onClick={() => setIsCreatingCategory(true)} className="text-[#339A2D] hover:bg-[#339A2D]/10 p-1 rounded transition-colors"><Plus size={16}/></button>}
                </div>
                
                {isCreatingCategory && (
                    <div className="p-2 border-b border-slate-200 bg-[#339A2D]/10">
                        <div className="flex gap-1">
                            <Input 
                                autoFocus 
                                value={newCategoryName} 
                                onChange={e => setNewCategoryName(e.target.value)} 
                                placeholder="Название..."
                                className="h-8 text-xs"
                            />
                            <Button size="sm" onClick={handleCreateCategory} disabled={!newCategoryName}>OK</Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center gap-3 ${selectedCategory === cat ? 'bg-white text-[#339A2D] font-bold shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-200/50'}`}
                        >
                            <BookOpen size={16} className={selectedCategory === cat ? "text-[#339A2D]" : "text-slate-400 opacity-70"}/>
                            {cat.replace(/^Тип\s+/, '')}
                        </button>
                    ))}
                    
                    <div className="my-2 border-t border-slate-200 mx-2"></div>
                    
                    <button
                        onClick={() => setSelectedCategory('GlobalVars')}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all flex items-center gap-3 ${isGlobalVars ? 'bg-white text-purple-700 font-bold shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-200/50'}`}
                    >
                         <Variable size={16} className={isGlobalVars ? "text-purple-500" : "text-slate-400 opacity-70"}/>
                         Переменные проекта
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${isGlobalVars ? 'bg-purple-50 text-purple-600' : 'bg-[#339A2D]/10 text-[#339A2D]'}`}>
                            {isGlobalVars ? <Variable size={24}/> : <BookOpen size={24}/>}
                         </div>
                         <div>
                            <h2 className="text-xl font-bold text-slate-800">{isGlobalVars ? 'Переменные проекта' : selectedCategory.replace(/^Тип\s+/, '')}</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {isGlobalVars ? 'Глобальные настройки шаблонов' : (isProjectCode ? 'Код проекта' : 'Справочник значений')}
                            </p>
                         </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden p-6 bg-slate-50 flex flex-col">
                    {isGlobalVars ? (
                        <>
                            {isAdmin && (
                                <div className="grid grid-cols-4 gap-2 mb-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0">
                                    <Input placeholder="Ключ (MOTOR_CHAR)" value={newVar.key} onChange={e => setNewVar({...newVar, key: e.target.value.toUpperCase()})} />
                                    <Input placeholder="Значение (M)" value={newVar.value} onChange={e => setNewVar({...newVar, value: e.target.value})} />
                                    <Input placeholder="Описание" value={newVar.description} onChange={e => setNewVar({...newVar, description: e.target.value})} />
                                    <Button onClick={handleAddVar} size="sm" icon={<Plus size={16}/>}>Добавить</Button>
                                </div>
                            )}

                            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">KEY</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">VALUE</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Описание</th>
                                            <th className="px-6 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {globalVariables.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 text-sm font-mono text-purple-600 font-bold">{item.key}</td>
                                                <td className="px-6 py-3 text-sm text-slate-900 font-bold">{item.value}</td>
                                                <td className="px-6 py-3 text-sm text-slate-600">{item.description}</td>
                                                <td className="px-6 py-3 text-right">
                                                    {isAdmin && <button onClick={() => deleteGlobalVariable(item.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 size={16} /></button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <>
                             {/* Input Area */}
                             {isAdmin && !isProjectCode && (
                                <div className="grid grid-cols-12 gap-3 mb-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0 items-end">
                                    <div className="col-span-3">
                                        <Input 
                                            label="Код"
                                            placeholder="Например: VALVE"
                                            value={newItem.code} 
                                            onChange={handleNewItemCodeChange} 
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <Input 
                                            label="Значение"
                                            placeholder="Например: Клапан"
                                            value={newItem.value} 
                                            onChange={e => setNewItem({...newItem, value: e.target.value})} 
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <Input 
                                            label="Описание"
                                            placeholder="Дополнительно..."
                                            value={newItem.description} 
                                            onChange={e => setNewItem({...newItem, description: e.target.value})} 
                                        />
                                    </div>
                                    <div className="col-span-1">
                                         <Button onClick={handleAddDict} className="w-full h-[38px]" icon={<Plus size={18}/>}></Button>
                                    </div>
                                </div>
                            )}

                            {/* Dictionary Table */}
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                {isProjectCode ? 'КОД ПРОЕКТА' : 'КОД'}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                {isProjectCode ? 'НАИМЕНОВАНИЕ' : 'ЗНАЧЕНИЕ'}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ОПИСАНИЕ</th>
                                            <th className="px-6 py-3 w-20"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredDicts.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">Список пуст. Добавьте элементы.</td></tr>
                                        )}
                                        {filteredDicts.map(item => {
                                            const isEditing = editingItemId === item.id;
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-3 text-sm font-mono text-[#339A2D] font-bold">
                                                        {isEditing ? (
                                                            <Input 
                                                                value={editValues.code} 
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    if (!isProjectCode || /^\d*$/.test(val)) {
                                                                            setEditValues({...editValues, code: isProjectCode ? val : val.toUpperCase()})
                                                                    }
                                                                }} 
                                                                className="h-8 text-xs"
                                                            />
                                                        ) : item.code}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-slate-900">
                                                        {isEditing ? (
                                                            <Input 
                                                                value={editValues.value} 
                                                                onChange={e => setEditValues({...editValues, value: e.target.value})} 
                                                                className="h-8 text-xs"
                                                            />
                                                        ) : item.value}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-slate-600">
                                                        {isEditing ? (
                                                            <Input 
                                                                value={editValues.description} 
                                                                onChange={e => setEditValues({...editValues, description: e.target.value})} 
                                                                className="h-8 text-xs"
                                                            />
                                                        ) : item.description}
                                                    </td>
                                                    <td className="px-6 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isAdmin && (
                                                            isEditing ? (
                                                                <>
                                                                    <button onClick={handleSaveEdit} className="text-green-500 hover:text-green-700 p-1"><Check size={16}/></button>
                                                                    <button onClick={() => setEditingItemId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {isProjectCode ? (
                                                                            <button onClick={() => handleStartEdit(item)} className="text-[#339A2D] hover:text-[#267c21] p-1 rounded hover:bg-[#339A2D]/10"><PenLine size={16} /></button>
                                                                    ) : (
                                                                            <button onClick={() => deleteDictionaryItem(item.id)} className="text-red-300 hover:text-red-500 p-1 rounded hover:bg-red-50"><Trash2 size={16} /></button>
                                                                    )}
                                                                </>
                                                            )
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};