
import React, { useState } from 'react';
import { SupportTicket, SupportMessage } from '../types';
import { 
    Headset, Plus, Search, Filter, MessageSquare, Clock, AlertCircle, 
    CheckCircle2, X, Send, Wand2, User, Mail, ChevronRight, 
    MoreVertical, Paperclip, RefreshCw, ShieldAlert, Sparkles
} from 'lucide-react';
import { generateSupportReply } from '../geminiService';

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
    },
    {
        id: 'SUP-1003',
        subject: 'Emergency: Dental chair power failure',
        customerName: 'Dr. Reddy',
        customerEmail: 'admin@reddydental.in',
        priority: 'Urgent',
        status: 'Open',
        category: 'Technical',
        createdAt: '2023-10-28 08:30 AM',
        updatedAt: '2023-10-28 08:30 AM',
        messages: [
            { id: 'm4', sender: 'Dr. Reddy', text: 'Chair is not powering on in Room 4. We have patients waiting.', timestamp: '2023-10-28 08:30 AM', isAdmin: false }
        ]
    }
];

export const SupportModule: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // New Ticket State
    const [newTicket, setNewTicket] = useState<Partial<SupportTicket>>({
        priority: 'Medium',
        category: 'Technical'
    });

    // Chat State
    const [replyText, setReplyText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

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

    const updateTicketStatus = (id: string, newStatus: SupportTicket['status']) => {
        const updated = tickets.map(t => t.id === id ? { ...t, status: newStatus } : t);
        setTickets(updated);
        if (selectedTicket?.id === id) {
            setSelectedTicket(updated.find(t => t.id === id) || null);
        }
    };

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.customerName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getPriorityStyle = (p: string) => {
        switch(p) {
            case 'Urgent': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'High': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const getStatusIcon = (s: string) => {
        switch(s) {
            case 'Open': return <AlertCircle size={14} className="text-blue-500" />;
            case 'In Progress': return <Clock size={14} className="text-amber-500" />;
            case 'Resolved': return <CheckCircle2 size={14} className="text-emerald-500" />;
            default: return <X size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
            
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><MessageSquare size={24}/></div>
                    <div><div className="text-2xl font-black text-slate-800">{tickets.length}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</div></div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><ShieldAlert size={24}/></div>
                    <div><div className="text-2xl font-black text-slate-800">{tickets.filter(t => t.priority === 'Urgent').length}</div><div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Urgent Action</div></div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Clock size={24}/></div>
                    <div><div className="text-2xl font-black text-slate-800">{tickets.filter(t => t.status === 'Open').length}</div><div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Awaiting Response</div></div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={24}/></div>
                    <div><div className="text-2xl font-black text-slate-800">4.2h</div><div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Avg. Resolve Time</div></div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                
                {/* Tickets List */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4 items-center bg-slate-50/30">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search tickets..." 
                                className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm outline-none focus:border-medical-500 bg-white"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <select 
                                className="flex-1 sm:flex-none border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none bg-white"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option>All</option>
                                <option>Open</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                            </select>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="bg-medical-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-medical-500/20">
                                <Plus size={18} /> New Ticket
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="divide-y divide-slate-100">
                            {filteredTickets.map(ticket => (
                                <div 
                                    key={ticket.id} 
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`p-5 cursor-pointer transition-all hover:bg-slate-50 flex flex-col sm:flex-row gap-4 sm:items-center ${selectedTicket?.id === ticket.id ? 'bg-medical-50/50 border-l-4 border-medical-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getPriorityStyle(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">#{ticket.id}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">• {ticket.category}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 leading-tight mb-1">{ticket.subject}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <User size={12} /> {ticket.customerName}
                                            <span className="mx-1">•</span>
                                            <Clock size={12} /> Updated {ticket.updatedAt.split(' ')[0]}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                                            ticket.status === 'Open' ? 'bg-white text-blue-600' :
                                            ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-700' :
                                            'bg-emerald-50 text-emerald-700'
                                        }`}>
                                            {getStatusIcon(ticket.status)}
                                            {ticket.status}
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 hidden sm:block" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Detail Panel */}
                {selectedTicket ? (
                    <div className="w-full lg:w-[450px] bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                        {/* Panel Header */}
                        <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white relative">
                            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full lg:hidden">
                                <X size={20} />
                            </button>
                            <h3 className="font-bold text-lg text-slate-800 pr-8">{selectedTicket.subject}</h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <Mail size={14} className="text-slate-400" /> {selectedTicket.customerEmail}
                                </div>
                            </div>
                            <div className="mt-6 flex gap-2">
                                <select 
                                    className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg outline-none"
                                    value={selectedTicket.status}
                                    onChange={e => updateTicketStatus(selectedTicket.id, e.target.value as any)}
                                >
                                    <option>Open</option>
                                    <option>In Progress</option>
                                    <option>Resolved</option>
                                    <option>Closed</option>
                                </select>
                            </div>
                        </div>

                        {/* Thread View */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                            {selectedTicket.messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative ${
                                        msg.isAdmin 
                                            ? 'bg-medical-600 text-white rounded-tr-none' 
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                    }`}>
                                        <p className="text-sm leading-relaxed">{msg.text}</p>
                                        <div className={`text-[9px] mt-2 font-bold uppercase tracking-wider opacity-60 ${msg.isAdmin ? 'text-white' : 'text-slate-400'}`}>
                                            {msg.sender} • {msg.timestamp.split(' ')[1]} {msg.timestamp.split(' ')[2]}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Area */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Response</span>
                                <button 
                                    onClick={handleAiSuggest}
                                    disabled={isGenerating}
                                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                                    {isGenerating ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                    AI Assist
                                </button>
                            </div>
                            <div className="relative">
                                <textarea 
                                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:border-medical-500 outline-none resize-none transition-colors pr-12 min-h-[100px]"
                                    placeholder="Type your response here..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                />
                                <button 
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim()}
                                    className="absolute bottom-3 right-3 p-2 bg-medical-600 text-white rounded-xl shadow-lg shadow-medical-500/30 hover:bg-medical-700 transition-all active:scale-95 disabled:opacity-50">
                                    <Send size={18} />
                                </button>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                    <Paperclip size={18} />
                                </button>
                                <span className="text-[10px] text-slate-300">Customer will be notified via Email & Dashboard.</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 m-2">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                            <Headset size={40} />
                        </div>
                        <h3 className="font-bold text-slate-400">Select a ticket to view details</h3>
                        <p className="text-xs text-slate-300 mt-1">Manage inquiries and support threads.</p>
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-3xl">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Plus className="text-medical-600" /> Create Manual Ticket
                            </h3>
                            <button onClick={() => setShowCreateModal(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Subject *</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-medical-500"
                                    placeholder="Brief description of the issue"
                                    onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Customer Name *</label>
                                    <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-medical-500" 
                                        onChange={e => setNewTicket({...newTicket, customerName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Email Address *</label>
                                    <input type="email" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-medical-500" 
                                        onChange={e => setNewTicket({...newTicket, customerEmail: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Category</label>
                                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                                        value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value as any})}>
                                        <option>Technical</option>
                                        <option>Billing</option>
                                        <option>Sales</option>
                                        <option>General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Priority</label>
                                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                                        value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}>
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                        <option>Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Initial Message</label>
                                <textarea rows={4} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-medical-500 resize-none" placeholder="Enter customer's query..." />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">Cancel</button>
                            <button className="flex-1 bg-medical-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-medical-500/20">Create Ticket</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
