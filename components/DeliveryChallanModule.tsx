
import React, { useState } from 'react';
import { DeliveryChallan, ChallanItem } from '../types';
import { Truck, Plus, FileText, Printer, Search, Filter, Trash2, Calendar, Building2, User, Package, MapPin, CheckCircle2, Box, ArrowRight, X } from 'lucide-react';

const MOCK_CHALLANS: DeliveryChallan[] = [
  {
    id: 'DC-001',
    challanNumber: 'DC-2023-501',
    date: '2023-10-26',
    customerName: 'City General Hospital',
    customerAddress: '45 Medical Park Rd, Bangalore',
    vehicleNumber: 'KA-01-AB-1234',
    items: [
      { id: '1', description: 'Philips MRI Coil (Head)', quantity: 1, unit: 'Pc', remarks: 'Fragile' },
      { id: '2', description: 'Power Cables Set', quantity: 2, unit: 'Box' }
    ],
    status: 'Dispatched',
    referenceOrder: 'ORD-9981'
  },
  {
    id: 'DC-002',
    challanNumber: 'DC-2023-502',
    date: '2023-10-25',
    customerName: 'Apollo Clinic',
    customerAddress: 'Sector 5, Rohini, New Delhi',
    vehicleNumber: 'DL-04-XY-9876',
    items: [
      { id: '3', description: 'Ultrasound Gel (5L)', quantity: 20, unit: 'Can', remarks: 'Batch #441' }
    ],
    status: 'Delivered',
    referenceOrder: 'ORD-8822'
  }
];

export const DeliveryChallanModule: React.FC = () => {
  const [challans, setChallans] = useState<DeliveryChallan[]>(MOCK_CHALLANS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);

  // New Challan State
  const [newChallan, setNewChallan] = useState<Partial<DeliveryChallan>>({
      date: new Date().toISOString().split('T')[0],
      items: [],
      status: 'Dispatched'
  });

  const addItem = () => {
      const newItem: ChallanItem = {
          id: `ITEM-${Date.now()}`,
          description: '',
          quantity: 1,
          unit: 'Pc',
          remarks: ''
      };
      setNewChallan(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (id: string, field: keyof ChallanItem, value: any) => {
      setNewChallan(prev => ({
          ...prev,
          items: (prev.items || []).map(item => item.id === id ? { ...item, [field]: value } : item)
      }));
  };

  const removeItem = (id: string) => {
      setNewChallan(prev => ({ ...prev, items: (prev.items || []).filter(i => i.id !== id) }));
  };

  const handleSaveChallan = () => {
      if (!newChallan.customerName || !newChallan.items || newChallan.items.length === 0) {
          alert("Please fill customer details and add at least one item.");
          return;
      }

      const challan: DeliveryChallan = {
          id: `DC-${Date.now()}`,
          challanNumber: `DC-${new Date().getFullYear()}-${String(challans.length + 501)}`,
          date: newChallan.date!,
          customerName: newChallan.customerName!,
          customerAddress: newChallan.customerAddress || '',
          vehicleNumber: newChallan.vehicleNumber || '',
          items: newChallan.items,
          status: 'Dispatched',
          referenceOrder: newChallan.referenceOrder || ''
      };

      setChallans([challan, ...challans]);
      setShowCreateModal(false);
      setNewChallan({ date: new Date().toISOString().split('T')[0], items: [], status: 'Dispatched' });
  };

  const updateStatus = (id: string, status: DeliveryChallan['status']) => {
      setChallans(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const viewChallan = (c: DeliveryChallan) => {
      setSelectedChallan(c);
      setShowViewModal(true);
  };

  // Stats
  const dispatchedCount = challans.filter(c => c.status === 'Dispatched').length;
  const deliveredCount = challans.filter(c => c.status === 'Delivered').length;

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
          <div className="bg-gradient-to-br from-indigo-800 to-blue-900 p-6 rounded-3xl shadow-lg shadow-indigo-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Truck size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-indigo-200/80 uppercase tracking-wider mb-1">In Transit</p>
                <h3 className="text-3xl font-black tracking-tight">{dispatchedCount}</h3>
                <p className="text-xs text-indigo-200/60 mt-1 font-medium">Deliveries Dispatched</p>
             </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-700 to-green-900 p-6 rounded-3xl shadow-lg shadow-emerald-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle2 size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider mb-1">Delivered</p>
                <h3 className="text-3xl font-black tracking-tight">{deliveredCount}</h3>
                <p className="text-xs text-emerald-200/60 mt-1 font-medium">Successfully Completed</p>
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
               <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Challans</p>
                  <h3 className="text-3xl font-black text-slate-800">{challans.length}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">This Month</p>
              </div>
               <div className="bg-slate-100 p-3 rounded-2xl text-slate-600 group-hover:scale-110 transition-transform">
                  <FileText size={24} />
              </div>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg"><Package size={20} /></div> Delivery Challans
            </h2>
            <div className="flex gap-3">
                 <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search Challan #..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 w-64 transition-all"
                    />
                </div>
                 <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-medical-500/30 transition-transform active:scale-95">
                    <Plus size={18} /> New Challan
                </button>
            </div>
        </div>

        {/* Challan List */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4">Challan Details</th>
                        <th className="px-6 py-4">Consignee (Customer)</th>
                        <th className="px-6 py-4">Items</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {challans.map(challan => (
                        <tr key={challan.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{challan.challanNumber}</div>
                                <div className="text-xs text-slate-400 font-medium">{challan.date}</div>
                                {challan.vehicleNumber && <div className="text-[10px] bg-slate-100 text-slate-500 inline-block px-1.5 py-0.5 rounded mt-1 font-mono">Veh: {challan.vehicleNumber}</div>}
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-700">{challan.customerName}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{challan.customerAddress}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-slate-700">{challan.items.length} Items</span>
                                <div className="text-xs text-slate-500">{challan.items.reduce((acc, i) => acc + i.quantity, 0)} Total Qty</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 w-fit ${
                                    challan.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    challan.status === 'Returned' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                }`}>
                                    {challan.status === 'Dispatched' && <Truck size={12}/>}
                                    {challan.status === 'Delivered' && <CheckCircle2 size={12}/>}
                                    {challan.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    {challan.status === 'Dispatched' && (
                                        <button 
                                            onClick={() => updateStatus(challan.id, 'Delivered')}
                                            className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                                            Mark Delivered
                                        </button>
                                    )}
                                    <button onClick={() => viewChallan(challan)} className="text-slate-400 hover:text-medical-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                                        <FileText size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Create Challan Modal */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-3xl">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Plus className="text-medical-600" size={24} /> Create Delivery Challan
                      </h3>
                      <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                      {/* Customer & Transport Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <User size={16} /> Consignee Details
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                  <input type="text" placeholder="Customer Name *" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                      value={newChallan.customerName || ''} onChange={e => setNewChallan({...newChallan, customerName: e.target.value})} />
                                  <input type="text" placeholder="Delivery Address" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                      value={newChallan.customerAddress || ''} onChange={e => setNewChallan({...newChallan, customerAddress: e.target.value})} />
                                  <input type="text" placeholder="Reference Order No." className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                      value={newChallan.referenceOrder || ''} onChange={e => setNewChallan({...newChallan, referenceOrder: e.target.value})} />
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <Truck size={16} /> Transport Details
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Challan Date</label>
                                      <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                          value={newChallan.date} onChange={e => setNewChallan({...newChallan, date: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle No.</label>
                                      <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500 uppercase"
                                          value={newChallan.vehicleNumber || ''} onChange={e => setNewChallan({...newChallan, vehicleNumber: e.target.value})} placeholder="KA-01-XX-0000" />
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Items Section */}
                      <div>
                          <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
                              <Box size={16} /> Items to Ship
                          </h4>
                          <div className="border border-slate-200 rounded-2xl overflow-hidden mb-3">
                              <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 font-bold text-slate-500 uppercase">
                                      <tr>
                                          <th className="px-4 py-3 w-[40%]">Description of Goods</th>
                                          <th className="px-4 py-3 w-[15%]">Qty</th>
                                          <th className="px-4 py-3 w-[15%]">Unit</th>
                                          <th className="px-4 py-3 w-[25%]">Remarks</th>
                                          <th className="px-4 py-3 w-[5%]"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {(newChallan.items || []).map((item) => (
                                          <tr key={item.id} className="bg-white">
                                              <td className="p-2">
                                                  <input type="text" placeholder="Item Description" 
                                                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-medical-500"
                                                      value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                  />
                                              </td>
                                              <td className="p-2">
                                                  <input type="number" min="1"
                                                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-medical-500"
                                                      value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                  />
                                              </td>
                                              <td className="p-2">
                                                  <select className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-medical-500"
                                                      value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                  >
                                                      <option>Pc</option>
                                                      <option>Box</option>
                                                      <option>Kg</option>
                                                      <option>Set</option>
                                                      <option>Ltr</option>
                                                  </select>
                                              </td>
                                              <td className="p-2">
                                                  <input type="text" placeholder="Optional"
                                                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-medical-500"
                                                      value={item.remarks} onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                                                  />
                                              </td>
                                              <td className="p-2 text-center">
                                                  <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                      <Trash2 size={16} />
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                              <div className="bg-slate-50 p-2 text-center border-t border-slate-200">
                                  <button onClick={addItem} className="text-xs font-bold text-medical-600 hover:text-medical-700 flex items-center justify-center gap-1 mx-auto py-1">
                                      <Plus size={14} /> Add Line Item
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                      <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">
                          Cancel
                      </button>
                      <button onClick={handleSaveChallan} className="px-6 py-2.5 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                          <Truck size={18} /> Generate Challan
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* View Challan Modal (Printable) */}
      {showViewModal && selectedChallan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl print:hidden">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={20} /> Challan Preview
                      </h3>
                      <div className="flex gap-2">
                          <button onClick={() => window.print()} className="p-2 text-slate-600 hover:text-medical-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200" title="Print">
                              <Printer size={20} />
                          </button>
                          <button onClick={() => setShowViewModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
                              <X size={20} />
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 bg-white print:p-0" id="challan-print">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
                          <div>
                              <div className="flex items-center gap-2 text-medical-600 mb-2">
                                  <Building2 size={24} />
                                  <span className="text-2xl font-bold tracking-tight text-slate-900">MedEquip 360</span>
                              </div>
                              <p className="text-sm text-slate-500">123, Healthcare Park, Industrial Area</p>
                              <p className="text-sm text-slate-500">Bangalore, Karnataka - 560001</p>
                          </div>
                          <div className="text-right">
                              <h1 className="text-3xl font-black text-slate-200 uppercase tracking-widest mb-2">Delivery Challan</h1>
                              <p className="font-bold text-slate-800">#{selectedChallan.challanNumber}</p>
                              <p className="text-sm text-slate-500">Date: {selectedChallan.date}</p>
                          </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-8 mb-8">
                          <div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Consignee (Ship To):</h4>
                              <p className="font-bold text-slate-800">{selectedChallan.customerName}</p>
                              <p className="text-sm text-slate-600">{selectedChallan.customerAddress}</p>
                              {selectedChallan.referenceOrder && (
                                  <p className="text-sm text-slate-500 mt-2">Ref Order: {selectedChallan.referenceOrder}</p>
                              )}
                          </div>
                          <div className="text-right">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Transport Details:</h4>
                              <p className="text-sm text-slate-600"><span className="font-bold">Vehicle No:</span> {selectedChallan.vehicleNumber || 'N/A'}</p>
                              <p className="text-sm text-slate-600"><span className="font-bold">Mode:</span> Road</p>
                              <div className={`mt-4 inline-block px-4 py-2 rounded-lg border-2 text-sm font-bold uppercase tracking-wider ${
                                  selectedChallan.status === 'Delivered' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                                  'border-indigo-200 text-indigo-700 bg-indigo-50'
                              }`}>
                                  {selectedChallan.status}
                              </div>
                          </div>
                      </div>

                      {/* Items Table */}
                      <table className="w-full text-sm text-left mb-8 border border-slate-200">
                          <thead className="bg-slate-50">
                              <tr>
                                  <th className="py-3 px-4 border-r border-slate-200 font-bold text-slate-600">S.No</th>
                                  <th className="py-3 px-4 border-r border-slate-200 font-bold text-slate-600">Description of Goods</th>
                                  <th className="py-3 px-4 border-r border-slate-200 font-bold text-slate-600 text-center">Qty</th>
                                  <th className="py-3 px-4 border-r border-slate-200 font-bold text-slate-600 text-center">Unit</th>
                                  <th className="py-3 px-4 font-bold text-slate-600">Remarks</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                              {selectedChallan.items.map((item, idx) => (
                                  <tr key={idx}>
                                      <td className="py-3 px-4 border-r border-slate-200 text-center text-slate-500">{idx + 1}</td>
                                      <td className="py-3 px-4 border-r border-slate-200 font-medium text-slate-800">{item.description}</td>
                                      <td className="py-3 px-4 border-r border-slate-200 text-center font-bold">{item.quantity}</td>
                                      <td className="py-3 px-4 border-r border-slate-200 text-center text-slate-500">{item.unit}</td>
                                      <td className="py-3 px-4 text-slate-500 text-sm">{item.remarks}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>

                      {/* Footer Signatures */}
                      <div className="mt-20 flex justify-between pt-8">
                          <div className="text-center">
                              <div className="border-t border-slate-300 w-48 mb-2"></div>
                              <p className="text-xs font-bold text-slate-500 uppercase">Receiver's Signature</p>
                          </div>
                          <div className="text-center">
                              <p className="text-sm font-bold text-slate-800 mb-8">For MedEquip 360</p>
                              <div className="border-t border-slate-300 w-48 mb-2"></div>
                              <p className="text-xs font-bold text-slate-500 uppercase">Authorized Signatory</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
