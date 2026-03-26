import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Tag, TagStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { 
    Search, Filter, Trash2, X, Copy, Download, 
    CheckSquare, Square, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronIcon,
    CheckCircle, AlertCircle, PenLine, Save, RotateCcw, FolderTree, List, Clock, FileText,
    Folder, FolderOpen, Tag as TagIcon, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_MAP: Record<string, string> = {
    'active': 'Активен',
    'draft': 'Черновик',
    'review': 'На проверке',
    'approved': 'Утвержден',
    'reserved': 'Занят',
    'archived': 'Архив'
};

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
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  
  // Tree State
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Selection & Edit State
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, string>>({}); 
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Visibility toggle for History and Notes
  const [showNotes, setShowNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Constants
  const ITEMS_PER_PAGE = 50; // Increased for better tree viewing
  const [page, setPage] = useState(1);

  // --- Actions ---

  const toggleExpand = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(expandedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedIds(newSet);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('Скопировано в буфер!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот тег навсегда?')) {
        deleteTag(id);
        if (selectedTag?.id === id) {
            setSelectedTag(null);
            setIsEditMode(false);
        }
        toast.success('Тег удален');
    }
  };

  const handleBulkDelete = () => {
      if (confirm(`Удалить выбранные теги (${selectedIds.size} шт)?`)) {
          deleteTags(Array.from(selectedIds));
          setSelectedIds(new Set());
          setSelectedTag(null);
          toast.success(`Удалено ${selectedIds.size} тегов`);
      }
  };

  const handleBulkStatusChange = (status: TagStatus) => {
      updateTagsStatus(Array.from(selectedIds), status);
      setSelectedIds(new Set());
      toast.success('Статусы обновлены');
  };

  const handleEditClick = (tag: Tag) => {
      setSelectedTag(tag);
      setEditFormData({...tag.parts});
      setIsEditMode(true);
      setShowNotes(true); // Auto-show notes when editing
      setShowHistory(false);
  };

  const handleSaveEdit = () => {
      if (!selectedTag || !currentUser) return;
      const template = templates.find(t => t.id === selectedTag.templateId);
      if (!template) return;

      const newFullTag = template.blocks.map(b => {
          if (b.type === 'separator') return b.value;
          if (b.type === 'text' && !b.isSuffix) return b.value;
          return editFormData[b.id] || '?';
      }).join('');

      const changes: string[] = [];
      if (newFullTag !== selectedTag.fullTag) changes.push(`Тег: ${selectedTag.fullTag} -> ${newFullTag}`);
      
      Object.keys(editFormData).forEach(blockId => {
          if (editFormData[blockId] !== selectedTag.parts[blockId]) {
              const block = template.blocks.find(b => b.id === blockId);
              const label = block?.categoryId || (block?.isSuffix ? 'Суффикс' : 'Значение');
              changes.push(`${label}: ${selectedTag.parts[blockId]} -> ${editFormData[blockId]}`);
          }
      });

      if (changes.length === 0) {
          setIsEditMode(false);
          return;
      }

      const updatedTag: Tag = {
          ...selectedTag,
          fullTag: newFullTag,
          parts: editFormData,
          history: [{
              action: 'Редактирование',
              user: currentUser.name,
              timestamp: new Date().toISOString(),
              details: changes.join('; ')
          }, ...selectedTag.history]
      };

      updateTag(selectedTag.id, updatedTag);
      setSelectedTag(updatedTag);
      setIsEditMode(false);
      toast.success('Изменения сохранены');
  };

    const handleClone = (original: Tag) => {
      const template = templates.find(t => t.id === original.templateId);
      if (!template) {
          toast.error('Ошибка: Шаблон исходного тега не найден');
          return;
      }

      let prefixForCounter = '';
      const newParts = { ...original.parts };

      for (const block of template.blocks) {
          if (block.isAutoIncrement) break;
          if (block.type === 'separator' || block.type === 'text' && !block.isSuffix) prefixForCounter += block.value;
          else if (block.type === 'dictionary' || block.type === 'parent') prefixForCounter += (newParts[block.id] || '');
      }

      const numBlock = template.blocks.find(b => b.isAutoIncrement);
      if (numBlock) {
          const nextNum = getNextNumber(prefixForCounter, numBlock.padding || 3);
          const numStr = nextNum.toString().padStart(numBlock.padding || 3, '0');
          newParts[numBlock.id] = numStr;
      }

      const newFullTag = template.blocks.map(b => {
          if (b.type === 'separator') return b.value;
          if (b.type === 'text' && !b.isSuffix) return b.value;
          return newParts[b.id] || '?';
      }).join('');

      const newTag: Tag = {
          ...original,
          id: crypto.randomUUID(),
          fullTag: newFullTag,
          parts: newParts,
          status: 'draft',
          parentId: original.parentId, // Clone keeps the same parent
          createdAt: new Date().toISOString(),
          history: [{ 
              action: 'Клонирование', 
              user: currentUser?.name || 'System', 
              timestamp: new Date().toISOString(), 
              details: `Клон тега ${original.fullTag}` 
          }]
      };

      addTag(newTag);
      toast.success(`Создан клон: ${newFullTag}`);
  };

  const handleExportCSV = () => {
      const headers = ["ID", "Parent ID", "Full Tag", "Status", "Template", "Notes", "Created At"];
      const rows = tags.map(t => {
          const tmpl = templates.find(temp => temp.id === t.templateId)?.name || 'Unknown';
          return [t.id, t.parentId || '', t.fullTag, t.status, tmpl, `"${(t.notes || '').replace(/"/g, '""')}"`, t.createdAt];
      });
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `tags_export.csv`;
      link.click();
  };

  // --- Tree / List Data Processing ---

  // 1. Basic Filtering
  const filteredBaseTags = useMemo(() => {
    return tags.filter(t => {
        const matchesTemplate = filterTemplate === 'all' || t.templateId === filterTemplate;
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchesTemplate && matchesStatus;
    });
  }, [tags, filterTemplate, filterStatus]);

  // 2. Search Logic (Switches to List Mode if active)
  const isSearchActive = searchTerm.length > 0;
  const displayTags = useMemo(() => {
      if (isSearchActive) {
          return filteredBaseTags.filter(t => 
              t.fullTag.toLowerCase().includes(searchTerm.toLowerCase()) || 
              t.id.toLowerCase().includes(searchTerm.toLowerCase())
          );
      }
      return filteredBaseTags;
  }, [filteredBaseTags, searchTerm, isSearchActive]);

  // 3. Tree Structure Construction
  const { roots, childrenMap } = useMemo(() => {
      const roots: Tag[] = [];
      const childrenMap: Record<string, Tag[]> = {};
      
      const displayTagIds = new Set(displayTags.map(t => t.id));

      displayTags.forEach(tag => {
          // If no parent, or parent doesn't exist in the current display list of tags, treat as root
          if (!tag.parentId || !displayTagIds.has(tag.parentId)) {
              roots.push(tag);
          } else {
              // Otherwise, add to parent's children list
              if (!childrenMap[tag.parentId]) childrenMap[tag.parentId] = [];
              childrenMap[tag.parentId].push(tag);
          }
      });
      
      // Sort: Folders (parents) first, then files
      const sorter = (a: Tag, b: Tag) => {
           const aHasChildren = !!childrenMap[a.id]?.length;
           const bHasChildren = !!childrenMap[b.id]?.length;
           if (aHasChildren && !bHasChildren) return -1;
           if (!aHasChildren && bHasChildren) return 1;
           return a.fullTag.localeCompare(b.fullTag);
      };

      roots.sort(sorter);
      Object.values(childrenMap).forEach(list => list.sort(sorter));
      
      return { roots, childrenMap };
  }, [displayTags, tags]);

  // --- Helper: Render Row ---
  const renderRow = (tag: Tag, level: number = 0, isLastChild: boolean = false) => {
      const hasChildren = !!childrenMap[tag.id]?.length;
      const isExpanded = expandedIds.has(tag.id);
      const isSelected = selectedTag?.id === tag.id;
      const isChecked = selectedIds.has(tag.id);

      const templateName = templates.find(t => t.id === tag.templateId)?.name;

      return (
          <React.Fragment key={tag.id}>
            <tr 
                onClick={() => { setSelectedTag(tag); setIsEditMode(false); setShowNotes(false); setShowHistory(false); }}
                className={`
                    group cursor-pointer transition-all border-b border-slate-50 hover:bg-blue-50/30
                    ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}
                `}
            >
                {/* Checkbox */}
                <td className="px-3 py-2 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => {
                            const newSet = new Set(selectedIds);
                            if (newSet.has(tag.id)) newSet.delete(tag.id);
                            else newSet.add(tag.id);
                            setSelectedIds(newSet);
                        }} 
                        className={`transition-colors ${isChecked ? "text-blue-600" : "text-slate-300 hover:text-slate-500"}`}
                    >
                        {isChecked ? <CheckSquare size={16}/> : <Square size={16} />}
                    </button>
                </td>

                {/* Tree Column */}
                <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center h-full" style={{ paddingLeft: `${level * 24}px` }}>
                        
                        {/* Tree Lines (Visual Aid) */}
                        {level > 0 && (
                            <div className="w-4 h-full border-l border-slate-200 absolute left-0" style={{ marginLeft: `${(level * 24) - 12}px` }}></div>
                        )}

                        {/* Expander Button */}
                        <div className="w-6 h-6 flex items-center justify-center mr-1 shrink-0 relative z-10">
                            {hasChildren && viewMode === 'tree' && !isSearchActive ? (
                                <button 
                                    onClick={(e) => toggleExpand(tag.id, e)}
                                    className={`
                                        p-0.5 rounded hover:bg-slate-200 transition-all
                                        ${isExpanded ? 'text-slate-700 transform rotate-90' : 'text-slate-400'}
                                    `}
                                >
                                    <ChevronRight size={14} strokeWidth={3} />
                                </button>
                            ) : (
                                <span className="w-4"></span>
                            )}
                        </div>

                        {/* Icon */}
                        <div className={`mr-3 shrink-0 ${hasChildren ? 'text-indigo-500' : 'text-slate-400'}`}>
                            {hasChildren ? (
                                isExpanded ? <FolderOpen size={18} fill="currentColor" fillOpacity={0.1} /> : <Folder size={18} fill="currentColor" fillOpacity={0.1} />
                            ) : (
                                <TagIcon size={16} />
                            )}
                        </div>

                        {/* Tag Name */}
                        <div className="flex flex-col">
                            <span className={`font-mono font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-slate-700'} ${hasChildren ? 'text-base' : ''}`}>
                                {tag.fullTag}
                            </span>
                            {/* Mobile/Compact view sub-info */}
                            <span className="text-[10px] text-slate-400 lg:hidden">{templateName}</span>
                        </div>
                    </div>
                </td>

                {/* Template (Hidden on small screens) */}
                <td className="px-4 py-2 text-xs text-slate-500 hidden lg:table-cell whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                    {templateName}
                </td>

                {/* Parent (Only in List Mode) */}
                {viewMode === 'list' && (
                    <td className="px-4 py-2 text-xs text-slate-400 font-mono hidden md:table-cell">
                        {tag.parentId ? tags.find(t => t.id === tag.parentId)?.fullTag || '...' : '-'}
                    </td>
                )}

                {/* Status */}
                <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold uppercase tracking-wide rounded-full border ${
                        tag.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                        tag.status === 'draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        tag.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        tag.status === 'reserved' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                        {STATUS_MAP[tag.status] || tag.status}
                    </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-2 text-right w-10">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(tag.fullTag); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Копировать"><Copy size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(tag); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Редактировать"><PenLine size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Удалить"><Trash2 size={14}/></button>
                    </div>
                </td>
            </tr>
            
            {/* Recursive Children Render */}
            {isExpanded && viewMode === 'tree' && !isSearchActive && hasChildren && (
                childrenMap[tag.id].map((child, idx, arr) => renderRow(child, level + 1, idx === arr.length - 1))
            )}
          </React.Fragment>
      );
  };

  // --- Main Render ---

  const tagsToRender = isSearchActive || viewMode === 'list' ? displayTags : roots;
  const totalItems = tagsToRender.length;
  // In tree mode, pagination applies to roots. In list mode, to all items.
  const paginatedItems = tagsToRender.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="flex h-full gap-4 relative overflow-hidden">
      
      {/* Main Panel */}
      <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 min-w-0 ${selectedTag ? 'flex-[3]' : 'flex-1'}`}>
         
         {/* Toolbar */}
         <div className="p-3 border-b border-slate-200 bg-white z-20 flex-shrink-0">
             <div className="flex flex-col xl:flex-row gap-3 justify-between items-center">
                <div className="relative flex-1 w-full xl:w-auto">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Поиск тегов..." 
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>
                
                <div className="flex gap-2 w-full xl:w-auto justify-end">
                    {/* View Toggles */}
                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button 
                            onClick={() => setViewMode('tree')} 
                            className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-xs font-bold ${viewMode === 'tree' && !isSearchActive ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                            disabled={isSearchActive}
                        >
                            <FolderTree size={14}/> Дерево
                        </button>
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-xs font-bold ${viewMode === 'list' || isSearchActive ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <List size={14}/> Список
                        </button>
                    </div>

                    <div className="w-40">
                        <Select 
                            className="h-[34px] py-1 text-xs"
                            options={[{ value: 'all', label: 'Все шаблоны' }, ...templates.map(t => ({ value: t.id, label: t.name }))]}
                            value={filterTemplate}
                            onChange={e => { setFilterTemplate(e.target.value); setPage(1); }}
                        />
                    </div>

                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleExportCSV}
                        icon={<Download size={14} />}
                        className="h-[34px]"
                    >
                        Экспорт CSV
                    </Button>
                </div>
             </div>
             
             {/* Bulk Actions Bar */}
             {selectedIds.size > 0 && (
                 <div className="mt-3 bg-blue-50 border border-blue-100 p-2 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 fade-in">
                     <div className="flex items-center gap-2 px-2">
                        <CheckSquare className="text-blue-600" size={16} />
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Выбрано: {selectedIds.size}</span>
                     </div>
                     <div className="flex gap-2">
                         <Button size="sm" variant="secondary" onClick={() => handleBulkStatusChange('approved')}>Утвердить</Button>
                         <Button size="sm" variant="danger" onClick={handleBulkDelete} icon={<Trash2 size={14}/>}>Удалить</Button>
                     </div>
                 </div>
             )}
         </div>

         {/* Content Table Container - Full Height Scrollable */}
         <div className="flex-1 overflow-auto bg-slate-50/30 custom-scrollbar relative">
            <table className="min-w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-3 py-3 w-10 text-center border-b border-slate-200">
                            <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-blue-600">
                                <Square size={16} />
                            </button>
                        </th>
                        <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            {viewMode === 'tree' && !isSearchActive ? 'Иерархия тегов' : 'Наименование'}
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 hidden lg:table-cell">Шаблон</th>
                        {viewMode === 'list' && <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 hidden md:table-cell">Родитель</th>}
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Статус</th>
                        <th className="px-4 py-3 text-right border-b border-slate-200 w-10"></th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {paginatedItems.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                <div className="flex flex-col items-center">
                                    <Filter size={48} className="mb-4 opacity-20"/>
                                    <p className="font-medium">Теги не найдены</p>
                                    <p className="text-xs mt-1">Попробуйте изменить фильтры или создать новый тег</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        paginatedItems.map(tag => renderRow(tag, 0))
                    )}
                </tbody>
            </table>
         </div>

         {/* Pagination Footer */}
         <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
             <div className="text-xs text-slate-400">
                 Всего: <span className="font-bold text-slate-700">{totalItems}</span>
             </div>
             <div className="flex gap-1 items-center">
                 <button 
                    disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                 >
                     <ChevronLeft size={16}/>
                 </button>
                 <span className="text-xs font-mono px-2 text-slate-600">
                     {page} / {Math.max(1, totalPages)}
                 </span>
                 <button 
                    disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                 >
                     <ChevronRight size={16}/>
                 </button>
             </div>
         </div>
      </div>

      {/* Detail Slide Over */}
      {selectedTag && (
        <div className="w-[350px] flex-shrink-0 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-all z-30 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className={`p-5 border-b border-slate-200 flex justify-between items-start ${isEditMode ? 'bg-indigo-50' : 'bg-white'}`}>
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {isEditMode ? <PenLine size={12}/> : <TagIcon size={12}/>}
                        {isEditMode ? 'Редактирование' : 'Свойства'}
                    </div>
                    <h2 className="text-lg font-bold font-mono text-slate-900 break-all leading-tight">
                        {selectedTag.fullTag}
                    </h2>
                </div>
                <button onClick={() => { setSelectedTag(null); setIsEditMode(false); }} className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"><X size={20}/></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
                
                {/* Parent Block */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FolderTree size={12}/> Родительский узел
                    </div>
                    {selectedTag.parentId ? (
                        <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-white rounded border border-slate-200 text-indigo-500"><Folder size={14}/></div>
                             <div>
                                 <div className="font-mono font-bold text-sm text-slate-700 leading-none">
                                     {tags.find(t => t.id === selectedTag.parentId)?.fullTag || 'Не найден'}
                                 </div>
                             </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400 italic pl-1">Это корневой элемент</div>
                    )}
                </div>

                {/* Status Selector */}
                <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Статус</label>
                    <Select 
                        className="h-9 text-sm"
                        options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v }))}
                        value={selectedTag.status}
                        onChange={(e) => {
                             const newStatus = e.target.value as TagStatus;
                             if (selectedTag.status !== newStatus) {
                                 const logEntry: any = {
                                     action: 'Статус изменен',
                                     user: currentUser?.name || 'Unknown',
                                     timestamp: new Date().toISOString(),
                                     details: `${selectedTag.status} -> ${newStatus}`
                                 };
                                 updateTag(selectedTag.id, { status: newStatus, history: [logEntry, ...selectedTag.history] });
                                 setSelectedTag({...selectedTag, status: newStatus, history: [logEntry, ...selectedTag.history]});
                                 toast.success('Статус обновлен');
                             }
                        }}
                    />
                </div>

                {/* Parts Form */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700">Параметры тега</label>
                        {isEditMode && <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">Изменение значений</span>}
                    </div>
                    
                    <div className={`space-y-1 rounded-lg border overflow-hidden ${isEditMode ? 'border-indigo-200' : 'border-slate-200'}`}>
                        {Object.entries(selectedTag.parts).map(([key, value]) => {
                            const tmpl = templates.find(t => t.id === selectedTag.templateId);
                            const block = tmpl?.blocks.find(b => b.id === key);
                            const label = block?.categoryId || (block?.isAutoIncrement ? 'Счетчик' : (block?.isSuffix ? 'Суффикс' : 'Текст'));

                            if (!block) return null;

                            return (
                                <div key={key} className="flex text-sm border-b border-slate-100 last:border-0 bg-white">
                                    <div className="w-1/3 px-3 py-2 bg-slate-50 border-r border-slate-100 text-xs font-medium text-slate-500 flex items-center truncate" title={label}>
                                        {label}
                                    </div>
                                    <div className="w-2/3 px-3 py-2 font-mono font-bold text-slate-800">
                                        {isEditMode ? (
                                            block.type === 'dictionary' ? (
                                                <select
                                                    className="w-full bg-transparent outline-none text-indigo-700"
                                                    value={editFormData[key] || ''}
                                                    onChange={(e) => setEditFormData({...editFormData, [key]: e.target.value})}
                                                >
                                                    <option value="" disabled>...</option>
                                                    {dictionaries
                                                        .filter(d => d.category === block.categoryId)
                                                        .map(d => (
                                                            <option key={d.id} value={d.code}>{d.code}</option>
                                                        ))
                                                    }
                                                </select>
                                            ) : (
                                                <input 
                                                    className="w-full bg-transparent outline-none text-indigo-700 placeholder-indigo-300"
                                                    value={editFormData[key] || ''}
                                                    onChange={(e) => setEditFormData({...editFormData, [key]: e.target.value})}
                                                />
                                            )
                                        ) : value}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <button 
                        onClick={() => setShowNotes(!showNotes)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-600 transition-colors w-full"
                    >
                        {showNotes ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} Заметки
                    </button>
                    {showNotes && (
                        <textarea 
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                            placeholder="Добавьте описание..."
                            value={selectedTag.notes || ''}
                            onChange={(e) => setSelectedTag({ ...selectedTag, notes: e.target.value })}
                            onBlur={() => updateTag(selectedTag.id, { notes: selectedTag.notes })}
                        />
                    )}
                </div>

                {/* History */}
                <div>
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-600 transition-colors w-full"
                    >
                        {showHistory ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} История
                    </button>
                    {showHistory && (
                        <div className="space-y-3 pl-3 border-l-2 border-slate-100 ml-1">
                            {selectedTag.history.map((log, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="text-xs font-bold text-slate-700">{log.action}</div>
                                    <div className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString('ru-RU')} • {log.user}</div>
                                    {log.details && <div className="text-[10px] text-slate-500 mt-0.5 bg-slate-50 p-1.5 rounded">{log.details}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
                {isEditMode ? (
                    <>
                        <Button className="flex-1" onClick={handleSaveEdit} icon={<Save size={16}/>}>Сохранить</Button>
                        <Button className="flex-1" variant="secondary" onClick={() => setIsEditMode(false)}>Отмена</Button>
                    </>
                ) : (
                    <>
                        <Button className="flex-1" variant="secondary" onClick={() => handleEditClick(selectedTag)} icon={<PenLine size={16}/>}>Правка</Button>
                        <Button variant="danger" onClick={() => handleDelete(selectedTag.id)}><Trash2 size={16}/></Button>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};