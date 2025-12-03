
import React, { useState } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { Receipt, Plus, FileText, Printer, Download, Search, Filter, AlertCircle, CheckCircle2, Clock, Trash2, Calendar, Building2, User, ChevronDown, IndianRupee, CreditCard, X } from 'lucide-react';

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    invoiceNumber: 'SMCPO-001',
    date: '2023-10-20',
    dueDate: '2023-11-20',
    customerName: 'Dr. Sarah Smith',
    customerHospital: 'City General Hospital',
    customerAddress: '45 Medical Park Rd, Bangalore',
    customerGstin: '29ABCDE1234F1Z5',
    items: [
      { id: '1', description: 'Philips MRI Coil (Head)', hsn: '9018', quantity: 1, unitPrice: 15000, taxRate: 12, amount: 15000 },
      { id: '2', description: 'Installation Service', hsn: '9987', quantity: 1, unitPrice: 2000, taxRate: 18, amount: 2000 }
    ],
    subtotal: 17000,
    taxTotal: 2160,
    grandTotal: 19160,
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
    smcpoNumber: 'SMCPO-001',
    cpoNumber: 'CPO-9981',
    cpoDate: '2023-10-18',
    deliveryAddress: 'City General Hospital, Main Block',
    advanceAmount: 5000,
    deliveryTime: '2 Weeks'
  },
  {
    id: 'INV-002',
    invoiceNumber: 'SMCPO-002',
    date: '2023-10-25',
    dueDate: '2023-11-10',
    customerName: 'Mr. Rajesh Kumar',
    customerHospital: 'Apollo Clinic',
    customerAddress: 'Sector 5, Rohini, New Delhi',
    customerGstin: '07XYZAB9876C1Z1',
    items: [
      { id: '3', description: 'Ultrasound Gel (5L)', hsn: '3006', quantity: 10, unitPrice: 25, taxRate: 12, amount: 250 },
      { id: '4', description: 'Disposable Syringes (Box)', hsn: '9018', quantity: 5, unitPrice: 120, taxRate: 12, amount: 600 }
    ],
    subtotal: 850,
    taxTotal: 102,
    grandTotal: 952,
    status: 'Pending',
    smcpoNumber: 'SMCPO-002',
    deliveryTime: 'Immediate'
  }
];

const PREDEFINED_PRODUCTS = [
    { name: 'MRI Coil (Head)', price: 15000, hsn: '9018', tax: 12 },
    { name: 'Ultrasound Gel (5L)', price: 25, hsn: '3006', tax: 12 },
    { name: 'Patient Monitor X12', price: 1200, hsn: '9018', tax: 18 },
    { name: 'X-Ray Tube Housing', price: 4500, hsn: '9022', tax: 18 },
    { name: 'Dental Chair Unit', price: 85000, hsn: '9018', tax: 12 },
    { name: 'Surgical Gloves (Box)', price: 15, hsn: '4015', tax: 5 },
];

export const BillingModule: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New Invoice State
  const [newInv, setNewInv] = useState<Partial<Invoice>>({
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      status: 'Pending',
      discount: 0,
      advanceAmount: 0
  });

  // Helper Calculations
  const calculateInvoiceTotals = (items: InvoiceItem[], discount: number = 0) => {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxTotal = items.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) * (item.taxRate / 100)), 0);
      const grandTotal = Math.max(0, subtotal + taxTotal - discount);
      return { subtotal, taxTotal, grandTotal };
  };

  const addItemToInvoice = () => {
      const newItem: InvoiceItem = {
          id: `ITEM-${Date.now()}`,
          description: '',
          hsn: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18,
          amount: 0
      };
      setNewInv(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
      setNewInv(prev => {
          const updatedItems = (prev.items || []).map(item => {
              if (item.id === id) {
                  const updatedItem = { ...item, [field]: value };
                  // If product selected from dropdown, auto-fill details
                  if (field === 'description') {
                     const product = PREDEFINED_PRODUCTS.find(p => p.name === value);
                     if (product) {
                         updatedItem.unitPrice = product.price;
                         updatedItem.hsn = product.hsn;
                         updatedItem.taxRate = product.tax;
                     }
                  }
                  // Recalculate line amount
                  updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
                  return updatedItem;
              }
              return item;
          });
          return { ...prev, items: updatedItems };
      });
  };

  const removeItem = (id: string) => {
      setNewInv(prev => ({ ...prev, items: (prev.items || []).filter(i => i.id !== id) }));
  };

  const handleSaveInvoice = () => {
      if (!newInv.customerName || !newInv.items || newInv.items.length === 0) {
          alert("Please fill customer details and add at least one item.");
          return;
      }

      const { subtotal, taxTotal, grandTotal } = calculateInvoiceTotals(newInv.items, newInv.discount);
      const invoice: Invoice = {
          id: `INV-${Date.now()}`,
          invoiceNumber: newInv.smcpoNumber || `SMCPO-${new Date().getFullYear()}-${String(invoices.length + 1)}`,
          date: newInv.date!,
          dueDate: newInv.dueDate!,
          customerName: newInv.customerName!,
          customerHospital: newInv.customerHospital || '',
          customerAddress: newInv.customerAddress || '',
          customerGstin: newInv.customerGstin,
          items: newInv.items,
          subtotal,
          taxTotal,
          grandTotal,
          status: 'Pending',
          
          // New Fields
          smcpoNumber: newInv.smcpoNumber || `SMCPO-${new Date().getFullYear()}-${String(invoices.length + 1)}`,
          cpoNumber: newInv.cpoNumber,
          cpoDate: newInv.cpoDate,
          deliveryAddress: newInv.deliveryAddress,
          deliveryTime: newInv.deliveryTime,
          advanceAmount: newInv.advanceAmount,
          advanceDate: newInv.advanceDate,
          advanceMode: newInv.advanceMode,
          bankDetails: newInv.bankDetails,
          specialNote: newInv.specialNote,
          discount: newInv.discount
      };

      // 1. Save in history
      setInvoices([invoice, ...invoices]);
      
      // 2. Reset Form
      setNewInv({ date: new Date().toISOString().split('T')[0], dueDate: '', items: [], status: 'Pending', discount: 0, advanceAmount: 0 });
      
      // 3. Close Create Modal
      setShowCreateModal(false);

      // 4. Open View/Print Modal immediately
      setSelectedInvoice(invoice);
      setShowViewModal(true);
  };

  const viewInvoice = (inv: Invoice) => {
      setSelectedInvoice(inv);
      setShowViewModal(true);
  };

  // Stats
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.grandTotal, 0);
  const pendingAmount = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.grandTotal, 0);
  const overdueAmount = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + i.grandTotal, 0);

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
          <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-6 rounded-3xl shadow-lg shadow-emerald-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Receipt size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider mb-1">Total Revenue</p>
                <h3 className="text-3xl font-black tracking-tight">₹{totalRevenue.toLocaleString()}</h3>
                <p className="text-xs text-emerald-200/60 mt-1 font-medium">From {invoices.filter(i => i.status === 'Paid').length} paid invoices</p>
             </div>
          </div>

          <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-6 rounded-3xl shadow-lg shadow-blue-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-blue-200/80 uppercase tracking-wider mb-1">Pending Payment</p>
                <h3 className="text-3xl font-black tracking-tight">₹{pendingAmount.toLocaleString()}</h3>
                <p className="text-xs text-blue-200/60 mt-1 font-medium">{invoices.filter(i => i.status === 'Pending').length} invoices pending</p>
             </div>
          </div>

          <div className="bg-gradient-to-br from-rose-800 to-red-900 p-6 rounded-3xl shadow-lg shadow-rose-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertCircle size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-rose-200/80 uppercase tracking-wider mb-1">Overdue Amount</p>
                <h3 className="text-3xl font-black tracking-tight">₹{overdueAmount.toLocaleString()}</h3>
                <p className="text-xs text-rose-200/60 mt-1 font-medium">{invoices.filter(i => i.status === 'Overdue').length} invoices overdue</p>
             </div>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg"><Receipt size={20} /></div> Invoices & POs
            </h2>
            <div className="flex gap-3">
                 <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search Invoice # or Client..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 w-64 transition-all"
                    />
                </div>
                 <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-medical-500/30 transition-transform active:scale-95">
                    <Plus size={18} /> New Order
                </button>
            </div>
        </div>

        {/* Invoice List */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4">SMCPO / Invoice</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">CPO Date</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => viewInvoice(invoice)}>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{invoice.smcpoNumber || invoice.invoiceNumber}</div>
                                <div className="text-xs text-slate-400 font-medium">{invoice.date}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-700">{invoice.customerName}</div>
                                <div className="text-xs text-slate-500">{invoice.customerHospital}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-xs font-medium text-slate-600`}>
                                    {invoice.cpoDate || invoice.date}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                                ₹{invoice.grandTotal.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    invoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    invoice.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                    'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                    {invoice.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="text-medical-600 hover:bg-medical-50 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                    <FileText size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Create Order/Invoice Modal */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-3xl">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Plus className="text-medical-600" size={24} /> Create Customer Purchase Order
                      </h3>
                      <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* PO Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">SMCPO Number</label>
                              <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                  value={newInv.smcpoNumber || ''} onChange={e => setNewInv({...newInv, smcpoNumber: e.target.value})} placeholder="Auto-generated if empty" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                              <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                  value={newInv.date} onChange={e => setNewInv({...newInv, date: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">Customer CPO No.</label>
                              <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                  value={newInv.cpoNumber || ''} onChange={e => setNewInv({...newInv, cpoNumber: e.target.value})} placeholder="Optional" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase">CPO Date</label>
                              <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                  value={newInv.cpoDate || ''} onChange={e => setNewInv({...newInv, cpoDate: e.target.value})} />
                          </div>
                      </div>

                      {/* Customer Info Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <User size={16} /> Bill To (Customer)
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                  <input type="text" placeholder="Customer Name *" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                      value={newInv.customerName || ''} onChange={e => setNewInv({...newInv, customerName: e.target.value})} />
                                  <input type="text" placeholder="Hospital / Company Name" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                      value={newInv.customerHospital || ''} onChange={e => setNewInv({...newInv, customerHospital: e.target.value})} />
                                  <textarea placeholder="Billing Address" rows={2} className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500 resize-none"
                                      value={newInv.customerAddress || ''} onChange={e => setNewInv({...newInv, customerAddress: e.target.value})} />
                                  <input type="text" placeholder="GSTIN (Optional)" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500 uppercase"
                                      value={newInv.customerGstin || ''} onChange={e => setNewInv({...newInv, customerGstin: e.target.value})} />
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <Building2 size={16} /> Delivery Address (If Different)
                              </h4>
                              <textarea placeholder="Delivery Address" rows={3} className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500 resize-none"
                                  value={newInv.deliveryAddress || ''} onChange={e => setNewInv({...newInv, deliveryAddress: e.target.value})} />
                                  
                              <div className="pt-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Delivery Time</label>
                                  <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                      value={newInv.deliveryTime || ''} onChange={e => setNewInv({...newInv, deliveryTime: e.target.value})} placeholder="e.g. 2 Weeks" />
                              </div>
                          </div>
                      </div>

                      {/* Items Section */}
                      <div>
                          <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
                              <Receipt size={16} /> Order Details
                          </h4>
                          <div className="border border-slate-200 rounded-2xl overflow-hidden mb-3">
                              <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 font-bold text-slate-500 uppercase">
                                      <tr>
                                          <th className="px-4 py-3 w-[30%]">Product</th>
                                          <th className="px-4 py-3 w-[10%]">Qty</th>
                                          <th className="px-4 py-3 w-[15%]">Rate (₹)</th>
                                          <th className="px-4 py-3 w-[15%]">Amount (₹)</th>
                                          <th className="px-4 py-3 w-[10%]">GST %</th>
                                          <th className="px-4 py-3 w-[15%] text-right">Price w/ GST</th>
                                          <th className="px-4 py-3 w-[5%]"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {(newInv.items || []).map((item) => (
                                          <tr key={item.id} className="bg-white">
                                              <td className="p-2">
                                                  <input type="text" list="products" placeholder="Select Item" 
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
                                                  <input type="number" min="0"
                                                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-medical-500"
                                                      value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                  />
                                              </td>
                                              <td className="p-2 text-slate-600 font-medium">
                                                  ₹{item.amount.toLocaleString()}
                                              </td>
                                              <td className="p-2">
                                                  <select 
                                                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-medical-500"
                                                      value={item.taxRate} onChange={(e) => updateItem(item.id, 'taxRate', Number(e.target.value))}
                                                  >
                                                      <option value={5}>5%</option>
                                                      <option value={12}>12%</option>
                                                      <option value={18}>18%</option>
                                                      <option value={28}>28%</option>
                                                  </select>
                                              </td>
                                              <td className="p-2 text-right font-bold text-slate-700">
                                                  ₹{(item.amount + (item.amount * item.taxRate / 100)).toLocaleString()}
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
                                  <button onClick={addItemToInvoice} className="text-xs font-bold text-medical-600 hover:text-medical-700 flex items-center justify-center gap-1 mx-auto py-1">
                                      <Plus size={14} /> Add Line Item
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* Extras & Totals */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                           <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Discount / Adjustment (₹)</label>
                                    <input type="number" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                        value={newInv.discount} onChange={e => setNewInv({...newInv, discount: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Advance Payment Amount (₹)</label>
                                    <input type="number" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                        value={newInv.advanceAmount} onChange={e => setNewInv({...newInv, advanceAmount: Number(e.target.value)})} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                     <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Advance Date</label>
                                        <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                            value={newInv.advanceDate || ''} onChange={e => setNewInv({...newInv, advanceDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Mode</label>
                                        <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                                            value={newInv.advanceMode || ''} onChange={e => setNewInv({...newInv, advanceMode: e.target.value})} placeholder="NEFT/UPI" />
                                    </div>
                                </div>
                           </div>
                           <div className="flex flex-col justify-end items-end space-y-2">
                              <div className="w-full max-w-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  <div className="flex justify-between text-sm text-slate-600">
                                      <span>Subtotal (Pre-Tax)</span>
                                      <span className="font-bold">₹{calculateInvoiceTotals(newInv.items || []).subtotal.toLocaleString()}</span>
                                  </div>
                                   <div className="flex justify-between text-sm text-slate-600">
                                      <span>Total GST</span>
                                      <span className="font-bold">₹{calculateInvoiceTotals(newInv.items || []).taxTotal.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm text-red-500">
                                      <span>Discount</span>
                                      <span className="font-bold">- ₹{(newInv.discount || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-lg text-slate-800 font-black border-t border-slate-200 pt-2 mt-2">
                                      <span>Grand Total</span>
                                      <span>₹{calculateInvoiceTotals(newInv.items || [], newInv.discount).grandTotal.toLocaleString()}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                      <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">
                          Cancel
                      </button>
                      <button onClick={handleSaveInvoice} className="px-6 py-2.5 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                          <CheckCircle2 size={18} /> Save & Generate PO
                      </button>
                  </div>
              </div>

              {/* Datalist for Product Autocomplete */}
              <datalist id="products">
                  {PREDEFINED_PRODUCTS.map((p, idx) => (
                      <option key={idx} value={p.name} />
                  ))}
              </datalist>
          </div>
      )}

      {/* View Template Modal (Printable) */}
      {showViewModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl print:hidden">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={20} /> Customer Purchase Order Preview
                      </h3>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 bg-medical-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-medical-700 transition-colors shadow-sm" 
                            title="Print / Download PDF">
                              <Download size={16} /> Download / Print
                          </button>
                          <button onClick={() => setShowViewModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                              <X size={20} />
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white p-8 print:p-0" id="invoice-print">
                      
                      {/* --- SREE MEDITEC TEMPLATE START --- */}
                      <div className="text-black border-2 border-black p-0 max-w-[210mm] mx-auto bg-white" style={{ fontFamily: 'Calibri, sans-serif' }}>
                          
                          {/* Header */}
                          <div className="text-center p-2">
                              <h1 className="text-3xl font-bold uppercase tracking-wide">SREE MEDITEC</h1>
                              <p className="text-sm mt-1">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                              <p className="text-sm font-bold">Mob: 9884818398</p>
                          </div>

                          {/* Title Box */}
                          <div className="border-t-2 border-b-2 border-black text-center py-1 font-bold text-lg bg-gray-100">
                              CUSTOMER PURCHASE ORDER
                          </div>

                          {/* PO Numbers Grid */}
                          <div className="grid grid-cols-2 border-b-2 border-black">
                              <div className="border-r-2 border-black p-2 text-sm font-bold">
                                  <div className="flex justify-between mb-1">
                                      <span>SMCPO NO: {selectedInvoice.smcpoNumber}</span>
                                      <span>DATE: {selectedInvoice.date}</span>
                                  </div>
                              </div>
                              <div className="p-2 text-sm font-bold">
                                  {/* Right side blank in template usually or same */}
                              </div>
                          </div>

                           <div className="grid grid-cols-2 border-b-2 border-black">
                              <div className="border-r-2 border-black p-2 text-sm font-bold">
                                  <div className="flex justify-between mb-1">
                                      <span>CPO NO: {selectedInvoice.cpoNumber || 'N/A'}</span>
                                      <span>DATE: {selectedInvoice.cpoDate || 'N/A'}</span>
                                  </div>
                              </div>
                              <div className="p-2 text-sm font-bold">
                                   {/* Right side blank */}
                              </div>
                          </div>

                          {/* Address Grid */}
                          <div className="grid grid-cols-2 border-b-2 border-black">
                              <div className="border-r-2 border-black p-2 text-sm">
                                  <span className="font-bold block mb-1">Name of the Customer and Address:</span>
                                  <p>{selectedInvoice.customerName}</p>
                                  <p>{selectedInvoice.customerHospital}</p>
                                  <p className="whitespace-pre-wrap">{selectedInvoice.customerAddress}</p>
                              </div>
                              <div className="p-2 text-sm">
                                  <span className="font-bold block mb-1">Delivery Address:</span>
                                  <p className="whitespace-pre-wrap">{selectedInvoice.deliveryAddress || selectedInvoice.customerAddress}</p>
                              </div>
                          </div>

                          {/* GST Grid */}
                          <div className="grid grid-cols-2 border-b-2 border-black">
                              <div className="border-r-2 border-black p-2 text-sm font-bold">
                                  GST No: {selectedInvoice.customerGstin || ''}
                              </div>
                              <div className="p-2 text-sm font-bold">
                                  GST No: 33AKLPS1234F1Z1
                              </div>
                          </div>

                          {/* Order Details Title */}
                          <div className="border-b-2 border-black text-center py-1 font-bold text-sm bg-gray-100">
                              ORDER DETAILS
                          </div>

                          {/* Items Table */}
                          <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                  <tr className="border-b-2 border-black text-center">
                                      <th className="border-r-2 border-black p-1 w-[5%]">Sl no.</th>
                                      <th className="border-r-2 border-black p-1 w-[30%]">Product</th>
                                      <th className="border-r-2 border-black p-1 w-[8%]">Qty</th>
                                      <th className="border-r-2 border-black p-1 w-[10%]">Rate</th>
                                      <th className="border-r-2 border-black p-1 w-[12%]">Amount</th>
                                      <th className="border-r-2 border-black p-1 w-[8%]">Gst %</th>
                                      <th className="border-r-2 border-black p-1 w-[10%]">Gst value</th>
                                      <th className="p-1 w-[17%]">Price with Gst</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {selectedInvoice.items.map((item, idx) => {
                                      const gstValue = item.amount * (item.taxRate / 100);
                                      return (
                                        <tr key={idx} className="border-b border-black">
                                            <td className="border-r-2 border-black p-1 text-center">{idx + 1}</td>
                                            <td className="border-r-2 border-black p-1 font-semibold">{item.description}</td>
                                            <td className="border-r-2 border-black p-1 text-center">{item.quantity}</td>
                                            <td className="border-r-2 border-black p-1 text-right">{item.unitPrice.toLocaleString()}</td>
                                            <td className="border-r-2 border-black p-1 text-right">{item.amount.toLocaleString()}</td>
                                            <td className="border-r-2 border-black p-1 text-center">{item.taxRate}%</td>
                                            <td className="border-r-2 border-black p-1 text-right">{gstValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                            <td className="p-1 text-right font-bold">{(item.amount + gstValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                        </tr>
                                      );
                                  })}
                                  {/* Empty Rows to Fill Space if needed */}
                                  {[...Array(Math.max(0, 5 - selectedInvoice.items.length))].map((_, i) => (
                                       <tr key={`empty-${i}`} className="border-b border-black h-8">
                                            <td className="border-r-2 border-black"></td>
                                            <td className="border-r-2 border-black"></td>
                                            <td className="border-r-2 border-black"></td>
                                            <td className="border-r-2 border-black"></td>
                                            <td className="border-r-2 border-black"></td>
                                            <td className="border-r-2 border-black"></td>
                                            <td className="border-r-2 border-black"></td>
                                            <td></td>
                                       </tr>
                                  ))}
                              </tbody>
                          </table>

                          {/* Totals Section */}
                          <div className="border-b-2 border-black">
                               <div className="flex border-b border-black">
                                   <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Total</div>
                                   <div className="w-[17%] p-1 text-right font-bold">
                                       {(selectedInvoice.subtotal + selectedInvoice.taxTotal).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                   </div>
                               </div>
                               <div className="flex border-b border-black">
                                   <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Discount/Buyback/adjustment</div>
                                   <div className="w-[17%] p-1 text-right font-bold">
                                       {(selectedInvoice.discount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                   </div>
                               </div>
                               <div className="flex bg-gray-100">
                                   <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Grand Total</div>
                                   <div className="w-[17%] p-1 text-right font-bold text-lg">
                                       {selectedInvoice.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                   </div>
                               </div>
                          </div>

                          {/* Advance Payment */}
                          <div className="border-b-2 border-black p-2 text-sm">
                              <span className="font-bold">Advance Payment details:</span>
                              {selectedInvoice.advanceAmount ? (
                                  <span className="ml-2">₹{selectedInvoice.advanceAmount} received on {selectedInvoice.advanceDate} via {selectedInvoice.advanceMode}</span>
                              ) : (
                                  <span className="ml-2">N/A</span>
                              )}
                          </div>

                          {/* Payment Details Box */}
                          <div className="border-b-2 border-black">
                              <div className="bg-gray-100 text-center font-bold text-sm border-b-2 border-black py-1">PAYMENT DETAILS</div>
                              <div className="grid grid-cols-4 text-sm divide-x-2 divide-black">
                                  <div className="p-2 h-16">
                                      <span className="font-bold block">Bank and Branch:</span>
                                      {selectedInvoice.bankDetails || 'HDFC Bank, Chennai'}
                                  </div>
                                  <div className="p-2">
                                      <span className="font-bold block">Mode of payment:</span>
                                      {selectedInvoice.paymentMethod || 'Cheque / NEFT'}
                                  </div>
                                  <div className="p-2">
                                      <span className="font-bold block">Date:</span>
                                      {selectedInvoice.advanceDate}
                                  </div>
                                  <div className="p-2">
                                      <span className="font-bold block">Amount:</span>
                                      {selectedInvoice.advanceAmount}
                                  </div>
                              </div>
                          </div>

                          {/* Delivery Time */}
                          <div className="border-b-2 border-black flex">
                              <div className="p-2 text-sm border-r-2 border-black w-1/2 font-bold">
                                  Delivery time: {selectedInvoice.deliveryTime}
                              </div>
                              <div className="p-2 text-sm w-1/2">
                                  {/* Empty as per template or can add details */}
                              </div>
                          </div>

                          {/* Special Note */}
                          <div className="border-b-2 border-black p-2 text-sm h-16">
                              <span className="font-bold">Any special note regarding supply, payment terms (to be filled by company personal):</span>
                              <p className="mt-1">{selectedInvoice.specialNote}</p>
                          </div>

                          {/* Signatures */}
                          <div className="grid grid-cols-2 text-sm h-32">
                              <div className="border-r-2 border-black p-2 flex flex-col justify-end">
                                  <span className="font-bold">Customer seal and signature:</span>
                              </div>
                              <div className="p-2 flex flex-col justify-end">
                                  <span className="font-bold">Sreemeditec representative signature:</span>
                              </div>
                          </div>

                      </div>
                      {/* --- SREE MEDITEC TEMPLATE END --- */}
                      
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
