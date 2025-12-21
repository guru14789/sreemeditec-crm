import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, User, Save, PenTool, 
    History, FileText, 
    Download, Edit, Eye, ShoppingCart, List as ListIcon, Calendar, Building2, MapPin
} from 'lucide-react';
import { useData } from './DataContext';

const calculateDetailedTotals = (order: Partial<Invoice>) => {
    const items = order.items || [];
    const subTotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const taxTotal = items.reduce((sum, p) => sum + p.gstValue, 0);
    const totalWithGst = subTotal + taxTotal; // Sum of Price with Gst
    const discount = order.discount || 0;
    const grandTotal = totalWithGst - discount;
    return { subTotal, taxTotal, totalWithGst, discount, grandTotal };
};

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

export const PurchaseOrderModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [order, setOrder] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        cpoNumber: '',
        cpoDate: new Date().toISOString().split('T')[0],
        items: [],
        discount: 0,
        status: 'Pending',
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        customerGstin: '',
        bankDetails: '33APGPS4675G2ZL', // Repurposed for Company GSTIN
        deliveryAddress: '',
        bankAndBranch: 'ICICI Bank, Br: Selaiyur',
        accountNo: '603705016939',
        paymentMethod: 'Bank Transfer',
        advanceAmount: 0,
        advanceDate: new Date().toISOString().split('T')[0],
        deliveryTime: 'Immediate',
        specialNote: '',
        documentType: 'PO'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.invoiceNumber) {
            setOrder(prev => ({
                ...prev,
                invoiceNumber: `SMCPO ${String(invoices.filter(i => i.documentType === 'PO').length + 151).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, invoices]);

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unitPrice: prod?.price || 0,
            taxRate: prod?.taxRate || 12,
            amount: prod?.price || 0,
            gstValue: (prod?.price || 0) * ((prod?.taxRate || 12) / 100),
            priceWithGst: (prod?.price || 0) * (1 + ((prod?.taxRate || 12) / 100))
        };
        setOrder(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const handleClientSelect = (inputValue: string) => {
        const client = clients.find(c => c.name === inputValue || c.hospital === inputValue);
        if (client) {
            setOrder(prev => ({
                ...prev,
                customerName: client.name,
                customerHospital: client.hospital || '',
                customerAddress: client.address || '',
                customerGstin: client.gstin || '',
                deliveryAddress: client.address || ''
            }));
        } else {
            setOrder(prev => ({ ...prev, customerName: inputValue }));
        }
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setOrder(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    
                    // Auto-fill logic from products catalog
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.price;
                            updated.taxRate = masterProd.taxRate || 12;
                            updated.hsn = masterProd.hsn || '';
                        }
                    }

                    updated.amount = updated.quantity * updated.unitPrice;
                    updated.gstValue = updated.amount * (updated.taxRate / 100);
                    updated.priceWithGst = updated.amount + updated.gstValue;
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const handleSave = () => {
        if (!order.customerName || !order.items?.length) {
            alert("Fill customer details and items.");
            return;
        }
        const totals = calculateDetailedTotals(order);
        const finalData: Invoice = {
            ...order as Invoice,
            id: editingId || `PO-${Date.now()}`,
            subtotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            documentType: 'PO'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
            p.sku.toLowerCase().includes(catalogSearch.toLowerCase())
        );
    }, [products, catalogSearch]);

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    const renderPOTemplate = (data: Partial<Invoice>, totals: { subTotal: number, taxTotal: number, totalWithGst: number, discount: number, grandTotal: number }) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-full flex flex-col border border-slate-300 shadow-sm" style={{ fontFamily: 'Calibri, "Segoe UI", Candara, Segoe, Optima, Arial, sans-serif' }}>
            <div className="text-center mb-4 border-b border-black pb-2">
                <h1 className="text-4xl font-bold uppercase tracking-widest leading-none mb-1">SREE MEDITEC</h1>
                <p className="text-[12px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[12px] font-bold">Mob: 9884818398</p>
            </div>
            <div className="border border-black text-center py-1 mb-2 bg-slate-50">
                <h2 className="text-sm font-bold uppercase tracking-widest">CUSTOMER PURCHASE ORDER</h2>
            </div>
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px]">
                <div className="border-r border-black p-1.5"><span className="font-bold">SMCPO NO: </span><span className="font-bold">{data.invoiceNumber || '---'}</span></div>
                <div className="p-1.5"><span className="font-bold">DATE: </span><span>{formatDateDDMMYYYY(data.date)}</span></div>
            </div>
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px]">
                <div className="border-r border-black p-1.5"><span className="font-bold">CPO NO: </span><span className="font-bold">{data.cpoNumber || '---'}</span></div>
                <div className="p-1.5"><span className="font-bold">DATE: </span><span>{formatDateDDMMYYYY(data.cpoDate)}</span></div>
            </div>
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px] min-h-[50px]">
                <div className="border-r border-black p-1.5"><p className="font-bold mb-1 underline-none">Name of the Customer and Address:</p><p className="font-bold uppercase">{data.customerName}</p><p className="whitespace-pre-wrap">{data.customerAddress}</p></div>
                <div className="p-1.5"><p className="font-bold mb-1 underline-none">Delivery Address:</p><p className="whitespace-pre-wrap">{data.deliveryAddress || data.customerAddress}</p></div>
            </div>
            <div className="grid grid-cols-2 border border-black text-[12px]">
                <div className="border-r border-black p-1.5 flex gap-2"><span className="font-bold">GST No:</span><span>{data.customerGstin || '---'}</span></div>
                <div className="p-1.5 flex gap-2"><span className="font-bold">GST No:</span><span className="font-bold">{data.bankDetails || '33APGPS4675G2ZL'}</span></div>
            </div>
            <div className="border-x border-b border-black text-center py-0.5 bg-slate-50"><h3 className="text-[12px] font-bold uppercase tracking-widest">ORDER DETAILS</h3></div>
            <div className="border-x border-black">
                <table className="w-full border-collapse text-[12px]">
                    <thead><tr className="border-b border-black font-bold"><th className="border-r border-black p-1 text-center w-8">Sl no.</th><th className="border-r border-black p-1 text-center">Product</th><th className="border-r border-black p-1 text-center w-8">Qty</th><th className="border-r border-black p-1 text-center w-20">Rate</th><th className="border-r border-black p-1 text-center w-24">Amount</th><th className="border-r border-black p-1 text-center w-12">Gst %</th><th className="border-r border-black p-1 text-center w-20">Gst value</th><th className="p-1 text-center w-[24.1mm]">Price with Gst</th></tr></thead>
                    <tbody>{data.items?.map((item, idx) => (<tr key={idx} className="border-b border-black last:border-b-0"><td className="border-r border-black p-1 text-left">{idx + 1}</td><td className="border-r border-black p-1 text-left"><div className="font-bold">{item.description}</div></td><td className="border-r border-black p-1 text-left">{item.quantity}</td><td className="border-r border-black p-1 text-left">{item.unitPrice.toLocaleString()}</td><td className="border-r border-black p-1 text-left">{item.amount.toLocaleString()}</td><td className="border-r border-black p-1 text-left">{item.taxRate}%</td><td className="border-r border-black p-1 text-left">{item.gstValue.toLocaleString()}</td><td className="p-1 text-left font-bold">{item.priceWithGst.toLocaleString()}</td></tr>))}</tbody>
                </table>
            </div>
            <div className="border border-black">
                <div className="grid grid-cols-[1fr_24.1mm] border-b border-black text-[12px]"><div className="p-1.5 text-left border-r border-black font-bold">Total</div><div className="p-1.5 text-left font-black">{totals.totalWithGst.toLocaleString()}</div></div>
                <div className="grid grid-cols-[1fr_24.1mm] border-b border-black text-[12px]"><div className="p-1.5 text-left border-r border-black font-bold">Discount/Buyback/adjustment</div><div className="p-1.5 text-left">{totals.discount.toLocaleString()}</div></div>
                <div className="grid grid-cols-[1fr_24.1mm] text-[12px]"><div className="p-1.5 text-left border-r border-black font-bold text-sm">Grand Total</div><div className="p-1.5 text-left font-black text-sm">{totals.grandTotal.toLocaleString()}</div></div>
            </div>
            <div className="border-x border-b border-black p-1.5 text-[12px]"><span className="font-bold">Advance Payment details:</span><span className="ml-2 font-bold">{data.advanceAmount ? `Rs. ${data.advanceAmount.toLocaleString()} paid via ${data.paymentMethod} on ${formatDateDDMMYYYY(data.advanceDate)}` : 'No advance recorded.'}</span></div>
            <div className="border-x border-b border-black text-center py-0.5 bg-slate-50"><h3 className="text-[12px] font-bold uppercase tracking-widest">PAYMENT DETAILS</h3></div>
            <div className="grid grid-cols-[1fr_1fr_1fr_0.4fr_0.4fr] border-x border-b border-black text-[11px] font-bold"><div className="border-r border-black p-1.5">Bank and Branch:</div><div className="border-r border-black p-1.5">Acc No:</div><div className="border-r border-black p-1.5">Mode of payment:</div><div className="border-r border-black p-1.5">Date:</div><div className="p-1.5">Amount:</div></div>
            <div className="grid grid-cols-[1fr_1fr_1fr_0.4fr_0.4fr] border-x border-b border-black text-[12px] min-h-[28px]"><div className="border-r border-black p-1.5">{data.bankAndBranch}</div><div className="border-r border-black p-1.5">{data.accountNo || '---'}</div><div className="border-r border-black p-1.5">{data.paymentMethod}</div><div className="border-r border-black p-1.5">{formatDateDDMMYYYY(data.advanceDate)}</div><div className="p-1.5 text-left font-bold">{data.advanceAmount?.toLocaleString()}</div></div>
            <div className="grid grid-cols-[1fr_1.8fr] border-x border-b border-black text-[12px] min-h-[28px]"><div className="border-r border-black p-1.5 font-bold uppercase">Delivery time:</div><div className="p-1.5 font-bold">{data.deliveryTime}</div></div>
            <div className="border-x border-b border-black p-1.5 text-[11px]"><p className="font-bold leading-tight underline decoration-slate-300">Any special note regarding supply, payment terms (to be filled by company personal):</p><p className="mt-1 font-medium italic min-h-[40px]">{data.specialNote || 'Standard terms apply.'}</p></div>
            <div className="grid grid-cols-2 border-x border-b border-black text-[12px] flex-1"><div className="border-r border-black p-2 flex flex-col justify-between"><p className="font-bold">Customer seal and signature:</p><div className="flex-1 flex items-end pb-2"><div className="w-full border-t border-dotted border-black pt-1 text-[10px]">Authorised Signatory & Seal</div></div></div><div className="p-2 flex flex-col justify-between relative overflow-hidden"><div className="relative z-10"><p className="font-bold text-left">Sreemeditec representative Signature:</p></div><div className="flex justify-between items-end relative z-10 pt-10"><div className="text-left"><div className="h-12 w-full"></div></div><div className="w-24 h-24 border-4 border-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-200 uppercase text-center rotate-12 select-none -mr-4 -mb-4 opacity-40">Official<br/>Company Seal</div></div></div></div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setOrder({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'PO', bankDetails: '33APGPS4675G2ZL', bankAndBranch: 'ICICI Bank, Br: Selaiyur', accountNo: '603705016939' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Order</button>
            </div>
            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Order Log</h3><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-64" /></div></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr><th className="px-6 py-4">PO #</th><th className="px-6 py-4">Consignee</th><th className="px-6 py-4 text-right">Total</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">{invoices.filter(i => i.documentType === 'PO').map(inv => (<tr key={inv.id} className="hover:bg-slate-50 transition-colors group"><td className="px-6 py-4 font-black">{inv.invoiceNumber}</td><td className="px-6 py-4 font-bold text-slate-700">{inv.customerName}</td><td className="px-6 py-4 text-right font-black text-teal-700">₹{inv.grandTotal.toLocaleString()}</td><td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">{inv.status}</span></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={18}/></button><button className="p-2 text-slate-400 hover:text-emerald-500"><Download size={18}/></button></div></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="lg:hidden flex bg-slate-50 border-b border-slate-200 shrink-0"><button onClick={() => setBuilderTab('form')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button><button onClick={() => setBuilderTab('preview')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button><button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button></div>
                    <div className="flex-1 flex overflow-hidden">
                        <div className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white ${builderTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                            <section className="space-y-4"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Registry</h3><div className="grid grid-cols-2 gap-4"><input type="text" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.invoiceNumber} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMCPO No." /><input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.date} onChange={e => setOrder({...order, date: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><input type="text" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.cpoNumber} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="CPO No." /><input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.cpoDate} onChange={e => setOrder({...order, cpoDate: e.target.value})} /></div></section>
                            <section className="space-y-4"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Consignee Identity</h3><input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={order.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Customer Name *" /><div className="grid grid-cols-2 gap-4"><textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Billing Address" /><textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={order.deliveryAddress || ''} onChange={e => setOrder({...order, deliveryAddress: e.target.value})} placeholder="Delivery Address" /></div><div className="grid grid-cols-2 gap-4"><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.customerGstin || ''} onChange={e => setOrder({...order, customerGstin: e.target.value})} placeholder="Customer GST No" /><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.bankDetails || ''} onChange={e => setOrder({...order, bankDetails: e.target.value})} placeholder="Company GST No" /></div></section>
                            <section className="space-y-4"><div className="flex justify-between items-center border-b border-slate-100 pb-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Details</h3><div className="flex gap-2"><button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all">+ Manual Row</button><button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all">+ Add Catalog</button></div></div><div className="space-y-4">{order.items?.map((item) => (<div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group"><button onClick={() => setOrder({...order, items: order.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button><div className="grid grid-cols-12 gap-3"><div className="col-span-12"><input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div><div className="col-span-4"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="Qty" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div><div className="col-span-4"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right" placeholder="Rate" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div><div className="col-span-4"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="GST %" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div></div></div>))}</div></section>
                            <section className="space-y-4"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment & Notes</h3><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Advance Amount</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.advanceAmount} onChange={e => setOrder({...order, advanceAmount: Number(e.target.value)})} /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Discount</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.discount} onChange={e => setOrder({...order, discount: Number(e.target.value)})} /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bank & Branch</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.bankAndBranch} onChange={e => setOrder({...order, bankAndBranch: e.target.value})} /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Acc No:</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.accountNo} onChange={e => setOrder({...order, accountNo: e.target.value})} /></div></div><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.deliveryTime} onChange={e => setOrder({...order, deliveryTime: e.target.value})} placeholder="Delivery Time (e.g. Immediate)" /><textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={order.specialNote || ''} onChange={e => setOrder({...order, specialNote: e.target.value})} placeholder="Any special note regarding supply..." /></section>
                            <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50"><button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button><button onClick={handleSave} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Generate Order Form</button></div>
                        </div>
                        <div className={`w-full lg:w-1/2 bg-slate-100 border-l border-slate-200 flex flex-col lg:overflow-hidden ${builderTab === 'form' ? 'hidden lg:flex' : 'flex'}`}><div className="hidden lg:flex bg-[#81D7D3] p-1 shrink-0"><button onClick={() => setBuilderTab('preview')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'preview' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Live Document Preview</button><button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'catalog' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Catalog Add</button></div><div className="flex-1 overflow-hidden relative"><div className={`h-full overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar ${builderTab === 'preview' ? 'flex' : 'hidden'}`}><div className="shadow-2xl h-fit w-full max-w-[210mm] transition-all duration-300">{renderPOTemplate(order, totals)}</div></div><div className={`h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in ${builderTab === 'catalog' ? 'flex' : 'hidden'}`}><div className="flex justify-between items-center mb-6"><h3 className="font-black text-slate-800 uppercase tracking-tight">Select Products</h3><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Filter..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} /></div></div><div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-4">{filteredProducts.map(prod => (<div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => handleAddItem(prod)}><div className="flex-1"><h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{prod.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">₹{prod.price.toLocaleString()} • {prod.sku}</p></div><div className="ml-4 p-1.5 bg-white rounded-lg border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all"><Plus size={16} /></div></div>))}</div></div></div></div>
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};
