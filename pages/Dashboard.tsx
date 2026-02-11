import React from 'react';
import { useStore } from '../store';
import { Activity, Database, CheckCircle, Archive, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const { tags, templates } = useStore();

  const activeTags = tags.filter((t) => t.status === 'active').length;
  const archivedTags = tags.filter((t) => t.status === 'archived').length;
  
  // Status Distribution Data
  const statusCounts = tags.reduce((acc, tag) => {
    acc[tag.status] = (acc[tag.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = [
    { name: 'Черновик', value: statusCounts['draft'] || 0, color: '#94a3b8' },
    { name: 'Активен', value: statusCounts['active'] || 0, color: '#2563eb' },
    { name: 'На проверке', value: statusCounts['review'] || 0, color: '#f59e0b' },
    { name: 'Утвержден', value: statusCounts['approved'] || 0, color: '#10b981' },
    { name: 'Архив', value: statusCounts['archived'] || 0, color: '#475569' },
  ];

  // Recent Activity Data (Mock based on history)
  const recentActivity = tags
    .flatMap(t => t.history.map(h => ({ ...h, fullTag: t.fullTag, id: t.id })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Статистика проекта</h1>
        <span className="text-sm text-slate-500">Обновлено: {new Date().toLocaleTimeString('ru-RU')}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Всего тегов" value={tags.length} icon={Database} color="bg-blue-500" />
        <StatCard label="Активные" value={activeTags} icon={CheckCircle} color="bg-green-500" />
        <StatCard label="Шаблоны" value={templates.length} icon={FileText} color="bg-purple-500" />
        <StatCard label="Архив" value={archivedTags} icon={Archive} color="bg-slate-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Распределение по статусам</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" />
            Последняя активность
          </h2>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
                <p className="text-slate-400 text-sm">Нет недавней активности.</p>
            ) : (
                recentActivity.map((log, idx) => (
                    <div key={idx} className="flex flex-col border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                        <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-slate-700">{log.action}</span>
                        <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                        {log.user} изменил <span className="font-mono bg-slate-100 px-1 rounded">{log.fullTag}</span>
                        </p>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};