import React, { useState } from 'react';
import { useStore } from '../store';
import { LibraryTemplate } from '../types';
import { Button } from './ui/Button';
import { Search, Globe, LayoutTemplate, Download, X } from 'lucide-react';
import { ImportWizardModal } from './ImportWizardModal';

interface LibraryModalProps {
    onClose: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ onClose }) => {
    const { globalLibrary } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<LibraryTemplate | null>(null);
    const [showWizard, setShowWizard] = useState(false);

    const filteredItems = globalLibrary.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (item: any) => {
        setSelectedItem(item);
    };

    const handleStartImport = () => {
        if (selectedItem) setShowWizard(true);
    };

    if (showWizard && selectedItem) {
        return <ImportWizardModal template={selectedItem} onClose={() => setShowWizard(false)} onComplete={() => { setShowWizard(false); onClose(); }} />;
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                             <Globe size={24} />
                         </div>
                         <div>
                             <h2 className="text-xl font-bold text-slate-800">Корпоративная библиотека</h2>
                             <p className="text-xs text-indigo-600 font-medium">Стандарты компании</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar / Filter */}
                    <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <input 
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Поиск..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2">
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Категории</p>
                             {/* Mock Categories Filter - could be dynamic */}
                             {['Все', 'Instrumentation', 'Electrical', 'Mechanical'].map(cat => (
                                 <button key={cat} className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                                     {cat}
                                 </button>
                             ))}
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                        <div className="grid grid-cols-2 gap-4">
                            {filteredItems.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleSelect(item)}
                                    className={`
                                        cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md
                                        ${selectedItem?.id === item.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <LayoutTemplate size={20} className="text-slate-400"/>
                                            <span className="font-bold text-slate-800">{item.name}</span>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{item.category}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
                    <div className="text-sm text-slate-500">
                        {selectedItem ? `Выбран: ${selectedItem.name}` : 'Выберите стандарт для импорта'}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
                        <Button 
                            disabled={!selectedItem} 
                            onClick={handleStartImport}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            icon={<Download size={18}/>}
                        >
                            Импортировать
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};