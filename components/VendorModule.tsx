import React, { useState } from 'react';
import { Vendor, Invoice } from '../types';
/* Added missing 'User' icon to imports */
import { Truck, Search, MapPin, Phone, Mail, FileText, ArrowUpRight, X, Building2, Wallet, Lock, ShieldCheck, Plus, Save, Key, User } from 'lucide-react';
import { useData } from './DataContext';

// Helper for Indian Number Formatting
const formatIndianNumber = (num: number) => {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};

export const VendorModule: React.FC = () => {
  const { vendors, invoices, addVendor, addNotification } = useData();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVendor, setNewVendor] = useState<Partial<Vendor>>({});

  // Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const verifyPassword = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      // Using 'admin' as the master key for this restricted module
      if (password === 'admin') {
          setIsAuthenticated(true);
      } else {
          alert("Incorrect Security Password. Please try again.");
          setPassword('');
      }
  };

  if (!isAuthenticated) {
      return (
          <div className="h-full flex items-center justify-center bg-slate-50 p-4">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner">
                      <Lock size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Vendor Database Lock</h2>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                      Please enter the module security password to access supplier registry and procurement history.
                  </p>
                  
                  <form onSubmit={verifyPassword} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Key size={18} className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                          </div>
                          <input 
                              type="password" 
                              placeholder="Enter Password" 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-700 font-bold"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              autoFocus
                          />
                      </div>
                      <button 
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95"
                      >
                          <ShieldCheck size={20} /> Verify & Unlock
                      </button>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Authorized Access Only</p>
                  </form>
              </div>
          </div>
      )
  }

  const getVendorProcurementValue = (vendorName: string) => {
    return invoices
      .filter(inv => inv.documentType === 'SupplierPO' && inv.customerName === vendorName)
      .reduce((sum, inv) => sum + inv.grandTotal, 0);
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveVendor = () => {
    if (!newVendor.name || !newVendor.address) {
      alert("Name and Address are required");
      return;
    }
    const vendor: Vendor = {
      id: `VEN-${String(vendors.length + 1).padStart(3, '0')}`,
      name: newVendor.name,
      address: newVendor.address,
      contactPerson: newVendor.contactPerson,
      gstin: newVendor.gstin,
      email: newVendor.email,
      phone: newVendor.phone,
    };
    addVendor(vendor);
    setShowAddModal(false);
    setNewVendor({});
    addNotification('Registry Updated', `Vendor "${vendor.name}" added to database.`, 'success');
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      <div className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                  <Truck size={24} />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800">Vendor Registry</h2>
                  <p className="text-xs text-slate-500 font-medium">{vendors.length} Authorized Suppliers</p>
              </div>
          </div>
          <div className="flex gap-3">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" 
                      placeholder="Search Suppliers..." 
                      className="pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              <button onClick={() => setShowAddModal(true)} className="bg-medical-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-medical-500/30 active:scale-95 transition-all">
                  <Plus size={18} /> Add Vendor
              </button>
          </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                  <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Vendor Name</th>
                          <th className="px-6 py-4">Contact Person</th>
                          <th className="px-6 py-4">Phone / Email</th>
                          <th className="px-6 py-4 text-right">Procured Value</th>
                          <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredVendors.map(vendor => (
                          <tr key={vendor.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedVendor(vendor)}>
                              <td className="px-6 py-4 font-mono text-xs text-slate-400">{vendor.id}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{vendor.name}</td>
                              <td className="px-6 py-4 font-medium text-slate-600">{vendor.contactPerson || '-'}</td>
                              <td className="px-6 py-4 text-xs">
                                  {vendor.phone && <div className="flex items-center gap-1"><Phone size={12} className="text-slate-400"/> {vendor.phone}</div>}
                                  {vendor.email && <div className="flex items-center gap-1"><Mail size={12} className="text-slate-400"/> {vendor.email}</div>}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                                      ₹{formatIndianNumber(getVendorProcurementValue(vendor.name))}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right"><ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors ml-auto"/></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Add New Supplier</h3>
                    <button onClick={() => setShowAddModal(false)}><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Name *</label><input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={newVendor.name || ''} onChange={e => setNewVendor({...newVendor, name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Contact Person</label><input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={newVendor.contactPerson || ''} onChange={e => setNewVendor({...newVendor, contactPerson: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Phone</label><input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={newVendor.phone || ''} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label><input type="email" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={newVendor.email || ''} onChange={e => setNewVendor({...newVendor, email: e.target.value})} /></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">GSTIN</label><input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={newVendor.gstin || ''} onChange={e => setNewVendor({...newVendor, gstin: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Address *</label><textarea rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={newVendor.address || ''} onChange={e => setNewVendor({...newVendor, address: e.target.value})} /></div>
                </div>
                <div className="p-6 border-t border-slate-100 flex gap-3">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">Cancel</button>
                    <button onClick={handleSaveVendor} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/> Save Vendor</button>
                </div>
           </div>
        </div>
      )}

      {selectedVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-3xl">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">{selectedVendor.name.charAt(0)}</div>
                          <div><h3 className="text-xl font-bold text-slate-800">{selectedVendor.name}</h3><p className="text-sm font-medium text-slate-500">{selectedVendor.id}</p></div>
                      </div>
                      <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-1">Firm Details</h4>
                              <div className="space-y-3">
                                  <div className="flex items-start gap-2 text-sm text-slate-600"><MapPin size={16} className="text-indigo-500 shrink-0 mt-0.5" /> <span className="whitespace-pre-wrap">{selectedVendor.address}</span></div>
                                  <div className="flex items-center gap-2 text-sm text-slate-600"><FileText size={16} className="text-indigo-500 shrink-0" /> <span>GST: {selectedVendor.gstin || 'N/A'}</span></div>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-1">Contact Info</h4>
                              <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-sm text-slate-600"><User size={16} className="text-indigo-500 shrink-0" /> <span>{selectedVendor.contactPerson || 'N/A'}</span></div>
                                  <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={16} className="text-indigo-500 shrink-0" /> <span>{selectedVendor.phone || 'N/A'}</span></div>
                                  <div className="flex items-center gap-2 text-sm text-slate-600"><Mail size={16} className="text-indigo-500 shrink-0" /> <span>{selectedVendor.email || 'N/A'}</span></div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex justify-end"><button onClick={() => setSelectedVendor(null)} className="px-8 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors">Close</button></div>
              </div>
          </div>
      )}
    </div>
  );
};
