import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { BlockType, Template, TemplateBlock } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
    Save, Plus, X, 
    Settings, Hash, Box, Type, Trash2, ArrowLeft,
    CheckSquare, Square
} from 'lucide-react';

export const Builder: React.FC = () => {
  const { addTemplate, dictionaries } = useStore();
  
  // Builder State
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  
  // UI State for Popovers
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [menuLevel, setMenuLevel] = useState<'main' | 'sub'>('main');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Close menu on click outside
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveBlockId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Drag and Drop Logic ---
  
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Add a new placeholder block
    const newBlock: TemplateBlock = {
      id: crypto.randomUUID(),
      type: 'placeholder',
      value: '',
    };
    
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
    setMenuLevel('main');
  };

  // --- Block Manipulation ---

  const removeBlock = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlocks(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const updateBlock = (id: string, updates: Partial<TemplateBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  // --- Menu Logic ---

  const handleBlockClick = (id: string) => {
      if (activeBlockId === id) {
          setActiveBlockId(null);
      } else {
          setActiveBlockId(id);
          setMenuLevel('main');
          setSelectedCategory(null);
      }
  };

  const selectMainCategory = (category: string) => {
      setSelectedCategory(category);
      setMenuLevel('sub');
  };

  const applyConfiguration = (config: Partial<TemplateBlock>) => {
      if (!activeBlockId) return;
      updateBlock(activeBlockId, config);
      setActiveBlockId(null); // Close menu
  };

  // --- Structure Definition ---

  const mainCategories = [
      { id: 'context', label: 'Проект / Система', icon: Box, color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { id: 'equipment', label: 'Оборудование', icon: Settings, color: 'bg-orange-50 text-orange-700 border-orange-200' },
      { id: 'format', label: 'Форматирование', icon: Type, color: 'bg-slate-50 text-slate-700 border-slate-200' },
      { id: 'auto', label: 'Нумерация', icon: Hash, color: 'bg-green-50 text-green-700 border-green-200' },
  ];

  const renderSubOptions = () => {
      const uniqueDictCats = Array.from(new Set(dictionaries.map(d => d.category))) as string[];

      switch (selectedCategory) {
          case 'context':
              return (
                  <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Выберите справочник</p>
                      {uniqueDictCats.filter(c => !c.toLowerCase().includes('оборудование') && !c.toLowerCase().includes('арматур') && !c.toLowerCase().includes('тип')).map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => applyConfiguration({ type: 'dictionary', categoryId: cat, value: '' })}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md transition-colors flex items-center justify-between group"
                          >
                             <span className="font-medium text-slate-700 group-hover:text-blue-700">{cat}</span>
                          </button>
                      ))}
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button 
                        onClick={() => applyConfiguration({ type: 'parent', value: '' })}
                        className="w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md font-medium"
                      >
                          Родительский тег (Врезка)
                      </button>
                  </div>
              );
          case 'equipment':
              return (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Классификатор</p>
                     {uniqueDictCats.filter(c => c.toLowerCase().includes('оборудование') || c.toLowerCase().includes('арматур') || c.toLowerCase().includes('тип')).length > 0 ? (
                         uniqueDictCats.filter(c => c.toLowerCase().includes('оборудование') || c.toLowerCase().includes('арматур') || c.toLowerCase().includes('тип')).map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => applyConfiguration({ type: 'dictionary', categoryId: cat, value: '' })}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 rounded-md font-medium text-slate-700 hover:text-orange-700"
                            >
                                {cat}
                            </button>
                         ))
                     ) : (
                         <div className="text-xs text-slate-400 p-2">Справочники оборудования не найдены</div>
                     )}
                </div>
              );
          case 'format':
              return (
                  <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Разделители</p>
                        <div className="grid grid-cols-4 gap-2">
                            {['-', '.', '/', '_', '|', ':'].map(sep => (
                                <button 
                                    key={sep}
                                    onClick={() => applyConfiguration({ type: 'separator', value: sep })}
                                    className="h-10 border border-slate-200 rounded-md hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 font-mono text-lg font-bold flex items-center justify-center transition-all bg-white shadow-sm"
                                >
                                    {sep}
                                </button>
                            ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Текст / Суффикс</p>
                        <button 
                            onClick={() => applyConfiguration({ type: 'text', value: 'FIX' })}
                            className="w-full border border-slate-200 rounded-md p-2 hover:bg-slate-50 text-sm font-medium text-slate-700 bg-white shadow-sm mb-2"
                        >
                            Статичный текст (Префикс)
                        </button>
                        <button 
                            onClick={() => applyConfiguration({ type: 'text', value: '', isSuffix: true })}
                            className="w-full border border-blue-200 rounded-md p-2 hover:bg-blue-50 text-sm font-medium text-blue-700 bg-blue-50 shadow-sm flex items-center justify-center gap-2"
                        >
                            <Type size={14}/>
                            Суффикс (A, B, C...)
                        </button>
                      </div>
                  </div>
              );
          case 'auto':
              return (
                  <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Длина номера</p>
                      {[2, 3, 4, 5].map(padding => (
                          <button 
                            key={padding}
                            onClick={() => applyConfiguration({ type: 'number', isAutoIncrement: true, padding })}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-green-50 rounded-md group bg-white border border-transparent hover:border-green-200"
                          >
                              <span className="font-mono text-slate-600 group-hover:text-green-700 font-bold">{'0'.repeat(padding-1)}1</span>
                              <span className="text-xs text-slate-400">{padding} знака</span>
                          </button>
                      ))}
                  </div>
              );
          default:
              return null;
      }
  };


  const handleSave = () => {
    if (!templateName || blocks.length === 0) {
        alert("Пожалуйста, укажите название и добавьте блоки.");
        return;
    }
    if (blocks.some(b => b.type === 'placeholder')) {
        alert("Пожалуйста, настройте все пустые блоки или удалите их.");
        return;
    }

    const newTemplate: Template = {
        id: crypto.randomUUID(),
        name: templateName,
        description: templateDesc,
        blocks,
        createdAt: new Date().toISOString()
    };
    addTemplate(newTemplate);
    setTemplateName('');
    setTemplateDesc('');
    setBlocks([]);
    alert("Шаблон сохранен!");
  };

  // Preview Logic
  const previewText = blocks.map(b => {
    if (b.type === 'text') {
        if (b.isSuffix) return '[A]';
        return b.value || 'FIX';
    }
    if (b.type === 'separator') return b.value;
    if (b.type === 'dictionary') return `[${b.categoryId?.substring(0,4).toUpperCase() || 'DICT'}]`;
    if (b.type === 'number') return '0'.repeat(b.padding || 3);
    if (b.type === 'parent') return '[PRNT]';
    if (b.type === 'placeholder') return '[ ... ]';
    return '?';
  }).join('');

  return (
    <div className="h-full flex flex-col space-y-6" ref={containerRef}>
       
       {/* Top Header */}
       <div className="flex justify-between items-start bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1 max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Название шаблона</label>
                <Input 
                    value={templateName} 
                    onChange={e => setTemplateName(e.target.value)} 
                    placeholder="Например: PDH2 Механика" 
                    className="font-bold text-lg border-slate-300"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Описание</label>
                <Input 
                    value={templateDesc} 
                    onChange={e => setTemplateDesc(e.target.value)} 
                    placeholder="Для оборудования..." 
                />
            </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
             <div className="bg-slate-900 text-green-400 px-4 py-2 rounded-lg font-mono font-bold tracking-widest text-lg shadow-inner border border-slate-700 min-w-[200px] text-center">
                {previewText || 'ПУСТО'}
             </div>
             <Button onClick={handleSave} icon={<Save size={18} />}>Сохранить</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        
        {/* Canvas Area */}
        <div 
            className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50/30 relative"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {blocks.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                    <Box size={64} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium opacity-60">Перетащите сюда блок из панели инструментов</p>
                </div>
            )}

            <div className="flex flex-wrap gap-6 items-start content-start">
                {blocks.map((block, index) => (
                    <div key={block.id} className="relative group z-0 hover:z-10">
                        
                        {/* THE VISUAL BLOCK CARD */}
                        <div 
                            onClick={() => handleBlockClick(block.id)}
                            className={`
                                relative h-20 min-w-[80px] px-4 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm select-none bg-white
                                ${block.type === 'placeholder' 
                                    ? 'border-dashed border-slate-400 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:scale-105' 
                                    : 'border-slate-200 text-slate-800 hover:border-blue-400 hover:shadow-md'
                                }
                                ${activeBlockId === block.id ? 'ring-4 ring-blue-100 border-blue-500 z-20' : ''}
                            `}
                        >
                            {/* Render Content */}
                            {block.type === 'placeholder' && (
                                <div className="flex flex-col items-center animate-pulse">
                                    <Plus size={24} />
                                    <span className="text-[10px] mt-1 font-bold uppercase">Настроить</span>
                                </div>
                            )}
                            
                            {block.type === 'separator' && <span className="font-mono text-3xl font-black text-slate-600">{block.value}</span>}
                            
                            {block.type === 'text' && (
                                <div className="text-center">
                                    <span className={`text-sm font-bold ${block.isSuffix ? 'text-blue-600' : 'text-slate-900'}`}>{block.isSuffix ? '[A..Z]' : block.value}</span>
                                    <span className="block text-[9px] uppercase text-slate-400 mt-1">{block.isSuffix ? 'Суффикс' : 'Текст'}</span>
                                </div>
                            )}
                            
                            {block.type === 'number' && (
                                <div className="text-center">
                                    <span className="font-mono text-xl font-bold text-green-600 tracking-wider">{'0'.repeat((block.padding || 3) - 1)}1</span>
                                    <span className="block text-[9px] uppercase text-slate-400 mt-1">Авто</span>
                                </div>
                            )}
                            
                            {block.type === 'dictionary' && (
                                <div className="text-center max-w-[120px]">
                                    <span className="block text-sm font-bold truncate text-blue-700">{block.categoryId}</span>
                                    <span className="block text-[9px] uppercase text-slate-400 mt-1">Справочник</span>
                                </div>
                            )}
                            
                            {block.type === 'parent' && (
                                <div className="flex flex-col items-center text-purple-600">
                                    <ArrowLeft size={20} className="rotate-90 mb-1"/>
                                    <span className="text-[9px] font-bold uppercase">Родитель</span>
                                </div>
                            )}

                            {/* Remove Button (Hover only) */}
                            <button 
                                onClick={(e) => removeBlock(block.id, e)}
                                className="absolute -top-2 -right-2 bg-white text-red-500 border border-red-100 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50 hover:scale-110 z-30"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* POPOVER MENU */}
                        {activeBlockId === block.id && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-200">
                                {/* Triangle Arrow */}
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-200 rotate-45 transform"></div>
                                
                                <div className="relative p-4">
                                    {menuLevel === 'main' ? (
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-widest mb-2">Выберите тип блока</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {mainCategories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => selectMainCategory(cat.id)}
                                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:scale-105 active:scale-95 shadow-sm ${cat.color}`}
                                                    >
                                                        <cat.icon size={24} className="mb-2" />
                                                        <span className="text-xs font-bold text-center leading-tight">{cat.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={(e) => removeBlock(block.id, e)}
                                                className="w-full flex items-center justify-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold mt-2 transition-colors"
                                            >
                                                <Trash2 size={14}/> Удалить блок
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                                <button 
                                                    onClick={() => setMenuLevel('main')} 
                                                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center font-medium px-2 py-1 hover:bg-slate-100 rounded"
                                                >
                                                    <ArrowLeft size={12} className="mr-1"/> Назад
                                                </button>
                                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                                    {mainCategories.find(c => c.id === selectedCategory)?.label}
                                                </span>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                {renderSubOptions()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Toolbox (Footer) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center shadow-sm sticky bottom-4 z-40">
            <div className="flex flex-col mr-8">
                 <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">Панель инструментов</span>
                 <span className="text-xs text-slate-500 mt-1">Перетащите элементы на холст</span>
            </div>
            
            {/* Draggable Placeholder */}
            <div 
                draggable 
                onDragStart={(e) => handleDragStart(e, 'placeholder')}
                className="group relative w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
                <Plus size={32} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-[10px] mt-2 font-bold text-slate-500 group-hover:text-blue-600 uppercase">Блок</span>
                
                {/* Tooltip hint */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Перетащи меня
                </div>
            </div>

            <div className="h-12 w-px bg-slate-200 mx-8"></div>
            
            <div className="flex-1 grid grid-cols-2 gap-4 max-w-lg">
                <div className="flex items-start gap-3 text-sm text-slate-500">
                    <div className="p-2 bg-slate-100 rounded-lg"><Box size={16}/></div>
                    <p className="leading-tight text-xs">Добавляйте <strong>Справочники</strong> для выбора параметров проекта.</p>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-500">
                    <div className="p-2 bg-slate-100 rounded-lg"><Hash size={16}/></div>
                    <p className="leading-tight text-xs">Используйте <strong>Авто-нумерацию</strong> для уникальных ID.</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};