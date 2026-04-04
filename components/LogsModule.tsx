
import React, { useState, useMemo } from 'react';
import { Activity, Search, Clock, Info, FileText, Package, Users, Receipt, Lock } from 'lucide-react';
import { useData } from './DataContext';
import { LogEntry } from '../types';

export const LogsModule: React.FC = () => {
    const { logs, fetchAuditLogs, addLog } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [daysToFetch, setDaysToFetch] = useState(7);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchAuditLogs(daysToFetch);
        setIsRefreshing(false);
    };

    const handleExport = () => {
        addLog('System', 'Exported Logs', `Audit logs exported to JSON (${filteredLogs.length} records)`);
        const dataStr = JSON.stringify(filteredLogs, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `nirva_audit_logs_${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.details.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
            
            return matchesSearch && matchesCategory;
        });
    }, [logs, searchQuery, categoryFilter]);

    const getCategoryIcon = (category: LogEntry['category']) => {
        switch (category) {
            case 'Attendance': return <Clock size={14} className="text-emerald-500" />;
            case 'Inventory': return <Package size={14} className="text-amber-500" />;
            case 'Leads': return <Users size={14} className="text-indigo-500" />;
            case 'Auth': return <Lock size={14} className="text-rose-500" />;
            case 'Billing': return <Receipt size={14} className="text-teal-500" />;
            case 'Tasks': return <FileText size={14} className="text-blue-500" />;
            default: return <Info size={14} className="text-slate-400" />;
        }
    };

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="h-full flex flex-col gap-6 relative p-2">
            {/* Header / Stats Overlay? No, keep it clean for logs */}
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-300 flex flex-col overflow-hidden flex-1">
                {/* Search & Filter Bar */}
                <div className="p-5 border-b border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-medical-50 text-medical-600 rounded-2xl shadow-sm">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 uppercase tracking-tight text-lg leading-tight">System Audit Logs</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Real-time enterprise activity tracking</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-medical-600" size={16} />
                            <input 
                                type="text"
                                placeholder="Search logs..."
                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:border-medical-500 transition-all w-full sm:w-64"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <button 
                            onClick={handleRefresh}
                            className={`p-2.5 bg-white border border-slate-300 rounded-xl text-slate-600 hover:text-medical-600 hover:border-medical-300 transition-all ${isRefreshing ? 'animate-spin text-medical-600' : ''}`}
                            title="Refresh Logs"
                        >
                            <Activity size={18} />
                        </button>

                        <button 
                            onClick={handleExport}
                            className="px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
                        >
                            <FileText size={14} /> Export JSON
                        </button>

                        <select 
                            className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-medical-500 appearance-none pr-8 relative cursor-pointer"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="All">All Categories</option>
                            <option value="Attendance">Attendance</option>
                            <option value="Inventory">Inventory</option>
                            <option value="Leads">Leads CRM</option>
                            <option value="Auth">Security / Auth</option>
                            <option value="Billing">Billing</option>
                            <option value="Tasks">Tasks</option>
                            <option value="System">System Master</option>
                        </select>

                        <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200">
                             <span className="text-[9px] font-black uppercase text-slate-400">History:</span>
                             <select 
                                className="bg-transparent text-[10px] font-black uppercase text-indigo-600 outline-none"
                                value={daysToFetch}
                                onChange={e => setDaysToFetch(Number(e.target.value))}
                            >
                                <option value={1}>Today</option>
                                <option value={3}>3 Days</option>
                                <option value={7}>7 Days</option>
                                <option value={14}>14 Days</option>
                                <option value={30}>30 Days</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-[#fcfdfd] text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 sticky top-0 z-20 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Time & Actor</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Event Description</th>
                                <th className="px-6 py-4">Specific Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 italic-last:bg-slate-50">
                            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center shrink-0">
                                                <div className="text-[11px] font-black text-slate-800 leading-none mb-1">{formatTime(log.timestamp)}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{formatDate(log.timestamp)}</div>
                                            </div>
                                            <div className="w-px h-8 bg-slate-100"></div>
                                            <div>
                                                <div className="text-[11px] font-black text-slate-700 leading-none mb-1">{log.userName}</div>
                                                <div className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.1em] leading-none">{log.userRole}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg w-fit shadow-sm">
                                            {getCategoryIcon(log.category)}
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{log.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[11px] font-black text-slate-800 tracking-tight leading-snug">{log.action}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-md">
                                            <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic border-l-2 border-slate-100 pl-3 mb-2">
                                                {log.details}
                                            </p>
                                            
                                            {log.beforeValues && log.afterValues && (
                                                <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[9px] font-medium font-mono overflow-auto max-h-32">
                                                    <div className="text-slate-400 mb-1 uppercase tracking-tighter font-black">Field Level Changes:</div>
                                                    {Object.keys({ ...log.beforeValues, ...log.afterValues }).map(key => {
                                                        const before = log.beforeValues[key];
                                                        const after = log.afterValues[key];
                                                        if (JSON.stringify(before) === JSON.stringify(after)) return null;
                                                        if (typeof before === 'object' || typeof after === 'object') return null; // Skip complex objects for readability
                                                        
                                                        return (
                                                            <div key={key} className="flex flex-wrap gap-1 mb-1">
                                                                <span className="text-slate-500 font-bold">{key}:</span>
                                                                <span className="text-rose-500 line-through opacity-70">{String(before || 'None')}</span>
                                                                <span className="text-slate-400">→</span>
                                                                <span className="text-emerald-600 font-bold">{String(after || 'None')}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-300">
                                            <Activity size={48} className="opacity-20" />
                                            <p className="font-black uppercase tracking-[0.3em] text-[10px]">No logs detected</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
