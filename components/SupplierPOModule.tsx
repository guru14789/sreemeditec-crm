
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

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: totals.totalWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }],
                [{ content: 'Discount/Buyback/adjustment', styles: { fontStyle: 'bold' } }, { content: (data.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }],
                [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 9 } }, { content: totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }],
                [{ content: `Payment details: ${data.paymentTerms || 'As per agreement'}`, colSpan: 2, styles: { fontStyle: 'bold' } }]
            ],
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
                            updated.unitPrice = masterProd.purchasePrice; // USE purchasePrice
                            updated.taxRate = masterProd.taxRate || 18;
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
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'SupplierPO',
            createdBy: currentUser?.name || 'System'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Supplier PO ${finalData.invoiceNumber} saved as ${status}.`, 'success');
    };

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    const renderPOTemplate = (data: Partial<Invoice>, totals: any) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col mx-auto" style={{ fontFamily: '"Arial", sans-serif', fontSize: '12px' }}>
            <div className="text-center mb-4">
                <h1 className="text-4xl font-black uppercase mb-1">SREE MEDITEC</h1>
                <p className="text-[11px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[11px] font-bold">Mob: 9884818398</p>
            </div>
            <div className="border border-black text-center py-1.5 font-bold mb-0">SUPPLIER PURCHASE ORDER</div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">SMPOC NO: {data.invoiceNumber}</div>
                <div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.date)}</div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">VENDOR REF NO: {data.cpoNumber || '---'}</div>
                <div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.cpoDate)}</div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black min-h-[60px]">
                <div className="border-r border-black p-1.5">
                    <p className="font-bold mb-1 underline">Name of the Vendor and Address:</p>
                    <p className="font-bold uppercase leading-tight">{data.customerName || '------------------'}</p>
                    <p className="whitespace-pre-wrap text-[11px]">{data.customerAddress}</p>
                </div>
                <div className="p-1.5">
                    <p className="font-bold mb-1 underline">Dispatch To:</p>
                    <p className="whitespace-pre-wrap text-[11px]">{data.deliveryAddress}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 flex gap-2"><span className="font-bold">Vendor GST:</span><span>{data.customerGstin || '------------------'}</span></div>
                <div className="p-1.5 flex gap-2"><span className="font-bold">Our GST:</span><span className="font-bold">{data.bankDetails || '33APGPS4675G2ZL'}</span></div>
            </div>
            <div className="border-x border-black text-center py-1 font-bold">PROCUREMENT DETAILS</div>
            <div className="border border-black">
                <table className="w-full border-collapse text-[10px]">
                    <thead>
                        <tr className="border-b border-black font-bold">
                            <th className="border-r border-black p-1 w-10 text-center">Sl no.</th>
                            <th className="border-r border-black p-1 text-center">Product</th>
                            <th className="border-r border-black p-1 w-10 text-center">Qty</th>
                            <th className="border-r border-black p-1 w-20 text-center">Rate</th>
                            <th className="border-r border-black p-1 w-20 text-center">Amount</th>
                            <th className="border-r border-black p-1 w-12 text-center">Gst %</th>
                            <th className="border-r border-black p-1 w-20 text-center">Gst value</th>
                            <th className="p-1 w-24 text-center">Price with Gst</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.items || []).map((item, idx) => {
                            const amt = item.quantity * item.unitPrice;
                            const tax = amt * (item.taxRate / 100);
                            return (
                                <tr key={idx} className="border-b border-black last:border-b-0 h-8">
                                    <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border-r border-black p-1 font-bold">{item.description}</td>
                                    <td className="border-r border-black p-1 text-center">{item.quantity || ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? (item.unitPrice || 0).toLocaleString() : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? amt.toLocaleString() : ''}</td>
                                    <td className="border-r border-black p-1 text-center">{item.quantity ? `${item.taxRate}%` : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? tax.toLocaleString() : ''}</td>
                                    <td className="p-1 text-right font-bold">{item.quantity ? (amt + tax).toLocaleString() : ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Total</td>
                            <td className="p-1 text-right font-black">{(totals.totalWithGst || 0).toLocaleString()}</td>
                        </tr>
                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Discount/Adjustment</td>
                            <td className="p-1 text-right">{(data.discount || 0).toLocaleString()}</td>
                        </tr>
                        <tr className="border-t border-black font-black bg-slate-50 text-sm">
                            <td colSpan={7} className="border-r border-black p-1.5 text-right uppercase">Grand Total</td>
                            <td className="p-1.5 text-right">Rs. {(totals.grandTotal || 0).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="border-x border-b border-black p-1.5 font-bold italic">Payment Terms: <span className="ml-4 font-normal not-italic">{data.paymentTerms || '------------------'}</span></div>
            <div className="border-x border-b border-black p-1.5 font-bold">Delivery Schedule: <span className="ml-4 font-medium">{data.deliveryTime || '------------------'}</span></div>
            <div className="border-x border-b border-black p-1.5 min-h-[60px]"><p className="font-bold underline decoration-slate-300">Special instructions regarding supply/packing:</p><p className="mt-1 font-medium italic">{data.specialNote || '------------------'}</p></div>
            <div className="grid grid-cols-2 border-x border-b border-black flex-1 min-h-[100px]"><div className="border-r border-black p-2 flex flex-col justify-between"><p className="font-bold">Accepted By (Vendor):</p><div className="border-t border-dotted border-black pt-1 w-3/4 mb-4"></div></div><div className="p-2 flex flex-col justify-between"><p className="font-bold">Authorized Signatory (Sree Meditec):</p><div className="border-t border-dotted border-black pt-1 w-3/4 mb-4"></div></div></div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderTab('form'); setOrder({ date: new Date().toISOString().split('T')[0], cpoDate: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'SupplierPO', bankDetails: '33APGPS4675G2ZL', deliveryAddress: DEFAULT_DELIVERY_ADDRESS, advanceAmount: 0, discount: 0, deliveryTime: 'Immediate', specialNote: '', paymentTerms: 'Terms: 100% against delivery or as agreed.' }); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Procurement</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-800 uppercase tracking-tight text-xs tracking-widest">Procurement History</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">PO #</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-right">Value</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.filter(i => i.documentType === 'SupplierPO').map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-500">{inv.createdBy?.charAt(0) || 'S'}</div>
                                                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[100px]">{inv.createdBy || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-teal-700">₹{(inv.grandTotal || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={18}/></button>
                                                <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"><Download size={18}/></button>
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
                    <div className="flex bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><PenTool size={18}/> Details</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('spares')} className={`flex-1 min-w-[120px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'spares' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><ListIcon size={18}/> Spares Store</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><FileText size={14}/> Registry Meta</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">SMPOC No.</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={order.invoiceNumber} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMPOC-001" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.date} onChange={e => setOrder({...order, date: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendor Ref No.</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.cpoNumber} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="Ref-1234" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ref Date</label>
                                            <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.cpoDate} onChange={e => setOrder({...order, cpoDate: e.target.value})} />
                                        </div>
                                    </div>
                                </section>
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Building2 size={14}/> Vendor Linkage</h3>
                                    <div className="relative">
                                        <input type="text" list="vendor-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={order.customerName || ''} onChange={e => handleVendorSelect(e.target.value)} placeholder="Search Authorized Vendor Database *" />
                                        <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none transition-all" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Vendor Address Details" />
                                        <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none transition-all" value={order.deliveryAddress || ''} onChange={e => setOrder({...order, deliveryAddress: e.target.value})} placeholder="Sree Meditec Delivery Point" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" placeholder="Vendor GSTIN" value={order.customerGstin} onChange={e => setOrder({...order, customerGstin: e.target.value})} />
                                        <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" placeholder="Our Billing GSTIN" value={order.bankDetails} onChange={e => setOrder({...order, bankDetails: e.target.value})} />
                                    </div>
                                </section>
                                <section className="space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-2 gap-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Line Items</h3><div className="flex gap-2 w-full sm:w-auto"><button onClick={() => handleAddItem()} className="flex-1 sm:flex-none text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1.5 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all">+ Add Empty Row</button><button onClick={() => setBuilderTab('spares')} className="flex-1 sm:flex-none text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all">+ Browse Spares Store</button></div></div>
                                    <div className="space-y-4">
                                        {order.items?.map((item) => (
                                            <div key={item.id} className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] sm:rounded-[2rem] relative group hover:bg-white hover:border-medical-200 transition-all">
                                                <button onClick={() => setOrder({...order, items: order.items?.filter(i => i.id !== item.id)})} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                    <div className="md:col-span-8"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1">Description</label><input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black" placeholder="Part or Consumable" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                                    <div className="grid grid-cols-3 md:col-span-4 gap-2">
                                                        <div className="col-span-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1 text-center">Qty</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                                        <div className="col-span-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1 text-right">Buy Rate</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-right" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                                        <div className="col-span-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1 text-center">GST %</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {order.items?.length === 0 && (
                                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                                                <Package size={40} className="mb-2 opacity-20" />
                                                <p className="text-xs font-black uppercase tracking-widest text-center px-4">No spares indexed in this order</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                                <section className="space-y-6 bg-slate-50/50 p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CreditCard size={16} /> Fulfillment & Terms</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Discount / Adjustment (₹)</label><input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={order.discount} onChange={e => setOrder({...order, discount: Number(e.target.value)})} placeholder="0.00" /></div>
                                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Delivery Lead Time</label><input type="text" className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={order.deliveryTime} onChange={e => setOrder({...order, deliveryTime: e.target.value})} placeholder="e.g. Immediate, 7 Days" /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payment / Contract Terms</label><textarea rows={2} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-medical-500/5 transition-all resize-none" value={order.paymentTerms} onChange={e => setOrder({...order, paymentTerms: e.target.value})} placeholder="e.g. 100% against delivery" /></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Special Packing/Shipping Notes</label><textarea rows={3} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-medical-500/5 transition-all resize-none" value={order.specialNote || ''} onChange={e => setOrder({...order, specialNote: e.target.value})} placeholder="Any specific vendor requirements..." /></div>
                                </section>
                                <div className="flex flex-col sm:flex-row gap-4 pt-10 sticky bottom-0 bg-white pb-6 border-t border-slate-50 z-30">
                                    <button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Discard</button>
                                    <button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-4 bg-white border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-50 transition-all">Save Draft</button>
                                    <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(order); }} className="w-full sm:flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center justify-center gap-3 transition-all active:scale-95"><Save size={18} /> Finalize & Download</button>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50"><div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>{renderPOTemplate(order, totals)}</div></div>
                        )}
                        {builderTab === 'spares' && (
                            <div className="h-full bg-white flex flex-col p-4 sm:p-8 overflow-hidden animate-in fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg sm:text-xl">Spares Store</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Select hardware for procurement</p>
                                    </div>
                                    <div className="relative w-full sm:w-80">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Filter Spares Registry..." className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                
                                {order.customerName && (
                                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-indigo-700">
                                        <Star size={18} fill="currentColor" className="text-indigo-400 shrink-0" />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Prioritizing products indexed for "{order.customerName}"</span>
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    {filteredSpares.map(prod => {
                                        const isVendorMatch = prod.supplier?.toLowerCase() === order.customerName?.toLowerCase();
                                        return (
                                            <div key={prod.id} 
                                                 className={`p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                                                     isVendorMatch 
                                                     ? 'bg-indigo-50/20 border-indigo-200 shadow-md ring-1 ring-indigo-100' 
                                                     : 'bg-white border-slate-100 hover:border-medical-400 shadow-sm'
                                                 }`} 
                                                 onClick={() => handleAddItem(prod)}>
                                                {isVendorMatch && <div className="absolute top-0 right-0 p-2 bg-indigo-600 text-white rounded-bl-2xl"><Star size={12} fill="currentColor" /></div>}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${isVendorMatch ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{prod.category}</span>
                                                        <span className="text-[9px] font-mono text-slate-400 tracking-tighter uppercase">{prod.sku}</span>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-medical-700 transition-colors">{prod.name}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase truncate">{prod.supplier || 'N/A Supplier'}</p>
                                                </div>
                                                <div className="mt-4 sm:mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Master Buy Rate</p>
                                                        <p className="text-sm font-black text-slate-800 tracking-tight">₹{(prod.purchasePrice || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className={`p-2 rounded-xl border shadow-sm transition-all group-hover:scale-110 ${isVendorMatch ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-medical-600 border-slate-100 group-hover:bg-medical-600 group-hover:text-white'}`}>
                                                        <Plus size={20} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredSpares.length === 0 && (
                                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-300 opacity-30">
                                            <Search size={64} className="mb-4" />
                                            <p className="text-sm font-black uppercase tracking-widest">No matching spares in database</p>
                                        </div>
                                    )}
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
