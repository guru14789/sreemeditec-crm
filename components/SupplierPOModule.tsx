
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem, Product } from '../types';
import { 
    Plus, Search, Trash2, Save, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Calendar, ArrowLeft, Building2, CreditCard, Package, CheckCircle2, Star, FileText
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DEFAULT_DELIVERY_ADDRESS = 'Sreemeditec,\nNew No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.';

const calculateDetailedTotals = (order: Partial<Invoice>) => {
    const items = order.items || [];
    const subTotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const taxTotal = items.reduce((sum, p) => {
        const itemAmount = p.quantity * p.unitPrice;
        return sum + (itemAmount * (p.taxRate / 100));
    }, 0);
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

export const SupplierPOModule: React.FC = () => {
    const { vendors, products, invoices, addInvoice, updateInvoice, addVendor, addNotification, currentUser } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'spares'>('form');
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
        bankDetails: '33APGPS4675G2ZL',
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
        bankAndBranch: 'ICICI Bank, Br: Selaiyur',
        accountNo: '603705016939',
        paymentMethod: 'Bank Transfer',
        advanceAmount: 0,
        advanceDate: new Date().toISOString().split('T')[0],
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

    const filteredSpares = useMemo(() => {
        const query = catalogSearch.toLowerCase();
        let list = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.sku.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
        
        if (order.customerName) {
            const vendorMatch = list.filter(p => p.supplier?.toLowerCase() === order.customerName?.toLowerCase());
            const others = list.filter(p => p.supplier?.toLowerCase() !== order.customerName?.toLowerCase());
            return [...vendorMatch, ...others];
        }
        
        return list;
    }, [products, catalogSearch, order.customerName]);

    const handleVendorSelect = (name: string) => {
        const vendor = vendors.find(v => v.name === name);
        if (vendor) {
            setOrder(prev => ({
                ...prev,
                customerName: vendor.name,
                customerAddress: vendor.address,
                customerGstin: vendor.gstin
            }));
            addNotification('Vendor Detected', `Linked ${vendor.name} to procurement order.`, 'success');
        } else {
            setOrder(prev => ({ ...prev, customerName: name }));
        }
    };

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        const doc = new jsPDF();
        const totals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const colWidth = (pageWidth - 20) / 2;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 24, { align: 'center' });
        doc.text('Mob: 9884818398', pageWidth / 2, 29, { align: 'center' });

        doc.setLineWidth(0.1);
        doc.rect(margin, 34, pageWidth - 20, 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SUPPLIER PURCHASE ORDER', pageWidth / 2, 39.5, { align: 'center' });

        autoTable(doc, {
            startY: 42,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [`SMPOC NO: ${data.invoiceNumber || ''}`, `DATE: ${formatDateDDMMYYYY(data.date)}`],
                [`VENDOR REF NO: ${data.cpoNumber || ''}`, `DATE: ${formatDateDDMMYYYY(data.cpoDate)}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 25, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [`Name of the Vendor and Address:\n\n${data.customerName || ''}\n${data.customerAddress || ''}`, `Dispatch To:\n\n${data.deliveryAddress || ''}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [`Vendor GST No: ${data.customerGstin || ''}`, `Our GST No: ${data.bankDetails || '33APGPS4675G2ZL'}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 7);
        doc.setFont('helvetica', 'bold');
        doc.text('PROCUREMENT DETAILS', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4.5, { align: 'center' });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 7,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            head: [['Sl no.', 'Description', 'Qty', 'Rate', 'Amount', 'Gst %', 'Gst value', 'Price with Gst']],
            body: (data.items || []).map((it, idx) => {
                const amount = it.quantity * it.unitPrice;
                const gstValue = amount * (it.taxRate / 100);
                return [
                    idx + 1,
                    it.description,
                    it.quantity,
                    (it.unitPrice || 0).toLocaleString('en-IN'),
                    amount.toLocaleString('en-IN'),
                    `${it.taxRate}%`,
                    gstValue.toLocaleString('en-IN'),
                    (amount + gstValue).toLocaleString('en-IN')
                ];
            }),
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                2: { halign: 'center', cellWidth: 10 },
                3: { halign: 'right', cellWidth: 20 },
                4: { halign: 'right', cellWidth: 25 },
                5: { halign: 'center', cellWidth: 12 },
                6: { halign: 'right', cellWidth: 25 },
                7: { halign: 'right', cellWidth: 30 }
            }
        });

        const footerRows = [];
        footerRows.push([{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: totals.totalWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }]);
        if (totals.discount > 0) {
            footerRows.push([{ content: 'Discount:', styles: { fontStyle: 'bold', textColor: [225, 29, 72] } }, { content: `-${totals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', textColor: [225, 29, 72] } }]);
        }
        footerRows.push([{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 9 } }, { content: totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }]);
        footerRows.push([{ content: `Payment details: ${data.paymentTerms || 'As per agreement'}`, colSpan: 2, styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: footerRows,
            columnStyles: { 0: { cellWidth: pageWidth - 20 - 30 }, 1: { cellWidth: 30 } }
        });

        const noteY = (doc as any).lastAutoTable.finalY + 2;
        const noteText = `Special instructions regarding supply/packing:\n\n${data.specialNote || 'Standard quality requirements apply.'}`;
        const splitNote = doc.splitTextToSize(noteText, pageWidth - 24);
        const noteHeight = Math.max(20, (splitNote.length * 5) + 5);
        doc.rect(margin, noteY, pageWidth - 20, noteHeight);
        doc.setFont('helvetica', 'bold');
        doc.text(splitNote, margin + 2, noteY + 5);

        const sigY = noteY + noteHeight;
        doc.rect(margin, sigY, pageWidth - 20, 30);
        doc.line(pageWidth / 2, sigY, pageWidth / 2, sigY + 30);
        doc.setFontSize(8);
        doc.text('Accepted By (Vendor):', margin + 2, sigY + 5);
        doc.text('For Sree Meditec (Authorized Signatory):', pageWidth / 2 + 2, sigY + 5);

        doc.save(`${data.invoiceNumber || 'SupplierPO'}.pdf`);
    };

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            model: prod?.model || '',
            features: prod?.features || '',
            quantity: 1,
            unitPrice: prod?.purchasePrice || 0, // USE purchasePrice (Cost) for procurement
            taxRate: prod?.taxRate || 18,
            amount: prod?.purchasePrice || 0,
            gstValue: (prod?.purchasePrice || 0) * ((prod?.taxRate || 18) / 100),
            priceWithGst: (prod?.purchasePrice || 0) * (1 + ((prod?.taxRate || 18) / 100))
        };
        setOrder(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'spares') setBuilderTab('form');
        addNotification('Item Added', `"${newItem.description}" added to list.`, 'info');
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setOrder(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.purchasePrice || 0;
                            updated.taxRate = masterProd.taxRate || 18;
                            updated.hsn = masterProd.hsn || '';
                            updated.model = masterProd.model || '';
                            updated.features = masterProd.features || '';
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
        if (!order.customerName || !order.items?.length) {
            alert("Fill vendor name and items.");
            return;
        }
        const totals = calculateDetailedTotals(order);
        const finalData: Invoice = {
            ...order as Invoice,
            id: editingId || `SPO-${Date.now()}`,
            subtotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'SupplierPO',
            createdBy: currentUser?.name || 'System'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Supplier Order ${finalData.invoiceNumber} saved.`, 'success');
    };

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Procured Logs</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setOrder({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'SupplierPO', deliveryAddress: DEFAULT_DELIVERY_ADDRESS, bankDetails: '33APGPS4675G2ZL', discount: 0 }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Procurement</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 font-black uppercase text-xs tracking-widest text-slate-800 dark:text-slate-200">Procurement Registry</div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b dark:border-slate-700">
                                <tr><th className="px-6 py-4">PO #</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4 text-right">Value (Cost)</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {invoices.filter(i => i.documentType === 'SupplierPO').map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-black dark:text-slate-300">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-400 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4 text-right font-black text-indigo-700 dark:text-indigo-400">₹{(inv.grandTotal || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${inv.status === 'Draft' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Edit size={18}/></button>
                                                <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-emerald-500 transition-all"><Download size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white dark:bg-slate-900 text-indigo-700 border-b-4 border-indigo-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white dark:bg-slate-900 text-indigo-700 border-b-4 border-indigo-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('spares')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'spares' ? 'bg-white dark:bg-slate-900 text-indigo-700 border-b-4 border-indigo-500' : 'text-slate-400'}`}><ListIcon size={18}/> Spare Index</button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white dark:bg-slate-950 pb-20">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Meta</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">SMPOC Number</label><input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black dark:text-white" value={order.invoiceNumber} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Order Date</label><input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold dark:text-white" value={order.date} onChange={e => setOrder({...order, date: e.target.value})} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Vendor Ref/Invoice</label><input type="text" className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold dark:text-white" value={order.cpoNumber} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="V-REF-123" /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ref Date</label><input type="date" className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold dark:text-white" value={order.cpoDate} onChange={e => setOrder({...order, cpoDate: e.target.value})} /></div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Supplier Identity</h3>
                                    <div className="space-y-4">
                                        <input type="text" list="vendor-list" className="w-full bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black dark:text-white" value={order.customerName || ''} onChange={e => handleVendorSelect(e.target.value)} placeholder="Vendor Name *" />
                                        <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
                                        <textarea rows={2} className="w-full bg-white dark:bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white resize-none" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Supplier Registered Address" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Our Dispatch Address</label><textarea rows={3} className="w-full bg-white dark:bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white" value={order.deliveryAddress} onChange={e => setOrder({...order, deliveryAddress: e.target.value})} /></div>
                                            <div className="space-y-4">
                                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Vendor GSTIN</label><input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold dark:text-white" value={order.customerGstin} onChange={e => setOrder({...order, customerGstin: e.target.value})} /></div>
                                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Our Audit GSTIN</label><input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold dark:text-white" value={order.bankDetails} onChange={e => setOrder({...order, bankDetails: e.target.value})} /></div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Procurement Items</h3><button onClick={() => setBuilderTab('spares')} className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all">+ Add Spare</button></div>
                                    <div className="space-y-4">
                                        {order.items?.map(item => (
                                            <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-800 rounded-2xl relative group">
                                                <button onClick={() => setOrder({...order, items: order.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                                <div className="grid grid-cols-12 gap-4">
                                                    <div className="col-span-12 md:col-span-7"><input type="text" className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold dark:text-white" placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                                    <div className="col-span-4 md:col-span-1"><input type="number" className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-center dark:text-white" placeholder="Qty" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                                    <div className="col-span-4 md:col-span-2"><input type="number" className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-right dark:text-white" placeholder="Cost" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                                    <div className="col-span-4 md:col-span-2"><input type="number" className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-center dark:text-white" placeholder="GST %" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-3xl border border-dashed dark:border-slate-800">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> Financials</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount (₹)</label><input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-2.5 text-sm font-bold text-rose-600 outline-none" value={order.discount} onChange={e => setOrder({...order, discount: Number(e.target.value)})} /></div>
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label><input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-2.5 text-sm font-bold dark:text-white outline-none" value={order.paymentMethod} onChange={e => setOrder({...order, paymentMethod: e.target.value as any})} placeholder="e.g. 100% Advance" /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Instructions</label><textarea rows={2} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-2.5 text-sm font-bold dark:text-white outline-none resize-none" value={order.specialNote || ''} onChange={e => setOrder({...order, specialNote: e.target.value})} placeholder="Packing, Shipping etc..." /></div>
                                </section>

                                <div className="flex flex-col sm:flex-row gap-4 pt-10 sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t dark:border-slate-800 z-30">
                                    <button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Discard</button>
                                    <button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-4 bg-white dark:bg-slate-900 border-2 border-indigo-500 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">Save Draft</button>
                                    <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(order); }} className="w-full sm:flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3 transition-all active:scale-95">Finalize & PDF</button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50 dark:bg-slate-900/30">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-2xl mx-auto font-sans" style={{ fontSize: '11px' }}>
                                        <div className="text-center mb-4">
                                            <h1 className="text-4xl font-black uppercase mb-1">SREE MEDITEC</h1>
                                            <p className="font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                                            <p className="font-bold text-xs">Mob: 9884818398</p>
                                        </div>
                                        <div className="border border-black text-center py-1.5 font-bold text-xs mb-2">SUPPLIER PURCHASE ORDER</div>
                                        <div className="grid grid-cols-2 border border-black mb-2">
                                            <div className="border-r border-black p-2 font-bold">SMPOC NO: {order.invoiceNumber}</div>
                                            <div className="p-2 font-bold">DATE: {formatDateDDMMYYYY(order.date)}</div>
                                            <div className="border-t border-r border-black p-2 font-bold">VENDOR REF: {order.cpoNumber || '---'}</div>
                                            <div className="border-t border-black p-2 font-bold">DATE: {formatDateDDMMYYYY(order.cpoDate)}</div>
                                        </div>
                                        <div className="grid grid-cols-2 border border-black mb-2 min-h-[80px]">
                                            <div className="border-r border-black p-2">
                                                <p className="font-bold underline mb-1">Vendor Details:</p>
                                                <p className="font-bold uppercase text-[12px]">{order.customerName}</p>
                                                <p className="whitespace-pre-wrap">{order.customerAddress}</p>
                                            </div>
                                            <div className="p-2">
                                                <p className="font-bold underline mb-1">Dispatch To:</p>
                                                <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 border border-black mb-2">
                                            <div className="border-r border-black p-1.5 flex gap-2"><span className="font-bold">Vendor GSTIN:</span><span>{order.customerGstin || '---'}</span></div>
                                            <div className="p-1.5 flex gap-2"><span className="font-bold">Our GSTIN:</span><span className="font-bold">{order.bankDetails}</span></div>
                                        </div>
                                        <div className="border-x border-t border-black text-center py-1 font-bold text-[10px]">PROCUREMENT LIST</div>
                                        <table className="w-full border-collapse border border-black text-[10px]">
                                            <thead>
                                                <tr className="border-b border-black bg-slate-50 font-bold">
                                                    <th className="border-r border-black p-1.5 w-10">Sl.</th>
                                                    <th className="border-r border-black p-1.5 text-left">Description</th>
                                                    <th className="border-r border-black p-1.5 w-10">Qty</th>
                                                    <th className="border-r border-black p-1.5 w-24">Rate (Cost)</th>
                                                    <th className="border-r border-black p-1.5 w-24 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(order.items || []).map((it, idx) => (
                                                    <tr key={idx} className="border-b border-black last:border-b-0">
                                                        <td className="border-r border-black p-1.5 text-center">{idx + 1}</td>
                                                        <td className="border-r border-black p-1.5 font-bold">{it.description}</td>
                                                        <td className="border-r border-black p-1.5 text-center">{it.quantity}</td>
                                                        <td className="border-r border-black p-1.5 text-right">{it.unitPrice.toLocaleString()}</td>
                                                        <td className="p-1.5 text-right font-bold">{(it.quantity * it.unitPrice).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {Array.from({ length: Math.max(0, 10 - (order.items?.length || 0)) }).map((_, i) => (
                                                    <tr key={i} className="border-b border-black last:border-b-0 h-6">
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t border-black font-bold">
                                                    <td colSpan={4} className="border-r border-black p-1.5 text-right">Total Order Value (Pre-Tax)</td>
                                                    <td className="p-1.5 text-right">{totals.subTotal.toLocaleString()}</td>
                                                </tr>
                                                {totals.discount > 0 && (
                                                    <tr className="border-t border-black font-bold text-rose-600">
                                                        <td colSpan={4} className="border-r border-black p-1.5 text-right">Discount:</td>
                                                        <td className="p-1.5 text-right">-Rs. {totals.discount.toLocaleString()}</td>
                                                    </tr>
                                                )}
                                                <tr className="border-t border-black font-black bg-slate-100 text-sm">
                                                    <td colSpan={4} className="border-r border-black p-1.5 text-right">NET GRAND TOTAL</td>
                                                    <td className="p-1.5 text-right">Rs. {totals.grandTotal.toLocaleString()}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                        <div className="border-x border-b border-black p-3 min-h-[60px]">
                                            <p className="font-bold underline mb-1">Instructions:</p>
                                            <p className="italic">{order.specialNote || 'Standard procurement terms apply.'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 border-x border-b border-black flex-1 min-h-[100px]">
                                            <div className="border-r border-black p-4 flex flex-col justify-between">
                                                <p className="font-bold">Authorized Vendor Sign-off:</p>
                                                <div className="border-t border-dotted border-black pt-1 w-3/4"></div>
                                            </div>
                                            <div className="p-4 flex flex-col justify-between items-end">
                                                <p className="font-bold">For SREE MEDITEC</p>
                                                <p className="font-black mt-12">Authorized Signatory</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {builderTab === 'spares' && (
                            <div className="h-full bg-white dark:bg-slate-900 flex flex-col p-6 overflow-hidden animate-in fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-xl">Procurement Index</h3>
                                    <div className="relative w-64">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Filter Spares..." className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold outline-none w-full dark:text-white" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredSpares.map(prod => {
                                        const isVendorMatch = order.customerName && prod.supplier?.toLowerCase() === order.customerName.toLowerCase();
                                        return (
                                            <div key={prod.id} className={`p-6 rounded-[2rem] border transition-all cursor-pointer group shadow-sm flex flex-col justify-between ${isVendorMatch ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700'}`} onClick={() => handleAddItem(prod)}>
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{prod.sku}</span>
                                                        {isVendorMatch && <div className="bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Matched Vendor</div>}
                                                    </div>
                                                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight group-hover:text-indigo-600 transition-colors uppercase">{prod.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Cost: ₹{(prod.purchasePrice || 0).toLocaleString()} • Tax: {prod.taxRate}%</p>
                                                </div>
                                                <div className="mt-6 flex justify-between items-center pt-4 border-t dark:border-slate-700/50">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Stock: {prod.stock}</span>
                                                    <div className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-md group-hover:bg-indigo-600 group-hover:text-white transition-all"><Plus size={18} /></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
