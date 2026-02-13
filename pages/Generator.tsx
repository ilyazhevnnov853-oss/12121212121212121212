import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Template, Tag, TemplateBlock } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Wand2, CheckCircle, QrCode, Layers, Link as LinkIcon, Info, FolderTree, Globe, Package } from 'lucide-react';
import { LibraryModal } from '../components/LibraryModal';
import { AssemblyImportModal } from '../components/AssemblyImportModal';

export const Generator: React.FC = () => {
  const { templates, dictionaries, tags, addTags, getNextNumber, globalVariables, currentProjectId } = useStore();
  
  // Selection State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedParentId, setSelectedParentId] = useState<string>(''); // For auto-fill logic (Reference)
  const [hierarchyParentId, setHierarchyParentId] = useState<string>(''); // For DB Hierarchy (Parent)
  
  const [formData, setFormData] = useState<Record<string, string>>({}); // blockId -> value
  const [quantity, setQuantity] = useState<number>(1);
  const [lastGenerated, setLastGenerated] = useState<Tag[]>([]);
  const [generationMode, setGenerationMode] = useState<'sequence' | 'parallel'>('sequence');
  
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // --- Logic: Detect if Template needs a parent for Data Inheritance ---
  const requiresParent = useMemo(() => {
      return selectedTemplate?.blocks.some(b => b.type === 'parent_ref') || false;
  }, [selectedTemplate]);

  // --- Logic: Auto-fill fields based on Parent and Global Vars ---
  useEffect(() => {
      if (!selectedTemplate) return;

      const newFormData = { ...formData };
      let hasChanges = false;

      // 1. Fill Global Variables
      selectedTemplate.blocks.forEach(block => {
          if (block.type === 'global_var' && block.variableKey) {
              const globalVal = globalVariables.find(v => v.key === block.variableKey)?.value || '';
              if (newFormData[block.id] !== globalVal) {
                  newFormData[block.id] = globalVal;
                  hasChanges = true;
              }
          }
          // Auto-fill Project dictionary (single item logic)
          if (block.type === 'dictionary' && (block.categoryId === 'Проект' || block.categoryId === 'Project')) {
             const projectDict = dictionaries.find(d => d.category === block.categoryId);
             if (projectDict && newFormData[block.id] !== projectDict.code) {
                 newFormData[block.id] = projectDict.code;
                 hasChanges = true;
             }
          }
      });

      // 2. Fill Parent References (if parent selected)
      if (selectedParentId) {
          const parentTag = tags.find(t => t.id === selectedParentId);
          const parentTemplate = templates.find(t => t.id === parentTag?.templateId);

          if (parentTag && parentTemplate) {
              selectedTemplate.blocks.forEach(block => {
                  if (block.type === 'parent_ref') {
                      let resolvedValue = '';

                      // LOGIC: How to get data from parent?
                      if (block.parentSource === 'full_tag') {
                          resolvedValue = parentTag.fullTag;
                      } else if (block.parentSource === 'wbs') {
                          // Check for old WBS/System or new Project Code
                          const wbsBlock = parentTemplate.blocks.find(pb => pb.categoryId === 'Проект' || pb.categoryId === 'Код проекта' || pb.categoryId?.includes('WBS') || pb.categoryId?.includes('System'));
                          if (wbsBlock) resolvedValue = parentTag.parts[wbsBlock.id] || '';
                      } else if (block.parentSource === 'number') {
                          const numBlock = parentTemplate.blocks.find(pb => pb.type === 'number');
                          if (numBlock) resolvedValue = parentTag.parts[numBlock.id] || '';
                      }

                      if (resolvedValue && newFormData[block.id] !== resolvedValue) {
                          newFormData[block.id] = resolvedValue;
                          hasChanges = true;
                      }
                  }
              });
          }
      }

      if (hasChanges) {
          setFormData(newFormData);
      }
  }, [selectedTemplate, selectedParentId, globalVariables, tags, templates, dictionaries, formData]);


  const getDictOptions = (block: TemplateBlock) => {
    return dictionaries
        .filter(d => d.category === block.categoryId)
        .map(d => ({ value: d.code, label: `${d.code} - ${d.value}` }));
  };

  const calculatePrefix = () => {
    if (!selectedTemplate) return '';
    let prefix = '';
    for (const block of selectedTemplate.blocks) {
        if (block.isAutoIncrement) break; 
        if (block.isSuffix) break; 
        
        if (block.type === 'separator') prefix += block.value;
        if (block.type === 'text' && !block.isSuffix) prefix += block.value;
        if (block.type === 'global_var') prefix += formData[block.id] || '';
        if (block.type === 'parent_ref') prefix += formData[block.id] || '';
        if (block.type === 'dictionary' || block.type === 'parent') prefix += formData[block.id] || '?';
    }
    return prefix;
  };

  const suffixBlock = selectedTemplate?.blocks.find(b => b.isSuffix);
  const numBlock = selectedTemplate?.blocks.find(b => b.isAutoIncrement);

  const previewTag = useMemo(() => {
    if (!selectedTemplate) return '';
    const prefix = calculatePrefix();
    
    const parts = selectedTemplate.blocks.map(b => {
        if (b.type === 'separator') return b.value;
        if (b.type === 'text' && !b.isSuffix) return b.value;
        if (b.type === 'global_var') return formData[b.id] || `{${b.variableKey}}`;
        if (b.type === 'parent_ref') return formData[b.id] || `(Ref:${b.parentSource})`;
        if (b.type === 'dictionary' || b.type === 'parent') return formData[b.id] || '?';
        if (b.isAutoIncrement) {
             const next = getNextNumber(prefix, b.padding || 2);
             return next.toString().padStart(b.padding || 2, '0');
        }
        if (b.isSuffix) return generationMode === 'parallel' ? 'A' : (formData[b.id] || '');
        return '';
    });

    return parts.join('');
  }, [selectedTemplate, formData, tags, generationMode, selectedParentId]); 

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    if (requiresParent && !selectedParentId) {
        alert("Для этого шаблона необходимо выбрать 'Источник данных (Родитель)' для наследования!");
        return;
    }

    const newTags: Tag[] = [];
    const prefix = calculatePrefix();
    let startNum = numBlock ? getNextNumber(prefix, numBlock.padding || 3) : 0;
    const startChar = 'A';

    for (let i = 0; i < quantity; i++) {
        let fullTag = '';
        const parts = { ...formData };
        
        let currentNum = startNum;
        let currentSuffix = formData[suffixBlock?.id || ''] || '';

        if (generationMode === 'sequence' && numBlock) {
            currentNum = startNum + i;
        } else if (generationMode === 'parallel' && suffixBlock) {
            currentSuffix = String.fromCharCode(startChar.charCodeAt(0) + i);
        }

        for (const block of selectedTemplate.blocks) {
            if (block.type === 'separator') fullTag += block.value;
            else if (block.type === 'text' && !block.isSuffix) fullTag += block.value;
            else if (block.type === 'global_var') {
                fullTag += parts[block.id] || '';
            }
            else if (block.type === 'parent_ref') {
                fullTag += parts[block.id] || ''; // Data already in formData from effect
            }
            else if (block.type === 'dictionary' || block.type === 'parent') fullTag += parts[block.id] || '?';
            else if (block.isAutoIncrement) {
                const val = currentNum.toString().padStart(block.padding || 2, '0');
                fullTag += val;
                parts[block.id] = val;
            }
            else if (block.isSuffix) {
                fullTag += currentSuffix;
                parts[block.id] = currentSuffix;
            }
        }

        if (tags.some(t => t.fullTag === fullTag)) {
            alert(`Обнаружен дубликат для ${fullTag}. Генерация прервана.`);
            break;
        }

        const newTag: Tag = {
            id: crypto.randomUUID(),
            projectId: currentProjectId || '',
            fullTag,
            parts,
            templateId: selectedTemplate.id,
            status: 'draft',
            // Priority: hierarchyParentId (Explicit location) -> selectedParentId (Data source)
            parentId: hierarchyParentId || (requiresParent ? selectedParentId : undefined),
            createdAt: new Date().toISOString(),
            history: [{ action: 'Создан', user: 'Инженер', timestamp: new Date().toISOString() }]
        };
        newTags.push(newTag);
    }

    if (newTags.length > 0) {
        addTags(newTags);
        setLastGenerated(newTags);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Создание тега</h1>
                <p className="text-slate-500">Автоматическая генерация с наследованием данных.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsAssemblyModalOpen(true)} className="text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100" icon={<Package size={18} />}>
                    Импорт Сборки
                </Button>
                <Button variant="secondary" onClick={() => setIsLibraryOpen(true)} className="text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100" icon={<Globe size={18} />}>
                    Библиотека
                </Button>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <Select 
                label="Выберите шаблон"
                options={templates.map(t => ({ value: t.id, label: t.name }))}
                value={selectedTemplateId}
                onChange={e => { setSelectedTemplateId(e.target.value); setFormData({}); setQuantity(1); setSelectedParentId(''); setHierarchyParentId(''); }}
            />

            {selectedTemplate && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    
                    {/* Data Inheritance Source (if needed by template) */}
                    {requiresParent && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <div className="flex items-center gap-2 mb-2 text-purple-700">
                                <LinkIcon size={16} />
                                <label className="text-sm font-bold uppercase">Источник данных (Родитель)</label>
                            </div>
                            <select 
                                className="w-full px-3 py-2 bg-white border border-purple-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={selectedParentId}
                                onChange={e => setSelectedParentId(e.target.value)}
                            >
                                <option value="">-- Выберите тег для копирования данных --</option>
                                {tags.filter(t => t.status === 'active' || t.status === 'approved').map(t => (
                                    <option key={t.id} value={t.id}>{t.fullTag}</option>
                                ))}
                            </select>
                            <p className="text-xs text-purple-600 mt-2">
                                <Info size={10} className="inline mr-1"/>
                                Номер и WBS будут скопированы из этого тега.
                            </p>
                        </div>
                    )}

                    {/* Dynamic Fields */}
                    {selectedTemplate.blocks.map(block => {
                        if (block.type === 'separator' || block.isAutoIncrement || (block.type === 'text' && !block.isSuffix)) return null;
                        
                        if (block.type === 'global_var') {
                            return (
                                <div key={block.id} className="opacity-70">
                                    <Input 
                                        label={`Переменная: ${block.variableKey}`}
                                        value={formData[block.id] || ''}
                                        readOnly
                                        className="bg-slate-50 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            );
                        }
                        if (block.type === 'parent_ref') {
                            return (
                                <div key={block.id} className="opacity-70">
                                    <Input 
                                        label={`Наследование: ${block.parentSource}`}
                                        value={formData[block.id] || ''}
                                        readOnly
                                        placeholder="Выберите источник данных..."
                                        className="bg-slate-50 text-slate-500 cursor-not-allowed border-purple-200"
                                    />
                                </div>
                            );
                        }

                        if (block.type === 'dictionary') {
                             // Hide "Project" dictionary blocks as requested
                            if (block.categoryId === 'Проект' || block.categoryId === 'Project') {
                                return null;
                            }

                            return (
                                <Select 
                                    key={block.id}
                                    label={`Выберите ${block.categoryId}`}
                                    options={getDictOptions(block)}
                                    value={formData[block.id] || ''}
                                    onChange={e => setFormData({ ...formData, [block.id]: e.target.value })}
                                />
                            );
                        }
                        
                        if (block.isSuffix && generationMode === 'sequence') {
                             return (
                                <Input
                                    key={block.id}
                                    label="Суффикс (опционально)"
                                    placeholder="Например: A, B"
                                    value={formData[block.id] || ''}
                                    onChange={e => setFormData({ ...formData, [block.id]: e.target.value.toUpperCase() })}
                                />
                            );
                        }
                        return null;
                    })}

                    {/* Hierarchy Setting (DB Parent) - Always available */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-2 text-slate-700">
                            <FolderTree size={16} />
                            <label className="text-sm font-bold uppercase">Место установки (Родитель в дереве)</label>
                        </div>
                        <select 
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={hierarchyParentId}
                            onChange={e => setHierarchyParentId(e.target.value)}
                        >
                             <option value="">-- Корневой элемент --</option>
                             {tags.map(t => (
                                <option key={t.id} value={t.id}>{t.fullTag}</option>
                             ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Определяет, где тег будет находиться в реестре.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex gap-4 mb-4">
                            <button onClick={() => setGenerationMode('sequence')} className={`flex-1 p-3 rounded-lg border-2 text-left text-xs transition-all ${generationMode === 'sequence' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-slate-300'}`}>
                                <span className="font-bold block mb-1">Последовательный</span> 01, 02...
                            </button>
                            <button onClick={() => setGenerationMode('parallel')} disabled={!suffixBlock} className={`flex-1 p-3 rounded-lg border-2 text-left text-xs transition-all ${!suffixBlock ? 'opacity-50 cursor-not-allowed' : ''} ${generationMode === 'parallel' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-slate-300'}`}>
                                <span className="font-bold block mb-1">Параллельный</span> 01A, 01B...
                            </button>
                        </div>
                        <Input type="number" min={1} max={20} value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} />
                    </div>

                    <div className="bg-slate-900 p-4 rounded-lg flex items-center justify-between shadow-lg">
                         <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Результат</span>
                            <p className="text-xl font-mono text-green-400 font-bold tracking-wide">{previewTag || '...'}</p>
                         </div>
                         <Button onClick={handleGenerate} icon={<Wand2 size={18} />}>Создать</Button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Results Panel */}
      <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center min-h-[400px]">
         {lastGenerated.length === 0 ? (
            <div className="text-center text-slate-400">
                <Layers size={48} className="mx-auto mb-4 opacity-30" />
                <p>Результаты генерации отобразятся здесь.</p>
            </div>
         ) : (
            <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><CheckCircle className="text-green-500" size={20}/> Создано {lastGenerated.length} тегов</h3>
                    <Button variant="secondary" size="sm" onClick={() => setLastGenerated([])}>Очистить</Button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {lastGenerated.map(tag => (
                        <div key={tag.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex justify-between items-center group hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"><QrCode size={20} /></div>
                                <div>
                                    <p className="text-lg font-mono font-bold text-slate-900">{tag.fullTag}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                                        ID: {tag.id.slice(0,8)}
                                        {tag.parentId && <span className="ml-2 text-purple-500">Parent: {tag.parentId.slice(0,6)}</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         )}
      </div>

      {isLibraryOpen && <LibraryModal onClose={() => setIsLibraryOpen(false)} />}
      {isAssemblyModalOpen && <AssemblyImportModal onClose={() => setIsAssemblyModalOpen(false)} />}
    </div>
  );
};