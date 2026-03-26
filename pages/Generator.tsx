import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Template, Tag, TemplateBlock } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Wand2, CheckCircle, QrCode, Layers, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

export const Generator: React.FC = () => {
  const { templates, dictionaries, tags, addTags, getNextNumber, currentProjectId, currentUser } = useStore();
  
  // Selection State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [hierarchyParentId, setHierarchyParentId] = useState<string>(''); // For DB Hierarchy (Parent)
  
  const [formData, setFormData] = useState<Record<string, string>>({}); // blockId -> value
  const [quantity, setQuantity] = useState<number>(1);
  const [lastGenerated, setLastGenerated] = useState<Tag[]>([]);
  const [generationMode, setGenerationMode] = useState<'sequence' | 'parallel'>('sequence');
  
  const filteredTemplates = useMemo(() => {
      if (!currentUser) return templates;
      if (currentUser.role === 'hvac_engineer') {
          return templates.filter(t => t.name.toLowerCase().includes('ов') || t.name.toLowerCase().includes('вентиляция'));
      }
      if (currentUser.role === 'automation_engineer') {
          return templates.filter(t => t.name.toLowerCase().includes('ак') || t.name.toLowerCase().includes('автоматика'));
      }
      return templates;
  }, [templates, currentUser]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // --- Logic: Auto-fill fields based on Parent and Global Vars ---
  useEffect(() => {
      if (!selectedTemplate) return;

      const newFormData = { ...formData };
      let hasChanges = false;

      // 1. Fill Global Variables
      selectedTemplate.blocks.forEach(block => {
          // Auto-fill Project dictionary (single item logic)
          if (block.type === 'dictionary' && (block.categoryId === 'Проект' || block.categoryId === 'Project')) {
             const projectDict = dictionaries.find(d => d.category === block.categoryId);
             if (projectDict && newFormData[block.id] !== projectDict.code) {
                 newFormData[block.id] = projectDict.code;
                 hasChanges = true;
             }
          }
      });

      if (hasChanges) {
          setFormData(newFormData);
      }
  }, [selectedTemplate, dictionaries, formData]);


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
        if (b.type === 'dictionary' || b.type === 'parent') return formData[b.id] || '?';
        if (b.isAutoIncrement) {
             const next = getNextNumber(prefix, b.padding || 2);
             return next.toString().padStart(b.padding || 2, '0');
        }
        if (b.isSuffix) return generationMode === 'parallel' ? 'A' : (formData[b.id] || '');
        return '';
    });

    return parts.join('');
  }, [selectedTemplate, formData, tags, generationMode]); 

  const handleGenerate = () => {
    if (!selectedTemplate) return;

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
            toast.error(`Обнаружен дубликат для ${fullTag}. Генерация прервана.`);
            break;
        }

        const newTag: Tag = {
            id: crypto.randomUUID(),
            projectId: currentProjectId || '',
            fullTag,
            parts,
            templateId: selectedTemplate.id,
            status: 'draft',
            parentId: hierarchyParentId || undefined,
            createdAt: new Date().toISOString(),
            history: [{ action: 'Создан', user: 'Инженер', timestamp: new Date().toISOString() }]
        };
        newTags.push(newTag);
    }

    if (newTags.length > 0) {
        addTags(newTags);
        setLastGenerated(newTags);
        toast.success(`Успешно создано ${newTags.length} тегов`);
    }
  };

  const batchPreviewTags = useMemo(() => {
    if (!selectedTemplate || quantity <= 1) return [];
    
    const previews: string[] = [];
    const prefix = calculatePrefix();
    let startNum = numBlock ? getNextNumber(prefix, numBlock.padding || 3) : 0;
    const startChar = 'A';

    for (let i = 0; i < Math.min(quantity, 5); i++) { // Max 5 previews
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
        previews.push(fullTag);
    }
    return previews;
  }, [selectedTemplate, formData, quantity, generationMode, numBlock, suffixBlock, tags]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
      <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Создание тега</h1>
                <p className="text-slate-500">Автоматическая генерация с наследованием данных.</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <Select 
                label="Выберите шаблон"
                options={filteredTemplates.map(t => ({ value: t.id, label: t.name }))}
                value={selectedTemplateId}
                onChange={e => { setSelectedTemplateId(e.target.value); setFormData({}); setQuantity(1); setHierarchyParentId(''); }}
            />

            {selectedTemplate && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    
                    {/* Dynamic Fields */}
                    {selectedTemplate.blocks.map(block => {
                        if (block.type === 'separator' || block.isAutoIncrement || (block.type === 'text' && !block.isSuffix)) return null;
                        
                        // Dictionary Blocks
                        if (block.type === 'dictionary') {
                             if (block.categoryId === 'Проект' || block.categoryId === 'Project') return null;
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
                        
                        // Suffix Block
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
                            {quantity > 1 && batchPreviewTags.length > 0 && (
                                <div className="mt-2 text-xs text-slate-500 font-mono">
                                    {batchPreviewTags.slice(1).map((tag, idx) => (
                                        <div key={idx} className="opacity-70">{tag}</div>
                                    ))}
                                    {quantity > 5 && <div className="opacity-50">...и еще {quantity - 5}</div>}
                                </div>
                            )}
                         </div>
                         <Button onClick={handleGenerate} icon={<Wand2 size={18} />}>Создать</Button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Results Panel */}
      <div className={`bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center h-full overflow-y-auto custom-scrollbar ${lastGenerated.length === 0 ? 'justify-center' : 'justify-start'}`}>
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
    </div>
  );
};