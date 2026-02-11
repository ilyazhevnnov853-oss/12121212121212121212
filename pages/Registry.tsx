import React, { useState } from 'react';
import { useStore } from '../store';
import { Tag, TagStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Filter, Trash2, Edit3, X, Copy } from 'lucide-react';

export const Registry: React.FC = () => {
  const { tags, deleteTag, updateTag } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  // Filter Logic
  const filteredTags = tags.filter(t => 
    t.fullTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.status.includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот тег?')) {
        deleteTag(id);
        if (selectedTag?.id === id) setSelectedTag(null);
    }
  };

  const getStatusColor = (status: TagStatus) => {
    switch(status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'draft': return 'bg-slate-100 text-slate-600';
        case 'archived': return 'bg-slate-200 text-slate-500 line-through';
        default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: TagStatus) => {
    switch(status) {
        case 'active': return 'Активен';
        case 'draft': return 'Черновик';
        case 'review': return 'Проверка';
        case 'approved': return 'Утвержден';
        case 'archived': return 'Архив';
        default: return status;
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Main List */}
      <div className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         {/* Toolbar */}
         <div className="p-4 border-b border-slate-200 flex justify-between items-center gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Поиск тегов..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <Button variant="secondary" icon={<Filter size={18} />}>Фильтр</Button>
         </div>

         {/* Table */}
         <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Номер тега</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Статус</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Создан</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Действия</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {filteredTags.map(tag => (
                        <tr 
                            key={tag.id} 
                            onClick={() => setSelectedTag(tag)}
                            className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedTag?.id === tag.id ? 'bg-blue-50' : ''}`}
                        >
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-slate-800">{tag.fullTag}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(tag.status)}`}>
                                    {getStatusLabel(tag.status)}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {new Date(tag.createdAt).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }} className="text-slate-400 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>

      {/* Detail SlideOver */}
      {selectedTag && (
        <div className="w-96 bg-white shadow-xl border-l border-slate-200 flex flex-col transition-all">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                <div>
                    <h2 className="text-xl font-bold font-mono text-slate-900">{selectedTag.fullTag}</h2>
                    <p className="text-xs text-slate-500 mt-1">ID: {selectedTag.id}</p>
                </div>
                <button onClick={() => setSelectedTag(null)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                
                {/* Status Control */}
                <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Статус</label>
                    <select 
                        className="w-full border border-slate-300 rounded p-2 text-sm"
                        value={selectedTag.status}
                        onChange={(e) => updateTag(selectedTag.id, { status: e.target.value as TagStatus })}
                    >
                        <option value="draft">Черновик</option>
                        <option value="active">Активен</option>
                        <option value="review">На проверке</option>
                        <option value="approved">Утвержден</option>
                        <option value="archived">Архив</option>
                    </select>
                </div>

                {/* Structure Breakdown */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Структура</h3>
                    <div className="space-y-2">
                        {Object.entries(selectedTag.parts).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                                <span className="text-slate-500">Блок {key.slice(0,4)}...</span>
                                <span className="font-mono font-medium">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Инженерные заметки</label>
                    <textarea 
                        className="w-full border border-slate-300 rounded p-2 text-sm h-24"
                        placeholder="Добавьте примечания..."
                        value={selectedTag.notes || ''}
                        onChange={(e) => updateTag(selectedTag.id, { notes: e.target.value })}
                    />
                </div>

                 {/* Actions */}
                 <div className="pt-4 flex gap-2">
                    <Button variant="secondary" className="w-full" icon={<Copy size={16}/>}>Клон</Button>
                    <Button variant="danger" className="w-full" onClick={() => handleDelete(selectedTag.id)}>Удалить</Button>
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};