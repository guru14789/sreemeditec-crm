
import React, { useState } from 'react';
import { Vendor, Invoice } from '../types';
import { Truck, Search, MapPin, Phone, Mail, FileText, ArrowUpRight, X, Building2, Wallet, Lock, ShieldCheck, Plus, Save, Key, User } from 'lucide-react';
import { useData } from './DataContext';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const verifyPassword = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (password === 'admin') setIsAuthenticated(true);
      else { alert("Incorrect Security Password."); setPassword(''); }
  };

  if (!isAuthenticated) {
      return (
          <div className="h-full flex items-center justify-center bg-slate-50 p-4">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border p-8 text-center animate-in fade-in zoom-in-95">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner"><Lock size={40} /></div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Vendor Database Lock</h2>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed">Please enter the module security password to access supplier registry.</p>
                  <form onSubmit={verifyPassword} className="space-y-4">
                      <input type="password" placeholder="Password" className="w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-indigo-500 font-bold" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                      <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/30">Verify & Unlock</button>
                  </form>
              </div>
          </div>
      )
  }

  const normalize = (str: string) => (str || '').toLowerCase().trim();
  const getVendorProcurementValue = (vendorName: string) => {
    const target = normalize(vendorName);
    return invoices.filter(inv => inv.documentType === 'SupplierPO' && normalize(inv.customerName) === target).reduce((sum, inv) => sum + inv.grandTotal, 0);
  };

  const filteredVendors = vendors.filter(v => normalize(v.name).includes(normalize(searchQuery)));

  const handleSaveVendor = () => {
    if (!newVendor.name) { alert("Name is required"); return; }
    const vendor: Vendor = {
      id: `VEN-${String(vendors.length + 1).padStart(3, '0')}`,
      name: newVendor.name,
      address: newVendor.address || '',
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
    <div className="h-full flex flex-col gap-6 overflow-hidden p-2">
      <div className="p-5 bg-white rounded-3xl border flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg"><Truck size={24} /></div>
              <div><h2 className="text-xl font-bold text-slate-800">Vendor Registry</h2><p className="text-xs text-slate-500 font-medium">{vendors.length} Authorized Suppliers</p></div>
          </div>
          <div className="flex gap-3">
              <input type="text" placeholder="Search..." className="pl-4 pr-4 py-2.5 border rounded-xl text-sm font-medium w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <button onClick={() => setShowAddModal(true)} className="bg-medical-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-medical-700 transition-all">+ Add Vendor</button>
          </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border overflow-hidden flex flex-col shadow-sm">
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                      <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4 text-right">Volume</th><th className="px-6 py-4 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y">
                      {filteredVendors.map(vendor => (
                          <tr key={vendor.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedVendor(vendor)}>
                              <td className="px-6 py-4 font-mono text-xs text-slate-400">{vendor.id}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{vendor.name}</td>
                              <td className="px-6 py-4 font-medium text-slate-600">{vendor.contactPerson || '-'}</td>
                              <td className="px-6 py-4 text-right font-black text-indigo-700">₹{formatIndianNumber(getVendorProcurementValue(vendor.name))}</td>
                              <td className="px-6 py-4 text-right"><ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-600 ml-auto"/></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Register Supplier</h3>
                    <button onClick={() => setShowAddModal(false)}><X size={24} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <input type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold" placeholder="Vendor Name *" value={newVendor.name || ''} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                    <textarea className="w-full border rounded-xl px-4 py-3 text-sm font-bold resize-none" rows={3} placeholder="Address Details" value={newVendor.address || ''} onChange={e => setNewVendor({...newVendor, address: e.target.value})} />
                    <button onClick={handleSaveVendor} className="w-full bg-medical-600 text-white py-3 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Save Vendor</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
