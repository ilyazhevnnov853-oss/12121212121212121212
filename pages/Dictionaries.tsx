import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { DictionaryItem, ReservedRange, GlobalVariable } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, ShieldAlert, Upload, Save, RefreshCw, BookOpen, Search, Lock } from 'lucide-react';

export const Dictionaries: React.FC = () => {
  const { 
      dictionaries, addDictionaryItem, importDictionaryItems, deleteDictionaryItem, 
      reservedRanges, addReservedRange, deleteReservedRange,
      globalVariables, addGlobalVariable, deleteGlobalVariable,
      loadProjectData, tags, templates, counters, currentUser
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'dicts' | 'vars'>('dicts');
  const isAdmin = currentUser?.role === 'admin';

  // Derived state for categories (Lists)
  const categories = Array.from(new Set(dictionaries.map(d => d.category)));
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // New Item States
  const [newItem, setNewItem] = useState<Partial<DictionaryItem>>({ code: '', value: '', description: '' });
  const [newRange, setNewRange] = useState<Partial<ReservedRange>>({ start: 0, end: 0, reason: '', scope: '' });
  const [newVar, setNewVar] = useState<Partial<GlobalVariable>>({ key: '', value: '', description: '' });

  // Refs
  const csvInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const filteredDicts = dictionaries.filter(d => d.category === selectedCategory);

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

  const handleAddRange = () => {
    if (newRange.start !== undefined && newRange.end !== undefined && newRange.reason && newRange.scope) {
        addReservedRange({
            id: crypto.randomUUID(),
            scope: newRange.scope.toUpperCase(), // Normalize Scope
            start: Number(newRange.start),
            end: Number(newRange.end),
            reason: newRange.reason
        });
        setNewRange({ start: 0, end: 0, reason: '', scope: '' });
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

  // --- Import / Export ---
  const handleBackup = () => {
      const data = { tags, templates, dictionaries, reservedRanges, globalVariables, counters };
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Данные проекта</h1>
        <p className="text-slate-500">Управление справочными данными, переменными проекта и диапазонами.</p>
        {!isAdmin && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><Lock size={12}/> Режим только для чтения (Требуются права Администратора)</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Config */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Header & Controls */}
          <div className="bg-slate-800 text-white p-6 rounded-xl shadow-sm flex justify-between items-center">
             <div>
                <h2 className="text-lg font-bold mb-1">Управление проектом</h2>
                <p className="text-xs text-slate-400">Бэкапы и миграция данных</p>
             </div>
             {isAdmin && (
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" icon={<Upload size={14}/>} onClick={() => csvInputRef.current?.click()}>CSV Импорт</Button>
                    <input type="file" accept=".csv" ref={csvInputRef} hidden onChange={handleImportCSV} />
                    <div className="h-8 w-px bg-slate-600 mx-2"></div>
                    <Button variant="secondary" size="sm" icon={<Save size={14}/>} onClick={handleBackup}>Скачать Бэкап</Button>
                    <Button variant="ghost" className="text-slate-300 hover:text-white" size="sm" icon={<RefreshCw size={14}/>} onClick={() => backupInputRef.current?.click()}>Restore</Button>
                    <input type="file" accept=".json" ref={backupInputRef} hidden onChange={handleRestore} />
                </div>
             )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
             <div className="flex border-b border-slate-200">
                 <button 
                    onClick={() => setActiveTab('dicts')} 
                    className={`px-6 py-3 text-sm font-bold ${activeTab === 'dicts' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                 >
                     Справочники значений
                 </button>
                 <button 
                    onClick={() => setActiveTab('vars')} 
                    className={`px-6 py-3 text-sm font-bold ${activeTab === 'vars' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                 >
                     Переменные проекта (Config)
                 </button>
             </div>

             <div className="flex-1 flex flex-col p-6">
                 {activeTab === 'dicts' && (
                     <div className="flex-1 flex gap-6">
                        {/* Sidebar: Categories */}
                        <div className="w-1/3 border-r border-slate-100 pr-4 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase">Списки (Категории)</h3>
                                {isAdmin && <button onClick={() => setIsCreatingCategory(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Plus size={16}/></button>}
                            </div>
                            
                            {isCreatingCategory && (
                                <div className="mb-2 flex gap-1">
                                    <Input 
                                        autoFocus 
                                        value={newCategoryName} 
                                        onChange={e => setNewCategoryName(e.target.value)} 
                                        placeholder="Название..."
                                        className="h-8 text-xs"
                                    />
                                    <Button size="sm" onClick={handleCreateCategory} disabled={!newCategoryName}>OK</Button>
                                </div>
                            )}

                            <div className="space-y-1 overflow-y-auto max-h-[400px]">
                                {categories.length === 0 && <p className="text-sm text-slate-400 italic">Нет категорий</p>}
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${selectedCategory === cat ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <BookOpen size={14} className={selectedCategory === cat ? "text-blue-500" : "text-slate-300"}/>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main: Items */}
                        <div className="flex-1 flex flex-col">
                            {selectedCategory ? (
                                <>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <BookOpen size={20} className="text-blue-500"/>
                                        {selectedCategory}
                                    </h3>

                                    {isAdmin && (
                                        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <Input placeholder="Код (VALVE)" value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value.toUpperCase()})} />
                                            <Input placeholder="Значение (Клапан)" value={newItem.value} onChange={e => setNewItem({...newItem, value: e.target.value})} />
                                            <div className="flex gap-2">
                                                <Input placeholder="Описание" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                                                <Button onClick={handleAddDict} size="sm" icon={<Plus size={16}/>}></Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Код</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Значение</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Описание</th>
                                                    <th className="px-4 py-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {filteredDicts.length === 0 && (
                                                    <tr><td colSpan={4} className="p-4 text-center text-slate-400 text-sm">Список пуст. Добавьте элементы.</td></tr>
                                                )}
                                                {filteredDicts.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2 text-sm font-mono text-blue-600 font-bold">{item.code}</td>
                                                        <td className="px-4 py-2 text-sm text-slate-900">{item.value}</td>
                                                        <td className="px-4 py-2 text-sm text-slate-600">{item.description}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            {isAdmin && <button onClick={() => deleteDictionaryItem(item.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Search size={48} className="mb-4 opacity-20"/>
                                    <p>Выберите или создайте справочник слева.</p>
                                </div>
                            )}
                        </div>
                     </div>
                 )}

                 {activeTab === 'vars' && (
                     <>
                        <p className="text-sm text-slate-500 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                            Глобальные переменные используются в шаблонах для подстановки фиксированных значений проекта (например, префиксы или разделители), которые могут меняться от проекта к проекту.
                        </p>
                        
                        {isAdmin && (
                            <div className="grid grid-cols-4 gap-2 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <Input placeholder="Ключ (MOTOR_CHAR)" value={newVar.key} onChange={e => setNewVar({...newVar, key: e.target.value.toUpperCase()})} />
                                <Input placeholder="Значение (M)" value={newVar.value} onChange={e => setNewVar({...newVar, value: e.target.value})} />
                                <Input placeholder="Описание" value={newVar.description} onChange={e => setNewVar({...newVar, description: e.target.value})} />
                                <Button onClick={handleAddVar} size="sm" icon={<Plus size={16}/>}>Добавить</Button>
                            </div>
                        )}

                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">KEY (В шаблоне)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">VALUE (Результат)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Описание</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Действие</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {globalVariables.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 text-sm font-mono text-purple-600 font-bold">{item.key}</td>
                                            <td className="px-4 py-2 text-sm text-slate-900 font-bold">{item.value}</td>
                                            <td className="px-4 py-2 text-sm text-slate-600">{item.description}</td>
                                            <td className="px-4 py-2 text-right">
                                                {isAdmin && <button onClick={() => deleteGlobalVariable(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </>
                 )}
             </div>
          </div>
        </div>

        {/* Right Column: Reserved Ranges */}
        <div className="space-y-4">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-2 mb-4 text-amber-600">
                    <ShieldAlert size={20} />
                    <h2 className="text-lg font-bold text-slate-800">Диапазоны резерва</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">Определите диапазоны чисел, которые авто-генератор должен пропускать.</p>

                {isAdmin ? (
                    <div className="space-y-3 mb-6">
                        <Input placeholder="Префикс (Scope), напр: P" value={newRange.scope} onChange={e => setNewRange({...newRange, scope: e.target.value.toUpperCase()})} />
                        <div className="flex space-x-2">
                            <Input type="number" placeholder="Начало" value={newRange.start} onChange={e => setNewRange({...newRange, start: parseInt(e.target.value)})} />
                            <Input type="number" placeholder="Конец" value={newRange.end} onChange={e => setNewRange({...newRange, end: parseInt(e.target.value)})} />
                        </div>
                        <Input placeholder="Причина" value={newRange.reason} onChange={e => setNewRange({...newRange, reason: e.target.value})} />
                        <Button onClick={handleAddRange} className="w-full">Зарезервировать</Button>
                    </div>
                ) : (
                    <div className="p-3 bg-slate-100 rounded text-xs text-slate-500 mb-4 text-center">Создание резервов доступно только администратору</div>
                )}

                <div className="space-y-2">
                    {reservedRanges.map(range => (
                        <div key={range.id} className="p-3 bg-amber-50 border border-amber-200 rounded-md flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold uppercase text-amber-600 bg-amber-100 px-1 rounded mr-2">{range.scope}</span>
                                <span className="font-mono font-bold text-amber-800">{range.start} - {range.end}</span>
                                <p className="text-xs text-amber-700">{range.reason}</p>
                            </div>
                            {isAdmin && (
                                <button onClick={() => deleteReservedRange(range.id)} className="text-amber-400 hover:text-amber-700">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    {reservedRanges.length === 0 && <p className="text-xs text-slate-400 text-center italic">Нет зарезервированных диапазонов.</p>}
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};