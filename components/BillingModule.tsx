
import React, { useState } from 'react';
import { Invoice, InvoiceItem, PaymentRecord, Client } from '../types';
import { Receipt, Plus, FileText, Printer, Download, Search, Filter, AlertCircle, CheckCircle2, Clock, Trash2, Calendar, Building2, User, ChevronDown, IndianRupee, CreditCard, X, Upload, Save, Image, Box, Percent, Eye, PenTool, ArrowLeft } from 'lucide-react';
import { useData } from './DataContext';

// Helper for Indian Number Formatting (K, L, Cr)
const formatIndianNumber = (num: number) => {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  }
  if (num >= 100000) {
    return (num / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
  }
  return num.toString();
};

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
      { id: '1', description: 'Philips MRI Coil (Head)', hsn: '9018', quantity: 1, unitPrice: 15000, taxRate: 12, amount: 15000 }
    ],
    subtotal: 15000,
    taxTotal: 1800,
    grandTotal: 16800,
    status: 'Partial',
    paymentMethod: 'Bank Transfer',
    smcpoNumber: 'SMCPO-001',
    cpoNumber: 'CPO-9981',
    cpoDate: '2023-10-18',
    deliveryAddress: 'City General Hospital, Main Block',
    advanceAmount: 5000,
    advanceDate: '2023-10-20',
    advanceMode: 'NEFT',
    bankDetails: 'HDFC Bank, Adyar Branch',
    deliveryTime: '2 Weeks',
    specialNote: 'Warranty valid for 1 year from installation.',
    payments: [
        { id: 'PAY-1', date: '2023-10-20', amount: 5000, mode: 'NEFT', reference: 'REF123' }
    ],
    totalPaid: 5000,
    balanceDue: 11800
  }
];

export const BillingModule: React.FC = () => {
  const { clients, products, addClient } = useData();
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [viewState, setViewState] = useState<'list' | 'create'>('list');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Mobile Tab State for Quotation Generator
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  // New Invoice State (Quotation Generator Format)
  const [newInv, setNewInv] = useState<Partial<Invoice>>({
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      status: 'Pending',
      discount: 0,
      freightAmount: 0,
      freightTaxRate: 18,
      paymentTerms: '50% advance with purchase order payable in the name of Sreemeditec and balance 50% on delivery of Machine.',
      deliveryTerms: 'Within 10 days from the date of the receipt of your purchase order.',
      warrantyTerms: 'Warranty against manufacturing defects for a period of one year from the date of delivery.',
      subject: '',
      smcpoNumber: `SMQ ${String(invoices.length + 1).padStart(3, '0')}`, // Default reference style
  });

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Helper Calculations
  const calculateInvoiceTotals = (items: InvoiceItem[], discount: number = 0, freight: number = 0, freightTax: number = 0) => {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxTotal = items.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) * (item.taxRate / 100)), 0);
      
      const freightTaxAmount = freight * (freightTax / 100);
      
      const grandTotal = Math.max(0, subtotal + taxTotal + freight + freightTaxAmount - discount);
      return { subtotal, taxTotal, grandTotal };
  };

  const addItemToInvoice = () => {
      const newItem: InvoiceItem = {
          id: `ITEM-${Date.now()}`,
          description: '',
          model: '',
          features: '',
          hsn: '',
          quantity: 1,
          unit: 'No',
          unitPrice: 0,
          taxRate: 12,
          amount: 0
      };
      setNewInv(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
      setNewInv(prev => {
          const updatedItems = (prev.items || []).map(item => {
              if (item.id === id) {
                  const updatedItem = { ...item, [field]: value };
                  
                  // Auto-fill Product Details
                  if (field === 'description') {
                     const product = products.find(p => p.name === value);
                     if (product) {
                         updatedItem.unitPrice = product.price;
                         updatedItem.hsn = product.hsn || '';
                         updatedItem.taxRate = product.taxRate || 18;
                         updatedItem.model = product.model;
                         updatedItem.features = product.description;
                     }
                  }
                  
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

  const handleClientChange = (name: string) => {
      const client = clients.find(c => c.name === name);
      setNewInv(prev => ({
          ...prev,
          customerName: name,
          ...(client && {
              customerHospital: client.hospital,
              customerAddress: client.address,
              customerGstin: client.gstin
          })
      }));
  };

  const handleSaveInvoice = () => {
      if (!newInv.customerName || !newInv.items || newInv.items.length === 0) {
          alert("Please fill Client Name and add at least one Product.");
          return;
      }

      // Check if new client, if so, add to central store
      const existingClient = clients.find(c => c.name === newInv.customerName);
      if (!existingClient) {
          if (confirm(`"${newInv.customerName}" is a new client. Save to Client Database?`)) {
              addClient({
                  id: `C${Date.now()}`,
                  name: newInv.customerName,
                  hospital: newInv.customerHospital,
                  address: newInv.customerAddress || '',
                  gstin: newInv.customerGstin
              });
          }
      }

      const { subtotal, taxTotal, grandTotal } = calculateInvoiceTotals(
          newInv.items, 
          newInv.discount, 
          newInv.freightAmount, 
          newInv.freightTaxRate
      );

      const invoice: Invoice = {
          id: `INV-${Date.now()}`,
          invoiceNumber: newInv.smcpoNumber || `SMQ ${String(invoices.length + 1)}`,
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
          
          subject: newInv.subject,
          smcpoNumber: newInv.smcpoNumber,
          
          discount: newInv.discount,
          freightAmount: newInv.freightAmount,
          freightTaxRate: newInv.freightTaxRate,
          
          paymentTerms: newInv.paymentTerms,
          deliveryTerms: newInv.deliveryTerms,
          warrantyTerms: newInv.warrantyTerms,
          
          // Legacy/Compatibility fields
          advanceAmount: 0,
          payments: [],
          totalPaid: 0,
          balanceDue: grandTotal,
          deliveryTime: newInv.deliveryTerms?.substring(0, 20) + '...', // approximate
          specialNote: `${newInv.paymentTerms}\n${newInv.deliveryTerms}\n${newInv.warrantyTerms}`
      };

      setInvoices([invoice, ...invoices]);
      setViewState('list');
      
      // Reset
      setNewInv({ 
          date: new Date().toISOString().split('T')[0], 
          dueDate: '', items: [], status: 'Pending', discount: 0, freightAmount: 0, freightTaxRate: 18,
          paymentTerms: '50% advance with purchase order payable in the name of Sreemeditec and balance 50% on delivery of Machine.', 
          deliveryTerms: 'Within 10 days from the date of the receipt of your purchase order.', 
          warrantyTerms: 'Warranty against manufacturing defects for a period of one year from the date of delivery.',
          smcpoNumber: `SMQ ${String(invoices.length + 2).padStart(3, '0')}`
      });

      setSelectedInvoice(invoice);
      setShowViewModal(true);
  };

  const handleRecordPayment = () => {
      if(!selectedInvoice || paymentAmount <= 0) return;
      
      const newPayment: PaymentRecord = {
          id: `PAY-${Date.now()}`,
          date: paymentDate,
          amount: paymentAmount,
          mode: paymentMode
      };
      
      const updatedPaid = (selectedInvoice.totalPaid || 0) + paymentAmount;
      const updatedBalance = selectedInvoice.grandTotal - updatedPaid;
      const newStatus = updatedBalance <= 0 ? 'Paid' : 'Partial';

      const updatedInvoice = {
          ...selectedInvoice,
          payments: [...(selectedInvoice.payments || []), newPayment],
          totalPaid: updatedPaid,
          balanceDue: updatedBalance,
          status: newStatus as any
      };

      setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? updatedInvoice : inv));
      setSelectedInvoice(updatedInvoice);
      setShowPaymentModal(false);
      setPaymentAmount(0);
  };

  const viewInvoice = (inv: Invoice) => {
      setSelectedInvoice(inv);
      setShowViewModal(true);
  };

  // Stats
  const totalRevenue = invoices.reduce((sum, i) => sum + (i.totalPaid || 0), 0);
  const pendingAmount = invoices.reduce((sum, i) => sum + (i.balanceDue || (i.status === 'Paid' ? 0 : i.grandTotal)), 0);
  const overdueAmount = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + (i.balanceDue || i.grandTotal), 0);

  // Live Totals for Preview
  const liveTotals = calculateInvoiceTotals(
      newInv.items || [], 
      newInv.discount || 0, 
      newInv.freightAmount || 0, 
      newInv.freightTaxRate || 0
  );

  if (viewState === 'create') {
      return (
          <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
              <div className="w-full h-full flex flex-col rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
                      <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setViewState('list')}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                            title="Back to List"
                          >
                              <ArrowLeft size={20} />
                          </button>
                          <h2 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                              <FileText className="text-medical-600" /> 
                              <span>New Quotation / Order</span>
                          </h2>
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hidden lg:flex items-center gap-1">
                            <Eye size={14}/> Live Preview Active
                        </span>
                      </div>
                  </div>

                  {/* Mobile View Toggle */}
                  <div className="lg:hidden flex border-b border-slate-200 bg-slate-50 shrink-0">
                      <button 
                        onClick={() => setMobileTab('edit')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'edit' ? 'text-medical-600 border-b-2 border-medical-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                         <PenTool size={16} /> Edit Details
                      </button>
                      <button 
                        onClick={() => setMobileTab('preview')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'preview' ? 'text-medical-600 border-b-2 border-medical-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                         <Eye size={16} /> Live Preview
                      </button>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                      {/* Left Side: Form */}
                      <div className={`w-full lg:w-1/2 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-white ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
                        {/* Quotation Details */}
                        <section>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Quotation Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Reference No.</label>
                                    <input type="text" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                        value={newInv.smcpoNumber} onChange={e => setNewInv({...newInv, smcpoNumber: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                                    <div className="relative">
                                        <input type="date" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                            value={newInv.date} onChange={e => setNewInv({...newInv, date: e.target.value})} />
                                        <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Client Details */}
                        <section>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Client Details</h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Client Name</label>
                                    <input 
                                        type="text" 
                                        list="clients-list"
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                        value={newInv.customerName} 
                                        onChange={e => handleClientChange(e.target.value)} 
                                        placeholder="Start typing to search..."
                                    />
                                    <datalist id="clients-list">
                                        {clients.map(client => (
                                            <option key={client.id} value={client.name}>{client.hospital}</option>
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Client Address</label>
                                    <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 resize-none"
                                        value={newInv.customerAddress} onChange={e => setNewInv({...newInv, customerAddress: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Client GST</label>
                                    <input type="text" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 uppercase"
                                        value={newInv.customerGstin} onChange={e => setNewInv({...newInv, customerGstin: e.target.value})} />
                                </div>
                            </div>
                        </section>

                        {/* Subject */}
                        <section>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Subject</h3>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Subject Line</label>
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                    placeholder="e.g. Quotation for MRI Machine"
                                    value={newInv.subject} onChange={e => setNewInv({...newInv, subject: e.target.value})} />
                            </div>
                        </section>

                        {/* Product Details */}
                        <section>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Product Details</h3>
                            <div className="space-y-6">
                                {(newInv.items || []).map((item, index) => (
                                    <div key={item.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/30 relative group hover:border-medical-200 transition-colors">
                                        <button onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                        
                                        <h4 className="font-bold text-slate-700 mb-4">Product #{index + 1}</h4>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Product Name</label>
                                                <input type="text" list="products-list" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 bg-white"
                                                    value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Search product..." />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Model</label>
                                                    <input type="text" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 bg-white"
                                                        value={item.model || ''} onChange={e => updateItem(item.id, 'model', e.target.value)} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                                                    <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 bg-white"
                                                        value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Quantity Type</label>
                                                <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 bg-white"
                                                    value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}>
                                                    <option>No</option>
                                                    <option>Set</option>
                                                    <option>Box</option>
                                                    <option>Pack</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Features (one per line)</label>
                                                <textarea rows={4} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 bg-white resize-none"
                                                    value={item.features || ''} onChange={e => updateItem(item.id, 'features', e.target.value)} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Rate (List Price)</label>
                                                    <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 bg-white"
                                                        value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 uppercase">GST Rate (%)</label>
                                                    <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 bg-white"
                                                        value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                <button onClick={addItemToInvoice} className="w-full py-3 bg-medical-50 text-medical-700 font-bold rounded-xl border border-medical-100 hover:bg-medical-100 transition-colors text-sm">
                                    + Add Product
                                </button>
                            </div>
                        </section>

                        {/* Charges & Discounts */}
                        <section>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Charges & Discounts</h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Total Discount Amount</label>
                                    <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                        value={newInv.discount} onChange={e => setNewInv({...newInv,discount: Number(e.target.value)})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Freight</label>
                                        <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                            value={newInv.freightAmount} onChange={e => setNewInv({...newInv, freightAmount: Number(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Freight GST Rate (%)</label>
                                        <input type="number" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                            value={newInv.freightTaxRate} onChange={e => setNewInv({...newInv, freightTaxRate: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Terms & Conditions */}
                        <section>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Terms & Conditions</h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Payment Terms</label>
                                    <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 resize-none"
                                        value={newInv.paymentTerms} onChange={e => setNewInv({...newInv, paymentTerms: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Delivery Terms</label>
                                    <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 resize-none"
                                        value={newInv.deliveryTerms} onChange={e => setNewInv({...newInv, deliveryTerms: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Warranty Terms</label>
                                    <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 resize-none"
                                        value={newInv.warrantyTerms} onChange={e => setNewInv({...newInv, warrantyTerms: e.target.value})} />
                                </div>
                            </div>
                        </section>

                        {/* Assets */}
                        <section className="mb-8">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Assets</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {['Logo', 'Signature', 'Stamp'].map(asset => (
                                    <div key={asset} className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer bg-slate-50/50">
                                        <div className="p-2 bg-white rounded-full shadow-sm">
                                            <Image size={20} />
                                        </div>
                                        <span className="text-xs font-bold">{asset}</span>
                                        <button className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded shadow-sm text-slate-600">Choose file</button>
                                        <span className="text-[10px] text-slate-300">No file chosen</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                      </div>
                      
                      {/* Right Side: Live Preview */}
                      <div className={`w-full lg:w-1/2 bg-slate-50 border-l border-slate-200 overflow-y-auto p-4 justify-center custom-scrollbar ${mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'}`}>
                           <div className="bg-white shadow-xl min-h-[1000px] w-full max-w-[210mm] p-4 lg:p-8 origin-top scale-[0.6] sm:scale-75 md:scale-90 lg:scale-[0.85] xl:scale-95 transition-transform duration-200 origin-top-center" style={{ fontFamily: 'Calibri, sans-serif' }}>
                                 {/* --- SREE MEDITEC TEMPLATE (LIVE) --- */}
                                  <div className="text-black border-2 border-black p-0 h-full relative">
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
                                                  <span>SMCPO NO: {newInv.smcpoNumber}</span>
                                                  <span>DATE: {newInv.date}</span>
                                              </div>
                                          </div>
                                          <div className="p-2 text-sm font-bold"></div>
                                      </div>

                                      <div className="grid grid-cols-2 border-b-2 border-black">
                                          <div className="border-r-2 border-black p-2 text-sm font-bold">
                                              <div className="flex justify-between mb-1">
                                                  <span>CPO NO: {newInv.cpoNumber || ''}</span>
                                                  <span>DATE: {newInv.cpoDate || ''}</span>
                                              </div>
                                          </div>
                                          <div className="p-2 text-sm font-bold"></div>
                                      </div>

                                      {/* Address Grid */}
                                      <div className="grid grid-cols-2 border-b-2 border-black">
                                          <div className="border-r-2 border-black p-2 text-sm min-h-[80px]">
                                              <span className="font-bold block mb-1">Name of the Customer and Address:</span>
                                              <p>{newInv.customerName}</p>
                                              <p>{newInv.customerHospital}</p>
                                              <p className="whitespace-pre-wrap">{newInv.customerAddress}</p>
                                          </div>
                                          <div className="p-2 text-sm min-h-[80px]">
                                              <span className="font-bold block mb-1">Delivery Address:</span>
                                              <p className="whitespace-pre-wrap">{newInv.deliveryAddress || newInv.customerAddress}</p>
                                          </div>
                                      </div>

                                      {/* GST Grid */}
                                      <div className="grid grid-cols-2 border-b-2 border-black">
                                          <div className="border-r-2 border-black p-2 text-sm font-bold">
                                              GST No: {newInv.customerGstin || ''}
                                          </div>
                                          <div className="p-2 text-sm font-bold">
                                              GST No: 33AKLPS1234F1Z1
                                          </div>
                                      </div>
                                      
                                      {/* Subject Line if present */}
                                      {newInv.subject && (
                                          <div className="border-b-2 border-black p-2 text-sm">
                                              <span className="font-bold">Sub:</span> {newInv.subject}
                                          </div>
                                      )}

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
                                              {(newInv.items || []).map((item, idx) => {
                                                  const gstValue = (item.amount || 0) * ((item.taxRate || 0) / 100);
                                                  const lineTotal = (item.amount || 0) + gstValue;
                                                  return (
                                                    <tr key={idx} className="border-b border-black">
                                                        <td className="border-r-2 border-black p-1 text-center align-top">{idx + 1}</td>
                                                        <td className="border-r-2 border-black p-1">
                                                            <span className="font-bold block">{item.description}</span>
                                                            {item.model && <span className="block text-[10px]">Model: {item.model}</span>}
                                                            {item.features && (
                                                                <div className="mt-1 text-[10px] whitespace-pre-wrap text-gray-600">{item.features}</div>
                                                            )}
                                                        </td>
                                                        <td className="border-r-2 border-black p-1 text-center align-top">{item.quantity} {item.unit}</td>
                                                        <td className="border-r-2 border-black p-1 text-right align-top">{(item.unitPrice || 0).toLocaleString()}</td>
                                                        <td className="border-r-2 border-black p-1 text-right align-top">{(item.amount || 0).toLocaleString()}</td>
                                                        <td className="border-r-2 border-black p-1 text-center align-top">{item.taxRate}%</td>
                                                        <td className="border-r-2 border-black p-1 text-right align-top">{gstValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                        <td className="p-1 text-right font-bold align-top">{lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                    </tr>
                                                  );
                                              })}
                                              {(!newInv.items || newInv.items.length === 0) && (
                                                  <tr className="border-b border-black">
                                                      <td colSpan={8} className="p-4 text-center text-gray-400 italic">Add products to see details...</td>
                                                  </tr>
                                              )}
                                          </tbody>
                                      </table>

                                      {/* Totals Section */}
                                      <div className="border-b-2 border-black">
                                           <div className="flex border-b border-black">
                                               <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Total</div>
                                               <div className="w-[17%] p-1 text-right font-bold">
                                                   {(liveTotals.subtotal + liveTotals.taxTotal).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                               </div>
                                           </div>
                                           <div className="flex border-b border-black">
                                               <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Discount/Buyback/Adjustment</div>
                                               <div className="w-[17%] p-1 text-right font-bold">
                                                   {(newInv.discount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                               </div>
                                           </div>
                                           {newInv.freightAmount && newInv.freightAmount > 0 ? (
                                               <div className="flex border-b border-black">
                                                    <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Freight & Charges</div>
                                                    <div className="w-[17%] p-1 text-right font-bold">
                                                        {(newInv.freightAmount + (newInv.freightAmount * (newInv.freightTaxRate || 0) / 100)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </div>
                                                </div>
                                           ) : null}
                                           <div className="flex bg-gray-100">
                                               <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Grand Total</div>
                                               <div className="w-[17%] p-1 text-right font-bold text-lg">
                                                   {liveTotals.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                               </div>
                                           </div>
                                      </div>

                                      {/* Delivery Time */}
                                      <div className="border-b-2 border-black flex">
                                          <div className="p-2 text-sm border-r-2 border-black w-1/2 font-bold min-h-[40px]">
                                              Delivery time: {newInv.deliveryTerms?.substring(0, 50)}...
                                          </div>
                                          <div className="p-2 text-sm w-1/2"></div>
                                      </div>

                                      {/* Special Note / Terms */}
                                      <div className="border-b-2 border-black p-2 text-sm min-h-[120px]">
                                          <span className="font-bold">Terms & Conditions:</span>
                                          <div className="mt-1 text-xs space-y-1">
                                              {newInv.paymentTerms && <p><span className="font-semibold">Payment:</span> {newInv.paymentTerms}</p>}
                                              {newInv.deliveryTerms && <p><span className="font-semibold">Delivery:</span> {newInv.deliveryTerms}</p>}
                                              {newInv.warrantyTerms && <p><span className="font-semibold">Warranty:</span> {newInv.warrantyTerms}</p>}
                                          </div>
                                      </div>

                                      {/* Signatures */}
                                      <div className="grid grid-cols-2 text-sm h-32 absolute bottom-0 w-full border-t-2 border-black">
                                          <div className="border-r-2 border-black p-2 flex flex-col justify-end">
                                              <span className="font-bold">Customer seal and signature:</span>
                                          </div>
                                          <div className="p-2 flex flex-col justify-end">
                                              <span className="font-bold">Sreemeditec representative signature:</span>
                                          </div>
                                      </div>
                                  </div>
                           </div>
                      </div>
                  </div>
                  
                  {/* Footer Actions */}
                  <div className="p-4 border-t border-slate-200 bg-slate-50/50 sticky bottom-0 z-20 flex justify-center gap-4 shrink-0">
                      <button onClick={() => setViewState('list')} className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors">
                          Cancel
                      </button>
                      <button onClick={handleSaveInvoice} className="px-6 py-3 bg-gradient-to-r from-medical-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-medical-500/30 transition-all active:scale-95">
                          Generate PDF & Create New
                      </button>
                  </div>
              </div>
               
              {/* Datalist for Product Autocomplete */}
              <datalist id="products-list">
                  {products.map((p, idx) => (
                      <option key={idx} value={p.name} />
                  ))}
              </datalist>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
          <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-6 rounded-3xl shadow-lg shadow-emerald-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Receipt size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider mb-1">Total Revenue Collected</p>
                <h3 className="text-3xl font-black tracking-tight">₹{formatIndianNumber(totalRevenue)}</h3>
                <p className="text-xs text-emerald-200/60 mt-1 font-medium">From {invoices.filter(i => i.status === 'Paid' || i.status === 'Partial').length} active orders</p>
             </div>
          </div>

          <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-6 rounded-3xl shadow-lg shadow-blue-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-blue-200/80 uppercase tracking-wider mb-1">Outstanding Balance</p>
                <h3 className="text-3xl font-black tracking-tight">₹{formatIndianNumber(pendingAmount)}</h3>
                <p className="text-xs text-blue-200/60 mt-1 font-medium">Pending collections</p>
             </div>
          </div>

          <div className="bg-gradient-to-br from-rose-800 to-red-900 p-6 rounded-3xl shadow-lg shadow-rose-900/20 text-white flex flex-col justify-between group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertCircle size={100} />
             </div>
             <div className="relative z-10">
                <p className="text-xs font-bold text-rose-200/80 uppercase tracking-wider mb-1">Overdue Amount</p>
                <h3 className="text-3xl font-black tracking-tight">₹{formatIndianNumber(overdueAmount)}</h3>
                <p className="text-xs text-rose-200/60 mt-1 font-medium">Immediate attention required</p>
             </div>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg"><Receipt size={20} /></div> Invoices & Orders
            </h2>
            <div className="flex gap-3">
                 <button 
                    onClick={() => { setViewState('create'); setMobileTab('edit'); }}
                    className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-medical-500/30 transition-transform active:scale-95">
                    <Plus size={18} /> New Order
                </button>
            </div>
        </div>

        {/* Invoice List */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 min-w-[900px]">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4">Ref / Invoice #</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4 text-right">Grand Total</th>
                        <th className="px-6 py-4 text-right">Balance Due</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => viewInvoice(invoice)}>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{invoice.invoiceNumber}</div>
                                <div className="text-xs text-slate-400 font-medium">{invoice.date}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-700">{invoice.customerName}</div>
                                <div className="text-xs text-slate-500">{invoice.customerHospital}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-600">
                                ₹{invoice.grandTotal.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                                ₹{(invoice.balanceDue ?? invoice.grandTotal).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    invoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    invoice.status === 'Partial' ? 'bg-blue-50 text-blue-600 border-blue-100' :
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

      {/* View Template Modal (Printable) */}
      {showViewModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl print:hidden">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={20} /> Customer Purchase Order / Quotation Preview
                      </h3>
                      <div className="flex gap-2">
                          {selectedInvoice.status !== 'Paid' && selectedInvoice.balanceDue && selectedInvoice.balanceDue > 0 && (
                             <button 
                                onClick={() => setShowPaymentModal(true)} 
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <CreditCard size={16} /> Record Payment
                            </button>
                          )}
                          <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 bg-medical-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-medical-700 transition-colors shadow-sm" 
                            title="Download / Print PDF">
                              <Download size={16} /> Download / Print
                          </button>
                          <button onClick={() => setShowViewModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                              <X size={20} />
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white p-8 print:p-0" id="invoice-print">
                      
                      {/* --- SREE MEDITEC TEMPLATE --- */}
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
                                  {/* Right side blank/Subject can go here if needed, but keeping template layout */}
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
                          
                          {/* Subject Line if present */}
                          {selectedInvoice.subject && (
                              <div className="border-b-2 border-black p-2 text-sm">
                                  <span className="font-bold">Sub:</span> {selectedInvoice.subject}
                              </div>
                          )}

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
                                      const lineTotal = item.amount + gstValue;
                                      return (
                                        <tr key={idx} className="border-b border-black">
                                            <td className="border-r-2 border-black p-1 text-center align-top">{idx + 1}</td>
                                            <td className="border-r-2 border-black p-1">
                                                <span className="font-bold block">{item.description}</span>
                                                {item.model && <span className="block text-[10px]">Model: {item.model}</span>}
                                                {item.features && (
                                                    <div className="mt-1 text-[10px] whitespace-pre-wrap text-gray-600">{item.features}</div>
                                                )}
                                            </td>
                                            <td className="border-r-2 border-black p-1 text-center align-top">{item.quantity} {item.unit}</td>
                                            <td className="border-r-2 border-black p-1 text-right align-top">{item.unitPrice.toLocaleString()}</td>
                                            <td className="border-r-2 border-black p-1 text-right align-top">{item.amount.toLocaleString()}</td>
                                            <td className="border-r-2 border-black p-1 text-center align-top">{item.taxRate}%</td>
                                            <td className="border-r-2 border-black p-1 text-right align-top">{gstValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                            <td className="p-1 text-right font-bold align-top">{lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                        </tr>
                                      );
                                  })}
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
                                   <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Discount/Buyback/Adjustment</div>
                                   <div className="w-[17%] p-1 text-right font-bold">
                                       {(selectedInvoice.discount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                   </div>
                               </div>
                               {selectedInvoice.freightAmount && selectedInvoice.freightAmount > 0 && (
                                   <div className="flex border-b border-black">
                                        <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Freight & Charges</div>
                                        <div className="w-[17%] p-1 text-right font-bold">
                                            {(selectedInvoice.freightAmount + (selectedInvoice.freightAmount * (selectedInvoice.freightTaxRate || 0) / 100)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </div>
                                    </div>
                               )}
                               <div className="flex bg-gray-100">
                                   <div className="flex-1 p-1 text-right font-bold border-r-2 border-black pr-2">Grand Total</div>
                                   <div className="w-[17%] p-1 text-right font-bold text-lg">
                                       {selectedInvoice.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                   </div>
                               </div>
                          </div>
                          
                          {/* Payment History Section (New) */}
                           <div className="border-b-2 border-black p-2 text-sm bg-gray-50">
                               <div className="flex justify-between font-bold mb-1">
                                   <span>Payment History:</span>
                                   <span>Balance Due: ₹{((selectedInvoice.balanceDue ?? selectedInvoice.grandTotal)).toLocaleString()}</span>
                               </div>
                               {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                                   <ul className="list-disc pl-5 text-xs">
                                       {selectedInvoice.payments.map(p => (
                                           <li key={p.id}>Received ₹{p.amount.toLocaleString()} on {p.date} via {p.mode}</li>
                                       ))}
                                   </ul>
                               ) : (
                                   <span className="text-xs italic text-gray-500">No payments recorded yet.</span>
                               )}
                          </div>

                          {/* Advance Payment Details (Legacy Template Field) */}
                          <div className="border-b-2 border-black p-2 text-sm">
                              <span className="font-bold">Advance Payment details (Initial):</span>
                              {selectedInvoice.advanceAmount ? (
                                  <span className="ml-2">₹{selectedInvoice.advanceAmount} received on {selectedInvoice.advanceDate} via {selectedInvoice.advanceMode}</span>
                              ) : (
                                  <span className="ml-2">N/A</span>
                              )}
                          </div>

                          {/* Payment DETAILS Box */}
                          <div className="border-b-2 border-black">
                              <div className="bg-gray-100 text-center font-bold text-sm border-b-2 border-black py-1">PAYMENT DETAILS</div>
                              <div className="grid grid-cols-4 text-sm divide-x-2 divide-black">
                                  <div className="p-2 h-16">
                                      <span className="font-bold block">Bank and Branch:</span>
                                      {selectedInvoice.bankDetails || 'HDFC Bank, Chennai'}
                                  </div>
                                  <div className="p-2">
                                      <span className="font-bold block">Mode of payment:</span>
                                      {selectedInvoice.advanceMode || 'Cheque / NEFT'}
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
                                  
                              </div>
                          </div>

                          {/* Special Note / Terms */}
                          <div className="border-b-2 border-black p-2 text-sm">
                              <span className="font-bold">Terms & Conditions:</span>
                              <div className="mt-1 text-xs space-y-1">
                                  {selectedInvoice.paymentTerms && <p><span className="font-semibold">Payment:</span> {selectedInvoice.paymentTerms}</p>}
                                  {selectedInvoice.deliveryTerms && <p><span className="font-semibold">Delivery:</span> {selectedInvoice.deliveryTerms}</p>}
                                  {selectedInvoice.warrantyTerms && <p><span className="font-semibold">Warranty:</span> {selectedInvoice.warrantyTerms}</p>}
                                  {selectedInvoice.specialNote && !selectedInvoice.paymentTerms && <p>{selectedInvoice.specialNote}</p>}
                              </div>
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
                  </div>
              </div>
          </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                    <h3 className="font-bold text-slate-800">Record Payment</h3>
                    <button onClick={() => setShowPaymentModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                        <p className="text-xs text-blue-500 font-bold uppercase tracking-wide">Balance Due</p>
                        <p className="text-2xl font-black text-blue-700">₹{(selectedInvoice.balanceDue ?? selectedInvoice.grandTotal).toLocaleString()}</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Payment Amount (₹)</label>
                        <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2 font-bold text-lg outline-none focus:border-medical-500"
                            value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Date</label>
                        <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                            value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mode</label>
                        <select className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-medical-500"
                            value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                            <option>Bank Transfer</option>
                            <option>Cash</option>
                            <option>Cheque</option>
                            <option>UPI</option>
                        </select>
                    </div>
                </div>
                <div className="p-5 pt-0">
                    <button onClick={handleRecordPayment} className="w-full bg-medical-600 text-white font-bold py-3 rounded-xl hover:bg-medical-700 transition-colors shadow-lg shadow-medical-500/30">
                        Confirm Payment
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
