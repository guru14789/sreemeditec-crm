import React, { useMemo, useState } from 'react';
import { useData } from './DataContext';
import { 
    Activity, Clock, AlertTriangle, CheckCircle, 
    Search, Filter, ChevronRight, FileText, 
    Calendar, TrendingUp, ArrowUpRight, Wallet
} from 'lucide-react';
import { Invoice } from '../types';

export const CollectionsDashboard: React.FC = () => {
    const { invoices, addNotification, updateInvoice } = useData();
    const [searchQuery, setSearchQuery] = useState('');

    const outstandingInvoices = useMemo(() => {
        return invoices.filter(inv => 
            (inv.documentType === 'Invoice' || (inv.invoiceNumber || '').startsWith('SM/')) &&
            inv.status !== 'Cancelled' &&
            (inv.grandTotal - (inv.paidAmount || 0)) > 1
        );
    }, [invoices]);

    const calculateAging = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const agingSummary = useMemo(() => {
        const summary = {
            '0-30': { count: 0, amount: 0 },
            '31-60': { count: 0, amount: 0 },
            '61-90': { count: 0, amount: 0 },
            '90+': { count: 0, amount: 0 },
        };

        outstandingInvoices.forEach(inv => {
            const days = calculateAging(inv.date);
            const balance = inv.grandTotal - (inv.paidAmount || 0);

            if (days <= 30) {
                summary['0-30'].count++;
                summary['0-30'].amount += balance;
            } else if (days <= 60) {
                summary['31-60'].count++;
                summary['31-60'].amount += balance;
            } else if (days <= 90) {
                summary['61-90'].count++;
                summary['61-90'].amount += balance;
            } else {
                summary['90+'].count++;
                summary['90+'].amount += balance;
            }
        });

        return summary;
    }, [outstandingInvoices]);

    const totalOutstanding = useMemo(() => {
        return outstandingInvoices.reduce((sum, inv) => sum + (inv.grandTotal - (inv.paidAmount || 0)), 0);
    }, [outstandingInvoices]);

    const filteredInvoices = outstandingInvoices.filter(inv => 
        (inv.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => calculateAging(b.date) - calculateAging(a.date));

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden p-6 bg-slate-50">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
                <StatCard 
                    label="Total Outstanding" 
                    value={`₹${totalOutstanding.toLocaleString()}`} 
                    subtext={`${outstandingInvoices.length} Pending Invoices`}
                    icon={Wallet}
                    color="emerald"
                />
                <StatCard 
                    label="0-30 Days" 
                    value={`₹${agingSummary['0-30'].amount.toLocaleString()}`} 
                    subtext={`${agingSummary['0-30'].count} Invoices`}
                    icon={Activity}
                    color="blue"
                />
                <StatCard 
                    label="31-60 Days" 
                    value={`₹${agingSummary['31-60'].amount.toLocaleString()}`} 
                    subtext={`${agingSummary['31-60'].count} Invoices`}
                    icon={Clock}
                    color="amber"
                />
                <StatCard 
                    label="60+ Days" 
                    value={`₹${(agingSummary['61-90'].amount + agingSummary['90+'].amount).toLocaleString()}`} 
                    subtext={`${agingSummary['61-90'].count + agingSummary['90+'].count} Invoices`}
                    icon={AlertTriangle}
                    color="rose"
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-medical-600 text-white rounded-2xl shadow-lg">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Accounts Receivable Aging</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time collection tracking</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search party or invoice..."
                                className="pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-64 outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 sticky top-0 z-10">
                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Consignee</th>
                                <th className="px-8 py-5">Invoice Details</th>
                                <th className="px-8 py-5 text-right">Invoice Value</th>
                                <th className="px-8 py-5 text-right">Balance</th>
                                <th className="px-8 py-5 text-center">Aging</th>
                                <th className="px-8 py-5 text-center">Status</th>
                                <th className="px-8 py-5">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.map(inv => {
                                const aging = calculateAging(inv.date);
                                const balance = inv.grandTotal - (inv.paidAmount || 0);
                                return (
                                    <tr key={inv.id} className="group hover:bg-slate-50 transition-all">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-800 uppercase leading-none">{inv.customerName}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1.5">{inv.customerHospital || '---'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-medical-600">{inv.invoiceNumber}</span>
                                                    <ArrowUpRight size={10} className="text-slate-300" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 mt-1">{inv.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-black text-slate-400">₹{inv.grandTotal.toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-black text-rose-600">₹{balance.toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className={`text-xs font-black ${aging > 60 ? 'text-rose-600' : aging > 30 ? 'text-amber-600' : 'text-blue-600'}`}>{aging} Days</span>
                                                <div className="w-12 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${aging > 60 ? 'bg-rose-500' : aging > 30 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(100, (aging / 120) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                aging > 60 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                                                aging > 30 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                                {aging > 90 ? 'CRITICAL' : aging > 30 ? 'OVERDUE' : 'REGULAR'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <button 
                                                onClick={() => {
                                                    addNotification('Reminder Sent', `Payment reminder shared with ${inv.customerName}`, 'info');
                                                }}
                                                className="p-2.5 text-slate-400 hover:text-medical-600 hover:bg-medical-50 rounded-xl transition-all"
                                            >
                                                <Calendar size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: string, subtext: string, icon: any, color: 'emerald' | 'blue' | 'amber' | 'rose' }> = ({ label, value, subtext, icon: Icon, color }) => {
    const iconColors = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
    };

    return (
        <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col gap-4 bg-white`}>
            <div className="flex justify-between items-start">
                <div className={`p-3 ${iconColors[color]} text-white rounded-2xl shadow-lg`}>
                    <Icon size={20} />
                </div>
                <ArrowUpRight size={16} className="text-slate-300" />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-2">{subtext}</p>
            </div>
        </div>
    );
};
