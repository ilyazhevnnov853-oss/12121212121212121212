import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { LibraryTemplate, DictionaryItem } from '../types';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { ArrowRight, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react';

interface ImportWizardModalProps {
    template: LibraryTemplate;
    onClose: () => void;
    onComplete: () => void;
}

export const ImportWizardModal: React.FC<ImportWizardModalProps> = ({ template, onClose, onComplete }) => {
    const { dictionaries, importLibraryTemplate, addDictionaryItem, currentProjectId } = useStore();
    const [step, setStep] = useState(1);
    
    // Identify blocks that need mapping
    const requiredMappings = useMemo(() => {
        const cats = new Set<string>();
        template.blocks.forEach(b => {
            if (b.type === 'dictionary' && b.categoryId) {
                cats.add(b.categoryId);
            }
        });
        return Array.from(cats);
    }, [template]);

    // State for mappings: { "AbstractCategory": "ProjectDictionaryCategory" }
    const [mappings, setMappings] = useState<Record<string, string>>({});
    
    // State for creating new dictionaries on the fly
    const [newDicts, setNewDicts] = useState<Record<string, boolean>>({});

    const handleMappingChange = (abstract: string, value: string) => {
        if (value === '_CREATE_NEW_') {
            setMappings(prev => ({ ...prev, [abstract]: abstract })); // Map to same name
            setNewDicts(prev => ({ ...prev, [abstract]: true }));
        } else {
            setMappings(prev => ({ ...prev, [abstract]: value }));
            setNewDicts(prev => ({ ...prev, [abstract]: false }));
        }
    };

    const handleImport = () => {
        // 1. Create any new dictionaries if requested
        Object.keys(newDicts).forEach(abstract => {
            if (newDicts[abstract]) {
                // Check if it already exists to avoid dupes (though logic above handles it)
                const exists = dictionaries.some(d => d.category === abstract && d.projectId === currentProjectId);
                if (!exists) {
                     // Add a dummy item to initialize the category in the sidebar
                     // In real app, we might just define the category metadata
                     addDictionaryItem({
                         id: crypto.randomUUID(),
                         category: abstract,
                         code: '00',
                         value: 'Example',
                         description: 'Auto-created from import'
                     });
                }
            }
        });

        // 2. Import Template
        importLibraryTemplate(template.id, mappings);
        onComplete();
    };

    const uniqueProjectCategories = Array.from(new Set(dictionaries.map(d => d.category)));

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Мастер импорта стандарта</h3>
                        <p className="text-sm text-slate-500">{template.name}</p>
                    </div>
                    <div className="flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
                                <AlertTriangle className="shrink-0 mt-0.5" size={18}/>
                                <p>Этот шаблон использует <b>{requiredMappings.length}</b> справочников. Вам необходимо сопоставить их с существующими справочниками вашего проекта или создать новые.</p>
                            </div>

                            <div className="space-y-4">
                                {requiredMappings.map(abstract => (
                                    <div key={abstract} className="grid grid-cols-2 gap-4 items-center p-4 border border-slate-200 rounded-lg">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Требуется в стандарте</span>
                                            <div className="flex items-center gap-2 font-medium text-slate-800">
                                                <BookOpen size={16} className="text-slate-400"/>
                                                {abstract}
                                            </div>
                                        </div>
                                        <div>
                                             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ваш проект</span>
                                             <select 
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newDicts[abstract] ? '_CREATE_NEW_' : (mappings[abstract] || '')}
                                                onChange={(e) => handleMappingChange(abstract, e.target.value)}
                                             >
                                                 <option value="" disabled>-- Выберите --</option>
                                                 <option value="_CREATE_NEW_" className="font-bold text-blue-600">+ Создать "{abstract}"</option>
                                                 <optgroup label="Существующие">
                                                     {uniqueProjectCategories.map(cat => (
                                                         <option key={cat} value={cat}>{cat}</option>
                                                     ))}
                                                 </optgroup>
                                             </select>
                                        </div>
                                    </div>
                                ))}
                                {requiredMappings.length === 0 && (
                                    <p className="text-center text-slate-500 py-8">Справочники не требуются. Можно импортировать напрямую.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32}/>
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-2">Все готово!</h4>
                            <p className="text-slate-500 max-w-sm mx-auto">Шаблон будет добавлен в ваш проект. Вы сможете использовать его в генераторе тегов немедленно.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <Button variant="secondary" onClick={onClose}>Отмена</Button>
                    {step === 1 ? (
                        <Button 
                            onClick={() => setStep(2)} 
                            disabled={requiredMappings.some(m => !mappings[m])}
                            icon={<ArrowRight size={16}/>}
                        >
                            Далее
                        </Button>
                    ) : (
                        <Button onClick={handleImport}>Импортировать</Button>
                    )}
                </div>
            </div>
        </div>
    );
};