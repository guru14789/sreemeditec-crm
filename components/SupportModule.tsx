import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SupportTicket, SupportMessage } from '../types';
import { 
    Headset, Plus, Search, MessageSquare, Clock, AlertCircle, 
    CheckCircle2, X, Send, User, Mail, ChevronRight, 
    Paperclip, RefreshCw, ShieldAlert, Sparkles, Zap,
    MoreVertical, ArrowUpRight, List, Info, Activity
} from 'lucide-react';
import { generateSupportReply } from '../geminiService';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

const MOCK_TICKETS: SupportTicket[] = [
    {
        id: 'SUP-1001',
        subject: 'Inquiry regarding MRI maintenance schedule',
        customerName: 'Dr. Sarah Smith',
        customerEmail: 'sarah.s@citygeneral.com',
        priority: 'Medium',
        status: 'In Progress',
        category: 'Technical',
        createdAt: '2023-10-25 09:00 AM',
        updatedAt: '2023-10-26 10:30 AM',
        messages: [
            { id: 'm1', sender: 'Dr. Sarah Smith', text: 'When is our next scheduled maintenance for the 1.5T MRI unit?', timestamp: '2023-10-25 09:00 AM', isAdmin: false },
            { id: 'm2', sender: 'Admin', text: 'Hello Dr. Smith, checking your contract details now. It seems it was due last week.', timestamp: '2023-10-26 10:30 AM', isAdmin: true }
        ]
    },
    {
        id: 'SUP-1002',
        subject: 'Billing discrepancy for invoice INV-001',
        customerName: 'Mr. Rajesh Kumar',
        customerEmail: 'rajesh.k@apollo.com',
        priority: 'High',
        status: 'Open',
        category: 'Billing',
        createdAt: '2023-10-27 11:15 AM',
        updatedAt: '2023-10-27 11:15 AM',
        messages: [
            { id: 'm3', sender: 'Mr. Rajesh Kumar', text: 'The GST calculation on my recent invoice seems incorrect. Please review.', timestamp: '2023-10-27 11:15 AM', isAdmin: false }
        ]
    }
];

export const SupportModule: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
    const [viewState, setViewState] = useState<'stock' | 'builder'>('stock');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [replyText, setReplyText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [newTicket, setNewTicket] = useState<Partial<SupportTicket>>({
        priority: 'Medium',
        category: 'Technical',
        subject: '',
        customerName: '',
        customerEmail: '',
        messages: []
    });

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedTicket?.messages]);

    const handleSendReply = () => {
        if (!selectedTicket || !replyText.trim()) return;

        const newMessage: SupportMessage = {
            id: `msg-${Date.now()}`,
            sender: 'Admin',
            text: replyText,
            timestamp: new Date().toLocaleString(),
            isAdmin: true
        };

        const updatedTickets = tickets.map(t => {
            if (t.id === selectedTicket.id) {
                return {
                    ...t,
                    status: t.status === 'Open' ? 'In Progress' : t.status,
                    messages: [...t.messages, newMessage],
                    updatedAt: newMessage.timestamp
                } as SupportTicket;
            }
            return t;
        });

        setTickets(updatedTickets);
        setSelectedTicket(updatedTickets.find(t => t.id === selectedTicket.id) || null);
        setReplyText('');
    };

    const handleAiSuggest = async () => {
        if (!selectedTicket) return;
        setIsGenerating(true);
        const lastCustomerMessage = [...selectedTicket.messages].reverse().find(m => !m.isAdmin);
        const suggest = await generateSupportReply(selectedTicket.subject, lastCustomerMessage?.text || selectedTicket.subject);
        setReplyText(suggest);
        setIsGenerating(false);
    };

    const handleCreateTicket = () => {
        if (!newTicket.subject || !newTicket.customerName) return;
        const ticket: SupportTicket = {
            id: `SUP-${1000 + tickets.length + 1}`,
            subject: newTicket.subject,
            customerName: newTicket.customerName,
            customerEmail: newTicket.customerEmail || '',
            priority: newTicket.priority as any,
            status: 'Open',
            category: newTicket.category as any,
            createdAt: new Date().toLocaleString(),
            updatedAt: new Date().toLocaleString(),
            messages: [{
                id: `m-init-${Date.now()}`,
                sender: newTicket.customerName,
                text: 'Manual Ticket Initialization',
                timestamp: new Date().toLocaleString(),
                isAdmin: false
            }]
        };
        setTickets([ticket, ...tickets]);
        setViewState('stock');
        setNewTicket({ priority: 'Medium', category: 'Technical' });
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 t.customerName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tickets, searchQuery, statusFilter]);

    const getPriorityStyle = (p: string) => {
        switch(p) {
            case 'Urgent': return 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-500/10';
            case 'High': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('stock')} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'stock' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><MessageSquare size={16} /> Console</button>
                <button onClick={() => setViewState('builder')} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><Plus size={16} /> New Case</button>
            </div>

            {viewState === 'stock' ? (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                        <div className="p-5 border-b border-slate-300 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner border border-blue-50"><Headset size={20} /></div>
                                <div><h3 className="font-black text-slate-800 uppercase tracking-tight">Support Desk</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{tickets.length} Active Threads</p></div>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative w-48 sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search cases..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-[11px] font-bold outline-none focus:border-medical-500 transition-all shadow-inner uppercase" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                                <select className="bg-white border border-slate-300 rounded-2xl px-4 text-[10px] font-black uppercase outline-none focus:border-medical-500 transition-all shadow-inner" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All</option><option>Open</option><option>In Progress</option><option>Resolved</option></select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-slate-100">
                                {filteredTickets.map(ticket => (
                                    <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`p-6 cursor-pointer transition-all hover:bg-slate-50 flex items-center gap-6 group ${selectedTicket?.id === ticket.id ? 'bg-medical-50/50 border-l-4 border-medical-500' : 'border-l-4 border-transparent'}`}>
                                        <div className={`w-14 h-14 shrink-0 rounded-[1.25rem] border-2 border-white shadow-xl flex items-center justify-center font-black text-xs uppercase tracking-widest ${getPriorityStyle(ticket.priority)}`}>{ticket.priority.charAt(0)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{ticket.id}</span><span className="w-1 h-1 rounded-full bg-slate-300"></span><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{ticket.category}</span></div>
                                            <h4 className="text-[14px] font-black text-slate-800 uppercase tracking-tight truncate mb-1">{ticket.subject}</h4>
                                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span className="flex items-center gap-1"><User size={12}/> {ticket.customerName}</span>
                                                <span className="flex items-center gap-1"><Clock size={12}/> {ticket.updatedAt.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-4">
                                            <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${ticket.status === 'Open' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm' : ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                {ticket.status === 'Open' ? <AlertCircle size={14}/> : ticket.status === 'In Progress' ? <Clock size={14}/> : <CheckCircle2 size={14}/>} {ticket.status}
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300 group-hover:text-medical-600 group-hover:translate-x-1 transition-all"/>
                                        </div>
                                    </div>
                                ))}
                                {filteredTickets.length === 0 && (
                                    <div className="py-40 text-center opacity-30 flex flex-col items-center"><Zap size={64} className="text-slate-200 mb-6"/><p className="text-[12px] font-black uppercase tracking-[0.6em]">Console Quiet</p></div>
                                )}
                            </div>
                        </div>
                    </div>

                    {selectedTicket ? (
                        <div className="w-full lg:w-[500px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4">
                            <div className="p-8 border-b border-slate-300 bg-slate-50/50 relative">
                                <button onClick={() => setSelectedTicket(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
                                <div className="flex items-center gap-4 mb-4"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${getPriorityStyle(selectedTicket.priority)}`}>{selectedTicket.priority} PRIORITY</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{selectedTicket.id}</span></div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight mb-2">{selectedTicket.subject}</h3>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2"><Mail size={12} className="text-medical-500"/> {selectedTicket.customerEmail}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/20">
                                {selectedTicket.messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] relative ${msg.isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                                            <div className={`px-5 py-4 rounded-[1.5rem] shadow-sm text-[13px] font-bold leading-relaxed ${msg.isAdmin ? 'bg-medical-600 text-white rounded-tr-none shadow-medical-500/10' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>{msg.text}</div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{msg.sender} • {msg.timestamp.split(' ')[1]} {msg.timestamp.split(' ')[2]}</span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-6 bg-white border-t border-slate-200">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Protocol Response</span>
                                    <button onClick={handleAiSuggest} disabled={isGenerating} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-all disabled:opacity-50">{isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Synth</button>
                                </div>
                                <div className="relative group">
                                    <textarea className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-[1.5rem] px-5 py-4 text-[13px] font-bold outline-none focus:bg-white focus:border-medical-500 transition-all pr-14 custom-scrollbar resize-none" placeholder="Draft transmission..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                                    <button onClick={handleSendReply} disabled={!replyText.trim()} className="absolute bottom-4 right-4 p-3 bg-medical-600 text-white rounded-2xl shadow-xl shadow-medical-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"><Send size={20}/></button>
                                </div>
                                <div className="mt-4 flex items-center justify-between"><div className="flex gap-3"><button className="p-2 text-slate-300 hover:text-medical-600 transition-all"><Paperclip size={20}/></button><button className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><Activity size={20}/></button></div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">End-to-End Encrypted Node</p></div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-300 animate-in fade-in">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6 border border-slate-100 shadow-inner"><Headset size={48}/></div>
                            <h3 className="text-lg font-black text-slate-300 uppercase tracking-[0.4em]">Station Awaiting</h3>
                            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Select a thread to engage support protocol</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-10 py-6 justify-between items-center">
                        <div className="flex flex-col"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Manual Case Creation</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Initializing offline support ticket node</p></div>
                        <button onClick={() => setViewState('stock')} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X size={24}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar pb-32">
                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Info size={14} className="text-medical-500" />1. Incident Discovery</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="sm:col-span-3"><FormRow label="Incident Subject *"><input type="text" className="w-full h-[48px] bg-slate-50 border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 uppercase" placeholder="BRIEF DESCRIPTION OF THE CORE ISSUE" value={newTicket.subject || ''} onChange={e => setNewTicket({...newTicket, subject: e.target.value.toUpperCase()})} /></FormRow></div>
                                <FormRow label="Priority Vector"><select className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-xs font-black uppercase" value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></FormRow>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><User size={14} className="text-medical-500" />2. Reporter Profiling</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="sm:col-span-2"><FormRow label="Contact Full Name *"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-bold uppercase" placeholder="REPORTER IDENTITY" value={newTicket.customerName || ''} onChange={e => setNewTicket({...newTicket, customerName: e.target.value})} /></FormRow></div>
                                <div className="sm:col-span-2"><FormRow label="Primary Email Address"><input type="email" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-bold lowercase" placeholder="CONTACT@DOMAIN.COM" value={newTicket.customerEmail || ''} onChange={e => setNewTicket({...newTicket, customerEmail: e.target.value})} /></FormRow></div>
                                <FormRow label="Inquiry Category"><select className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-xs font-black uppercase" value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value as any})}><option>Technical</option><option>Billing</option><option>Sales</option><option>General</option></select></FormRow>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><MessageSquare size={14} className="text-medical-500" />3. Initialization Log</h3>
                            <div className="sm:col-span-4"><FormRow label="Primary Case Documentation"><textarea className="w-full min-h-[120px] bg-white border border-slate-300 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-medical-500 uppercase" placeholder="ENTER DETAILED LOG OF THE ISSUE AS REPORTED..." /></FormRow></div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-10">
                        <button onClick={() => setViewState('stock')} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Abort Creation</button>
                        <button onClick={handleCreateTicket} className="px-16 py-4 bg-gradient-to-r from-medical-600 to-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-medical-500/40 active:scale-95 transition-all hover:brightness-110">Authorize Case Ticket</button>
                    </div>
                </div>
            )}
        </div>
    );
};
