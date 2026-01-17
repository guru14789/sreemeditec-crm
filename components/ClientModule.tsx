
import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { Users, Search, MapPin, Phone, Mail, FileText, ArrowUpRight, X, Building2, Wallet, Lock, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useData } from './DataContext';

const formatIndianNumber = (num: number) => {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};

export const ClientModule: React.FC = () => {
  const { clients, invoices, addClient, removeClient, addNotification, isAdmin } = useData();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientData, setNewClientData] = useState<Partial<Client>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{id: string, name: string} | null>(null);

  // System Admins bypass the secondary password gate
  useEffect(() => {
    if (isAdmin) {
      setIsAuthenticated(true);
    }
  }, [isAdmin]);

  const verifyPassword = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (password === 'admin') setIsAuthenticated(true);
      else { alert("Incorrect Security Password."); setPassword(''); }
  };

  if (!isAuthenticated && !isAdmin) {
      return (
          <div className="h-full flex items-center justify-center bg-slate-50 p-4">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border p-8 text-center animate-in fade-in zoom-in-95">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-inner"><Lock size={40} /></div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Restricted Access</h2>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed">The Client Database contains sensitive information. Enter password to proceed.</p>
                  <form onSubmit={verifyPassword} className="space-y-4">
                      <input type="password" placeholder="Password" className="w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-blue-500 font-bold" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30">Verify & Access</button>
                  </form>
              </div>
          </div>
      )
  }

  const normalize = (str: string) => (str || '').toLowerCase().trim();
  const getClientTotalRevenue = (clientName: string) => {
    const target = normalize(clientName);
    return invoices.filter(inv => normalize(inv.customerName) === target).reduce((sum, inv) => sum + inv.grandTotal, 0);
  };

  const filteredClients = clients.filter(c => normalize(c.name).includes(normalize(searchQuery)) || normalize(c.id).includes(normalize(searchQuery)));

  const handleSaveClient = async () => {
      if (!newClientData.name) { alert("Name is required."); return; }
      const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timestamp = Date.now().toString().slice(-4);
      const client: Client = {
          id: `CLI-${timestamp}-${shortId}`,
          name: newClientData.name,
          hospital: newClientData.hospital,
          address: newClientData.address || '',
          gstin: newClientData.gstin,
          email: newClientData.email,
          phone: newClientData.phone
      };
      await addClient(client);
      setShowAddModal(false);
      setNewClientData({});
      addNotification('Registry Updated', `Client "${client.name}" successfully indexed.`, 'success');
  };

  const performDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
        await removeClient(pendingDelete.id);
        addNotification('Record Purged', `${pendingDelete.name} has been removed from cloud database.`, 'warning');
        if (selectedClient?.id === pendingDelete.id) setSelectedClient(null);
        setPendingDelete(null);
    } catch (err) {
        console.error("Client deletion error:", err);
        addNotification('Database Error', 'Could not delete record.', 'alert');
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden p-2">
      <div className="p-5 bg-white rounded-3xl shadow-sm border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg"><Users size={24} /></div>
              <div><h2 className="text-xl font-bold text-slate-800">Client Database</h2><p className="text-xs text-slate-500 font-medium">{clients.length} Active Clients</p></div>
          </div>
          <div className="flex gap-3">
              <input type="text" placeholder="Search..." className="pl-4 pr-4 py-2.5 border rounded-xl text-sm font-medium w-64 outline-none focus:border-blue-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)} className="bg-medical-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-medical-700 transition-all">+ Add Client</button>
              )}
          </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border overflow-hidden flex flex-col shadow-sm">
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Hospital</th>
                        <th className="px-6 py-4 text-right">Revenue</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredClients.map(client => (
                          <tr key={client.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedClient(client)}>
                              <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{client.id}</td>
                              <td className="px-6 py-4 font-bold text-slate-800 uppercase tracking-tight">{client.name}</td>
                              <td className="px-6 py-4 font-medium text-slate-600 truncate max-w-[200px]">{client.hospital || '-'}</td>
                              <td className="px-6 py-4 text-right font-black text-emerald-700">₹{formatIndianNumber(getClientTotalRevenue(client.name))}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end items-center gap-1">
                                    {isAdmin && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setPendingDelete({id: client.id, name: client.name}); }}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            title="Delete Client"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div className="p-2 text-slate-300 group-hover:text-blue-600 transition-colors">
                                        <ArrowUpRight size={18} />
                                    </div>
                                </div>
                              </td>
                          </tr>
                      ))}
                      {filteredClients.length === 0 && (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest opacity-30 italic">No Clients Found</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Confirmation Modal */}
      {pendingDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                      <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Confirm Deletion</h3>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                      Permanently remove <b>{pendingDelete.name}</b> from the cloud database? This action is irreversible.
                  </p>
                  <div className="flex gap-3 mt-8">
                      <button 
                        onClick={() => setPendingDelete(null)}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={performDelete}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                      >
                          {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : "Purge Record"}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Add New Client</h3>
                    <button onClick={() => setShowAddModal(false)}><X size={24} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <input type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500" placeholder="Client Name *" value={newClientData.name || ''} onChange={e => setNewClientData({...newClientData, name: e.target.value})} />
                    <input type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500" placeholder="Hospital / Facility" value={newClientData.hospital || ''} onChange={e => setNewClientData({...newClientData, hospital: e.target.value})} />
                    <textarea className="w-full border rounded-xl px-4 py-3 text-sm font-bold resize-none outline-none focus:border-medical-500" rows={3} placeholder="Address *" value={newClientData.address || ''} onChange={e => setNewClientData({...newClientData, address: e.target.value})} />
                    <button onClick={handleSaveClient} className="w-full bg-medical-600 text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Save Client</button>
                </div>
            </div>
        </div>
      )}

      {selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg border-2 border-white shadow-sm uppercase">{selectedClient.name.charAt(0)}</div>
                          <div><h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{selectedClient.name}</h3><p className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedClient.id}</p></div>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-1">Client Profile</h4>
                              <div className="space-y-4 text-sm text-slate-600 font-medium">
                                  <div className="flex items-start gap-2"><MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" /> <span className="whitespace-pre-wrap">{selectedClient.address}</span></div>
                                  <div className="flex items-center gap-2"><Building2 size={16} className="text-blue-500 shrink-0" /> <span className="uppercase">{selectedClient.hospital || 'Private Clinic'}</span></div>
                                  <div className="flex items-center gap-2"><Phone size={16} className="text-blue-500 shrink-0" /> <span>{selectedClient.phone || 'N/A'}</span></div>
                                  <div className="flex items-center gap-2"><Mail size={16} className="text-blue-500 shrink-0" /> <span>{selectedClient.email || 'N/A'}</span></div>
                                  <div className="flex items-center gap-2"><FileText size={16} className="text-blue-500 shrink-0" /> <span className="font-bold">GST: {selectedClient.gstin || 'N/A'}</span></div>
                              </div>
                          </div>
                          <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-inner min-h-[300px] flex flex-col">
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 mb-4">Financial Ledger Summary</h4>
                               <div className="flex-1 flex flex-col items-center justify-center opacity-20 italic text-sm text-slate-400">
                                   <Wallet size={48} className="mb-4 text-slate-300"/>
                                   <p className="font-bold uppercase tracking-widest">No active transactions indexed</p>
                               </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                    {isAdmin && (
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPendingDelete({id: selectedClient.id, name: selectedClient.name}); }}
                            className="px-8 py-3 bg-white border border-rose-200 text-rose-500 font-bold rounded-xl hover:bg-rose-50 transition-colors uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-sm"
                        >
                            <Trash2 size={14} />
                            Delete Record
                        </button>
                    )}
                    <button onClick={() => setSelectedClient(null)} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-colors uppercase text-[10px] tracking-widest shadow-lg">Close Terminal</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
