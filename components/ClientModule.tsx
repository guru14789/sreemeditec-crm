
import React, { useState } from 'react';
import { Client } from '../types';
import { Users, Search, MapPin, Phone, Mail, FileText, ArrowUpRight, X, Building2, Wallet, Lock, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useData } from './DataContext';

const formatIndianNumber = (num: number) => {
    if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toString();
};

export const ClientModule: React.FC = () => {
    const { clients, invoices, addClient, updateClient, removeClient, addNotification } = useData();
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newClientData, setNewClientData] = useState<Partial<Client>>({});
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editClientData, setEditClientData] = useState<Partial<Client>>({});

    const verifyPassword = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password === 'admin') setIsAuthenticated(true);
        else { alert("Incorrect Security Password."); setPassword(''); }
    };

    if (!isAuthenticated) {
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
        return invoices
            .filter(inv => normalize(inv.customerName) === target && inv.documentType !== 'Quotation')
            .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    };

    const filteredClients = clients.filter(c => normalize(c.name).includes(normalize(searchQuery)) || normalize(c.id).includes(normalize(searchQuery)));


    const handleSaveClient = async (status: 'Draft' | 'Finalized' = 'Finalized') => {
        if (!newClientData.name || !newClientData.address) {
            alert("Name and Address are mandatory for registry.");
            return;
        }

        const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        const clientId = `CLI-${timestamp}-${shortId}`;

        const client: Client = {
            id: clientId,
            name: newClientData.name,
            hospital: newClientData.hospital || '',
            address: newClientData.address,
            gstin: newClientData.gstin || '',
            email: newClientData.email || '',
            phone: newClientData.phone || '',
            cinNo: newClientData.cinNo || '',
            panNo: newClientData.panNo || '',
            dlNo: newClientData.dlNo || '',
            udyamNo: newClientData.udyamNo || '',
            status: status
        };

        try {
            await addClient(client);
            setShowAddModal(false);
            setNewClientData({});
            addNotification('Registry Updated', `Client "${client.name}" successfully indexed as ${status}.`, 'success');
        } catch (error: any) {
            console.error("Client creation failed:", error);
            alert("System error: Could not save client to cloud. Check connectivity.");
        }
    };

    const handleUpdateClient = async () => {
        if (!selectedClient) return;
        try {
            await updateClient(selectedClient.id, editClientData);
            setSelectedClient({ ...selectedClient, ...editClientData } as Client);
            setIsEditing(false);
            addNotification('Registry Updated', `Client "${selectedClient.name}" updated successfully.`, 'success');
        } catch (error) {
            console.error("Client update failed:", error);
            alert("Failed to update client.");
        }
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
            <div className="p-5 bg-white rounded-3xl shadow-sm border flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg"><Users size={24} /></div>
                    <div><h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Client Registry</h2><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{clients.length} Indexed Entities</p></div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Search entity..." className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium w-full outline-none focus:border-blue-500 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="bg-[#022c22] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2 shrink-0">+ Add Client</button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[2rem] border border-slate-300 overflow-hidden flex flex-col shadow-sm">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 border-b border-slate-300 text-[10px] uppercase font-black tracking-widest text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="px-8 py-5">Entity Information</th>
                                <th className="px-8 py-5">Facility / Hospital</th>
                                <th className="px-8 py-5 text-right">Lifetime Value</th>
                                <th className="px-8 py-5 text-right">Status</th>
                                <th className="px-8 py-5 text-right">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredClients.map(client => (
                                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => { setSelectedClient(client); setEditClientData(client); setIsEditing(false); }}>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-300 uppercase">{client.name.charAt(0)}</div>
                                            <div>
                                                <div className="font-black text-slate-800 text-sm uppercase tracking-tight">{client.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{client.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                            {client.hospital || 'General Practice'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-emerald-700 text-sm">₹{formatIndianNumber(getClientTotalRevenue(client.name))}</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${client.status === 'Draft' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                            {client.status || 'Finalized'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: client.id, name: client.name }); }}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Delete Client"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="p-2 text-slate-300 group-hover:text-blue-600 transition-colors">
                                                <ArrowUpRight size={20} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-black uppercase tracking-[0.2em] opacity-30 italic">No Registry Found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirmation Modal */}
            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
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
                                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 shrink-0"
                            >
                                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : "Purge Record"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Entity Intake</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registering new client to cloud sync</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-200 rounded-xl transition-colors"><X size={28} className="text-slate-400" /></button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name *</label>
                                <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all uppercase" placeholder="Client Name" value={newClientData.name || ''} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Clinic Name</label>
                                <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" placeholder="Facility Name" value={newClientData.hospital || ''} onChange={e => setNewClientData({ ...newClientData, hospital: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all font-mono" placeholder="+91" value={newClientData.phone || ''} onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN Number</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all uppercase font-mono" placeholder="GST Number" value={newClientData.gstin || ''} onChange={e => setNewClientData({ ...newClientData, gstin: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIN NO</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all uppercase font-mono" placeholder="CIN Number" value={newClientData.cinNo || ''} onChange={e => setNewClientData({ ...newClientData, cinNo: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN NO</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all uppercase font-mono" placeholder="PAN Number" value={newClientData.panNo || ''} onChange={e => setNewClientData({ ...newClientData, panNo: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DL no</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all uppercase font-mono" placeholder="DL Number" value={newClientData.dlNo || ''} onChange={e => setNewClientData({ ...newClientData, dlNo: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UDYAM No</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all uppercase font-mono" placeholder="UDYAM Number" value={newClientData.udyamNo || ''} onChange={e => setNewClientData({ ...newClientData, udyamNo: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <input type="email" className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" placeholder="client@example.com" value={newClientData.email || ''} onChange={e => setNewClientData({ ...newClientData, email: e.target.value })} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Address *</label>
                                <textarea className="w-full border border-slate-300 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold resize-none outline-none focus:border-blue-500 transition-all min-h-[100px]" placeholder="Full physical/legal address" value={newClientData.address || ''} onChange={e => setNewClientData({ ...newClientData, address: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-300 flex gap-4 bg-slate-50/50 rounded-b-[2.5rem]">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-white border border-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 active:scale-95 transition-all">Discard</button>
                            <button onClick={() => handleSaveClient('Draft')} className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-amber-700 transition-all active:scale-95">Save as Draft</button>
                            <button onClick={() => handleSaveClient('Finalized')} className="flex-[2] bg-[#022c22] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">Commit Registry</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedClient && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg border-2 border-white shadow-sm uppercase">{selectedClient.name.charAt(0)}</div>
                                <div><h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{selectedClient.name}</h3><p className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedClient.id}</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                {!isEditing && (
                                    <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Edit Profile</button>
                                )}
                                <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors"><X size={24} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name</label>
                                            <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.name || ''} onChange={e => setEditClientData({ ...editClientData, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Clinic</label>
                                            <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.hospital || ''} onChange={e => setEditClientData({ ...editClientData, hospital: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.phone || ''} onChange={e => setEditClientData({ ...editClientData, phone: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN</label>
                                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.gstin || ''} onChange={e => setEditClientData({ ...editClientData, gstin: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIN NO</label>
                                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.cinNo || ''} onChange={e => setEditClientData({ ...editClientData, cinNo: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN NO</label>
                                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.panNo || ''} onChange={e => setEditClientData({ ...editClientData, panNo: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DL no</label>
                                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.dlNo || ''} onChange={e => setEditClientData({ ...editClientData, dlNo: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UDYAM No</label>
                                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.udyamNo || ''} onChange={e => setEditClientData({ ...editClientData, udyamNo: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                            <input type="email" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.email || ''} onChange={e => setEditClientData({ ...editClientData, email: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                                            <textarea className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 min-h-[150px]" value={editClientData.address || ''} onChange={e => setEditClientData({ ...editClientData, address: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                            <select className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500" value={editClientData.status || 'Finalized'} onChange={e => setEditClientData({ ...editClientData, status: e.target.value as any })}>
                                                <option value="Draft">Draft</option>
                                                <option value="Finalized">Finalized</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-300 space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-1">Client Profile</h4>
                                        <div className="space-y-4 text-sm text-slate-600 font-medium">
                                            <div className="flex items-start gap-2 overflow-hidden"><MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" /> <span className="whitespace-pre-wrap break-all flex-1 min-w-0">{selectedClient.address}</span></div>
                                            <div className="flex items-center gap-2 overflow-hidden"><Building2 size={16} className="text-blue-500 shrink-0" /> <span className="uppercase truncate flex-1 min-w-0">{selectedClient.hospital || 'Private Clinic'}</span></div>
                                            <div className="flex items-center gap-2 overflow-hidden"><Phone size={16} className="text-blue-500 shrink-0" /> <span className="truncate flex-1 min-w-0">{selectedClient.phone || 'N/A'}</span></div>
                                            <div className="flex items-center gap-2 overflow-hidden"><Mail size={16} className="text-blue-500 shrink-0" /> <span className="truncate break-all flex-1 min-w-0">{selectedClient.email || 'N/A'}</span></div>
                                            <div className="flex items-center gap-2 overflow-hidden"><FileText size={16} className="text-blue-500 shrink-0" /> <span className="font-bold truncate flex-1 min-w-0">GST: {selectedClient.gstin || 'N/A'}</span></div>
                                            <div className="pt-2 mt-2 border-t border-slate-300 space-y-2">
                                                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest"><span className="text-slate-400">CIN:</span> <span className="font-bold text-slate-800">{selectedClient.cinNo || 'N/A'}</span></div>
                                                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest"><span className="text-slate-400">PAN:</span> <span className="font-bold text-slate-800">{selectedClient.panNo || 'N/A'}</span></div>
                                                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest"><span className="text-slate-400">DL NO:</span> <span className="font-bold text-slate-800">{selectedClient.dlNo || 'N/A'}</span></div>
                                                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest"><span className="text-slate-400">UDYAM:</span> <span className="font-bold text-slate-800">{selectedClient.udyamNo || 'N/A'}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 bg-white rounded-3xl border border-slate-300 p-6 shadow-inner min-h-[300px] flex flex-col">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 mb-4">Financial Ledger Summary</h4>
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-20 italic text-sm text-slate-400">
                                            <Wallet size={48} className="mb-4 text-slate-300" />
                                            <p className="font-bold uppercase tracking-widest">No active transactions indexed</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="px-8 py-3 bg-white border border-slate-300 text-slate-400 font-bold rounded-xl hover:bg-slate-50 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
                                    <button onClick={handleUpdateClient} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-black transition-colors uppercase text-[10px] tracking-widest shadow-lg">Save Changes</button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: selectedClient.id, name: selectedClient.name }); }}
                                        className="px-8 py-3 bg-white border border-rose-200 text-rose-500 font-bold rounded-xl hover:bg-rose-50 transition-colors uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-sm"
                                    >
                                        <Trash2 size={14} />
                                        Delete Record
                                    </button>
                                    <button onClick={() => setSelectedClient(null)} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-colors uppercase text-[10px] tracking-widest shadow-lg">Close Terminal</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
