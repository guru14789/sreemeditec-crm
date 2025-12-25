import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, Save, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Calendar
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const calculateDetailedTotals = (order: Partial<Invoice>) => {
    const items = order.items || [];
    const subTotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const taxTotal = items.reduce((sum, p) => sum + p.gstValue, 0);
    const totalWithGst = subTotal + taxTotal;
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

const DEFAULT_DELIVERY_ADDRESS = `Sreemeditec,
New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.
Mob: 9884818398`;

export const SupplierPOModule: React.FC = () => {
    const { products, invoices, addInvoice, updateInvoice } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [order, setOrder] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        discount: 0,
        status: 'Pending',
        customerName: '',
        customerAddress: '',
        customerGstin: '',
        bankDetails: '33APGPS4675G2ZL',
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
        bankAndBranch: '',
        accountNo: 'As per record',
        paymentMethod: 'NEFT',
        paymentTerms: 'Terms: 100% against delivery or as agreed.',
        advanceAmount: 0,
        deliveryTime: 'Immediate',
        specialNote: '',
        documentType: 'SupplierPO'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.invoiceNumber) {
            setOrder(prev => ({
                ...prev,
                invoiceNumber: `SMPOC ${String(invoices.filter(i => i.documentType === 'SupplierPO').length + 101).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, invoices]);

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        const doc = new jsPDF();
        const totals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('SREE MEDITEC', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text('New No: 18, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 27, { align: 'center' });
        doc.line(10, 32, pageWidth - 10, 32);

        doc.setFontSize(12);
        doc.rect(10, 35, pageWidth - 20, 8);
        doc.text('SUPPLIER PURCHASE ORDER (PROCUREMENT)', pageWidth / 2, 40.5, { align: 'center' });

        autoTable(doc, {
            startY: 47,
            body: [[`SMPOC NO: ${data.invoiceNumber}`, `DATE: ${formatDateDDMMYYYY(data.date)}`]],
            theme: 'grid',
            styles: { fontSize: 10, fontStyle: 'bold' }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 2,
            head: [['Vendor:', 'Dispatch To:']],
            body: [[`${data.customerName}\n${data.customerAddress}`, data.deliveryAddress]],
            theme: 'grid',
            styles: { fontSize: 9, minCellHeight: 25 },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 2,
            head: [['Sl', 'Description', 'Qty', 'Rate', 'Tax%', 'Total']],
            body: (data.items || []).map((it, idx) => [
                idx + 1, it.description, it.quantity, it.unitPrice, `${it.taxRate}%`, it.priceWithGst
            ]),
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0] }
        });

        const finalY = (doc as any).lastAutoTable.finalY;
        doc.rect(10, finalY + 2, pageWidth - 20, 8);
        doc.setFont('helvetica', 'bold');
        doc.text(`GRAND TOTAL: ${totals.grandTotal.toLocaleString()}`, pageWidth - 15, finalY + 7, { align: 'right' });

        doc.save(`${data.invoiceNumber || 'ProcurementPO'}.pdf`);
    };

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

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setOrder(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.price;
                            updated.taxRate = masterProd.taxRate || 12;
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
            alert("Fill vendor details and items.");
            return;
        }
        const totals = calculateDetailedTotals(order);
        const finalData: Invoice = {
            ...order as Invoice,
            id: editingId || `SPO-${Date.now()}`,
            subtotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            documentType: 'SupplierPO'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
    };

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    const renderPOTemplate = (data: Partial<Invoice>, totals: any) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-sm mx-auto" style={{ fontFamily: 'Calibri, "Segoe UI", Candara, Segoe, Optima, Arial, sans-serif' }}>
            <div className="text-center mb-4 border-b border-black pb-2"><h1 className="text-4xl font-bold uppercase tracking-widest leading-none mb-1">SREE MEDITEC</h1><p className="text-[12px] font-bold">New No: 18, Rajakilpakkam, Chennai - 600 073.</p></div>
            <div className="border border-black text-center py-1 mb-2 bg-slate-50"><h2 className="text-sm font-bold uppercase tracking-widest">SUPPLIER PURCHASE ORDER (PROCUREMENT)</h2></div>
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px]"><div className="border-r border-black p-1.5 font-bold">SMPOC NO: {data.invoiceNumber || '---'}</div><div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.date)}</div></div>
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px] min-h-[50px]"><div className="border-r border-black p-1.5"><p className="font-bold mb-1">Vendor Detail:</p><p className="font-bold uppercase">{data.customerName}</p><p className="whitespace-pre-wrap">{data.customerAddress}</p></div><div className="p-1.5"><p className="font-bold mb-1">Dispatch To:</p><p className="whitespace-pre-wrap">{data.deliveryAddress}</p></div></div>
            <div className="border-x border-black"><table className="w-full border-collapse text-[12px]"><thead><tr className="border-b border-black font-bold bg-slate-50"><th className="border-r border-black p-1 text-center w-8">Sl</th><th className="border-r border-black p-1 text-left">Description</th><th className="border-r border-black p-1 text-center w-8">Qty</th><th className="border-r border-black p-1 text-center w-20">Rate</th><th className="border-r border-black p-1 text-center w-12">Tax%</th><th className="p-1 text-center w-[24.1mm]">Total</th></tr></thead><tbody>{data.items?.map((item, idx) => (<tr key={idx} className="border-b border-black last:border-b-0"><td className="border-r border-black p-1 text-center">{idx + 1}</td><td className="border-r border-black p-1 text-left font-bold">{item.description}</td><td className="border-r border-black p-1 text-center">{item.quantity}</td><td className="border-r border-black p-1 text-right pr-1">{item.unitPrice.toLocaleString()}</td><td className="border-r border-black p-1 text-center">{item.taxRate}%</td><td className="p-1 text-right font-bold pr-1">{item.priceWithGst.toLocaleString()}</td></tr>))}</tbody></table></div>
            <div className="border border-black"><div className="grid grid-cols-[1fr_24.1mm] text-[12px] font-black"><div className="p-1.5 text-left border-r border-black font-bold text-sm uppercase">Grand Total</div><div className="p-1.5 text-right pr-1 text-sm">{totals.grandTotal.toLocaleString()}</div></div></div>
            <div className="mt-auto grid grid-cols-2 border-x border-b border-black text-[12px] min-h-[120px]"><div className="border-r border-black p-2 flex flex-col justify-between"><p className="font-bold">Authorized Signatory:</p><div className="flex items-end pb-2"><div className="w-full border-t border-dotted border-black pt-1">Sree Meditec</div></div></div><div className="p-2 flex flex-col justify-end"><div className="w-24 h-24 border-4 border-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-200 uppercase text-center rotate-12 opacity-40">Company Seal</div></div></div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setOrder({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'SupplierPO', deliveryAddress: DEFAULT_DELIVERY_ADDRESS }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New PO</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-800 uppercase tracking-tight text-xs">Procurement Registry</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr><th className="px-6 py-4">PO #</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4 text-right">Net Value</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">{invoices.filter(i => i.documentType === 'SupplierPO').map(inv => (<tr key={inv.id} className="hover:bg-slate-50 transition-colors group"><td className="px-6 py-4 font-black">{inv.invoiceNumber}</td><td className="px-6 py-4 font-bold text-slate-700">{inv.customerName}</td><td className="px-6 py-4 text-right font-black text-teal-700">₹{inv.grandTotal.toLocaleString()}</td><td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">{inv.status}</span></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={18}/></button><button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-emerald-500"><Download size={18}/></button></div></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white">
                                <section className="space-y-4"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Context</h3><div className="grid grid-cols-2 gap-4"><input type="text" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.invoiceNumber} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMPOC No." /><input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.date} onChange={e => setOrder({...order, date: e.target.value})} /></div></section>
                                <section className="space-y-4"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Vendor</h3><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.customerName || ''} onChange={e => setOrder({...order, customerName: e.target.value})} placeholder="Vendor Name *" /><textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Address" /><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.customerGstin || ''} onChange={e => setOrder({...order, customerGstin: e.target.value})} placeholder="Vendor GST" /></section>
                                <section className="space-y-4"><div className="flex justify-between items-center border-b border-slate-100 pb-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Items</h3><div className="flex gap-2"><button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1 rounded-lg border border-medical-100">+ Manual</button><button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100">+ Catalog</button></div></div><div className="space-y-4">{order.items?.map((item) => (<div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group"><button onClick={() => setOrder({...order, items: order.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button><div className="grid grid-cols-12 gap-3"><div className="col-span-12"><input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div><div className="col-span-4"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="Qty" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div><div className="col-span-4"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right" placeholder="Buy Rate" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div><div className="col-span-4"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="Tax %" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div></div></div>))}</div></section>
                                <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50"><button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors hover:bg-slate-200">Cancel</button><button onClick={() => { handleSave(); handleDownloadPDF(order); }} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Finalize & Download</button></div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderPOTemplate(order, totals)}
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Suppliers & Spares</h3>
                                    <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Filter..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} /></div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map(prod => (
                                        <div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => handleAddItem(prod)}>
                                            <div className="flex-1"><h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{prod.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">₹{prod.price.toLocaleString()} • {prod.sku}</p></div>
                                            <div className="ml-4 p-1.5 bg-white rounded-lg border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm"><Plus size={16} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};