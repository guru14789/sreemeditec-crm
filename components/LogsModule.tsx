
import React, { useState, useMemo } from 'react';
import { Activity, Search, Clock, Info, FileText, Package, Users, Receipt, Lock } from 'lucide-react';
import { useData } from './DataContext';
import { LogEntry } from '../types';

export const LogsModule: React.FC = () => {
    const { logs, fetchAuditLogs, addLog, hasMoreLogs } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (logs.length === 0) fetchAuditLogs(false);
    }, []);

    const handleRefresh = async () => {
        setIsLoading(true);
        await fetchAuditLogs(false);
        setIsLoading(false);
    };

    const handleLoadMore = async () => {
        if (isLoading) return;
        setIsLoading(true);
        await fetchAuditLogs(true);
        setIsLoading(false);
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
            case 'Leads': return <Users size={14} className="text-medical-500" />;
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
        <div className="h-full flex flex-col gap-3 md:gap-6 relative p-1 md:p-2">
            
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-300 flex flex-col overflow-hidden flex-1">
                {/* Search & Filter Bar */}
                <div className="p-3 md:p-5 border-b border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-slate-50/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-2.5 bg-medical-50 text-medical-600 rounded-xl md:rounded-2xl shadow-sm">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800 uppercase tracking-tight text-base md:text-lg leading-tight">System Audit Logs</h2>
                            <p className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Real-time enterprise activity tracking</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3">
                        <div className="relative group flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-medical-600" size={14} />
                            <input 
                                type="text"
                                placeholder="Search logs..."
                                className="pl-9 pr-4 py-2 md:py-2.5 bg-white border border-slate-300 rounded-lg md:rounded-xl text-xs font-bold focus:outline-none focus:border-medical-500 transition-all w-full md:w-64"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className={`flex-1 md:flex-none p-2 bg-white border border-slate-300 rounded-lg md:rounded-xl text-slate-600 hover:text-medical-600 hover:border-medical-300 transition-all ${isLoading ? 'animate-spin text-medical-600' : ''}`}
                            >
                                <Activity size={16} />
                            </button>

                            <button 
                                onClick={handleExport}
                                className="flex-1 md:flex-none px-3 py-2 bg-medical-50 text-medical-700 border border-medical-100 rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all flex items-center justify-center gap-2"
                            >
                                <FileText size={12} /> <span className="hidden sm:inline">JSON</span>
                            </button>

                            <select 
                                className="flex-[2] md:flex-none px-3 py-2 bg-white border border-slate-300 rounded-lg md:rounded-xl text-[9px] font-black uppercase tracking-widest outline-none focus:border-medical-500 appearance-none pr-7 relative cursor-pointer"
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
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-[#fcfdfd] text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 sticky top-0 z-20 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="px-3 md:px-6 py-2 md:py-4">Time & Actor</th>
                                <th className="px-3 md:px-6 py-2 md:py-4">Category</th>
                                <th className="px-3 md:px-6 py-2 md:py-4 hidden md:table-cell">Event</th>
                                <th className="px-3 md:px-6 py-2 md:py-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 italic-last:bg-slate-50">
                            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-3 md:px-6 py-2 md:py-4">
                                        <div className="flex gap-2 md:gap-3">
                                            <div className="flex flex-col items-center shrink-0">
                                                <div className="text-[10px] md:text-[11px] font-black text-slate-800 leading-none mb-0.5 md:mb-1">{formatTime(log.timestamp).slice(0, 5)}</div>
                                                <div className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{formatDate(log.timestamp).split(',')[0]}</div>
                                            </div>
                                            <div className="w-px h-6 md:h-8 bg-slate-100"></div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] md:text-[11px] font-black text-slate-700 leading-none mb-0.5 md:mb-1 truncate max-w-[80px] md:max-w-none">{log.userName}</div>
                                                <div className="text-[7px] md:text-[9px] font-black text-medical-500 uppercase tracking-[0.1em] leading-none truncate">{log.userRole?.split('_')[1] || log.userRole}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-2 md:py-4">
                                        <div className="flex items-center gap-1.5 md:gap-2 md:px-3 px-1.5 py-0.5 md:py-1 bg-white border border-slate-200 rounded-md md:rounded-lg w-fit shadow-sm">
                                            {getCategoryIcon(log.category)}
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 hidden sm:inline">{log.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-2 md:py-4 hidden md:table-cell">
                                        <div className="text-[11px] font-black text-slate-800 tracking-tight leading-snug">{log.action}</div>
                                    </td>
                                    <td className="px-3 md:px-6 py-2 md:py-4">
                                        <div className="max-w-md">
                                            <p className="text-[10px] md:text-[11px] font-bold text-slate-700 leading-tight md:leading-relaxed italic border-l md:border-l-2 border-slate-100 pl-2 md:pl-3 line-clamp-2 md:line-clamp-none">
                                                <span className="md:hidden font-black text-slate-900 not-italic mr-1">{log.action}:</span>
                                                {log.details}
                                            </p>
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

                    {hasMoreLogs && (
                        <div className="p-4 md:p-6 flex justify-center border-t border-slate-100 bg-slate-50/30">
                            <button 
                                onClick={handleLoadMore}
                                disabled={isLoading}
                                className="px-6 md:px-8 py-2.5 md:py-3 bg-white border border-slate-200 text-medical-600 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-md hover:border-medical-200 transition-all flex items-center gap-2 md:gap-3 disabled:opacity-50"
                            >
                                {isLoading ? <Activity size={14} className="animate-spin" /> : <Clock size={14} />}
                                Load Older Entries
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
