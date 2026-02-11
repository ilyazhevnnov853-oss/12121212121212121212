import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Template, Tag, TemplateBlock } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Wand2, AlertTriangle, CheckCircle, QrCode } from 'lucide-react';

export const Generator: React.FC = () => {
  const { templates, dictionaries, tags, addTag, getNextNumber } = useStore();
  
  // Selection State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({}); // blockId -> value
  const [quantity, setQuantity] = useState<number>(1);
  const [lastGenerated, setLastGenerated] = useState<Tag[]>([]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Helper to filter dictionary items for a specific block
  const getDictOptions = (block: TemplateBlock) => {
    return dictionaries
        .filter(d => d.category === block.categoryId)
        .map(d => ({ value: d.code, label: `${d.code} - ${d.value}` }));
  };

  // --- Real-time Tag Preview & Validation Logic ---
  
  // 1. Calculate the "Prefix" part (everything before the auto-number)
  // This is needed to query the store for the next available number.
  const calculatePrefix = () => {
    if (!selectedTemplate) return '';
    let prefix = '';
    for (const block of selectedTemplate.blocks) {
        if (block.isAutoIncrement) break; // Stop at number
        if (block.type === 'separator') prefix += block.value;
        if (block.type === 'text') prefix += block.value;
        if (block.type === 'dictionary') prefix += formData[block.id] || '?';
        if (block.type === 'parent') prefix += formData[block.id] || '?';
    }
    return prefix;
  };

  const previewTag = useMemo(() => {
    if (!selectedTemplate) return '';
    const prefix = calculatePrefix();
    // find the number block
    const numBlock = selectedTemplate.blocks.find(b => b.isAutoIncrement);
    if (!numBlock) return prefix; // No number? just text
    
    // We can't really know the number until we check DB, but we can estimate or show '###'
    // However, for UX, let's try to calculate next number if all required fields are filled.
    const isComplete = selectedTemplate.blocks
        .filter(b => b.type === 'dictionary' || b.type === 'parent')
        .every(b => formData[b.id]);
    
    if (!isComplete) return `${prefix}${'#'.repeat(numBlock.padding || 3)}`;

    const next = getNextNumber(prefix, numBlock.padding || 3);
    const numStr = next.toString().padStart(numBlock.padding || 3, '0');
    return prefix + numStr;

  }, [selectedTemplate, formData, tags]); // Depend on tags to update when new ones added

  // --- Actions ---

  const handleGenerate = () => {
    if (!selectedTemplate) return;

    const newTags: Tag[] = [];
    const prefix = calculatePrefix();
    const numBlock = selectedTemplate.blocks.find(b => b.isAutoIncrement);
    let startNum = numBlock ? getNextNumber(prefix, numBlock.padding || 3) : 0;

    for (let i = 0; i < quantity; i++) {
        let fullTag = prefix;
        const parts = { ...formData };

        if (numBlock) {
             const numStr = (startNum + i).toString().padStart(numBlock.padding || 3, '0');
             fullTag += numStr;
             parts[numBlock.id] = numStr;
        }

        // Check collision (basic)
        if (tags.some(t => t.fullTag === fullTag)) {
            alert(`Обнаружен дубликат для ${fullTag}. Генерация остановлена.`);
            break;
        }

        const newTag: Tag = {
            id: crypto.randomUUID(),
            fullTag,
            parts,
            templateId: selectedTemplate.id,
            status: 'draft',
            parentId: formData['parent_block_id'], // if exists
            createdAt: new Date().toISOString(),
            history: [{ action: 'Создан', user: 'Пользователь', timestamp: new Date().toISOString() }]
        };

        newTags.push(newTag);
    }

    newTags.forEach(t => addTag(t));
    setLastGenerated(newTags);
    setFormData({}); // Reset form
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left: Input Form */}
      <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Генератор тегов</h1>
            <p className="text-slate-500">Создание новых инженерных тегов на основе шаблонов.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <Select 
                label="Выберите шаблон"
                options={templates.map(t => ({ value: t.id, label: t.name }))}
                value={selectedTemplateId}
                onChange={e => { setSelectedTemplateId(e.target.value); setFormData({}); }}
            />

            {selectedTemplate && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    {selectedTemplate.blocks.map(block => {
                        if (block.type === 'separator' || block.type === 'number' || block.type === 'text') return null;
                        
                        if (block.type === 'dictionary') {
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
                        if (block.type === 'parent') {
                             return (
                                <Input
                                    key={block.id}
                                    label="ID Родительского тега"
                                    placeholder="Поиск родителя..."
                                    value={formData[block.id] || ''}
                                    onChange={e => setFormData({ ...formData, [block.id]: e.target.value })}
                                />
                            );
                        }
                        return null;
                    })}

                    <div className="pt-4">
                        <Input 
                            type="number" 
                            label="Количество" 
                            min={1} 
                            max={50} 
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                         <div>
                            <span className="text-xs text-blue-500 font-bold uppercase">Предпросмотр</span>
                            <p className="text-xl font-mono text-blue-900 font-bold tracking-wide">{previewTag}</p>
                         </div>
                         <Button onClick={handleGenerate} icon={<Wand2 size={18} />}>Создать</Button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Right: Results / Shipping Label */}
      <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center min-h-[400px]">
         {lastGenerated.length === 0 ? (
            <div className="text-center text-slate-400">
                <QrCode size={48} className="mx-auto mb-4 opacity-50" />
                <p>Здесь появятся созданные теги.</p>
            </div>
         ) : (
            <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><CheckCircle className="text-green-500" size={20}/> Создано {lastGenerated.length} тегов</h3>
                    <Button variant="secondary" size="sm" onClick={() => setLastGenerated([])}>Очистить</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lastGenerated.map(tag => (
                        <div key={tag.id} className="bg-white border-2 border-slate-800 p-4 rounded shadow-sm relative overflow-hidden group">
                            {/* "Shipping Label" Aesthetic */}
                            <div className="absolute top-2 right-2 text-slate-200 group-hover:text-slate-800 transition-colors">
                                <QrCode size={32} />
                            </div>
                            <p className="text-xs uppercase text-slate-500 font-bold">Инженерный тег</p>
                            <p className="text-xl font-mono font-black text-slate-900 mt-1">{tag.fullTag}</p>
                            <div className="mt-2 text-xs text-slate-400 font-mono">{tag.id.slice(0, 8)}</div>
                        </div>
                    ))}
                </div>
            </div>
         )}
      </div>
    </div>
  );
};