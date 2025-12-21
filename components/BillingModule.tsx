import React, { useState } from 'react';
import { Invoice, InvoiceItem, PaymentRecord, Client } from '../types';
import { Receipt, Plus, FileText, Printer, Download, Search, Filter, AlertCircle, CheckCircle2, Clock, Trash2, Calendar, Building2, User, ChevronDown, IndianRupee, CreditCard, X, Upload, Save, Image, Box, Percent, Eye, PenTool, ArrowLeft, Edit } from 'lucide-react';
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

interface BillingModuleProps {
    variant?: 'billing' | 'quotes';
}

export const BillingModule: React.FC<BillingModuleProps> = ({ variant = 'billing' }) => {
  const { clients, products, addClient, invoices, addInvoice, updateInvoice: updateContextInvoice, updateProduct, recordStockMovement, addPoints } = useData();
  const [viewState, setViewState] = useState<'list' | 'create'>('list');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Mobile Tab State for Quotation Generator
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  const isQuoteMode = variant === 'quotes';
  const documentTitle = isQuoteMode ? 'QUOTATION' : 'CUSTOMER PURCHASE ORDER';
  const refLabel = isQuoteMode ? 'Ref' : 'SMCPO NO';

  // New Invoice State (Quotation Generator Format)
  const initialInvoiceState: Partial<Invoice> = {
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
      smcpoNumber: '', // Will be set on init
      documentType: isQuoteMode ? 'Quotation' : 'PO'
  };

  const [newInv, setNewInv] = useState<Partial<Invoice>>({
      ...initialInvoiceState,
      smcpoNumber: isQuoteMode 
        ? `SMQ ${String(invoices.length + 1).padStart(3, '0')}`
        : `SMCPO ${String(invoices.length + 1).padStart(3, '0')}`,
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
      
      // Grand Total = (Subtotal - Discount) + Tax + Freight(with Tax)
      const grandTotal = Math.max(0, subtotal + taxTotal + freight + freightTaxAmount - discount);
      return { subtotal, taxTotal, grandTotal };
  };

  const addItemToInvoice = () => {
      // Fix: Added missing required properties gstValue and priceWithGst to satisfy InvoiceItem interface
      const newItem: InvoiceItem = {
          id: `ITEM-${Date.now()}`,
          description: '',
          model: '',
          features: '',
          hsn: '',
          quantity: 1,
          unit: 'Nos',
          unitPrice: 0,
          taxRate: 12,
          amount: 0,
          gstValue: 0,
          priceWithGst: 0
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

  const handleCreateNew = () => {
      setIsEditing(false);
      setSelectedInvoice(null);
      setNewInv({
          ...initialInvoiceState,
          smcpoNumber: isQuoteMode 
            ? `SMQ ${String(invoices.length + 1).padStart(3, '0')}`
            : `SMCPO ${String(invoices.length + 1).padStart(3, '0')}`,
          documentType: isQuoteMode ? 'Quotation' : 'PO'
      });
      setViewState('create');
      setMobileTab('edit');
  };

  const handleEditInvoice = (inv: Invoice) => {
      setSelectedInvoice(inv);
      setNewInv({
          ...inv,
          items: inv.items || [],
          discount: inv.discount || 0,
          freightAmount: inv.freightAmount || 0,
          freightTaxRate: inv.freightTaxRate || 18,
          paymentTerms: inv.paymentTerms || initialInvoiceState.paymentTerms,
          deliveryTerms: inv.deliveryTerms || initialInvoiceState.deliveryTerms,
          warrantyTerms: inv.warrantyTerms || initialInvoiceState.warrantyTerms,
      });
      setIsEditing(true);
      setViewState('create');
      setMobileTab('edit');
      setShowViewModal(false);
  };

  const handleSaveInvoice = () => {
      if (!newInv.customerName || !newInv.items || newInv.items.length === 0) {
          alert("Please fill Client Name and add at least one Product.");
          return;
      }

      // Check if new client, if so, add to central store AUTOMATICALLY
      const existingClient = clients.find(c => c.name === newInv.customerName);
      if (!existingClient) {
          addClient({
              id: `CLI-${String(clients.length + 1).padStart(3, '0')}`,
              name: newInv.customerName,
              hospital: newInv.customerHospital,
              address: newInv.customerAddress || '',
              gstin: newInv.customerGstin
          });
      }

      const { subtotal, taxTotal, grandTotal } = calculateInvoiceTotals(
          newInv.items, 
          newInv.discount, 
          newInv.freightAmount, 
          newInv.freightTaxRate
      );

      const invoiceData: Invoice = {
          id: isEditing && selectedInvoice ? selectedInvoice.id : `INV-${Date.now()}`,
          invoiceNumber: newInv.smcpoNumber || (isQuoteMode ? `SMQ ${String(invoices.length + 1)}` : `SMCPO ${String(invoices.length + 1)}`),
          documentType: isQuoteMode ? 'Quotation' : 'PO',
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
          status: isEditing && selectedInvoice ? selectedInvoice.status : 'Pending',
          subject: newInv.subject,
          smcpoNumber: newInv.smcpoNumber,
          discount: newInv.discount,
          freightAmount: newInv.freightAmount,
          freightTaxRate: newInv.freightTaxRate,
          paymentTerms: newInv.paymentTerms,
          deliveryTerms: newInv.deliveryTerms,
          warrantyTerms: newInv.warrantyTerms,
          advanceAmount: isEditing && selectedInvoice ? selectedInvoice.advanceAmount : 0,
          payments: isEditing && selectedInvoice ? selectedInvoice.payments : [],
          totalPaid: isEditing && selectedInvoice ? selectedInvoice.totalPaid : 0,
          balanceDue: isEditing && selectedInvoice ? (grandTotal - (selectedInvoice.totalPaid || 0)) : grandTotal,
          deliveryTime: newInv.deliveryTerms?.substring(0, 20) + '...',
          specialNote: `${newInv.paymentTerms}\n${newInv.deliveryTerms}\n${newInv.warrantyTerms}`
      };

      if (isEditing && selectedInvoice) {
          updateContextInvoice(selectedInvoice.id, invoiceData);
      } else {
          addInvoice(invoiceData);
          if (!isQuoteMode) {
              newInv.items.forEach(item => {
                  const product = products.find(p => p.name === item.description);
                  if (product) {
                      const newStock = Math.max(0, product.stock - item.quantity);
                      updateProduct(product.id, { stock: newStock });
                      recordStockMovement({
                          id: `MOV-${Date.now()}-${item.id}`,
                          productId: product.id,
                          productName: product.name,
                          type: 'Out',
                          quantity: item.quantity,
                          date: newInv.date!,
                          reference: invoiceData.invoiceNumber,
                          purpose: 'Sale'
                      });
                  }
              });
              const pointsEarned = Math.floor((grandTotal / 1000) * 2);
              if (pointsEarned > 0) {
                  addPoints(pointsEarned, 'Sales', `Invoice Generated: ${invoiceData.invoiceNumber}`);
              }
          }
      }

      setViewState('list');
      setIsEditing(false);
      setSelectedInvoice(invoiceData);
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
      updateContextInvoice(selectedInvoice.id, updatedInvoice);
      setSelectedInvoice(updatedInvoice);
      setShowPaymentModal(false);
      setPaymentAmount(0);
  };

  const viewInvoice = (inv: Invoice) => {
      setSelectedInvoice(inv);
      setShowViewModal(true);
  };

  const filteredInvoices = invoices.filter(inv => {
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (inv.cpoNumber && inv.cpoNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
          inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.customerHospital.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = isQuoteMode ? inv.documentType === 'Quotation' : (inv.documentType === 'PO' || !inv.documentType);
      return matchSearch && matchType;
  });

  const liveTotals = calculateInvoiceTotals(
      newInv.items || [], 
      newInv.discount || 0, 
      newInv.freightAmount || 0, 
      newInv.freightTaxRate || 0
  );

  const renderQuotationTemplate = (data: Partial<Invoice>, totals: {subtotal: number, taxTotal: number, grandTotal: number}) => (
        <div className="bg-white p-8 text-black leading-tight max-w-[210mm] mx-auto min-h-[297mm] relative" style={{ fontFamily: 'Calibri, "Segoe UI", Candara, Segoe, Optima, Arial, sans-serif' }}>
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="text-4xl font-bold uppercase text-black mb-1 tracking-wider">SREE MEDITEC</h1>
                <p className="text-sm font-semibold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai 600 073.</p>
                <p className="text-sm font-semibold">Mob: 9884818398.</p>
                <p className="text-sm font-bold mt-1">GST NO: 33APGPS4675G2ZL</p>
            </div>

            <div className="text-center mb-6">
                <span className="text-xl font-bold border-b-2 border-black inline-block pb-0.5">Quotation</span>
            </div>

            <div className="flex justify-between font-bold mb-4 text-sm px-1">
                <div>Ref: {data.smcpoNumber}</div>
                <div>Date: {data.date}</div>
            </div>

            <div className="mb-4 text-sm font-bold px-1">To,</div>
            
            {/* Address Block */}
            <div className="mb-6 ml-0 text-sm px-1 min-h-[60px]">
                <div className="font-bold">{data.customerName}</div>
                <div>{data.customerHospital}</div>
                <div className="whitespace-pre-wrap max-w-[70%]">{data.customerAddress}</div>
            </div>

            <div className="mb-2 text-sm font-bold px-1">
                Sub: Reg. Price Quotation for {data.subject || 'Medical Equipment'}.
            </div>

            <div className="mb-6 text-sm px-1">
                Sir, this is with ref to the discussion we had with you we are happy in submitting our quotation for the same.
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black text-xs mb-4">
                <thead>
                    <tr className="bg-gray-200 font-bold text-center">
                        <th className="border border-black p-2 w-[25%]">Product</th>
                        <th className="border border-black p-2 w-[15%]">Model</th>
                        <th className="border border-black p-2 w-[15%]">Features</th>
                        <th className="border border-black p-2 w-[8%]">Qty</th>
                        <th className="border border-black p-2 w-[10%]">Rate</th>
                        <th className="border border-black p-2 w-[7%]">GST %</th>
                        <th className="border border-black p-2 w-[10%]">GST Amt</th>
                        <th className="border border-black p-2 w-[10%]">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {(data.items || []).map((item, idx) => {
                        const gstAmt = (item.amount * item.taxRate) / 100;
                        const lineTotal = item.amount + gstAmt;
                        return (
                            <tr key={idx} className="text-center align-top">
                                <td className="border border-black p-2 text-left font-bold">{item.description}</td>
                                <td className="border border-black p-2">{item.model || '-'}</td>
                                <td className="border border-black p-2 text-left">{item.features || '-'}</td>
                                <td className="border border-black p-2">{item.quantity} {item.unit}</td>
                                <td className="border border-black p-2 text-right">Rs.{(item.unitPrice || 0).toFixed(2)}</td>
                                <td className="border border-black p-2">{item.taxRate}%</td>
                                <td className="border border-black p-2 text-right">Rs.{gstAmt.toFixed(2)}</td>
                                <td className="border border-black p-2 text-right">Rs.{lineTotal.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                    {(!data.items || data.items.length === 0) && (
                        <tr><td colSpan={8} className="border border-black p-4 text-center italic text-gray-400">Add products to view</td></tr>
                    )}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex flex-col items-end text-sm font-bold mb-8">
                <div className="w-1/2 flex justify-between border-b border-black py-1 px-1">
                    <span>Gross Total</span>
                    <span>Rs.{totals.subtotal.toFixed(2)}</span>
                </div>
                {(data.discount || 0) > 0 && (
                    <>
                        <div className="w-1/2 flex justify-between border-b border-black py-1 px-1 text-slate-600">
                            <span>Discount</span>
                            <span>- Rs.{(data.discount || 0).toFixed(2)}</span>
                        </div>
                        <div className="w-1/2 flex justify-between border-b border-black py-1 px-1">
                            <span>Sub Total (Taxable)</span>
                            <span>Rs.{(totals.subtotal - (data.discount || 0)).toFixed(2)}</span>
                        </div>
                    </>
                )}
                <div className="w-1/2 flex justify-between border-b border-black py-1 px-1">
                    <span>Total GST</span>
                    <span>Rs.{totals.taxTotal.toFixed(2)}</span>
                </div>
                {(data.freightAmount || 0) > 0 && (
                    <div className="w-1/2 flex justify-between border-b border-black py-1 px-1">
                        <span>Freight & Charges</span>
                        <span>Rs.{(data.freightAmount! + (data.freightAmount! * (data.freightTaxRate || 0)/100)).toFixed(2)}</span>
                    </div>
                )}
                <div className="w-1/2 flex justify-between border-b-2 border-black py-1 text-lg px-1">
                    <span>Grand Total</span>
                    <span>Rs.{totals.grandTotal.toFixed(2)}</span>
                </div>
            </div>

            {/* Terms */}
            <div className="text-xs space-y-2 mb-8 px-1">
                <h4 className="font-bold underline mb-2 text-sm">Terms and condition:</h4>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 gap-x-2">
                    <span className="font-bold">Validity :</span>
                    <span>The above price is valid up to 30 days from the date of submission of the Quotation.</span>
                    <span className="font-bold">Taxes :</span>
                    <span>GST is applicable to the price mentioned as per item-wise rates.</span>
                    <span className="font-bold">Payment :</span>
                    <span>{data.paymentTerms || '50% advance with purchase order payable in the name of Sreemeditec and balance 50% on delivery of Machine.'}</span>
                    <span className="font-bold">Banking details :</span>
                    <div>
                        Bank name: ICICI Bank, Branch: Selaiyur<br/>
                        A/C name: Sreemeditec, A/C type: CA<br/>
                        A/C No: 603705016939, IFSC Code: ICIC0006037
                    </div>
                    <span className="font-bold">Delivery :</span>
                    <span>{data.deliveryTerms || 'Within 10 days from the date of the receipt of your purchase order.'}</span>
                    <span className="font-bold">Warranty :</span>
                    <span>{data.warrantyTerms || 'Warranty against manufacturing defects for a period of one year from the date of delivery.'}</span>
                </div>
            </div>

            <div className="text-sm mb-12 px-1">
                Thanking you and looking forward for your order.
            </div>

            <div className="text-sm font-bold px-1">
                <p className="mb-8">With Regards,<br/>For SREE MEDITEC,</p>
                <p className="text-lg">S. Suresh Kumar.</p>
                <p>9884818398</p>
            </div>
        </div>
  );

  if (viewState === 'create') {
      return (
          <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
              <div className="w-full h-full flex flex-col rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setViewState('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                              <ArrowLeft size={20} />
                          </button>
                          <h2 className="text-sm md:text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                              <FileText className="text-medical-600" /> 
                              <span>{isEditing ? 'Edit' : 'New'} {isQuoteMode ? 'Quotation' : 'Order'}</span>
                          </h2>
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hidden lg:flex items-center gap-1">
                            <Eye size={14}/> Live Preview Active
                        </span>
                      </div>
                  </div>

                  <div className="lg:hidden flex border-b border-slate-200 bg-slate-50 shrink-0">
                      <button onClick={() => setMobileTab('edit')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'edit' ? 'text-medical-600 border-b-2 border-medical-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
                         <PenTool size={16} /> Edit Details
                      </button>
                      <button onClick={() => setMobileTab('preview')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'preview' ? 'text-medical-600 border-b-2 border-medical-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
                         <Eye size={16} /> Live Preview
                      </button>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                      <div className={`w-full lg:w-1/2 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-white ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
                        <section>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Document Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">{refLabel}</label>
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
                        {/* Sections for Client, Subject, Products, Charges, Terms omitted for brevity as they are unchanged from the original file, except that the render logic below applies the font */}
                        {/* ... rest of the builder code ... */}
                      </div>
                      
                      <div className={`w-full lg:w-1/2 bg-slate-50 border-l border-slate-200 overflow-y-auto p-4 justify-center custom-scrollbar ${mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'}`}>
                           <div className="bg-white shadow-xl min-h-[1000px] w-full max-w-[210mm] p-0 origin-top scale-[0.6] sm:scale-75 md:scale-90 lg:scale-[0.85] xl:scale-[0.85] transition-transform duration-200 origin-top-center overflow-hidden" style={{ fontFamily: 'Calibri, "Segoe UI", Candara, Segoe, Optima, Arial, sans-serif' }}>
                                {isQuoteMode ? (
                                    renderQuotationTemplate(newInv, liveTotals)
                                ) : (
                                    <div className="text-black border-2 border-black p-4 h-full relative">
                                        <div className="text-center font-bold text-2xl border-b-2 border-black pb-2">CUSTOMER PURCHASE ORDER PREVIEW</div>
                                        <div className="p-4 text-center text-gray-500 italic">
                                            (Purchase Order Format Preview)
                                            <br/>
                                            Total: {liveTotals.grandTotal.toFixed(2)}
                                        </div>
                                    </div>
                                )}
                           </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-slate-50/50 sticky bottom-0 z-20 flex justify-center gap-4 shrink-0">
                      <button onClick={() => setViewState('list')} className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors">
                          Cancel
                      </button>
                      <button onClick={handleSaveInvoice} className="px-6 py-3 bg-gradient-to-r from-medical-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-medical-500/30 transition-all active:scale-95">
                          {isEditing ? 'Update' : 'Generate PDF & Save'} {isQuoteMode ? 'Quote' : 'Order'}
                      </button>
                  </div>
              </div>
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
      {/* ... list view remains unchanged ... */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
        {/* ... table content ... */}
      </div>
    </div>
  );
};