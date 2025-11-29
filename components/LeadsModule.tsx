
import React, { useState } from 'react';
import { Lead, LeadStatus, FollowUp } from '../types';
import { Mail, Phone, MoreVertical, Plus, Wand2, RefreshCw, ShoppingBag, Globe, DownloadCloud, Box, CreditCard, MapPin, Printer, ArrowUpRight, User, Calendar, CheckSquare, MessageSquare, Clock } from 'lucide-react';
import { generateEmailDraft } from '../geminiService';

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
          // No pending follow up - alert candidate
      ]
  },
];

export const LeadsModule: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'followup'>('details');

  // Follow-up State
  const [newFollowUp, setNewFollowUp] = useState<Partial<FollowUp>>({ type: 'Call', date: new Date().toISOString().split('T')[0] });
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);

  const handleDraftEmail = async (lead: Lead) => {
    // setSelectedLead(lead); // Already selected
    setEmailDraft(''); // Clear previous draft
    setIsGenerating(true);
    
    // Customize prompt based on source
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
    
    // Simulate API fetch delay
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
                    items: [
                        { name: 'Digital Thermometer X200', quantity: 50, price: 17 }
                    ],
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
                    items: [
                        { name: 'Omron BP Monitor', quantity: 2, price: 600 }
                    ],
                    platformFee: 60
                }
            },
            {
                id: `L-IM-${Date.now()+2}`,
                name: 'Dr. Anjali Gupta',
                hospital: 'Gupta Nursing Home',
                source: 'IndiaMART',
                status: LeadStatus.NEW,
                value: 350000,
                lastContact: '10 mins ago',
                productInterest: 'X-Ray Machine 300mA',
                phone: '+91 99009 90099',
                email: 'dr.anjali@guptanursing.com',
                address: '15, Civil Lines, Jaipur, RJ, 302006'
            }
        ];
        
        setLeads(prev => [...newIncomingLeads, ...prev]);
        setIsSyncing(false);
    }, 1500);
  };

  const handleSendToGmail = () => {
    if (!selectedLead) return;
    
    // Default subject if parsing fails
    let subject = `Inquiry regarding ${selectedLead.productInterest}`;
    let body = emailDraft;

    // Attempt to extract Subject line from AI draft
    const subjectMatch = emailDraft.match(/^Subject:\s*(.*)/i);
    if (subjectMatch) {
        subject = subjectMatch[1];
        // Remove Subject line from body to avoid duplication
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
            return {
                ...l,
                followUps: [...(l.followUps || []), followUp]
            };
        }
        return l;
    });

    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === selectedLead.id) || null);
    setShowAddFollowUp(false);
    setNewFollowUp({ type: 'Call', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const toggleFollowUpStatus = (leadId: string, followUpId: string) => {
      const updatedLeads = leads.map(l => {
          if (l.id === leadId) {
              return {
                  ...l,
                  followUps: l.followUps?.map(f => f.id === followUpId ? { ...f, status: f.status === 'Pending' ? 'Completed' : 'Pending' } as FollowUp : f)
              };
          }
          return l;
      });
      setLeads(updatedLeads);
      if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(updatedLeads.find(l => l.id === leadId) || null);
      }
  };

  const getSourceIcon = (source: string) => {
      switch(source) {
          case 'Amazon': return <ShoppingBag size={14} className="text-orange-600" />;
          case 'Flipkart': return <ShoppingBag size={14} className="text-blue-600" />;
          case 'IndiaMART': return <Globe size={14} className="text-red-600" />;
          default: return <Globe size={14} className="text-slate-500" />;
      }
  };

  const getSourceStyle = (source: string) => {
      switch(source) {
          case 'Amazon': return 'bg-orange-50 text-orange-700 border-orange-200';
          case 'Flipkart': return 'bg-blue-50 text-blue-700 border-blue-200';
          case 'IndiaMART': return 'bg-red-50 text-red-700 border-red-200';
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
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-1">
      
      {/* Header / Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex gap-3">
            <button 
                onClick={handleSyncLeads}
                disabled={isSyncing}
                className="bg-white border border-slate-200 text-slate-700 hover:text-medical-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all">
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> 
                {isSyncing ? 'Syncing Channels...' : 'Sync Channels'}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-200 pl-3">
                <span>Sources:</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span>Amazon</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Flipkart</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>IndiaMART</span>
            </div>
          </div>
          <button className="bg-medical-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm shadow-medical-500/30 flex items-center justify-center gap-2 hover:bg-medical-700">
            <Plus size={16} /> Add Manual Lead
          </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:overflow-hidden lg:min-h-0">
        
        {/* Leads Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-700">Lead / Customer</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Channel</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Interest</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Next Action</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Status</th>
                            <th className="px-6 py-3 font-semibold text-slate-700 text-right">Action</th>
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
                                    className={`cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'bg-medical-50/50' : 'hover:bg-slate-50'}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{lead.name}</div>
                                        <div className="text-xs text-slate-400">{lead.hospital}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getSourceStyle(lead.source)}`}>
                                            {getSourceIcon(lead.source)} {lead.source}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 truncate max-w-[150px]" title={lead.productInterest}>
                                        {lead.productInterest}
                                    </td>
                                    <td className="px-6 py-4">
                                        {nextFollowUp ? (
                                            <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-blue-600'}`}>
                                                <Calendar size={12} />
                                                {nextFollowUp.type} on {nextFollowUp.date}
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-xs italic">No follow-up set</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium 
                                            ${lead.status === 'New' ? 'bg-blue-50 text-blue-700' : 
                                            lead.status === 'Won' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-medical-600">
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
            <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col shrink-0 overflow-hidden max-h-[600px] lg:max-h-none">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{selectedLead.name}</h3>
                            <p className="text-sm text-slate-500">{selectedLead.hospital}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{selectedLead.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 mt-3">
                         <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded hover:text-medical-600 hover:border-medical-200 transition-colors">
                            <Phone size={14}/> Call
                         </a>
                         <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded hover:text-medical-600 hover:border-medical-200 transition-colors">
                            <Mail size={14}/> Email
                         </a>
                    </div>
                    
                    {/* Panel Tabs */}
                    <div className="flex mt-4 border-b border-slate-200">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 pb-2 text-sm font-medium ${activeTab === 'details' ? 'text-medical-600 border-b-2 border-medical-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            Details
                        </button>
                        <button 
                            onClick={() => setActiveTab('followup')}
                            className={`flex-1 pb-2 text-sm font-medium ${activeTab === 'followup' ? 'text-medical-600 border-b-2 border-medical-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            Follow-ups
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    
                    {activeTab === 'details' && (
                        <>
                            {/* Contact Info Card */}
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
                                    <User size={12} /> Contact Details
                                </h4>
                                <div className="flex items-start gap-3">
                                    <Phone size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">Mobile</p>
                                        <p className="text-sm font-medium text-slate-700">{selectedLead.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-slate-500">Email</p>
                                        <p className="text-sm font-medium text-slate-700 truncate">{selectedLead.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">Address</p>
                                        <p className="text-sm font-medium text-slate-700 leading-snug">
                                            {selectedLead.address || selectedLead.orderDetails?.shippingAddress || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Details Card (If Order exists) */}
                            {selectedLead.orderDetails ? (
                                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                                        <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                            <Box size={14} /> Order Summary
                                        </h4>
                                        <span className={`text-xs px-2 py-0.5 rounded border ${selectedLead.orderDetails.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                            {selectedLead.orderDetails.paymentStatus}
                                        </span>
                                    </div>
                                    <div className="p-3 space-y-3">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Items</p>
                                            <div className="bg-white border border-slate-200 rounded text-sm">
                                                {selectedLead.orderDetails.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between p-2 border-b border-slate-100 last:border-0">
                                                        <span>{item.quantity}x {item.name}</span>
                                                        <span className="font-medium">${item.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1"><MapPin size={10} /> Shipping To</p>
                                                <p className="text-xs text-slate-700 leading-relaxed bg-white p-2 rounded border border-slate-200">
                                                    {selectedLead.orderDetails.shippingAddress}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                            <button className="text-xs bg-white border border-slate-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-50">
                                                <Printer size={12} /> Invoice
                                            </button>
                                            <button className="text-xs bg-medical-600 text-white px-2 py-1 rounded hover:bg-medical-700">
                                                Process Order
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-sm">
                                    <p className="font-semibold mb-1">Lead Interest</p>
                                    <p>{selectedLead.productInterest}</p>
                                    <p className="text-xs mt-1 opacity-70">Source: {selectedLead.source}</p>
                                </div>
                            )}

                            {/* AI Email Generator */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                        <Wand2 size={14} className="text-purple-500" /> AI Email Assistant
                                    </h4>
                                </div>
                                
                                {emailDraft ? (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                                        <pre className="whitespace-pre-wrap font-sans text-slate-600 mb-3">{emailDraft}</pre>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleSendToGmail}
                                                className="flex-1 bg-medical-600 text-white py-1.5 rounded text-xs font-medium hover:bg-medical-700 flex items-center justify-center gap-2">
                                                <Mail size={14} /> Compose in Gmail
                                            </button>
                                            <button 
                                                onClick={() => handleDraftEmail(selectedLead)}
                                                className="px-3 bg-white border border-slate-300 rounded text-slate-600 hover:text-medical-600"
                                                title="Regenerate Draft">
                                                <RefreshCw size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleDraftEmail(selectedLead)}
                                        disabled={isGenerating}
                                        className="w-full py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-medical-600 hover:border-medical-200 hover:bg-medical-50 transition-all flex flex-col items-center justify-center gap-2"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw size={20} className="animate-spin text-medical-500" />
                                                <span className="text-xs">Drafting email...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 size={20} />
                                                <span className="text-xs font-medium">Generate Sales Email</span>
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
                                <h4 className="font-semibold text-sm text-slate-700">Scheduled Actions</h4>
                                <button 
                                    onClick={() => setShowAddFollowUp(!showAddFollowUp)}
                                    className="text-xs bg-medical-50 text-medical-600 px-2 py-1 rounded border border-medical-100 hover:bg-medical-100 flex items-center gap-1">
                                    <Plus size={12} /> Add New
                                </button>
                            </div>

                            {showAddFollowUp && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm space-y-3 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Type</label>
                                            <select 
                                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
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
                                            <label className="text-xs text-slate-500 block mb-1">Date</label>
                                            <input 
                                                type="date"
                                                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                                                value={newFollowUp.date}
                                                onChange={(e) => setNewFollowUp({...newFollowUp, date: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Notes</label>
                                        <textarea 
                                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                                            rows={2}
                                            placeholder="Discuss quotation..."
                                            value={newFollowUp.notes || ''}
                                            onChange={(e) => setNewFollowUp({...newFollowUp, notes: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleAddFollowUp}
                                            className="flex-1 bg-medical-600 text-white py-1.5 rounded text-xs hover:bg-medical-700">
                                            Save Reminder
                                        </button>
                                        <button 
                                            onClick={() => setShowAddFollowUp(false)}
                                            className="px-3 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 text-xs">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {selectedLead.followUps && selectedLead.followUps.length > 0 ? (
                                    selectedLead.followUps.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(fu => (
                                        <div key={fu.id} className={`p-3 rounded-lg border ${fu.status === 'Completed' ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`p-1.5 rounded-full ${
                                                        fu.type === 'Call' ? 'bg-blue-100 text-blue-600' : 
                                                        fu.type === 'Meeting' ? 'bg-purple-100 text-purple-600' :
                                                        'bg-orange-100 text-orange-600'
                                                    }`}>
                                                        {fu.type === 'Call' && <Phone size={10} />}
                                                        {fu.type === 'Meeting' && <User size={10} />}
                                                        {fu.type === 'Email' && <Mail size={10} />}
                                                        {(fu.type === 'Site Visit' || fu.type === 'WhatsApp') && <MessageSquare size={10} />}
                                                    </span>
                                                    <span className={`text-sm font-medium ${fu.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                                        {fu.type}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Calendar size={10} /> {fu.date}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-2 pl-7">{fu.notes}</p>
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={() => toggleFollowUpStatus(selectedLead.id, fu.id)}
                                                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                                        fu.status === 'Pending' 
                                                        ? 'text-green-600 hover:bg-green-50' 
                                                        : 'text-slate-400 hover:text-slate-600'
                                                    }`}>
                                                    {fu.status === 'Pending' ? (
                                                        <><CheckSquare size={12} /> Mark Done</>
                                                    ) : (
                                                        <><RefreshCw size={12} /> Re-open</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <Clock size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">No follow-ups scheduled.</p>
                                        <button onClick={() => setShowAddFollowUp(true)} className="text-xs text-medical-600 hover:underline mt-1">Schedule one now</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};