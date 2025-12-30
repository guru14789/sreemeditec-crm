
import React, { useState } from 'react';
import { Client, Invoice } from '../types';
import { Users, Search, MapPin, Phone, Mail, FileText, ArrowUpRight, X, Building2, Wallet, Lock, Smartphone, ShieldCheck, RefreshCw, Plus, Trash2, Save } from 'lucide-react';
import { useData } from './DataContext';

// Helper for Indian Number Formatting
const formatIndianNumber = (num: number) => {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};

export const ClientModule: React.FC = () => {
  const { clients, invoices, addClient, removeClient, addNotification } = useData();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientData, setNewClientData] = useState<Partial<Client>>({});

  // Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [otpStep, setOtpStep] = useState<'initial' | 'sent'>('initial');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  const requestOtp = () => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      setOtpStep('sent');
      // Simulate SMS delay to specific number
      setTimeout(() => alert(`SREE MEDITEC SECURITY: OTP ${code} has been sent to +91 7200021788`), 500);
  };

  const verifyOtp = () => {
      if (enteredOtp === generatedOtp) {
          setIsAuthenticated(true);
      } else {
          alert("Incorrect OTP. Please try again.");
          setEnteredOtp('');
      }
  };

  const handleSaveClient = () => {
      if (!newClientData.name || !newClientData.address) {
          alert("Client Name and Address are required.");
          return;
      }

      const client: Client = {
          id: `CLI-${String(clients.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`,
          name: newClientData.name,
          hospital: newClientData.hospital,
          address: newClientData.address,
          gstin: newClientData.gstin,
          email: newClientData.email,
          phone: newClientData.phone
      };

      addClient(client);
      setShowAddModal(false);
      setNewClientData({});
      addNotification('Registry Updated', `Client "${client.name}" successfully indexed.`, 'success');
  };

  const handleDeleteClient = (id: string, name: string) => {
      if (confirm(`Are you sure you want to permanently delete client "${name}"? This will remove them from the master database.`)) {
          removeClient(id);
          if (selectedClient?.id === id) setSelectedClient(null);
          addNotification('Registry Updated', `Client record for "${name}" has been removed.`, 'warning');
      }
  };

  // Lock Screen Render
  if (!isAuthenticated) {
      return (
          <div className="h-full flex items-center justify-center bg-slate-50 p-4">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-inner">
                      <Lock size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Restricted Access</h2>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                      The Client Database contains sensitive information. 
                      {otpStep === 'sent' 
                        ? <span className="block mt-1 font-bold text-slate-700">Enter the OTP sent to +91 7200021788</span>
                        : "Please verify your identity via OTP sent to your registered number."}
                  </p>
                  
                  {otpStep === 'initial' ? (
                      <button 
                          onClick={requestOtp}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
                      >
                          <Smartphone size={20} /> Send OTP to +91 7200021788
                      </button>
                  ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                          <div className="relative">
                              <input 
                                  type="text" 
                                  placeholder="Enter 4-digit OTP" 
                                  maxLength={4}
                                  className="w-full text-center text-2xl font-mono font-bold tracking-[0.5em] py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors text-slate-700 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                                  value={enteredOtp}
                                  onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                              />
                          </div>
                          <button 
                              onClick={verifyOtp}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95"
                          >
                              <ShieldCheck size={20} /> Verify & Access
                          </button>
                          <button 
                              onClick={() => { setOtpStep('initial'); setEnteredOtp(''); }}
                              className="text-xs text-slate-400 font-bold hover:text-blue-600 underline transition-colors flex items-center justify-center gap-1 mx-auto"
                          >
                              <RefreshCw size={10} /> Resend OTP
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )
  }

  // Calculate total order value for each client
  const getClientTotalRevenue = (clientName: string) => {
    return invoices
      .filter(inv => inv.customerName === clientName)
      .reduce((sum, inv) => sum + inv.grandTotal, 0);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.hospital && c.hospital.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Header */}
      <div className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                  <Users size={24} />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800">Client Database</h2>
                  <p className="text-xs text-slate-500 font-medium">{clients.length} Active Clients</p>
              </div>
          </div>
          
          <div className="flex gap-3">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Search Clients..." 
                      className="pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-medical-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-medical-500/30 flex items-center gap-2 hover:bg-medical-700 transition-all active:scale-95"
              >
                  <Plus size={18} /> Add New Client
              </button>
          </div>
      </div>

      {/* Client List */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4">Client ID</th>
                          <th className="px-6 py-4">Client Name</th>
                          <th className="px-6 py-4">Hospital / Company</th>
                          <th className="px-6 py-4">Contact Info</th>
                          <th className="px-6 py-4 text-right">Total Order Value</th>
                          <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredClients.map(client => {
                          const revenue = getClientTotalRevenue(client.name);
                          return (
                              <tr key={client.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedClient(client)}>
                                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{client.id}</td>
                                  <td className="px-6 py-4 font-bold text-slate-800">{client.name}</td>
                                  <td className="px-6 py-4 font-medium text-slate-600">{client.hospital || '-'}</td>
                                  <td className="px-6 py-4">
                                      <div className="text-xs space-y-1">
                                          {client.phone && <div className="flex items-center gap-1"><Phone size={12} className="text-slate-400"/> {client.phone}</div>}
                                          {client.email && <div className="flex items-center gap-1"><Mail size={12} className="text-slate-400"/> {client.email}</div>}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <span className="font-black text-slate-800 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100">
                                          ₹{formatIndianNumber(revenue)}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.name); }}
                                              className="text-slate-300 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                          <button className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors">
                                              <ArrowUpRight size={18} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manual Client Intake</h3>
                      <button onClick={() => setShowAddModal(false)}><X size={24} className="text-slate-400" /></button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name *</label>
                          <input 
                              type="text" 
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                              placeholder="e.g. Dr. John Doe"
                              value={newClientData.name || ''}
                              onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Clinic Name</label>
                          <input 
                              type="text" 
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                              placeholder="Facility Name"
                              value={newClientData.hospital || ''}
                              onChange={(e) => setNewClientData({...newClientData, hospital: e.target.value})}
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Number (Optional)</label>
                          <input 
                              type="text" 
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase"
                              placeholder="33XXXXX..."
                              value={newClientData.gstin || ''}
                              onChange={(e) => setNewClientData({...newClientData, gstin: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Phone</label>
                              <input 
                                  type="tel" 
                                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                                  placeholder="+91..."
                                  value={newClientData.phone || ''}
                                  onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                              <input 
                                  type="email" 
                                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                                  placeholder="mail@site.com"
                                  value={newClientData.email || ''}
                                  onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                              />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Address *</label>
                          <textarea 
                              rows={3}
                              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all resize-none"
                              placeholder="Full address for billing & service"
                              value={newClientData.address || ''}
                              onChange={(e) => setNewClientData({...newClientData, address: e.target.value})}
                          />
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                      <button onClick={() => setShowAddModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Discard</button>
                      <button onClick={handleSaveClient} className="flex-1 bg-medical-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-medical-700 transition-all shadow-lg shadow-medical-500/30 flex items-center justify-center gap-2">
                          <Save size={16} /> Save Record
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-3xl">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg border-2 border-white shadow-sm">
                              {selectedClient.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-slate-800">{selectedClient.name}</h3>
                              <p className="text-sm font-medium text-slate-500">{selectedClient.id}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
                            className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl border border-rose-100 transition-all active:scale-90"
                            title="Delete Client"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                            <X size={24} />
                        </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          {/* Profile Card */}
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 h-full">
                              <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2 mb-2">Contact Details</h4>
                              
                              <div className="space-y-3">
                                  <div className="flex gap-3">
                                      <Building2 size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                      <div>
                                          <p className="text-xs font-bold text-slate-400 uppercase">Hospital / Company</p>
                                          <p className="text-sm font-medium text-slate-700">{selectedClient.hospital || 'N/A'}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-3">
                                      <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                      <div>
                                          <p className="text-xs font-bold text-slate-400 uppercase">Address</p>
                                          <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{selectedClient.address}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-3">
                                      <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                      <div>
                                          <p className="text-xs font-bold text-slate-400 uppercase">GSTIN</p>
                                          <p className="text-sm font-medium text-slate-700 font-mono">{selectedClient.gstin || 'N/A'}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-3">
                                      <Phone size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                      <div>
                                          <p className="text-xs font-bold text-slate-400 uppercase">Phone</p>
                                          <p className="text-sm font-medium text-slate-700">{selectedClient.phone || 'N/A'}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-3">
                                      <Mail size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                      <div>
                                          <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                                          <p className="text-sm font-medium text-slate-700">{selectedClient.email || 'N/A'}</p>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Order History */}
                          <div className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                      <Wallet size={16} className="text-emerald-600"/> Order History
                                  </h4>
                                  <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                                      Total: ₹{formatIndianNumber(getClientTotalRevenue(selectedClient.name))}
                                  </span>
                              </div>
                              <div className="flex-1 overflow-auto max-h-[300px] custom-scrollbar">
                                  <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                          <tr>
                                              <th className="px-4 py-3">Date</th>
                                              <th className="px-4 py-3">Invoice #</th>
                                              <th className="px-4 py-3 text-right">Amount</th>
                                              <th className="px-4 py-3 text-center">Status</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {invoices
                                              .filter(inv => inv.customerName === selectedClient.name)
                                              .map(inv => (
                                                  <tr key={inv.id} className="hover:bg-slate-50">
                                                      <td className="px-4 py-3 text-slate-500">{inv.date}</td>
                                                      <td className="px-4 py-3 font-medium text-slate-700">{inv.invoiceNumber}</td>
                                                      <td className="px-4 py-3 text-right font-bold text-slate-800">₹{inv.grandTotal.toLocaleString()}</td>
                                                      <td className="px-4 py-3 text-center">
                                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                              inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                              inv.status === 'Partial' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                              inv.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                              'bg-amber-50 text-amber-600 border-amber-100'
                                                          }`}>
                                                              {inv.status}
                                                          </span>
                                                      </td>
                                                  </tr>
                                              ))}
                                          {invoices.filter(inv => inv.customerName === selectedClient.name).length === 0 && (
                                              <tr>
                                                  <td colSpan={4} className="text-center py-8 text-slate-400">No orders found.</td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
                      <button onClick={() => setSelectedClient(null)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm">
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
