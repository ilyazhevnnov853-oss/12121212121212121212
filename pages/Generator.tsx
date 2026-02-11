import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Template, Tag, TemplateBlock } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Wand2, AlertTriangle, CheckCircle, QrCode, Printer, Layers, ArrowRight } from 'lucide-react';

export const Generator: React.FC = () => {
  const { templates, dictionaries, tags, addTags, getNextNumber } = useStore();
  
  // Selection State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({}); // blockId -> value
  const [quantity, setQuantity] = useState<number>(1);
  const [lastGenerated, setLastGenerated] = useState<Tag[]>([]);
  
  // Generation Mode: 'sequence' (01, 02) or 'parallel' (01A, 01B)
  const [generationMode, setGenerationMode] = useState<'sequence' | 'parallel'>('sequence');

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Helper to filter dictionary items for a specific block
  const getDictOptions = (block: TemplateBlock) => {
    return dictionaries
        .filter(d => d.category === block.categoryId)
        .map(d => ({ value: d.code, label: `${d.code} - ${d.value}` }));
  };

  // --- Real-time Tag Preview & Validation Logic ---
  
  const calculatePrefix = () => {
    if (!selectedTemplate) return '';
    let prefix = '';
    for (const block of selectedTemplate.blocks) {
        if (block.isAutoIncrement) break; 
        if (block.isSuffix) break; // Suffix usually comes after number, but checking just in case
        
        if (block.type === 'separator') prefix += block.value;
        if (block.type === 'text' && !block.isSuffix) prefix += block.value;
        if (block.type === 'dictionary') prefix += formData[block.id] || '?';
        if (block.type === 'parent') {
             // Logic to strip parent tag if needed? Or simply append. 
             // PDH2 Example: Parent is P-32001, Motor is PM-32001. 
             // Template for Motor has Text 'M' then Parent.
             // If parent block value is 'P-32001', we might need logic to strip 'P-'.
             // For universal usage, we assume the user picks the right template structure or inputs the right data.
             prefix += formData[block.id] || '?';
        }
    }
    return prefix;
  };

  // Identify iteratable blocks
  const suffixBlock = selectedTemplate?.blocks.find(b => b.isSuffix);
  const numBlock = selectedTemplate?.blocks.find(b => b.isAutoIncrement);

  const previewTag = useMemo(() => {
    if (!selectedTemplate) return '';
    const prefix = calculatePrefix();
    
    // Simple preview logic
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

  // --- Actions ---

  const handleGenerate = () => {
    if (!selectedTemplate) return;

    const newTags: Tag[] = [];
    const prefix = calculatePrefix();
    
    // Determine Start Values
    let startNum = numBlock ? getNextNumber(prefix, numBlock.padding || 3) : 0;
    const startChar = 'A'; // For suffix iteration

    for (let i = 0; i < quantity; i++) {
        let fullTag = '';
        const parts = { ...formData };
        
        // Parallel Mode Logic (PDH2: P-101A, P-101B)
        // Number stays same, Suffix changes.
        // NOTE: This assumes startNum is the SAME for all.
        // Sequence Mode Logic (PDH2: P-101, P-102)
        // Number increments, Suffix is empty or fixed from input.

        let currentNum = startNum;
        let currentSuffix = formData[suffixBlock?.id || ''] || '';

        if (generationMode === 'sequence') {
            if (numBlock) {
                currentNum = startNum + i;
            }
        } else if (generationMode === 'parallel' && suffixBlock) {
            // Iterate A, B, C...
            currentSuffix = String.fromCharCode(startChar.charCodeAt(0) + i);
        }

        // Construct Tag
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
            alert(`Обнаружен дубликат для ${fullTag}. Генерация прервана.`);
            break;
        }

        const newTag: Tag = {
            id: crypto.randomUUID(),
            fullTag,
            parts,
            templateId: selectedTemplate.id,
            status: 'draft',
            parentId: formData['parent_block_id'], 
            createdAt: new Date().toISOString(),
            history: [{ action: 'Создан', user: 'Инженер', timestamp: new Date().toISOString() }]
        };

        newTags.push(newTag);
    }

    if (newTags.length > 0) {
        addTags(newTags);
        setLastGenerated(newTags);
        // Do not clear form data immediately to allow multi-batch gen
    }
  };

  const handlePrint = () => {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
          const content = lastGenerated.map(tag => `
            <div style="border: 2px solid black; padding: 10px; margin: 5px; width: 200px; display: inline-block; font-family: monospace; text-align: center;">
                <h3 style="margin: 0; font-size: 10px;">PDH2 PROJECT TAG</h3>
                <h1 style="margin: 5px 0; font-size: 16px;">${tag.fullTag}</h1>
                <p style="margin: 0; font-size: 8px;">${tag.id}</p>
                <div style="background: #eee; height: 50px; margin-top: 5px; display: flex; align-items: center; justify-content: center;">QR CODE</div>
            </div>
          `).join('');

          printWindow.document.write(`
            <html>
                <head><title>Print Tags</title></head>
                <body>
                    <div style="display: flex; flex-wrap: wrap;">${content}</div>
                </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left: Input Form */}
      <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Генератор тегов</h1>
            <p className="text-slate-500">Создание тегов в соответствии с процедурой нумерации PDH2.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <Select 
                label="Выберите шаблон оборудования"
                options={templates.map(t => ({ value: t.id, label: t.name }))}
                value={selectedTemplateId}
                onChange={e => { setSelectedTemplateId(e.target.value); setFormData({}); setQuantity(1); }}
            />

            {selectedTemplate && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 italic">{selectedTemplate.description}</p>
                    
                    {selectedTemplate.blocks.map(block => {
                        if (block.type === 'separator' || block.isAutoIncrement || (block.type === 'text' && !block.isSuffix)) return null;
                        
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
                                    label="Родительский тег (для привязки)"
                                    placeholder="Например: P-32001"
                                    value={formData[block.id] || ''}
                                    onChange={e => setFormData({ ...formData, [block.id]: e.target.value })}
                                />
                            );
                        }
                        // Manual Suffix Entry (if sequence mode)
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

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-slate-700">Количество и Режим</label>
                        </div>
                        <div className="flex gap-4 mb-4">
                            <button 
                                onClick={() => setGenerationMode('sequence')}
                                className={`flex-1 p-3 rounded-lg border-2 text-left text-xs transition-all ${generationMode === 'sequence' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <span className="font-bold block mb-1">Последовательный</span>
                                01, 02, 03...
                            </button>
                            <button 
                                onClick={() => setGenerationMode('parallel')}
                                disabled={!suffixBlock}
                                className={`flex-1 p-3 rounded-lg border-2 text-left text-xs transition-all ${!suffixBlock ? 'opacity-50 cursor-not-allowed' : ''} ${generationMode === 'parallel' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <span className="font-bold block mb-1">Параллельный (Резерв)</span>
                                01A, 01B, 01C...
                            </button>
                        </div>
                        <Input 
                            type="number" 
                            min={1} 
                            max={20} 
                            value={quantity}
                            onChange={e => setQuantity(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="bg-slate-900 p-4 rounded-lg flex items-center justify-between shadow-lg">
                         <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Предпросмотр (PDH2)</span>
                            <p className="text-xl font-mono text-green-400 font-bold tracking-wide">{previewTag}</p>
                         </div>
                         <Button onClick={handleGenerate} icon={<Wand2 size={18} />}>Создать</Button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Right: Results */}
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
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={handlePrint} icon={<Printer size={16}/>}>Печать</Button>
                        <Button variant="secondary" size="sm" onClick={() => setLastGenerated([])}>Очистить</Button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    {lastGenerated.map(tag => (
                        <div key={tag.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex justify-between items-center group hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500">
                                    <QrCode size={20} />
                                </div>
                                <div>
                                    <p className="text-lg font-mono font-bold text-slate-900">{tag.fullTag}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">ID: {tag.id.slice(0,8)}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">New</span>
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