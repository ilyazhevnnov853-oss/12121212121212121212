import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { DictionaryItem, ReservedRange } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, ShieldAlert, Upload, Download, Save, RefreshCw } from 'lucide-react';

export const Dictionaries: React.FC = () => {
  const { 
      dictionaries, addDictionaryItem, importDictionaryItems, deleteDictionaryItem, 
      reservedRanges, addReservedRange, deleteReservedRange, 
      loadProjectData, tags, templates, counters 
  } = useStore();
  
  // State for new dictionary item
  const [newItem, setNewItem] = useState<Partial<DictionaryItem>>({ category: 'Проект', code: '', value: '' });
  
  // State for new reserved range
  const [newRange, setNewRange] = useState<Partial<ReservedRange>>({ start: 0, end: 0, reason: '' });

  // Refs for file inputs
  const csvInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // --- Logic ---

  const handleAddDict = () => {
    if (newItem.category && newItem.code && newItem.value) {
      addDictionaryItem({
        id: crypto.randomUUID(),
        category: newItem.category,
        code: newItem.code,
        value: newItem.value,
        description: newItem.description || '',
      });
      setNewItem({ ...newItem, code: '', value: '', description: '' });
    }
  };

  const handleAddRange = () => {
    if (newRange.start !== undefined && newRange.end !== undefined && newRange.reason) {
        addReservedRange({
            id: crypto.randomUUID(),
            start: Number(newRange.start),
            end: Number(newRange.end),
            reason: newRange.reason
        });
        setNewRange({ start: 0, end: 0, reason: '' });
    }
  }

  // --- Import / Export Logic ---

  const handleBackup = () => {
      const data = { tags, templates, dictionaries, reservedRanges, counters };
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
              } else {
                  alert("Неверный формат файла бэкапа.");
              }
          } catch (err) {
              alert("Ошибка чтения файла.");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          const newItems: DictionaryItem[] = [];
          
          // Simple CSV parser: Category,Code,Value,Description
          lines.forEach((line, idx) => {
              if (idx === 0 && line.includes('Category')) return; // Skip header
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
      e.target.value = ''; // Reset
  };

  // Get unique categories
  const categories = Array.from(new Set(dictionaries.map(d => d.category)));
  const [filterCategory, setFilterCategory] = useState<string>('Все');

  const filteredDicts = filterCategory === 'Все' 
    ? dictionaries 
    : dictionaries.filter(d => d.category === filterCategory);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Справочники и Настройки</h1>
        <p className="text-slate-500">Управление справочными данными, импорт/экспорт и диапазоны нумерации.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Dictionaries */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Management Panel */}
          <div className="bg-slate-800 text-white p-6 rounded-xl shadow-sm flex justify-between items-center">
             <div>
                <h2 className="text-lg font-bold mb-1">Управление данными</h2>
                <p className="text-xs text-slate-400">Бэкапы проекта и массовый импорт</p>
             </div>
             <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<Upload size={14}/>} onClick={() => csvInputRef.current?.click()}>Импорт CSV</Button>
                <input type="file" accept=".csv" ref={csvInputRef} hidden onChange={handleImportCSV} />

                <div className="h-8 w-px bg-slate-600 mx-2"></div>

                <Button variant="secondary" size="sm" icon={<Save size={14}/>} onClick={handleBackup}>Скачать Бэкап</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white" size="sm" icon={<RefreshCw size={14}/>} onClick={() => backupInputRef.current?.click()}>Восстановить</Button>
                <input type="file" accept=".json" ref={backupInputRef} hidden onChange={handleRestore} />
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Справочные значения</h2>
                <div className="flex space-x-2">
                    {['Все', ...categories].map(c => (
                        <button 
                            key={c}
                            onClick={() => setFilterCategory(c)}
                            className={`px-3 py-1 text-xs rounded-full ${filterCategory === c ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-600'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
             </div>

             {/* Add Form */}
             <div className="grid grid-cols-4 gap-2 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <Input 
                    placeholder="Категория" 
                    value={newItem.category} 
                    onChange={e => setNewItem({...newItem, category: e.target.value})} 
                />
                <Input 
                    placeholder="Код (напр. PUMP)" 
                    value={newItem.code} 
                    onChange={e => setNewItem({...newItem, code: e.target.value.toUpperCase()})} 
                />
                <Input 
                    placeholder="Значение (напр. Насос)" 
                    value={newItem.value} 
                    onChange={e => setNewItem({...newItem, value: e.target.value})} 
                />
                <Button onClick={handleAddDict} size="sm" icon={<Plus size={16}/>}>Добавить</Button>
             </div>

             {/* Table */}
             <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Категория</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Код</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Значение</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Действие</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredDicts.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-sm text-slate-900">{item.category}</td>
                                <td className="px-4 py-2 text-sm font-mono text-blue-600 font-bold">{item.code}</td>
                                <td className="px-4 py-2 text-sm text-slate-600">{item.value}</td>
                                <td className="px-4 py-2 text-right">
                                    <button onClick={() => deleteDictionaryItem(item.id)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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

                <div className="space-y-3 mb-6">
                    <div className="flex space-x-2">
                        <Input type="number" placeholder="Начало" value={newRange.start} onChange={e => setNewRange({...newRange, start: parseInt(e.target.value)})} />
                        <Input type="number" placeholder="Конец" value={newRange.end} onChange={e => setNewRange({...newRange, end: parseInt(e.target.value)})} />
                    </div>
                    <Input placeholder="Причина" value={newRange.reason} onChange={e => setNewRange({...newRange, reason: e.target.value})} />
                    <Button onClick={handleAddRange} className="w-full">Зарезервировать</Button>
                </div>

                <div className="space-y-2">
                    {reservedRanges.map(range => (
                        <div key={range.id} className="p-3 bg-amber-50 border border-amber-200 rounded-md flex justify-between items-center">
                            <div>
                                <span className="font-mono font-bold text-amber-800">{range.start} - {range.end}</span>
                                <p className="text-xs text-amber-700">{range.reason}</p>
                            </div>
                            <button onClick={() => deleteReservedRange(range.id)} className="text-amber-400 hover:text-amber-700">
                                <Trash2 size={14} />
                            </button>
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