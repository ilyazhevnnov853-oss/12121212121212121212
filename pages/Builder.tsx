import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Template, TemplateBlock, LibraryTemplate } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
    Save, Plus, X, 
    Hash, Type, Trash2, ArrowLeft,
    Variable, Link, Book, Play, ArrowRight, Globe
} from 'lucide-react';

interface BuilderProps {
    mode?: 'project' | 'global';
    onClose?: () => void; // For Admin mode when finished
}

export const Builder: React.FC<BuilderProps> = ({ mode = 'project', onClose }) => {
  const { addTemplate, addGlobalTemplate, dictionaries, globalVariables, currentUser } = useStore();
  
  // Builder State
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [category, setCategory] = useState(''); // Only for Global
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  
  // UI State for Popovers
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [menuLevel, setMenuLevel] = useState<'main' | 'sub'>('main');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isGlobal = mode === 'global';

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveBlockId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Block Manipulation ---

  const addBlock = (index: number) => {
      const newBlock: TemplateBlock = {
          id: crypto.randomUUID(),
          type: 'placeholder',
          value: '',
      };
      // Insert new block after the current index
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      
      // Immediately open menu for the new block
      setActiveBlockId(newBlock.id);
      setMenuLevel('main');
  };

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
      { id: 'dict', label: isGlobal ? 'Абстрактный Справочник' : 'Справочник', icon: Book, color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { id: 'format', label: 'Форматирование', icon: Type, color: 'bg-slate-50 text-slate-700 border-slate-200' },
      { id: 'auto', label: 'Нумерация', icon: Hash, color: 'bg-green-50 text-green-700 border-green-200' },
  ];

  if (!isGlobal) {
      mainCategories.splice(1, 0, { id: 'smart', label: 'Умная привязка', icon: Link, color: 'bg-purple-50 text-purple-700 border-purple-200' });
  }

  const renderSubOptions = () => {
      const uniqueDictCats = Array.from(new Set(dictionaries.map(d => d.category))) as string[];

      switch (selectedCategory) {
          case 'dict':
              if (isGlobal) {
                  return (
                      <div className="space-y-3 p-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Имя категории стандарта</p>
                          <p className="text-xs text-slate-500 mb-2">Например: "Function Code", "Area", "Fluid Type". При импорте инженер сопоставит это с реальным справочником.</p>
                          <div className="flex gap-2">
                             <Input 
                                id="abstract_cat_input"
                                placeholder="Название..."
                                className="text-xs h-9"
                             />
                             <Button 
                                size="sm" 
                                onClick={() => {
                                    const val = (document.getElementById('abstract_cat_input') as HTMLInputElement).value;
                                    if (val) applyConfiguration({ type: 'dictionary', categoryId: val, value: '' });
                                }}
                             >OK</Button>
                          </div>
                      </div>
                  )
              }
              return (
                  <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Выберите список значений</p>
                      {uniqueDictCats.length === 0 && <p className="text-xs text-red-400">Нет доступных справочников</p>}
                      {uniqueDictCats.map(cat => (
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
                        className="w-full text-left px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
                      >
                          Ручная ссылка на тег (Legacy)
                      </button>
                  </div>
              );
          case 'smart':
              return (
                  <div className="space-y-4">
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Глобальные переменные</p>
                          <div className="max-h-32 overflow-y-auto">
                            {globalVariables.map(v => (
                                <button 
                                    key={v.key}
                                    onClick={() => applyConfiguration({ type: 'global_var', variableKey: v.key })}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 text-teal-700 rounded-md font-medium flex justify-between"
                                >
                                    <span>{v.key}</span>
                                    <span className="text-teal-400 opacity-50">{v.value}</span>
                                </button>
                            ))}
                          </div>
                      </div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Наследование (От Родителя)</p>
                          <button onClick={() => applyConfiguration({ type: 'parent_ref', parentSource: 'number' })} className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 text-purple-700 rounded-md mb-1">
                              Копировать Номер (из авто-счетчика)
                          </button>
                          <button onClick={() => applyConfiguration({ type: 'parent_ref', parentSource: 'wbs' })} className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 text-purple-700 rounded-md mb-1">
                              Копировать Код Проекта/WBS
                          </button>
                          <button onClick={() => applyConfiguration({ type: 'parent_ref', parentSource: 'full_tag' })} className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 text-purple-700 rounded-md">
                              Копировать Полный Тег
                          </button>
                      </div>
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
    if (isGlobal && !category) {
        alert("Для системного стандарта укажите категорию (дисциплину).");
        return;
    }
    if (blocks.some(b => b.type === 'placeholder')) {
        alert("Пожалуйста, настройте все пустые блоки или удалите их.");
        return;
    }

    if (isGlobal) {
        const newLibTemplate: LibraryTemplate = {
            id: crypto.randomUUID(),
            type: 'template',
            name: templateName,
            description: templateDesc,
            blocks,
            category: category,
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.name || 'Admin'
        };
        addGlobalTemplate(newLibTemplate);
        if (onClose) onClose();
    } else {
        const newTemplate: Omit<Template, 'projectId'> = {
            id: crypto.randomUUID(),
            name: templateName,
            description: templateDesc,
            blocks,
            createdAt: new Date().toISOString()
        };
        addTemplate(newTemplate);
    }

    setTemplateName('');
    setTemplateDesc('');
    setBlocks([]);
    if (!isGlobal) alert("Шаблон сохранен!");
  };

  // Preview Logic
  const previewText = blocks.map(b => {
    if (b.type === 'text') {
        if (b.isSuffix) return '[A]';
        return b.value || 'FIX';
    }
    if (b.type === 'separator') return b.value;
    if (b.type === 'dictionary') return isGlobal ? `{${b.categoryId}}` : `[${b.categoryId?.substring(0,6)}]`;
    if (b.type === 'number') return '0'.repeat(b.padding || 3);
    if (b.type === 'parent') return '[PRNT]';
    if (b.type === 'global_var') return `{${b.variableKey}}`;
    if (b.type === 'parent_ref') return `(REF:${b.parentSource})`;
    if (b.type === 'placeholder') return '[ ... ]';
    return '?';
  }).join('');

  return (
    <div className="h-full flex flex-col space-y-6" ref={containerRef}>
       
       {/* Top Header */}
       <div className={`p-6 rounded-xl shadow-sm border flex flex-col gap-6 ${isGlobal ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
            {isGlobal && (
                <div className="flex justify-between items-center -mt-2">
                    <span className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider">
                        <Globe size={16}/> Редактор Системного Стандарта
                    </span>
                    {onClose && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    )}
                </div>
            )}
            
            {/* Preview Section - Full Width */}
            <div className="w-full">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Предпросмотр</label>
                <div className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center shadow-inner min-h-[52px]">
                    <div className="font-mono font-bold tracking-widest text-lg truncate text-green-400 w-full">
                        {previewText || '...'}
                    </div>
                </div>
            </div>

            {/* Inputs & Actions Section */}
            <div className="flex items-end gap-4">
                <div className="w-1/4">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Название стандарта</label>
                    <input 
                        value={templateName} 
                        onChange={e => setTemplateName(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder-transparent"
                        placeholder=""
                    />
                </div>
                {isGlobal && (
                    <div className="w-1/6">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Дисциплина</label>
                        <input 
                            value={category} 
                            onChange={e => setCategory(e.target.value)} 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder-transparent"
                            placeholder="Напр. КИПиА"
                        />
                    </div>
                )}
                <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Описание</label>
                    <input 
                        value={templateDesc} 
                        onChange={e => setTemplateDesc(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder-transparent"
                        placeholder=""
                    />
                </div>
                <button 
                    onClick={handleSave}
                    className={`h-[42px] w-[42px] text-white rounded-lg flex items-center justify-center shadow-sm transition-colors flex-shrink-0 ${isGlobal ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    title="Сохранить"
                >
                    <Save size={20} />
                </button>
            </div>
      </div>

      {/* Main Canvas Area */}
      <div className={`flex-1 rounded-xl border relative overflow-hidden flex flex-col ${isGlobal ? 'bg-indigo-50/30 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
        <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest z-10 pointer-events-none">
            Рабочая область {isGlobal ? '(Системная)' : ''}
        </div>

        <div className="flex-1 overflow-x-auto flex items-center px-10">
            
            {/* Empty State */}
            {blocks.length === 0 && (
                <div className="w-full flex justify-center">
                    <button 
                        onClick={() => addBlock(-1)}
                        className={`group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all ${isGlobal ? 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50'}`}
                    >
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Play className={isGlobal ? 'text-indigo-500 ml-1' : 'text-blue-500 ml-1'} size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Начать создание</h3>
                        <p className="text-sm text-slate-400">Нажмите, чтобы добавить первый блок</p>
                    </button>
                </div>
            )}

            {/* Block Chain */}
            <div className="flex items-center space-x-2 min-w-max mx-auto py-20">
                {blocks.map((block, index) => (
                    <div key={block.id} className="relative flex items-center">
                        
                        {/* THE BLOCK CARD */}
                        <div className="group relative z-10">
                            <div 
                                onClick={() => handleBlockClick(block.id)}
                                className={`
                                    relative h-24 min-w-[100px] px-6 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm select-none bg-white
                                    ${block.type === 'placeholder' ? 'border-dashed border-blue-400 text-blue-500 bg-blue-50 animate-pulse' : 'border-slate-200 text-slate-800 hover:border-blue-400 hover:shadow-md'}
                                    ${block.type === 'global_var' ? 'border-teal-200 bg-teal-50' : ''}
                                    ${block.type === 'parent_ref' ? 'border-purple-200 bg-purple-50' : ''}
                                    ${activeBlockId === block.id ? 'ring-4 ring-blue-100 border-blue-500 transform -translate-y-1' : ''}
                                `}
                            >
                                {/* Block Content */}
                                {block.type === 'placeholder' && <Plus size={32} />}
                                {block.type === 'separator' && <span className="font-mono text-4xl font-black text-slate-600">{block.value}</span>}
                                {block.type === 'text' && (
                                    <div className="text-center">
                                        <span className={`text-lg font-bold ${block.isSuffix ? 'text-blue-600' : 'text-slate-900'}`}>{block.isSuffix ? '[A..Z]' : block.value}</span>
                                        <span className="block text-[10px] uppercase text-slate-400 mt-1">{block.isSuffix ? 'Суффикс' : 'Текст'}</span>
                                    </div>
                                )}
                                {block.type === 'number' && (
                                    <div className="text-center">
                                        <span className="font-mono text-2xl font-bold text-green-600 tracking-wider">{'0'.repeat((block.padding || 3) - 1)}1</span>
                                        <span className="block text-[10px] uppercase text-slate-400 mt-1">Авто</span>
                                    </div>
                                )}
                                {block.type === 'dictionary' && (
                                    <div className="text-center max-w-[140px]">
                                        <span className="block text-sm font-bold truncate text-blue-700">{block.categoryId}</span>
                                        <span className="block text-[10px] uppercase text-slate-400 mt-1">{isGlobal ? 'Абстракция' : 'Справочник'}</span>
                                    </div>
                                )}
                                {block.type === 'global_var' && (
                                    <div className="text-center text-teal-700">
                                        <Variable size={20} className="mb-1 mx-auto"/>
                                        <span className="text-[10px] font-bold uppercase block">{block.variableKey}</span>
                                    </div>
                                )}
                                {block.type === 'parent_ref' && (
                                    <div className="text-center text-purple-700">
                                        <Link size={20} className="mb-1 mx-auto"/>
                                        <span className="text-[10px] font-bold uppercase block">REF: {block.parentSource}</span>
                                    </div>
                                )}

                                {/* Remove Button (Top Left) */}
                                <button 
                                    onClick={(e) => removeBlock(block.id, e)}
                                    className="absolute -top-3 -left-3 bg-white text-red-500 border border-red-100 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50 hover:scale-110 z-20"
                                    title="Удалить блок"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* RIGHT EDGE ADD BUTTON (Appears on Hover) */}
                            <div className="absolute top-0 bottom-0 -right-8 w-12 flex items-center justify-center z-0">
                                <button
                                    onClick={() => addBlock(index)}
                                    className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-all duration-200 hover:rotate-90 ${isGlobal ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    title="Вставить блок"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            {/* POPOVER MENU (Centered below block) */}
                            {activeBlockId === block.id && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-200 rotate-45 transform"></div>
                                    <div className="relative p-4">
                                        {menuLevel === 'main' ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center mb-2">
                                                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Тип блока</p>
                                                     <button onClick={() => removeBlock(block.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                </div>
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
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                                    <button onClick={() => setMenuLevel('main')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center font-medium px-2 py-1 hover:bg-slate-100 rounded">
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

                        {/* CONNECTOR LINE */}
                        {index < blocks.length - 1 && (
                            <div className="w-12 h-0.5 bg-slate-300 relative">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
                                     <ArrowRight size={12} className="text-slate-300" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};