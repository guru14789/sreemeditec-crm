
import React, { useState } from 'react';
import { Client, Invoice } from '../types';
import { Users, Search, MapPin, Phone, Mail, FileText, ArrowUpRight, X, Building2, Wallet } from 'lucide-react';
import { useData } from './DataContext';

// Helper for Indian Number Formatting
const formatIndianNumber = (num: number) => {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
};

export const ClientModule: React.FC = () => {
  const { clients, invoices } = useData();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
                                      <button className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors">
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
                      <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
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
