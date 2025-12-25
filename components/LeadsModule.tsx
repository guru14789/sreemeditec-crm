
import React, { useState } from 'react';
import { Lead, LeadStatus, FollowUp } from '../types';
import { Mail, Phone, MoreVertical, Plus, Wand2, RefreshCw, ShoppingBag, Globe, DownloadCloud, Box, CreditCard, MapPin, Printer, ArrowUpRight, User, Calendar, CheckSquare, MessageSquare, Clock, X, Save, UserPlus } from 'lucide-react';
import { generateEmailDraft } from '../geminiService';
import { useData } from './DataContext';

const MOCK_LEADS: Lead[] = [
  { 
      id: '1', 
      name: 'Dr. Sarah Smith', 
      hospital: 'City General Hospital', 
      source: 'Website', 
      status: LeadStatus.NEW, 
      value: 45000, 
      lastContact: '2023-10-25', 
      productInterest: 'Ultrasound Machine',
      phone: '+91 98765 12345',
      email: 'sarah.smith@citygeneral.com',
      address: '45, Medical Park Rd, Indiranagar, Bangalore, 560038',
      followUps: [
        { id: 'f1', date: '2023-10-28', type: 'Call', notes: 'Discuss pricing for Ultrasound', status: 'Pending' }
      ]
  },
  { 
      id: '2', 
      name: 'Mr. Rajesh Kumar', 
      hospital: 'Apollo Clinic', 
      source: 'IndiaMART', 
      status: LeadStatus.NEGOTIATION, 
      value: 12000, 
      lastContact: '2023-10-24', 
      productInterest: 'ECG Monitor',
      phone: '+91 99887 77665',
      email: 'rajesh.k@apolloclinics.in',
      address: 'Plot 12, Sector 5, Rohini, New Delhi, 110085',
      followUps: [
        { id: 'f2', date: '2023-10-26', type: 'Meeting', notes: 'Demo at clinic', status: 'Completed' },
        { id: 'f3', date: '2023-10-30', type: 'Email', notes: 'Send final quotation', status: 'Pending' }
      ]
  },
  { 
      id: '3', 
      name: 'Dr. Emily Chen', 
      hospital: 'Sunrise Diagnostics', 
      source: 'Referral', 
      status: LeadStatus.QUOTED, 
      value: 85000, 
      lastContact: '2023-10-20', 
      productInterest: 'CT Scanner Refurb',
      phone: '+91 91234 56789',
      email: 'admin@sunrisediagnostics.com',
      address: 'Shop 4, Main Market, Colaba, Mumbai, 400005',
      followUps: [
          { id: 'f4', date: '2023-10-22', type: 'Call', notes: 'Intro call', status: 'Completed' }
      ]
  },
];

export const LeadsModule: React.FC = () => {
  const { addNotification } = useData();
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'followup'>('details');

  // Follow-up State
  const [newFollowUp, setNewFollowUp] = useState<Partial<FollowUp>>({ type: 'Call', date: new Date().toISOString().split('T')[0] });
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);

  // Add Lead State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({
      source: 'Website',
      status: LeadStatus.NEW,
      value: 0
  });

  const handleDraftEmail = async (lead: Lead) => {
    setEmailDraft('');
    setIsGenerating(true);
    let tone = "Professional and persuasive";
    if (lead.source === 'Amazon' || lead.source === 'Flipkart') {
        tone = "Transactional and confirming shipping details";
    }
    const draft = await generateEmailDraft(lead.name, lead.productInterest, tone);
    setEmailDraft(draft);
    setIsGenerating(false);
  };

  const handleSyncLeads = () => {
    setIsSyncing(true);
    setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        const newIncomingLeads: Lead[] = [
            { 
                id: `ORD-AMZ-${Date.now()}`, 
                name: 'MediCare Supplies', 
                hospital: 'Online Order', 
                source: 'Amazon', 
                status: LeadStatus.NEW, 
                value: 850, 
                lastContact: 'Just now', 
                productInterest: 'Digital Thermometer (Bulk)',
                phone: '+91 88800 11223',
                email: 'orders@medicare.com',
                address: 'Plot 42, Tech Park, Hyderabad, TS, 500081',
                orderDetails: {
                    orderId: '404-1239912-9921',
                    orderDate: today,
                    paymentStatus: 'Paid',
                    shippingAddress: 'Plot 42, Tech Park, Hyderabad, TS, 500081',
                    items: [ { name: 'Digital Thermometer X200', quantity: 50, price: 17 } ],
                    platformFee: 45
                }
            },
            {
                id: `ORD-FLK-${Date.now()+1}`, 
                name: 'Suresh Medicals', 
                hospital: 'Retail Pharmacy', 
                source: 'Flipkart', 
                status: LeadStatus.WON, 
                value: 1200, 
                lastContact: '5 mins ago', 
                productInterest: 'BP Monitor Basic',
                phone: '+91 77766 55443',
                email: 'sureshmedicals@gmail.com',
                address: 'Shop 12, Main Market, Bangalore, KA, 560001',
                orderDetails: {
                    orderId: 'OD12993000441',
                    orderDate: today,
                    paymentStatus: 'COD',
                    shippingAddress: 'Shop 12, Main Market, Bangalore, KA, 560001',
                    items: [ { name: 'Omron BP Monitor', quantity: 2, price: 600 } ],
                    platformFee: 60
                }
            }
        ];
        setLeads(prev => [...newIncomingLeads, ...prev]);
        addNotification('Sync Complete', `Successfully imported 2 new orders from Amazon & Flipkart.`, 'success');
        setIsSyncing(false);
    }, 1500);
  };

  const handleSendToGmail = () => {
    if (!selectedLead) return;
    let subject = `Inquiry regarding ${selectedLead.productInterest}`;
    let body = emailDraft;
    const subjectMatch = emailDraft.match(/^Subject:\s*(.*)/i);
    if (subjectMatch) {
        subject = subjectMatch[1];
        body = emailDraft.replace(subjectMatch[0], '').trim();
    }
    const recipient = selectedLead.email || '';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleAddFollowUp = () => {
    if (!selectedLead || !newFollowUp.date || !newFollowUp.notes) return;
    const followUp: FollowUp = {
        id: `FU-${Date.now()}`,
        date: newFollowUp.date,
        type: newFollowUp.type as any,
        notes: newFollowUp.notes,
        status: 'Pending'
    };
    const updatedLeads = leads.map(l => {
        if (l.id === selectedLead.id) {
            return { ...l, followUps: [...(l.followUps || []), followUp] };
        }
        return l;
    });
    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === selectedLead.id) || null);
    setShowAddFollowUp(false);
    setNewFollowUp({ type: 'Call', date: new Date().toISOString().split('T')[0], notes: '' });
    addNotification('Task Created', `New follow-up scheduled for ${selectedLead.name}.`, 'info');
  };

  const toggleFollowUpStatus = (leadId: string, followUpId: string) => {
      const updatedLeads = leads.map(l => {
          if (l.id === leadId) {
              return { ...l, followUps: l.followUps?.map(f => f.id === followUpId ? { ...f, status: f.status === 'Pending' ? 'Completed' : 'Pending' } as FollowUp : f) };
          }
          return l;
      });
      setLeads(updatedLeads);
      if (selectedLead && selectedLead.id === leadId) {
          const lead = updatedLeads.find(l => l.id === leadId);
          setSelectedLead(lead || null);
          const fu = lead?.followUps?.find(f => f.id === followUpId);
          if (fu?.status === 'Completed') {
            addNotification('Task Finished', `Follow-up with ${lead?.name} marked as complete.`, 'success');
          }
      }
  };

  const handleSaveNewLead = () => {
      if (!newLead.name || !newLead.hospital || !newLead.productInterest) {
          alert("Please fill in Name, Hospital/Company, and Product Interest.");
          return;
      }

      const leadToAdd: Lead = {
          id: `L-${Date.now()}`,
          name: newLead.name,
          hospital: newLead.hospital,
          source: newLead.source as any,
          status: newLead.status as any,
          value: Number(newLead.value) || 0,
          lastContact: new Date().toISOString().split('T')[0],
          productInterest: newLead.productInterest,
          phone: newLead.phone,
          email: newLead.email,
          address: newLead.address,
          followUps: []
      };

      setLeads([leadToAdd, ...leads]);
      setShowAddModal(false);
      addNotification('New Lead', `${leadToAdd.name} added from ${leadToAdd.source}.`, 'success');
      setNewLead({ source: 'Website', status: LeadStatus.NEW, value: 0 });
      setSelectedLead(leadToAdd);
  };

  const getSourceIcon = (source: string) => {
      switch(source) {
          case 'Amazon': return <ShoppingBag size={14} className="text-orange-600" />;
          case 'Flipkart': return <ShoppingBag size={14} className="text-blue-600" />;
          case 'IndiaMART': return <Globe size={14} className="text-red-600" />;
          case 'Website': return <Globe size={14} className="text-emerald-600" />;
          default: return <User size={14} className="text-slate-500" />;
      }
  };

  const getSourceStyle = (source: string) => {
      switch(source) {
          case 'Amazon': return 'bg-orange-50 text-orange-700 border-orange-200';
          case 'Flipkart': return 'bg-blue-50 text-blue-700 border-blue-200';
          case 'IndiaMART': return 'bg-red-50 text-red-700 border-red-200';
          case 'Website': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const getNextFollowUp = (lead: Lead) => {
      if (!lead.followUps || lead.followUps.length === 0) return null;
      const pending = lead.followUps
        .filter(f => f.status === 'Pending')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return pending.length > 0 ? pending[0] : null;
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Header / Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex gap-3">
            <button 
                onClick={handleSyncLeads}
                disabled={isSyncing}
                className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 text-slate-700 hover:text-medical-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all hover:shadow-md">
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> 
                {isSyncing ? 'Syncing...' : 'Sync Channels'}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-200 pl-4">
                <span>Sources:</span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-50 text-orange-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Amazon</span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Flipkart</span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Website</span>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-medical-600 to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-medical-500/30 flex items-center justify-center gap-2 hover:shadow-xl transition-all transform active:scale-95">
            <Plus size={18} /> Add Manual Lead
          </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:overflow-hidden lg:min-h-0">
        
        {/* Leads Table */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4">Lead / Customer</th>
                            <th className="px-6 py-4">Channel</th>
                            <th className="px-6 py-4">Interest</th>
                            <th className="px-6 py-4">Next Action</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leads.map((lead) => {
                            const nextFollowUp = getNextFollowUp(lead);
                            const today = new Date().toISOString().split('T')[0];
                            const isOverdue = nextFollowUp && nextFollowUp.date < today;
                            const isToday = nextFollowUp && nextFollowUp.date === today;
                            
                            return (
                                <tr 
                                    key={lead.id} 
                                    onClick={() => setSelectedLead(lead)}
                                    className={`cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-medical-50/60 border-l-4 border-medical-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{lead.name}</div>
                                        <div className="text-xs text-slate-400 font-medium mt-0.5">{lead.hospital}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm ${getSourceStyle(lead.source)}`}>
                                            {getSourceIcon(lead.source)} {lead.source}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 truncate max-w-[150px] font-medium" title={lead.productInterest}>
                                        {lead.productInterest}
                                    </td>
                                    <td className="px-6 py-4">
                                        {nextFollowUp ? (
                                            <div className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-lg w-fit ${isOverdue ? 'bg-red-50 text-red-600' : isToday ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                                <Calendar size={12} />
                                                {nextFollowUp.type} {isToday ? 'Today' : nextFollowUp.date}
                                            </div>
                                        ) : (
                                            <div className="text-slate-300 text-xs italic flex items-center gap-1"><CheckSquare size={12}/> None</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold 
                                            ${lead.status === 'New' ? 'bg-blue-50 text-blue-600' : 
                                            lead.status === 'Won' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 rounded-full hover:bg-white hover:shadow-md text-slate-400 hover:text-medical-600 transition-all">
                                            <ArrowUpRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Details / Action Panel */}
        {selectedLead && (
            <div className="w-full lg:w-[420px] bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 flex flex-col shrink-0 overflow-hidden max-h-[700px] lg:max-h-none animate-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800">{selectedLead.name}</h3>
                            <p className="text-sm font-medium text-slate-500">{selectedLead.hospital}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{selectedLead.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 mt-2">
                         <a href={`tel:${selectedLead.phone}`} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:text-medical-600 hover:border-medical-200 hover:shadow-sm transition-all text-xs font-bold">
                            <Phone size={14}/> Call
                         </a>
                         <a href={`mailto:${selectedLead.email}`} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:text-medical-600 hover:border-medical-200 hover:shadow-sm transition-all text-xs font-bold">
                            <Mail size={14}/> Email
                         </a>
                    </div>
                    
                    {/* Panel Tabs */}
                    <div className="flex mt-6 bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'details' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('followup')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'followup' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Follow-ups
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    
                    {activeTab === 'details' && (
                        <>
                            {/* Contact Info Card */}
                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                                    <User size={12} /> Contact Details
                                </h4>
                                <div className="flex items-start gap-3 p-2 hover:bg-white rounded-xl transition-colors">
                                    <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600 shrink-0"><Phone size={14} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Mobile</p>
                                        <p className="text-sm font-semibold text-slate-700">{selectedLead.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-2 hover:bg-white rounded-xl transition-colors">
                                    <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600 shrink-0"><Mail size={14} /></div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedLead.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-2 hover:bg-white rounded-xl transition-colors">
                                    <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600 shrink-0"><MapPin size={14} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                                        <p className="text-sm font-semibold text-slate-700 leading-snug">
                                            {selectedLead.address || selectedLead.orderDetails?.shippingAddress || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Details Card (If Order exists) */}
                            {selectedLead.orderDetails ? (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                        <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                            <div className="p-1 bg-amber-100 text-amber-600 rounded-md"><Box size={14} /></div> Order Summary
                                        </h4>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedLead.orderDetails.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                            {selectedLead.orderDetails.paymentStatus}
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            {selectedLead.orderDetails.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm py-1">
                                                    <span className="text-slate-600 font-medium"><span className="text-slate-400 mr-2">x{item.quantity}</span>{item.name}</span>
                                                    <span className="font-bold text-slate-800">${item.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button className="flex-1 text-xs bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 font-medium text-slate-600">
                                                <Printer size={14} /> Invoice
                                            </button>
                                            <button className="flex-1 text-xs bg-slate-800 text-white px-3 py-2 rounded-xl hover:bg-slate-900 font-bold">
                                                Process Order
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 text-blue-900 shadow-sm">
                                    <p className="text-xs font-bold uppercase opacity-60 mb-1">Lead Interest</p>
                                    <p className="font-bold">{selectedLead.productInterest}</p>
                                </div>
                            )}

                            {/* AI Email Generator */}
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                        <Wand2 size={16} className="text-purple-500" /> AI Assistant
                                    </h4>
                                </div>
                                
                                {emailDraft ? (
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                                            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 leading-relaxed">{emailDraft}</pre>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleSendToGmail}
                                                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white py-2 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-red-500/20 flex items-center justify-center gap-2 transition-all">
                                                <Mail size={14} /> Gmail
                                            </button>
                                            <button 
                                                onClick={() => handleDraftEmail(selectedLead)}
                                                className="px-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-medical-600 hover:border-medical-200"
                                                title="Regenerate Draft">
                                                <RefreshCw size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleDraftEmail(selectedLead)}
                                        disabled={isGenerating}
                                        className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-medical-600 hover:border-medical-200 hover:bg-medical-50/50 transition-all flex flex-col items-center justify-center gap-2 group"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw size={24} className="animate-spin text-medical-500" />
                                                <span className="text-xs font-semibold">Drafting email...</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-2 bg-slate-100 rounded-full group-hover:bg-medical-100 transition-colors">
                                                    <Wand2 size={20} className="group-hover:text-medical-600" />
                                                </div>
                                                <span className="text-xs font-bold">Generate Sales Email</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'followup' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-slate-700">Timeline</h4>
                                <button 
                                    onClick={() => setShowAddFollowUp(!showAddFollowUp)}
                                    className="text-xs bg-medical-50 text-medical-700 px-3 py-1.5 rounded-lg border border-medical-100 hover:bg-medical-100 flex items-center gap-1 font-bold transition-colors">
                                    <Plus size={12} /> Add New
                                </button>
                            </div>

                            {showAddFollowUp && (
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg text-sm space-y-3 animate-in slide-in-from-top-4 relative z-10">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Type</label>
                                            <select 
                                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-medical-500/20"
                                                value={newFollowUp.type}
                                                onChange={(e) => setNewFollowUp({...newFollowUp, type: e.target.value as any})}
                                            >
                                                <option>Call</option>
                                                <option>Meeting</option>
                                                <option>Email</option>
                                                <option>Site Visit</option>
                                                <option>WhatsApp</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Date</label>
                                            <input 
                                                type="date"
                                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-medical-500/20"
                                                value={newFollowUp.date}
                                                onChange={(e) => setNewFollowUp({...newFollowUp, date: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Notes</label>
                                        <textarea 
                                            className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-medical-500/20 resize-none"
                                            rows={2}
                                            placeholder="Discuss quotation..."
                                            value={newFollowUp.notes || ''}
                                            onChange={(e) => setNewFollowUp({...newFollowUp, notes: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleAddFollowUp}
                                            className="flex-1 bg-medical-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-medical-700">
                                            Save Reminder
                                        </button>
                                        <button 
                                            onClick={() => setShowAddFollowUp(false)}
                                            className="px-4 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-bold">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {selectedLead.followUps && selectedLead.followUps.length > 0 ? (
                                    selectedLead.followUps.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(fu => (
                                        <div key={fu.id} className={`relative pl-10 transition-all ${fu.status === 'Completed' ? 'opacity-60 grayscale' : 'opacity-100'}`}>
                                            <div className={`absolute left-2 top-0 w-4 h-4 rounded-full border-2 border-white ${fu.status === 'Completed' ? 'bg-slate-300' : 'bg-medical-500'} z-10 shadow-sm`}></div>
                                            <div className={`p-3 rounded-2xl border ${fu.status === 'Completed' ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`p-1.5 rounded-lg ${
                                                            fu.type === 'Call' ? 'bg-blue-100 text-blue-600' : 
                                                            fu.type === 'Meeting' ? 'bg-purple-100 text-purple-600' :
                                                            'bg-orange-100 text-orange-600'
                                                        }`}>
                                                            {fu.type === 'Call' && <Phone size={10} />}
                                                            {fu.type === 'Meeting' && <User size={10} />}
                                                            {fu.type === 'Email' && <Mail size={10} />}
                                                            {(fu.type === 'Site Visit' || fu.type === 'WhatsApp') && <MessageSquare size={10} />}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-800">{fu.type}</span>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{fu.date}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-2 leading-relaxed">{fu.notes}</p>
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => toggleFollowUpStatus(selectedLead.id, fu.id)}
                                                        className={`text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                                                            fu.status === 'Pending' 
                                                            ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                                                            : 'text-slate-400 hover:text-slate-600'
                                                        }`}>
                                                        {fu.status === 'Pending' ? (
                                                            <><CheckSquare size={10} /> Mark Done</>
                                                        ) : (
                                                            <><RefreshCw size={10} /> Re-open</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <p className="text-xs">No history yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <UserPlus className="text-medical-600" size={24} /> Add New Lead
                      </h3>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Lead Name *</label>
                          <input 
                              type="text" 
                              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                              placeholder="e.g. Dr. John Doe"
                              value={newLead.name || ''}
                              onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hospital / Company *</label>
                          <input 
                              type="text" 
                              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                              placeholder="e.g. City Hospital"
                              value={newLead.hospital || ''}
                              onChange={(e) => setNewLead({...newLead, hospital: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
                              <input 
                                  type="tel" 
                                  className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                  placeholder="+91..."
                                  value={newLead.phone || ''}
                                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                              <input 
                                  type="email" 
                                  className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                  placeholder="mail@example.com"
                                  value={newLead.email || ''}
                                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Product Interest *</label>
                              <input 
                                  type="text" 
                                  className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                  placeholder="e.g. MRI Machine"
                                  value={newLead.productInterest || ''}
                                  onChange={(e) => setNewLead({...newLead, productInterest: e.target.value})}
                              />
                          </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Est. Value ($)</label>
                              <input 
                                  type="number" 
                                  className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                  value={newLead.value || 0}
                                  onChange={(e) => setNewLead({...newLead, value: Number(e.target.value)})}
                              />
                          </div>
                      </div>
                      <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Source</label>
                           <select 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none appearance-none"
                                value={newLead.source}
                                onChange={(e) => setNewLead({...newLead, source: e.target.value as any})}
                            >
                                <option value="Website">Website</option>
                                <option value="IndiaMART">IndiaMART</option>
                                <option value="Referral">Referral</option>
                                <option value="Walk-in">Walk-in</option>
                                <option value="Amazon">Amazon</option>
                                <option value="Flipkart">Flipkart</option>
                            </select>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
                      <button 
                          onClick={() => setShowAddModal(false)}
                          className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">
                          Cancel
                      </button>
                      <button 
                          onClick={handleSaveNewLead}
                          className="px-6 py-2.5 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                          <Save size={18} /> Save Lead
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
