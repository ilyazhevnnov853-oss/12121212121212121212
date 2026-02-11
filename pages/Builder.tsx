import React, { useState } from 'react';
import { useStore } from '../store';
import { BlockType, Template, TemplateBlock } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown, Save } from 'lucide-react';

export const Builder: React.FC = () => {
  const { addTemplate, dictionaries } = useStore();
  
  // Builder State
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  
  // Dictionary Categories for Dropdown
  const dictCategories = Array.from(new Set(dictionaries.map(d => d.category)))
    .map((c: string) => ({ value: c, label: c }));

  const addBlock = (type: BlockType) => {
    const newBlock: TemplateBlock = {
      id: crypto.randomUUID(),
      type,
      // Default values
      value: type === 'separator' ? '-' : '',
      isAutoIncrement: type === 'number' ? true : undefined,
      padding: type === 'number' ? 3 : undefined,
      categoryId: type === 'dictionary' && dictCategories.length > 0 ? dictCategories[0].value : undefined
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const updateBlock = (id: string, updates: Partial<TemplateBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleSave = () => {
    if (!templateName || blocks.length === 0) {
        alert("Пожалуйста, укажите название и добавьте хотя бы один блок.");
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
    // Reset
    setTemplateName('');
    setTemplateDesc('');
    setBlocks([]);
    alert("Шаблон успешно сохранен!");
  };

  // Live Preview Construction
  const previewText = blocks.map(b => {
    if (b.type === 'text') return b.value || '[ТЕКСТ]';
    if (b.type === 'separator') return b.value;
    if (b.type === 'dictionary') return `[${b.categoryId || 'СПРАВОЧНИК'}]`;
    if (b.type === 'number') return '0'.repeat(b.padding || 3);
    if (b.type === 'parent') return '[РОДИТЕЛЬ]';
    return '?';
  }).join('');

  return (
    <div className="h-full flex flex-col space-y-4">
       <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Конструктор шаблонов</h1>
            <p className="text-slate-500">Визуальное проектирование форматов тегов.</p>
        </div>
        <Button onClick={handleSave} icon={<Save size={18} />}>Сохранить</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: Tools */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-fit">
            <h3 className="font-semibold text-slate-700 mb-4">Инструменты</h3>
            <div className="space-y-2">
                <Button variant="secondary" className="w-full justify-start" onClick={() => addBlock('dictionary')}>+ Справочник</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => addBlock('separator')}>+ Разделитель</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => addBlock('number')}>+ Авто-номер</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => addBlock('text')}>+ Статичный текст</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => addBlock('parent')}>+ Родительский тег</Button>
            </div>
        </div>

        {/* Center: Canvas */}
        <div className="lg:col-span-9 flex flex-col space-y-4">
            {/* Header / Meta */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
                <Input label="Название шаблона" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="напр. Механическое оборудование" />
                <Input label="Описание" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder="напр. Стандарт для насосов" />
            </div>

            {/* Live Preview Bar */}
            <div className="bg-slate-800 text-white p-4 rounded-lg flex items-center justify-between font-mono">
                <span className="text-slate-400 text-sm">Предпросмотр:</span>
                <span className="text-xl tracking-widest text-green-400">{previewText || 'Пустой шаблон'}</span>
            </div>

            {/* Block List */}
            <div className="flex-1 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-6 space-y-3 overflow-y-auto" style={{ minHeight: '400px'}}>
                {blocks.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        Добавьте блоки из панели инструментов, чтобы начать.
                    </div>
                )}
                
                {blocks.map((block, index) => (
                    <div key={block.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4 group">
                        <div className="text-slate-400 cursor-move"><GripVertical size={20} /></div>
                        
                        <div className="w-24 font-bold text-xs uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded text-center">
                            {block.type}
                        </div>

                        {/* Config Inputs based on Type */}
                        <div className="flex-1">
                            {block.type === 'separator' && (
                                <Input 
                                    className="w-20 font-mono text-center" 
                                    value={block.value} 
                                    onChange={(e) => updateBlock(block.id, { value: e.target.value })} 
                                    maxLength={1}
                                />
                            )}
                            {block.type === 'text' && (
                                <Input 
                                    placeholder="Значение" 
                                    value={block.value} 
                                    onChange={(e) => updateBlock(block.id, { value: e.target.value })} 
                                />
                            )}
                            {block.type === 'dictionary' && (
                                <Select 
                                    options={dictCategories}
                                    value={block.categoryId}
                                    onChange={(e) => updateBlock(block.id, { categoryId: e.target.value })}
                                />
                            )}
                             {block.type === 'number' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">Знаков:</span>
                                    <Input 
                                        type="number" 
                                        className="w-20"
                                        min={1} 
                                        max={10}
                                        value={block.padding} 
                                        onChange={(e) => updateBlock(block.id, { padding: parseInt(e.target.value) })} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => moveBlock(index, 'up')}><ArrowUp size={16}/></Button>
                            <Button variant="ghost" size="sm" onClick={() => moveBlock(index, 'down')}><ArrowDown size={16}/></Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeBlock(block.id)}><Trash2 size={16}/></Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};