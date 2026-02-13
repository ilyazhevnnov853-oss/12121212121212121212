import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { AbstractAssembly, AbstractComponent } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ArrowRight, Package, CheckCircle, ListTree, Calculator } from 'lucide-react';

interface AssemblyImportModalProps {
    onClose: () => void;
}

export const AssemblyImportModal: React.FC<AssemblyImportModalProps> = ({ onClose }) => {
    const { globalAssemblies, instantiateAssembly } = useStore();
    const [step, setStep] = useState(1);
    
    // Step 1: Selection
    const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>('');
    const selectedAssembly = globalAssemblies.find(a => a.id === selectedAssemblyId);

    // Step 2: Definition
    const [rootTag, setRootTag] = useState('');
    
    // Step 3: Preview Data (Flat list of tags to create)
    const [previewTags, setPreviewTags] = useState<{ fullTag: string, parentId?: string, description?: string, componentId: string }[]>([]);

    // Helper: Extract number pattern from root tag
    const extractPattern = (root: string) => {
        // Simple regex to find the last numeric sequence
        const match = root.match(/(\d+)([a-zA-Z]*)$/);
        if (match) {
            return { number: match[1], suffix: match[2] };
        }
        return { number: '', suffix: '' };
    };

    const generatePreview = () => {
        if (!selectedAssembly || !rootTag) return;
        
        const pattern = extractPattern(rootTag);
        const tags: typeof previewTags = [];

        // Recursive generation
        const traverse = (node: AbstractComponent, parentTagId?: string) => {
            // Determine Tag
            let myTag = '';
            
            if (!parentTagId) {
                // I am Root
                myTag = rootTag;
            } else {
                // I am Child
                // Strategy: Use my Prefix + Parent's Number
                // e.g. Parent "AHU-101", My Prefix "M" -> "M-101"
                myTag = `${node.defaultPrefix}-${pattern.number}${pattern.suffix}`;
            }

            // Create entry
            // We use a temporary ID for parent linking in this preview list
            const myTempId = crypto.randomUUID(); 
            
            tags.push({
                fullTag: myTag,
                parentId: parentTagId, // This is the UUID of the parent *Tag* we just generated
                description: node.name,
                componentId: myTempId 
            });

            if (node.children) {
                node.children.forEach(child => traverse(child, myTempId));
            }
        };

        traverse(selectedAssembly.rootComponent);
        setPreviewTags(tags);
        setStep(3);
    };

    const handleConfirm = () => {
       // ... (Logic remains same, just translating UI) ...
    };
    
    // Access full store for direct tag creation
    const { addTags, currentProjectId, currentUser } = useStore();

    const finalImport = () => {
        const timestamp = new Date().toISOString();
        const tags = previewTags.map(pt => ({
            id: pt.componentId,
            projectId: currentProjectId!,
            fullTag: pt.fullTag,
            parts: {}, 
            templateId: 'assembly_generated', 
            status: 'draft' as const,
            parentId: pt.parentId,
            notes: pt.description,
            history: [{ action: 'Импорт Сборки', user: currentUser?.name || 'User', timestamp }],
            createdAt: timestamp
        }));
        
        addTags(tags);
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Package className="text-orange-600"/> Импорт Сборки
                        </h3>
                        <p className="text-sm text-slate-500">Создание оборудования по стандарту библиотеки</p>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    {step === 1 && (
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700">Выберите шаблон сборки</label>
                            <div className="grid grid-cols-1 gap-3">
                                {globalAssemblies.map(asm => (
                                    <div 
                                        key={asm.id}
                                        onClick={() => setSelectedAssemblyId(asm.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${selectedAssemblyId === asm.id ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'bg-white border-slate-200 hover:border-orange-300'}`}
                                    >
                                        <div>
                                            <div className="font-bold text-slate-800">{asm.name}</div>
                                            <div className="text-xs text-slate-500">{asm.description}</div>
                                        </div>
                                        {selectedAssemblyId === asm.id && <CheckCircle className="text-orange-600" size={20}/>}
                                    </div>
                                ))}
                                {globalAssemblies.length === 0 && <p className="text-slate-400 italic">Сборки не найдены в библиотеке.</p>}
                            </div>
                        </div>
                    )}

                    {step === 2 && selectedAssembly && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="font-bold text-slate-700 mb-2">{selectedAssembly.name}</h4>
                                <p className="text-sm text-slate-500">Определите Корневой Тег (Номер Системы). Подкомпоненты будут пронумерованы автоматически на основе этого номера.</p>
                            </div>
                            
                            <div>
                                <Input 
                                    label="Корневой Тег (Номер системы)" 
                                    placeholder="Например: AHU-101 или P-200"
                                    value={rootTag}
                                    onChange={e => setRootTag(e.target.value)}
                                    autoFocus
                                />
                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                    <Calculator size={12}/> Система извлечет номер для нумерации потомков.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <ListTree size={18}/> Предпросмотр ({previewTags.length})
                            </h4>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-2">Тег</th>
                                            <th className="px-4 py-2">Роль</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {previewTags.map((tag) => (
                                            <tr key={tag.componentId}>
                                                <td className="px-4 py-2 font-mono font-bold text-slate-800 flex items-center gap-2">
                                                    {tag.parentId && <span className="w-4 h-[1px] bg-slate-300 inline-block"></span>}
                                                    {tag.fullTag}
                                                </td>
                                                <td className="px-4 py-2 text-slate-500">{tag.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <Button variant="secondary" onClick={onClose}>Отмена</Button>
                    {step === 1 && (
                        <Button onClick={() => setStep(2)} disabled={!selectedAssemblyId} icon={<ArrowRight size={16}/>}>Далее</Button>
                    )}
                    {step === 2 && (
                        <Button onClick={generatePreview} disabled={!rootTag} icon={<ArrowRight size={16}/>}>Предпросмотр</Button>
                    )}
                    {step === 3 && (
                        <Button onClick={finalImport} className="bg-orange-600 hover:bg-orange-700">Подтвердить импорт</Button>
                    )}
                </div>
            </div>
        </div>
    );
};