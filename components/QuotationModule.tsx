import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, User, Save, PenTool, 
    History, Briefcase, FileText, 
    Download, IndianRupee, Sparkles, CheckCircle2, Edit, Eye, Truck, Shield, Upload, X, RefreshCw, Filter, List as ListIcon, Calendar, Building2, MapPin, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
        return inWords(Math.floor(num / 10000000)) + 'Crore ' + (num % 10000000 !== 0 ? inWords(num % 10000000) : '');
    };
    const result = inWords(Math.floor(num));
    return result ? '((' + result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' only))' : '';
};

const calculateDetailedTotals = (quote: Partial<Invoice>) => {
    const items = quote.items || [];
    const grossTotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const totalDiscountAmount = quote.discount || 0;
    const subTotal = grossTotal - totalDiscountAmount;
    
    const totalGst = items.reduce((sum, p) => {
        const itemGross = p.unitPrice * p.quantity;
        const itemDiscount = grossTotal > 0 ? (itemGross / grossTotal) * totalDiscountAmount : 0;
        const itemTaxable = itemGross - itemDiscount;
        return sum + (itemTaxable * (p.taxRate / 100));
    }, 0);

    const freightAmount = quote.freightAmount || 0;
    const freightGstRate = quote.freightTaxRate || 18;
    const freightGstAmount = (freightAmount * freightGstRate) / 100;
    
    const grandTotal = subTotal + totalGst + freightAmount + freightGstAmount;

    return { grossTotal, totalDiscountAmount, subTotal, totalGst, freightAmount, freightGstAmount, freightGstRate, grandTotal };
};

export const QuotationModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice } = useData();
    
    // UI View State
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    
    // Builder specific tabs
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    
    const [editingId, setEditingId] = useState<string | null>(null);

    const [quote, setQuote] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        discount: 0,
        freightAmount: 0,
        freightTaxRate: 18,
        subject: '',
        status: 'Draft',
        paymentTerms: '50% advance with purchase order payable in the name of Sreemeditec and balance 50% on delivery of Machine.',
        deliveryTerms: 'Within 10 days from the date of the receipt of your purchase order.',
        warrantyTerms: 'Warranty against manufacturing defects for a period of one year from the date of delivery.',
        bankAndBranch: 'ICICI Bank, Branch: Selaiyur',
        accountNo: '603705016939'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !quote.invoiceNumber) {
            setQuote(prev => ({
                ...prev,
                invoiceNumber: `SMQ ${String(invoices.filter(i => i.documentType === 'Quotation').length + 137).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, invoices]);

    const handleAddItem = (product?: any) => {
        const unitPrice = product?.price || 0;
        const taxRate = product?.taxRate || 12;
        const amount = unitPrice * 1;
        const gstValue = amount * (taxRate / 100);

        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: product?.name || '',
            model: product?.model || '',
            features: product?.description || '',
            hsn: product?.hsn || '',
            quantity: 1,
            unit: 'no',
            unitPrice,
            taxRate,
            amount,
            gstValue,
            priceWithGst: amount + gstValue
        };
        setQuote(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const handleClientSelect = (inputValue: string) => {
        const client = clients.find(c => c.name === inputValue || c.hospital === inputValue);
        if (client) {
            setQuote(prev => ({
                ...prev,
                customerName: client.name,
                customerHospital: client.hospital || '',
                customerAddress: client.address || '',
                customerGstin: client.gstin || ''
            }));
        } else {
            setQuote(prev => ({ ...prev, customerName: inputValue }));
        }
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setQuote(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.price;
                            updated.taxRate = masterProd.taxRate || 12;
                            updated.model = masterProd.model || '';
                            updated.features = masterProd.description || '';
                            updated.hsn = masterProd.hsn || '';
                        }
                    }
                    updated.amount = updated.quantity * updated.unitPrice;
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const handleSave = (status: 'Draft' | 'Finalized') => {
        if (!quote.customerName || !quote.items?.length) {
            alert("Please fill client details and add items.");
            return;
        }
        const totals = calculateDetailedTotals(quote);
        const finalData: Invoice = {
            ...quote as Invoice,
            id: editingId || `QT-${Date.now()}`,
            documentType: 'Quotation',
            subtotal: totals.subTotal,
            taxTotal: totals.totalGst,
            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        
        setViewState('history');
        setEditingId(null);
    };

    const handleEdit = (inv: Invoice) => {
        setQuote(inv);
        setEditingId(inv.id);
        setViewState('builder');
        setBuilderTab('form');
    };

    const resetBuilder = () => {
        setEditingId(null);
        setQuote({
            invoiceNumber: `SMQ ${String(invoices.filter(i => i.documentType === 'Quotation').length + 137).padStart(3, '0')}`,
            date: new Date().toISOString().split('T')[0],
            items: [],
            discount: 0,
            freightAmount: 0,
            freightTaxRate: 18,
            subject: '',
            status: 'Draft',
            paymentTerms: '50% advance with purchase order payable in the name of Sreemeditec and balance 50% on delivery of Machine.',
            deliveryTerms: 'Within 10 days from the date of the receipt of your purchase order.',
            warrantyTerms: 'Warranty against manufacturing defects for a period of one year from the date of delivery.',
            bankAndBranch: 'ICICI Bank, Branch: Selaiyur',
            accountNo: '603705016939'
        });
        setViewState('builder');
        setBuilderTab('form');
    };

    const totals = useMemo(() => calculateDetailedTotals(quote), [quote]);

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button 
                    onClick={() => setViewState('history')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-mint-200 text-teal-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <History size={16} /> Quotation History
                </button>
                <button 
                    onClick={resetBuilder} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-mint-200 text-teal-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <PenTool size={16} /> New Quotation
                </button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Past Quotations</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-48 sm:w-64" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Quote #</th>
                                    <th className="px-6 py-4">Consignee</th>
                                    <th className="px-6 py-4 text-right">Grand Total</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.filter(inv => inv.documentType === 'Quotation').map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black text-slate-800">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{inv.customerName}</div>
                                            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{inv.customerHospital}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-teal-700">₹{inv.grandTotal.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(inv)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white hover:shadow-sm transition-all"><Edit size={18} /></button>
                                                <button className="p-2 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-white hover:shadow-sm transition-all"><Download size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="lg:hidden flex bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white ${builderTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Registry</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reference No.</label>
                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={quote.invoiceNumber} onChange={e => setQuote({...quote, invoiceNumber: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={quote.date} onChange={e => setQuote({...quote, date: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Consignee Identity</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                                        <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={quote.customerName || ''} onChange={e => handleClientSelect(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registered Address</label>
                                        <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={quote.customerAddress || ''} onChange={e => setQuote({...quote, customerAddress: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quotation Subject</label>
                                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={quote.subject || ''} onChange={e => setQuote({...quote, subject: e.target.value})} placeholder="e.g. Reg. Price Quotation for Ultrasound Machines" />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Line Items</h3><button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1 rounded-lg border border-medical-100 hover:bg-medical-100">+ Manual Row</button></div>
                                <div className="space-y-4">
                                    {quote.items?.map((item) => (
                                        <div key={item.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                                            <button onClick={() => setQuote({...quote, items: quote.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-12"><input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                                <div className="col-span-6"><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold" placeholder="Model" value={item.model} onChange={e => updateItem(item.id, 'model', e.target.value)} /></div>
                                                <div className="col-span-6"><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold" placeholder="Features" value={item.features} onChange={e => updateItem(item.id, 'features', e.target.value)} /></div>
                                                <div className="col-span-3"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="Qty" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                                <div className="col-span-5"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right" placeholder="Rate" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                                <div className="col-span-4"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="GST %" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> Logistics & Banking</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Freight Amt</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={quote.freightAmount || 0} onChange={e => setQuote({...quote, freightAmount: Number(e.target.value)})} /></div>
                                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Freight GST%</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={quote.freightTaxRate || 18} onChange={e => setQuote({...quote, freightTaxRate: Number(e.target.value)})} /></div>
                                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Discount</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-rose-500" value={quote.discount || 0} onChange={e => setQuote({...quote, discount: Number(e.target.value)})} /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bank & Branch</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={quote.bankAndBranch} onChange={e => setQuote({...quote, bankAndBranch: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Acc No:</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={quote.accountNo} onChange={e => setQuote({...quote, accountNo: e.target.value})} /></div>
                                </div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payment Terms</label><textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" value={quote.paymentTerms} onChange={e => setQuote({...quote, paymentTerms: e.target.value})} /></div>
                            </section>

                            <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50">
                                <button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={() => handleSave('Draft')} className="flex-1 py-3 bg-white border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-50 transition-all">Save Draft</button>
                                <button onClick={() => handleSave('Finalized')} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Finalize Quote</button>
                            </div>
                        </div>

                        <div className={`w-full lg:w-1/2 bg-[#e0f2f1] border-l border-slate-200 flex flex-col lg:overflow-hidden ${builderTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="hidden lg:flex bg-[#81D7D3] p-1 shrink-0"><button onClick={() => setBuilderTab('preview')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'preview' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Live Preview</button><button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'catalog' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Product Catalog</button></div>
                            <div className="flex-1 overflow-hidden relative">
                                <div className={`h-full overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar bg-slate-50/50 ${builderTab === 'preview' ? 'flex' : 'hidden'}`}>
                                     <div className="bg-white shadow-2xl text-black w-[210mm] min-h-[297mm] h-fit p-[20mm] origin-top scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.6] xl:scale-[0.8] 2xl:scale-[0.95] transition-all duration-300" style={{ fontFamily: 'Calibri, "Segoe UI", Candara, Segoe, Optima, Arial, sans-serif' }}>
                                        <div className="text-center mb-8 border-b-2 border-black pb-4"><h1 className="text-5xl font-black uppercase text-black mb-1 tracking-tighter">SREE MEDITEC</h1><p className="text-sm font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajajipakkam, Chennai 600 073.</p><p className="text-sm font-bold">Mob: 9884818398 • GST NO: 33APGPS4675G2ZL</p></div>
                                        <div className="text-center mb-10"><h2 className="text-3xl font-black border-b-4 border-black inline-block px-10 pb-1 uppercase tracking-widest">Quotation</h2></div>
                                        <div className="flex justify-between font-bold text-lg mb-10 px-2"><span>Ref: {quote.invoiceNumber}</span><span>Date: {formatDateDDMMYYYY(quote.date)}</span></div>
                                        <div className="text-lg mb-8 px-2"><p className="font-bold mb-1">To,</p><div className="min-h-[100px] font-medium"><div className="font-black uppercase">{quote.customerName || '------------------'}</div><div className="whitespace-pre-wrap text-slate-700">{quote.customerAddress}</div></div></div>
                                        <div className="text-lg font-black mb-10 px-2 italic">Sub: <span className="underline decoration-2">Reg. Price Quotation for {quote.subject || '------------------'}</span>.</div>
                                        <div className="border-2 border-black mb-8 overflow-hidden rounded-sm">
                                            <table className="w-full border-collapse"><thead><tr className="bg-slate-100 border-b-2 border-black text-sm font-black"><th className="p-3 border-r-2 border-black text-left w-8">Sl</th><th className="p-3 border-r-2 border-black text-left">Product / Features</th><th className="p-3 border-r-2 border-black text-center w-12">Qty</th><th className="p-3 border-r-2 border-black text-right w-24">Rate</th><th className="p-3 border-r-2 border-black text-center w-16">GST%</th><th className="p-3 text-right w-28">Amount</th></tr></thead>
                                                <tbody className="divide-y-2 divide-black">
                                                    {quote.items && quote.items.length > 0 ? quote.items.map((it, idx) => { const lineTax = (it.amount * it.taxRate) / 100; return (<tr key={it.id} className="text-sm font-bold align-top"><td className="p-3 border-r-2 border-black text-center">{idx + 1}</td><td className="p-3 border-r-2 border-black"><div className="font-black">{it.description}</div>{it.model && <div className="text-xs text-slate-600 mt-0.5">Model: {it.model}</div>}</td><td className="p-3 border-r-2 border-black text-center">{it.quantity}</td><td className="p-3 border-r-2 border-black text-right">{it.unitPrice.toFixed(2)}</td><td className="p-3 border-r-2 border-black text-center">{it.taxRate}%</td><td className="p-3 text-right font-black">{(it.amount + lineTax).toFixed(2)}</td></tr>)}) : (<tr><td colSpan={6} className="p-12 text-center text-slate-300 italic font-medium">No items added to quotation</td></tr>)}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex justify-end text-lg font-bold mb-12 px-2"><div className="w-3/5 space-y-2"><div className="flex justify-between border-b border-slate-300 py-1"><span className="text-slate-600 uppercase text-xs">Gross Total</span><span>Rs.{totals.grossTotal.toFixed(2)}</span></div><div className="flex justify-between border-b border-slate-300 py-1"><span className="text-slate-600 uppercase text-xs">Sub Total (Taxable)</span><span>Rs.{totals.subTotal.toFixed(2)}</span></div><div className="flex justify-between border-b border-slate-300 py-1"><span className="text-slate-600 uppercase text-xs">Total GST</span><span>Rs.{totals.totalGst.toFixed(2)}</span></div><div className="flex justify-between pt-4 text-3xl font-black border-t-4 border-black underline decoration-double"><span>GRAND TOTAL</span><span>Rs.{totals.grandTotal.toFixed(2)}</span></div><div className="text-right text-[10px] font-black uppercase text-slate-400 italic mt-1 leading-tight">{numberToWords(totals.grandTotal)}</div></div></div>
                                        <div className="text-xs space-y-2 mb-8 px-2"><h4 className="font-bold underline mb-2 text-sm uppercase">Terms and condition:</h4><div className="grid grid-cols-[100px_1fr] gap-y-1.5 gap-x-3"><span className="font-bold uppercase opacity-50">Validity :</span><span>Up to 30 days from the date of submission.</span><span className="font-bold uppercase opacity-50">Taxes :</span><span>GST is applicable to the price mentioned as per item-wise rates.</span><span className="font-bold uppercase opacity-50">Payment :</span><span>{quote.paymentTerms}</span><span className="font-bold uppercase opacity-50">Banking :</span><div>Bank: {quote.bankAndBranch}<br/>A/C name: Sreemeditec, A/C No: {quote.accountNo}</div><span className="font-bold uppercase opacity-50">Warranty :</span><span>{quote.warrantyTerms}</span></div></div>
                                        <div className="mt-20 px-2 flex justify-between items-end"><div className="font-bold"><p>With Regards,</p><p className="mb-12 font-black uppercase">For SREE MEDITEC,</p><div className="h-16 w-full"></div><p className="text-slate-500">9884818398</p></div><div className="w-32 h-32 border-4 border-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-200 uppercase text-center rotate-12 select-none">Official<br/>Company Seal</div></div>
                                     </div>
                                </div>
                                <div className={`h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in ${builderTab === 'catalog' ? 'flex' : 'hidden'}`}><div className="flex justify-between items-center mb-6"><h3 className="font-black text-slate-800 uppercase tracking-tight">Quick Add Products</h3><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div></div><div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-4">{products.map(prod => (<div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer group" onClick={() => handleAddItem(prod)}><div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-teal-600 bg-white px-2 py-0.5 rounded-lg border border-teal-100 uppercase">{prod.category}</span><div className="p-1.5 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={14} className="text-teal-600" /></div></div><h4 className="font-black text-slate-800 text-sm leading-tight">{prod.name}</h4><div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center"><span className="text-xs font-black text-slate-700">₹{prod.price.toLocaleString()}</span><span className="text-[10px] font-bold text-slate-400">Model: {prod.model || 'N/A'}</span></div></div>))}</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};
