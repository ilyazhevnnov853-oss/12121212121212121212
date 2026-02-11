import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Tag, TagStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { 
    Search, Filter, Trash2, X, Copy, Download, 
    CheckSquare, Square, ChevronLeft, ChevronRight, 
    FileInput, CheckCircle, AlertCircle, PenLine, Save, RotateCcw
} from 'lucide-react';

export const Registry: React.FC = () => {
  const { 
      tags, templates, currentUser, dictionaries,
      deleteTag, deleteTags, updateTag, updateTagsStatus, addTag, 
      getNextNumber 
  } = useStore();

  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, string>>({}); // For editing parts
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Constants
  const ITEMS_PER_PAGE = 15;

  // --- Filtering & Sorting ---
  const filteredTags = useMemo(() => {
    return tags.filter(t => {
        const matchesSearch = t.fullTag.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTemplate = filterTemplate === 'all' || t.templateId === filterTemplate;
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchesSearch && matchesTemplate && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first
  }, [tags, searchTerm, filterTemplate, filterStatus]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredTags.length / ITEMS_PER_PAGE);
  const paginatedTags = filteredTags.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // --- Actions ---

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 3000);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      showToast('Скопировано в буфер!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот тег навсегда?')) {
        deleteTag(id);
        if (selectedTag?.id === id) {
            setSelectedTag(null);
            setIsEditMode(false);
        }
        showToast('Тег удален');
    }
  };

  const handleBulkDelete = () => {
      if (confirm(`Удалить выбранные теги (${selectedIds.size} шт)?`)) {
          deleteTags(Array.from(selectedIds));
          setSelectedIds(new Set());
          setSelectedTag(null);
          showToast(`Удалено ${selectedIds.size} тегов`);
      }
  };

  const handleBulkStatusChange = (status: TagStatus) => {
      updateTagsStatus(Array.from(selectedIds), status);
      setSelectedIds(new Set());
      showToast('Статусы обновлены');
  };

  const handleSelectAll = () => {
      if (selectedIds.size === paginatedTags.length) {
          setSelectedIds(new Set());
      } else {
          // Select only visible on current page to avoid accidental massive selection
          setSelectedIds(new Set(paginatedTags.map(t => t.id)));
      }
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  // --- Edit Logic ---

  const handleEditClick = (tag: Tag) => {
      setSelectedTag(tag);
      setEditFormData({...tag.parts}); // Load current parts into form
      setIsEditMode(true);
  };

  const handleSaveEdit = () => {
      if (!selectedTag || !currentUser) return;

      const template = templates.find(t => t.id === selectedTag.templateId);
      if (!template) return;

      // 1. Reconstruct Full Tag string based on new parts
      const newFullTag = template.blocks.map(b => {
          if (b.type === 'separator') return b.value;
          if (b.type === 'text' && !b.isSuffix) return b.value;
          return editFormData[b.id] || '?';
      }).join('');

      // 2. Calculate Diff for History
      const changes: string[] = [];
      
      // Check full tag change
      if (newFullTag !== selectedTag.fullTag) {
          changes.push(`Тег: ${selectedTag.fullTag} -> ${newFullTag}`);
      }

      // Check part changes (detailed)
      Object.keys(editFormData).forEach(blockId => {
          if (editFormData[blockId] !== selectedTag.parts[blockId]) {
              const block = template.blocks.find(b => b.id === blockId);
              const label = block?.categoryId || (block?.isSuffix ? 'Суффикс' : 'Значение');
              changes.push(`${label}: ${selectedTag.parts[blockId]} -> ${editFormData[blockId]}`);
          }
      });

      // If no changes, just close
      if (changes.length === 0) {
          setIsEditMode(false);
          return;
      }

      // 3. Create History Entry
      const newHistoryEntry = {
          action: 'Редактирование',
          user: currentUser.name,
          timestamp: new Date().toISOString(),
          details: changes.join('; ')
      };

      // 4. Update Store
      const updatedTag: Tag = {
          ...selectedTag,
          fullTag: newFullTag,
          parts: editFormData,
          history: [newHistoryEntry, ...selectedTag.history] // Prepend new entry
      };

      updateTag(selectedTag.id, updatedTag);
      setSelectedTag(updatedTag); // Update local view
      setIsEditMode(false);
      showToast('Изменения сохранены');
  };

  // --- Smart Clone Logic ---
  const handleClone = (original: Tag) => {
      const template = templates.find(t => t.id === original.templateId);
      if (!template) {
          showToast('Ошибка: Шаблон исходного тега не найден', 'error');
          return;
      }

      // 1. Calculate Prefix to find next number
      let prefixForCounter = '';
      const newParts = { ...original.parts };

      for (const block of template.blocks) {
          if (block.isAutoIncrement) break;
          if (block.type === 'separator' || block.type === 'text' && !block.isSuffix) prefixForCounter += block.value;
          else if (block.type === 'dictionary' || block.type === 'parent') prefixForCounter += (newParts[block.id] || '');
      }

      // 2. Get Next Number
      const numBlock = template.blocks.find(b => b.isAutoIncrement);
      if (numBlock) {
          const nextNum = getNextNumber(prefixForCounter, numBlock.padding || 3);
          const numStr = nextNum.toString().padStart(numBlock.padding || 3, '0');
          newParts[numBlock.id] = numStr;
      }

      // 3. Reconstruct Full Tag
      const newFullTag = template.blocks.map(b => {
          if (b.type === 'separator') return b.value;
          if (b.type === 'text' && !b.isSuffix) return b.value;
          return newParts[b.id] || '?';
      }).join('');

      // 4. Create Object
      const newTag: Tag = {
          ...original,
          id: crypto.randomUUID(),
          fullTag: newFullTag,
          parts: newParts,
          status: 'draft',
          createdAt: new Date().toISOString(),
          history: [{ 
              action: 'Клонирование', 
              user: currentUser?.name || 'System', 
              timestamp: new Date().toISOString(), 
              details: `Клон тега ${original.fullTag}` 
          }]
      };

      addTag(newTag);
      showToast(`Создан клон: ${newFullTag}`);
  };

  const handleExportCSV = () => {
      const headers = ["ID", "Full Tag", "Status", "Template", "Notes", "Created At"];
      const rows = filteredTags.map(t => {
          const tmpl = templates.find(temp => temp.id === t.templateId)?.name || 'Unknown';
          return [t.id, t.fullTag, t.status, tmpl, `"${(t.notes || '').replace(/"/g, '""')}"`, t.createdAt];
      });
      
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `tags_export_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
  };

  // --- UI Helpers ---

  const getStatusColor = (status: TagStatus) => {
    switch(status) {
        case 'active': return 'bg-green-100 text-green-700 border-green-200';
        case 'draft': return 'bg-slate-100 text-slate-600 border-slate-200';
        case 'review': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'approved': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'archived': return 'bg-red-50 text-red-600 border-red-100 line-through opacity-70';
        default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (status: TagStatus) => {
      const map: Record<string, string> = { 
          'active': 'Активен', 'draft': 'Черновик', 'review': 'На проверке', 
          'approved': 'Утвержден', 'archived': 'Архив' 
      };
      return map[status] || status;
  };

  return (
    <div className="flex h-full gap-6 relative">
      
      {/* Toast Notification */}
      {notification && (
          <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 ${notification.type === 'success' ? 'bg-slate-800 text-green-400' : 'bg-red-600 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
              <span className="font-medium text-sm">{notification.msg}</span>
          </div>
      )}

      {/* Main List Area */}
      <div className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         
         {/* Top Toolbar */}
         <div className="p-4 border-b border-slate-200 space-y-4 bg-slate-50/50">
             
             {/* Search & Filters Row */}
             <div className="flex flex-col xl:flex-row gap-4 justify-between">
                
                {/* Search */}
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Поиск по тегу или ID..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    <div className="w-48">
                        <Select 
                            options={[
                                { value: 'all', label: 'Все шаблоны' }, 
                                ...templates.map(t => ({ value: t.id, label: t.name }))
                            ]}
                            value={filterTemplate}
                            onChange={e => { setFilterTemplate(e.target.value); setPage(1); }}
                            className="bg-white"
                        />
                    </div>
                    <div className="w-40">
                        <Select 
                            options={[
                                { value: 'all', label: 'Все статусы' },
                                { value: 'active', label: 'Активен' },
                                { value: 'draft', label: 'Черновик' },
                                { value: 'review', label: 'На проверке' },
                                { value: 'approved', label: 'Утвержден' },
                                { value: 'archived', label: 'Архив' },
                            ]}
                            value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                            className="bg-white"
                        />
                    </div>
                    <Button variant="secondary" icon={<Download size={16} />} onClick={handleExportCSV}>CSV</Button>
                </div>
             </div>
             
             {/* Bulk Actions Bar (Conditional) */}
             {selectedIds.size > 0 && (
                 <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                     <div className="flex items-center gap-2 px-2">
                        <CheckSquare className="text-blue-600" size={18} />
                        <span className="text-sm font-bold text-blue-900">Выбрано: {selectedIds.size}</span>
                     </div>
                     <div className="flex gap-2">
                         <Button size="sm" variant="secondary" className="border-blue-200 text-blue-700 bg-white hover:bg-blue-100" onClick={() => handleBulkStatusChange('approved')}>Утвердить</Button>
                         <Button size="sm" variant="secondary" className="border-blue-200 text-blue-700 bg-white hover:bg-blue-100" onClick={() => handleBulkStatusChange('active')}>Активировать</Button>
                         <div className="w-px h-8 bg-blue-200 mx-1"></div>
                         <Button size="sm" variant="danger" onClick={handleBulkDelete} icon={<Trash2 size={14}/>}>Удалить</Button>
                     </div>
                 </div>
             )}
         </div>

         {/* Table Area */}
         <div className="flex-1 overflow-auto relative">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3 w-12 text-center">
                            <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                {selectedIds.size > 0 && selectedIds.size === paginatedTags.length ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                        </th>
                        <th className="px-6 py-3 text-left">Номер тега</th>
                        <th className="px-6 py-3 text-left">Шаблон</th>
                        <th className="px-6 py-3 text-left">Статус</th>
                        <th className="px-6 py-3 text-left">Создан</th>
                        <th className="px-6 py-3 text-right">Действия</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {paginatedTags.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                <Filter size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>Теги не найдены. Попробуйте изменить фильтры.</p>
                            </td>
                        </tr>
                    ) : (
                        paginatedTags.map(tag => (
                            <tr 
                                key={tag.id} 
                                onClick={() => { setSelectedTag(tag); setIsEditMode(false); }}
                                className={`group cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${selectedTag?.id === tag.id ? 'bg-blue-50/50 border-l-blue-500' : 'border-l-transparent'}`}
                            >
                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => handleSelectOne(tag.id)} className={selectedIds.has(tag.id) ? "text-blue-600" : "text-slate-300 hover:text-slate-500"}>
                                        {selectedIds.has(tag.id) ? <CheckSquare size={18}/> : <Square size={18} />}
                                    </button>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center space-x-3">
                                        <span className="font-mono font-bold text-slate-800 text-base">{tag.fullTag}</span>
                                        <button 
                                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={(e) => { e.stopPropagation(); handleCopy(tag.fullTag); }}
                                            title="Копировать номер"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {tag.id.slice(0,8)}...</div>
                                </td>
                                <td className="px-6 py-3 text-slate-600">
                                    {templates.find(t => t.id === tag.templateId)?.name || <span className="text-red-400 italic">Шаблон удален</span>}
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2.5 py-0.5 inline-flex text-xs font-bold uppercase tracking-wide rounded-full border ${getStatusColor(tag.status)}`}>
                                        {getStatusLabel(tag.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                                    {new Date(tag.createdAt).toLocaleDateString('ru-RU')}
                                    <span className="text-xs text-slate-400 ml-2">{new Date(tag.createdAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditClick(tag); }} 
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Редактировать"
                                        >
                                            <PenLine size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleClone(tag); }} 
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Клонировать (Создать копию)"
                                        >
                                            <FileInput size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }} 
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Удалить"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>

         {/* Pagination Footer */}
         <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
             <span className="text-xs text-slate-500">
                 Показано {paginatedTags.length} из {filteredTags.length} записей
             </span>
             <div className="flex gap-2">
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={page === 1} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="w-8 h-8 p-0 flex items-center justify-center"
                 >
                     <ChevronLeft size={16}/>
                 </Button>
                 <span className="flex items-center px-2 text-sm font-medium text-slate-700">
                     Стр. {page} из {Math.max(1, totalPages)}
                 </span>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 p-0 flex items-center justify-center"
                 >
                     <ChevronRight size={16}/>
                 </Button>
             </div>
         </div>
      </div>

      {/* Detail Panel (Slide Over) */}
      {selectedTag && (
        <div className="w-[400px] flex-shrink-0 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-all z-20 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className={`p-6 border-b border-slate-200 flex justify-between items-start ${isEditMode ? 'bg-blue-50' : 'bg-slate-50'}`}>
                <div className="overflow-hidden">
                    <h2 className="text-lg font-bold font-mono text-slate-900 break-all leading-tight">
                        {isEditMode ? 'Редактирование' : selectedTag.fullTag}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-mono">{selectedTag.id}</p>
                </div>
                <button onClick={() => { setSelectedTag(null); setIsEditMode(false); }} className="text-slate-400 hover:text-slate-700 ml-4 p-1 rounded hover:bg-slate-200"><X size={20}/></button>
            </div>
            
            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-8">
                
                {/* Status Section */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Текущий статус</label>
                    <Select 
                        options={[
                            { value: 'active', label: 'Активен' },
                            { value: 'draft', label: 'Черновик' },
                            { value: 'review', label: 'На проверке' },
                            { value: 'approved', label: 'Утвержден' },
                            { value: 'archived', label: 'Архив' },
                        ]}
                        value={selectedTag.status}
                        onChange={(e) => {
                             const oldStatus = selectedTag.status;
                             const newStatus = e.target.value as TagStatus;
                             if (oldStatus !== newStatus) {
                                 const logEntry: any = {
                                     action: 'Изменение статуса',
                                     user: currentUser?.name || 'Unknown',
                                     timestamp: new Date().toISOString(),
                                     details: `Статус: ${oldStatus} -> ${newStatus}`
                                 };
                                 updateTag(selectedTag.id, { status: newStatus, history: [logEntry, ...selectedTag.history] });
                                 setSelectedTag({...selectedTag, status: newStatus, history: [logEntry, ...selectedTag.history]});
                                 showToast('Статус изменен');
                             }
                        }}
                    />
                </div>

                {/* Structure Breakdown / Edit Form */}
                <div className={`p-4 rounded-xl border ${isEditMode ? 'bg-white border-blue-200 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Структура тега</h3>
                        {isEditMode ? (
                            <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">Edit Mode</span>
                        ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full font-bold">Read Only</span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {Object.entries(selectedTag.parts).map(([key, value]) => {
                            // Try to find block name from template
                            const tmpl = templates.find(t => t.id === selectedTag.templateId);
                            const block = tmpl?.blocks.find(b => b.id === key);
                            const label = block?.categoryId || (block?.isAutoIncrement ? 'Номер' : (block?.isSuffix ? 'Суффикс' : 'Параметр'));

                            // Skip rendering if block not found (e.g. template changed)
                            if (!block) return null;

                            return (
                                <div key={key} className="flex justify-between items-center text-sm group">
                                    <span className="text-slate-500 text-xs w-1/3">{label}</span>
                                    {isEditMode ? (
                                        block.type === 'dictionary' ? (
                                            <select
                                                className="w-2/3 border-b border-blue-300 focus:border-blue-600 outline-none text-right font-mono font-bold text-slate-900 bg-transparent px-1 cursor-pointer hover:bg-blue-50"
                                                value={editFormData[key] || ''}
                                                onChange={(e) => setEditFormData({...editFormData, [key]: e.target.value})}
                                            >
                                                <option value="" disabled>Выбрать...</option>
                                                {dictionaries
                                                    .filter(d => d.category === block.categoryId)
                                                    .map(d => (
                                                        <option key={d.id} value={d.code}>
                                                            {d.code} - {d.value}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        ) : (
                                            <input 
                                                className="w-2/3 border-b border-blue-300 focus:border-blue-600 outline-none text-right font-mono font-bold text-slate-900 bg-transparent px-1"
                                                value={editFormData[key] || ''}
                                                onChange={(e) => setEditFormData({...editFormData, [key]: e.target.value})}
                                                placeholder={block.isAutoIncrement ? 'Число' : 'Значение'}
                                            />
                                        )
                                    ) : (
                                        <span className="font-mono font-bold text-slate-800 border-b border-slate-200 border-dashed">{value}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Notes Editor */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Заметки инженера</label>
                    </div>
                    <textarea 
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none shadow-inner bg-slate-50 focus:bg-white transition-colors"
                        placeholder="Опишите назначение, местоположение или особенности..."
                        value={selectedTag.notes || ''}
                        onChange={(e) => setSelectedTag({ ...selectedTag, notes: e.target.value })}
                        onBlur={() => updateTag(selectedTag.id, { notes: selectedTag.notes })}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-right italic">Автосохранение при выходе из поля</p>
                </div>

                 {/* History Timeline */}
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">История изменений</label>
                    <div className="space-y-0 relative pl-2">
                        {/* Timeline line */}
                        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                        {selectedTag.history.map((log, idx) => (
                            <div key={idx} className="relative pl-6 pb-4 last:pb-0">
                                <div className="absolute left-0 top-1 w-4 h-4 bg-white border-2 border-blue-200 rounded-full z-10"></div>
                                <div className="text-xs text-slate-800 font-bold">{log.action}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
                                    <span>{log.user}</span>
                                    <span>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                {log.details && <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">{log.details}</div>}
                            </div>
                        ))}
                    </div>
                 </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-3">
                {isEditMode ? (
                    <>
                        <Button onClick={handleSaveEdit} icon={<Save size={16}/>}>Сохранить</Button>
                        <Button variant="secondary" onClick={() => setIsEditMode(false)} icon={<RotateCcw size={16}/>}>Отмена</Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" onClick={() => handleEditClick(selectedTag)} icon={<PenLine size={16}/>}>Редактировать</Button>
                        <Button variant="danger" onClick={() => handleDelete(selectedTag.id)} icon={<Trash2 size={16}/>}>Удалить</Button>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};