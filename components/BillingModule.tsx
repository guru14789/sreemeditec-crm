
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Download, Search, Trash2, 
    X, Save, Edit, Eye, List as ListIcon, PenTool, 
    History, FileText
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero Only';
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
        return inWords(Math.floor(num / 10000000)) + 'crore ' + (num % 10000000 !== 0 ? inWords(num % 10000000) : '');
    };
    const result = inWords(Math.floor(num));
    return result ? result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' Only' : '';
};

const calculateDetailedTotals = (invoice: Partial<Invoice>) => {
    const items = invoice.items || [];
    const taxableValue = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const taxTotal = items.reduce((sum, p) => sum + ((p.quantity * p.unitPrice) * (p.taxRate / 100)), 0);
    const cgst = taxTotal / 2;
    const sgst = taxTotal / 2;
    const totalQty = items.reduce((sum, p) => sum + p.quantity, 0);
    const grandTotal = taxableValue + taxTotal;
    return { taxableValue, taxTotal, cgst, sgst, grandTotal, totalQty };
};

export const BillingModule: React.FC<{ variant?: 'billing' | 'quotes' }> = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, updateProduct, addNotification, currentUser } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [invoice, setInvoice] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'Pending',
        customerName: '',
        customerAddress: '',
        customerGstin: '',
        smcpoNumber: 'verbal',
        deliveryTime: 'Immediately',
        specialNote: 'Chennai',
        documentType: 'PO'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !invoice.invoiceNumber) {
            setInvoice(prev => ({
                ...prev,
                invoiceNumber: `SM/25-26/${String(invoices.filter(i => i.documentType === 'PO' || !i.documentType).length + 135).padStart(4, '0')}`
            }));
        }
    }, [viewState, editingId, invoices]);

    const totals = useMemo(() => calculateDetailedTotals(invoice), [invoice]);

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        const doc = new jsPDF();
        const docTotals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const midX = pageWidth / 2;
        const margin = 10;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Tax Invoice', midX, 10, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('(ORIGINAL FOR RECIPIENT)', pageWidth - margin, 10, { align: 'right' });

        doc.setLineWidth(0.1);
        doc.rect(margin, 12, pageWidth - (margin * 2), 78);
        doc.line(midX, 12, midX, 90);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SREE MEDITEC', margin + 2, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Old No.2 New No.18, Bajanai Koil Street,', margin + 2, 23);
        doc.text('Rajakilpakkam, Chennai -73', margin + 2, 27);
        doc.text('Ph.9884818398/ 7200025642', margin + 2, 31);
        doc.text('GSTIN/UIN: 33APGPS4675G2ZL', margin + 2, 35);
        doc.text('State Name : Tamil Nadu, Code : 33', margin + 2, 39);
        doc.text('E-Mail : sreemeditec@gmail.com', margin + 2, 43);

        const rowH = 13;
        const startY = 12;
        doc.line(midX, startY + rowH, pageWidth - margin, startY + rowH);
        doc.line(midX, startY + (rowH * 2), pageWidth - margin, startY + (rowH * 2));
        doc.line(midX, startY + (rowH * 3), pageWidth - margin, startY + (rowH * 3));
        doc.line(midX, startY + (rowH * 4), pageWidth - margin, startY + (rowH * 4));
        doc.line(midX, startY + (rowH * 5), pageWidth - margin, startY + (rowH * 5));
        
        const innerMid = midX + ((pageWidth - margin - midX) / 2);
        doc.line(innerMid, startY, innerMid, startY + (rowH * 2));
        doc.line(innerMid, startY + (rowH * 3), innerMid, startY + (rowH * 5));

        doc.setFontSize(7);
        doc.text('Invoice No.', midX + 1, startY + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(data.invoiceNumber || '', midX + 1, startY + 9);

        doc.setFont('helvetica', 'normal');
        doc.text('Dated', innerMid + 1, startY + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(formatDateDDMMYYYY(data.date), innerMid + 1, startY + 9);

        doc.setFont('helvetica', 'normal');
        doc.text('Delivery Note', midX + 1, startY + rowH + 4);
        doc.text('Mode/Terms of Payment', innerMid + 1, startY + rowH + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(data.deliveryTime || 'Immediately', innerMid + 1, startY + rowH + 9);

        doc.setFont('helvetica', 'normal');
        doc.text('Reference No. & Date.', midX + 1, startY + (rowH * 2) + 4);
        doc.text('Other References', innerMid + 1, startY + (rowH * 2) + 4);

        doc.text('Buyer\'s Order No.', midX + 1, startY + (rowH * 3) + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(data.smcpoNumber || 'verbal', midX + 1, startY + (rowH * 3) + 9);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Dated', innerMid + 1, startY + (rowH * 3) + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(formatDateDDMMYYYY(data.date), innerMid + 1, startY + (rowH * 3) + 9);

        doc.setFont('helvetica', 'normal');
        doc.text('Dispatch Doc No.', midX + 1, startY + (rowH * 4) + 4);
        doc.text('Delivery Note Date', innerMid + 1, startY + (rowH * 4) + 4);

        doc.text('Dispatched through', midX + 1, startY + (rowH * 5) + 4);
        doc.setFont('helvetica', 'bold');
        doc.text('Person', midX + 1, startY + (rowH * 5) + 9);

        doc.setFont('helvetica', 'normal');
        doc.text('Destination', innerMid + 1, startY + (rowH * 5) + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(data.specialNote || 'Chennai', innerMid + 1, startY + (rowH * 5) + 9);

        doc.line(margin, 46, midX, 46);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Consignee (Ship to)', margin + 2, 49);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin + 2, 53);
        doc.setFont('helvetica', 'normal');
        const addrLines = doc.splitTextToSize(data.customerAddress || '', midX - margin - 5);
        doc.text(addrLines, margin + 2, 57);
        
        let partyCurrentY = 62 + (addrLines.length * 2);
        doc.text(`GSTIN/UIN : ${data.customerGstin || ''}`, margin + 2, partyCurrentY);
        doc.text('State Name : Tamil Nadu, Code : 33', margin + 2, partyCurrentY + 4);

        doc.line(margin, 68, midX, 68);
        doc.text('Buyer (Bill to)', margin + 2, 71);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin + 2, 75);
        doc.setFont('helvetica', 'normal');
        doc.text(addrLines, margin + 2, 79);
        doc.text(`GSTIN/UIN : ${data.customerGstin || ''}`, margin + 2, partyCurrentY + 20);
        doc.text('State Name : Tamil Nadu, Code : 33', margin + 2, partyCurrentY + 24);

        const itemsBody = (data.items || []).map((it, idx) => {
            const base = it.quantity * it.unitPrice;
            return [
                idx + 1, 
                { content: it.description, styles: { fontStyle: 'bold' } as any }, 
                it.hsn || '', 
                `${it.taxRate}%`, 
                `${it.quantity.toFixed(2)} nos`, 
                it.unitPrice.toFixed(2), 
                'nos', 
                '', 
                base.toFixed(2)
            ];
        });

        itemsBody.push(
            ['', { content: 'Output CGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', docTotals.cgst.toFixed(2)],
            ['', { content: 'Output SGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', docTotals.sgst.toFixed(2)]
        );

        autoTable(doc, {
            startY: 90,
            head: [['Sl\nNo.', 'Description of Goods', 'HSN/SAC', 'GST\nRate', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount']],
            body: itemsBody,
            foot: [[
                '', 
                { content: 'Total', styles: { halign: 'right', fontStyle: 'bold' } as any }, 
                '', 
                '', 
                { content: `${docTotals.totalQty.toFixed(2)} nos`, styles: { halign: 'right', fontStyle: 'bold' } as any }, 
                '', 
                '', 
                '', 
                { content: `Rs. ${docTotals.grandTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } as any }
            ]],
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center', fontSize: 7 },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 70 },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 20, halign: 'right' },
                5: { cellWidth: 20, halign: 'right' },
                6: { cellWidth: 10, halign: 'center' },
                7: { cellWidth: 10, halign: 'center' },
                8: { cellWidth: 20, halign: 'right' }
            }
        });

        const tableFinalY = (doc as any).lastAutoTable.finalY;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Amount Chargeable (in words)', margin + 2, tableFinalY + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(numberToWords(docTotals.grandTotal), margin + 2, tableFinalY + 12);
        doc.text('E. & O.E', pageWidth - margin - 2, tableFinalY + 8, { align: 'right' });

        autoTable(doc, {
            startY: tableFinalY + 18,
            head: [['HSN/SAC', 'Taxable\nValue', 'Central Tax', '', 'State Tax', '', 'Total\nTax Amount'], ['', '', 'Rate', 'Amount', 'Rate', 'Amount', '']],
            body: [
                ['---', docTotals.taxableValue.toFixed(2), '9%', docTotals.cgst.toFixed(2), '9%', docTotals.sgst.toFixed(2), docTotals.taxTotal.toFixed(2)],
                [{ content: 'Total', styles: { fontStyle: 'bold' } as any }, { content: docTotals.taxableValue.toFixed(2), styles: { fontStyle: 'bold' } as any }, '', { content: docTotals.cgst.toFixed(2), styles: { fontStyle: 'bold' } as any }, '', { content: docTotals.sgst.toFixed(2), styles: { fontStyle: 'bold' } as any }, { content: docTotals.taxTotal.toFixed(2), styles: { fontStyle: 'bold' } as any }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center', fontSize: 6.5 },
            styles: { fontSize: 6.5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' }
        });

        const taxFinalY = (doc as any).lastAutoTable.finalY;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Tax Amount (in words) : ${numberToWords(docTotals.taxTotal)}`, margin + 2, taxFinalY + 6);

        const bottomY = taxFinalY + 12;
        doc.rect(margin, bottomY, pageWidth - (margin * 2), 40);
        doc.setFont('helvetica', 'bold');
        doc.text('Declaration', margin + 2, bottomY + 5);
        doc.setFont('helvetica', 'normal');
        doc.text('We declare that this invoice shows the actual price of the goods \ndescribed and that all particulars are true and correct.', margin + 2, bottomY + 10);

        doc.setFont('helvetica', 'bold');
        doc.text('Company\'s Bank Details', midX + 2, bottomY + 5);
        doc.setFont('helvetica', 'normal');
        doc.text('Bank Name   : KVB Bank', midX + 2, bottomY + 10);
        doc.text('A/c No.         : 1617135000000754', midX + 2, bottomY + 15);
        doc.text('Branch & IFS Code : Selaiyur & KVBL0001617', midX + 2, bottomY + 20);

        doc.rect(margin, bottomY + 25, pageWidth - (margin * 2), 25);
        doc.line(midX, bottomY + 25, midX, bottomY + 50);
        doc.text('Customer\'s Seal and Signature', margin + 2, bottomY + 30);
        doc.setFont('helvetica', 'bold');
        doc.text('for SREE MEDITEC', pageWidth - margin - 2, bottomY + 30, { align: 'right' });
        doc.text('Authorised Signatory', pageWidth - margin - 2, bottomY + 47, { align: 'right' });

        doc.setFontSize(6);
        doc.setFont('helvetica', 'italic');
        doc.text('This is a Computer Generated Invoice', pageWidth / 2, bottomY + 56, { align: 'center' });

        doc.save(`Invoice_${data.invoiceNumber || 'New'}.pdf`);
    };

    const handleSave = (status: 'Draft' | 'Finalized') => {
        if (!invoice.customerName || !invoice.items?.length) {
            alert("Please fill customer details and add at least one item.");
            return;
        }

        const invTotals = calculateDetailedTotals(invoice);
        const finalData: Invoice = {
            ...invoice as Invoice,
            id: editingId || `INV-${Date.now()}`,
            subtotal: invTotals.taxableValue,
            taxTotal: invTotals.taxTotal,
            grandTotal: invTotals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'PO',
            createdBy: currentUser?.name || 'System'
        };

        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);

        if (status === 'Finalized') {
            (invoice.items || []).forEach(item => {
                const product = products.find(p => p.name === item.description);
                if (product) updateProduct(product.id, { stock: Math.max(0, product.stock - item.quantity) });
            });
        }

        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Invoice ${finalData.invoiceNumber} archived.`, 'success');
    };

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unitPrice: prod?.sellingPrice || 0, // USE sellingPrice for outward Invoice
            taxRate: prod?.taxRate || 18,
            amount: prod?.sellingPrice || 0,
            gstValue: (prod?.sellingPrice || 0) * 0.18,
            priceWithGst: (prod?.sellingPrice || 0) * 1.18
        };
        setInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setInvoice(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.sellingPrice; // USE sellingPrice
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

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setInvoice({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', smcpoNumber: 'verbal', deliveryTime: 'Immediately', specialNote: 'Chennai' }); setBuilderTab('form'); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Invoice</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Financial Archive</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[9px] text-slate-400 border-b">
                                <tr>
                                    <th className="px-8 py-5">Invoice #</th>
                                    <th className="px-8 py-5">Customer</th>
                                    <th className="px-8 py-5 text-center">Date</th>
                                    <th className="px-8 py-5 text-right">Value</th>
                                    <th className="px-8 py-5 text-center">Status</th>
                                    <th className="px-8 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.filter(i => i.documentType === 'PO' || !i.documentType).map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-5 font-black text-medical-700">{inv.invoiceNumber}</td>
                                        <td className="px-8 py-5 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-8 py-5 text-center text-slate-400 text-xs">{formatDateDDMMYYYY(inv.date)}</td>
                                        <td className="px-8 py-5 text-right font-black">₹{(inv.grandTotal || 0).toLocaleString()}</td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setInvoice(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit size={18}/></button>
                                                <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-300 hover:text-emerald-500"><Download size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Print Layout</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar bg-white">
                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">1. Registry Metadata</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        <FormRow label="Invoice No."><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={invoice.invoiceNumber} onChange={e => setInvoice({...invoice, invoiceNumber: e.target.value})} /></FormRow>
                                        <FormRow label="Dated"><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm outline-none font-bold" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} /></FormRow>
                                        <FormRow label="Buyer Order No"><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold" value={invoice.smcpoNumber} onChange={e => setInvoice({...invoice, smcpoNumber: e.target.value})} /></FormRow>
                                        <FormRow label="Destination"><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold" value={invoice.specialNote} onChange={e => setInvoice({...invoice, specialNote: e.target.value})} /></FormRow>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">2. Party Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <FormRow label="Consignee Name *">
                                                <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5" value={invoice.customerName || ''} onChange={e => {
                                                    const client = clients.find(c => c.name === e.target.value || c.hospital === e.target.value);
                                                    setInvoice(prev => ({
                                                        ...prev,
                                                        customerName: e.target.value,
                                                        customerAddress: client ? client.address : prev.customerAddress,
                                                        customerGstin: client ? client.gstin : prev.customerGstin
                                                    }));
                                                }} placeholder="Search registry..." />
                                            </FormRow>
                                            <FormRow label="Consignee GSTIN">
                                                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold outline-none" value={invoice.customerGstin} onChange={e => setInvoice({...invoice, customerGstin: e.target.value})} placeholder="33XXXXX" />
                                            </FormRow>
                                        </div>
                                        <FormRow label="Site / Billing Address">
                                            <textarea rows={5} className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold outline-none resize-none" value={invoice.customerAddress || ''} onChange={e => setInvoice({...invoice, customerAddress: e.target.value})} placeholder="Full site address details..." />
                                        </FormRow>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">3. Manifest Items</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => setBuilderTab('catalog')} className="text-[9px] font-black text-teal-600 bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all uppercase tracking-widest">+ Store</button>
                                            <button onClick={() => handleAddItem()} className="text-[9px] font-black text-medical-600 bg-medical-50 px-4 py-2 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all uppercase tracking-widest">+ Custom Row</button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {invoice.items?.map((item) => (
                                            <div key={item.id} className="p-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] relative group hover:bg-white hover:border-medical-200 transition-all">
                                                <button onClick={() => setInvoice({...invoice, items: invoice.items?.filter(i => i.id !== item.id)})} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                                <div className="grid grid-cols-12 gap-6">
                                                    <div className="col-span-12 md:col-span-6">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Description</label>
                                                        <input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black" placeholder="Item Name" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-4 md:col-span-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">HSN</label>
                                                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.hsn} onChange={e => updateItem(item.id, 'hsn', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-4 md:col-span-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">Qty</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                    </div>
                                                    <div className="col-span-4 md:col-span-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-right">Rate</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-right" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                                    </div>
                                                    <div className="col-span-12 md:col-span-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">GST %</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <div className="flex flex-col sm:flex-row gap-4 pt-12 sticky bottom-0 bg-white pb-8 border-t border-slate-50 z-30">
                                    <button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Discard</button>
                                    <button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-5 bg-white border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-medical-50 transition-all">Save Draft</button>
                                    <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(invoice); }} className="w-full sm:flex-[2] py-5 bg-medical-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center justify-center gap-3 transition-all active:scale-95">
                                        <Save size={20} /> Finalize & PDF
                                    </button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-12 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.4] sm:scale-[0.55] md:scale-[0.65] lg:scale-[0.7] xl:scale-[0.8] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 mx-auto overflow-hidden text-[10px] leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
                                        <div className="flex justify-between items-center border-b border-black pb-1 mb-1 font-bold">
                                            <span className="uppercase text-xs tracking-tighter">Tax Invoice</span>
                                            <span className="italic text-[8px]">(ORIGINAL FOR RECIPIENT)</span>
                                        </div>

                                        <div className="grid grid-cols-2 border border-black">
                                            <div className="border-r border-black p-3 flex flex-col h-full">
                                                <h1 className="text-xl font-bold text-black mb-1">SREE MEDITEC</h1>
                                                <p>Old No.2 New No.18, Bajanai Koil Street,</p>
                                                <p>Rajakilpakkam, Chennai -73</p>
                                                <p>Ph.9884818398/ 7200025642</p>
                                                <p className="font-bold mt-2">GSTIN/UIN: 33APGPS4675G2ZL</p>
                                                <p>State Name : Tamil Nadu, Code : 33</p>
                                                <p>E-Mail : sreemeditec@gmail.com</p>
                                            </div>
                                            <div className="grid grid-cols-2 text-[9px]">
                                                <div className="border-r border-b border-black p-2 h-[45px]">Invoice No.<br/><span className="font-bold text-[10px]">{invoice.invoiceNumber}</span></div>
                                                <div className="border-b border-black p-2 h-[45px]">Dated<br/><span className="font-bold text-[10px]">{formatDateDDMMYYYY(invoice.date)}</span></div>
                                                <div className="border-r border-b border-black p-2 h-[45px]">Delivery Note<br/><span className="font-bold"></span></div>
                                                <div className="border-b border-black p-2 h-[45px]">Mode/Terms of Payment<br/><span className="font-bold text-[10px]">{invoice.deliveryTime}</span></div>
                                                <div className="border-r border-b border-black p-2 h-[45px]">Reference No. & Date.<br/><span className="font-bold"></span></div>
                                                <div className="border-b border-black p-2 h-[45px]">Other References<br/><span className="font-bold"></span></div>
                                                <div className="border-r border-b border-black p-2 h-[45px]">Buyer's Order No.<br/><span className="font-bold text-[10px]">{invoice.smcpoNumber}</span></div>
                                                <div className="border-b border-black p-2 h-[45px]">Dated<br/><span className="font-bold text-[10px]">{formatDateDDMMYYYY(invoice.date)}</span></div>
                                                <div className="border-r border-b border-black p-2 h-[45px]">Dispatch Doc No.<br/><span className="font-bold"></span></div>
                                                <div className="border-b border-black p-2 h-[45px]">Delivery Note Date<br/><span className="font-bold"></span></div>
                                                <div className="border-r border-black p-2 h-[45px]">Dispatched through<br/><span className="font-bold">Person</span></div>
                                                <div className="p-2 h-[45px]">Destination<br/><span className="font-bold text-[10px]">{invoice.specialNote}</span></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 border-x border-b border-black min-h-[120px]">
                                            <div className="border-r border-black p-3 flex flex-col justify-between">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Consignee (Ship to)</p>
                                                    <p className="font-bold uppercase text-[11px] leading-tight mb-1">{invoice.customerName}</p>
                                                    <p className="whitespace-pre-wrap text-[10px]">{invoice.customerAddress}</p>
                                                </div>
                                                <div className="mt-4">
                                                    <p className="font-bold">GSTIN/UIN : {invoice.customerGstin}</p>
                                                    <p>State Name : Tamil Nadu, Code : 33</p>
                                                </div>
                                            </div>
                                            <div className="p-3 flex flex-col justify-between">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Buyer (Bill to)</p>
                                                    <p className="font-bold uppercase text-[11px] leading-tight mb-1">{invoice.customerName}</p>
                                                    <p className="whitespace-pre-wrap text-[10px]">{invoice.customerAddress}</p>
                                                </div>
                                                <div className="mt-4">
                                                    <p className="font-bold">GSTIN/UIN : {invoice.customerGstin}</p>
                                                    <p>State Name : Tamil Nadu, Code : 33</p>
                                                </div>
                                            </div>
                                        </div>

                                        <table className="w-full border-x border-b border-black text-center text-[10px]">
                                            <thead className="bg-slate-50 font-bold border-b border-black">
                                                <tr className="grid grid-cols-[10mm_1fr_15mm_15mm_20mm_20mm_10mm_10mm_20mm]">
                                                    <th className="border-r border-black p-2 flex items-center justify-center">Sl No.</th>
                                                    <th className="border-r border-black p-2 text-left flex items-center">Description of Goods</th>
                                                    <th className="border-r border-black p-2 flex items-center justify-center">HSN/SAC</th>
                                                    <th className="border-r border-black p-2 flex items-center justify-center">GST Rate</th>
                                                    <th className="border-r border-black p-2 flex items-center justify-center">Qty</th>
                                                    <th className="border-r border-black p-2 flex items-center justify-center">Rate</th>
                                                    <th className="border-r border-black p-2 flex items-center justify-center">per</th>
                                                    <th className="border-r border-black p-2 flex items-center justify-center">Disc. %</th>
                                                    <th className="p-2 text-right flex items-center justify-end">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(invoice.items || []).map((it, idx) => {
                                                    const base = it.quantity * it.unitPrice;
                                                    return (
                                                        <tr key={`${idx}-m`} className="grid grid-cols-[10mm_1fr_15mm_15mm_20mm_20mm_10mm_10mm_20mm] border-b border-slate-100">
                                                            <td className="border-r border-black p-2 flex items-center justify-center">{idx + 1}</td>
                                                            <td className="border-r border-black p-2 text-left font-bold uppercase truncate flex items-center">{it.description}</td>
                                                            <td className="border-r border-black p-2 flex items-center justify-center">{it.hsn}</td>
                                                            <td className="border-r border-black p-2 flex items-center justify-center">{it.taxRate}%</td>
                                                            <td className="border-r border-black p-2 text-right font-bold flex items-center justify-end">{it.quantity.toFixed(2)} nos</td>
                                                            <td className="border-r border-black p-2 text-right flex items-center justify-end">{it.unitPrice.toFixed(2)}</td>
                                                            <td className="border-r border-black p-2 flex items-center justify-center">nos</td>
                                                            <td className="border-r border-black p-2 flex items-center justify-center"></td>
                                                            <td className="p-2 text-right font-black flex items-center justify-end">₹ {base.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="grid grid-cols-[10mm_1fr_15mm_15mm_20mm_20mm_10mm_10mm_20mm] h-4 bg-slate-50/20 italic">
                                                    <td className="border-r border-black"></td>
                                                    <td className="border-r border-black p-1 text-left flex items-center">Output CGST</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="p-1 text-right font-bold flex items-center justify-end">{totals.cgst.toFixed(2)}</td>
                                                </tr>
                                                <tr className="grid grid-cols-[10mm_1fr_15mm_15mm_20mm_20mm_10mm_10mm_20mm] h-4 bg-slate-50/20 italic">
                                                    <td className="border-r border-black"></td>
                                                    <td className="border-r border-black p-1 text-left flex items-center">Output SGST</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="p-1 text-right font-bold flex items-center justify-end">{totals.sgst.toFixed(2)}</td>
                                                </tr>
                                                {Array.from({ length: Math.max(0, 8 - (invoice.items?.length || 0)) }).map((_, i) => (
                                                    <tr key={`f-${i}`} className="grid grid-cols-[10mm_1fr_15mm_15mm_20mm_20mm_10mm_10mm_20mm] h-8 border-b border-slate-50 opacity-10">
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="grid grid-cols-[10mm_1fr_15mm_15mm_20mm_20mm_10mm_10mm_20mm] border-t border-black font-black bg-slate-50 text-[11px]">
                                                    <td colSpan={2} className="border-r border-black p-2 text-right flex items-center justify-end">Total</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="border-r border-black p-2 text-right font-black flex items-center justify-end">{totals.totalQty.toFixed(2)} nos</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="p-2 text-right flex items-center justify-end">₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        <div className="flex justify-between items-start border-x border-b border-black p-3">
                                            <div>
                                                <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Amount Chargeable (in words)</p>
                                                <p className="font-black text-xs">{numberToWords(totals.grandTotal)}</p>
                                            </div>
                                            <div className="text-[9px] font-black italic">E. & O.E</div>
                                        </div>

                                        <div className="mt-2 border border-black">
                                            <table className="w-full text-[8px] text-center border-collapse">
                                                <thead className="bg-slate-100 border-b border-black font-black">
                                                    <tr>
                                                        <th rowSpan={2} className="border-r border-black p-1">HSN/SAC</th>
                                                        <th rowSpan={2} className="border-r border-black p-1">Taxable Value</th>
                                                        <th colSpan={2} className="border-r border-black p-1">Central Tax</th>
                                                        <th colSpan={2} className="border-r border-black p-1">State Tax</th>
                                                        <th rowSpan={2} className="p-1">Total Tax Amount</th>
                                                    </tr>
                                                    <tr className="border-t border-black">
                                                        <th className="border-r border-black p-1">Rate</th><th className="border-r border-black p-1">Amount</th>
                                                        <th className="border-r border-black p-1">Rate</th><th className="border-r border-black p-1">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-black">
                                                        <td className="border-r border-black p-1.5">---</td>
                                                        <td className="border-r border-black p-1.5">{totals.taxableValue.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1.5">9%</td><td className="border-r border-black p-1.5">{totals.cgst.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1.5">9%</td><td className="border-r border-black p-1.5">{totals.sgst.toFixed(2)}</td>
                                                        <td className="p-1.5 font-bold">{totals.taxTotal.toFixed(2)}</td>
                                                    </tr>
                                                    <tr className="font-black bg-slate-50">
                                                        <td className="border-r border-black p-1.5 text-right">Total</td>
                                                        <td className="border-r border-black p-1.5">{totals.taxableValue.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1.5"></td><td className="border-r border-black p-1.5">{totals.cgst.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1.5"></td><td className="border-r border-black p-1.5">{totals.sgst.toFixed(2)}</td>
                                                        <td className="p-1.5">₹ {totals.taxTotal.toFixed(2)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-[9px] font-black mt-1 uppercase">Tax Amount (in words) : {numberToWords(totals.taxTotal)}</p>

                                        <div className="grid grid-cols-2 border border-black min-h-[100px] mt-2">
                                            <div className="border-r border-black p-3 flex flex-col">
                                                <p className="font-black text-[10px] underline mb-1 uppercase">Declaration</p>
                                                <p className="text-[9px] mt-1 text-slate-600 leading-tight">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                                            </div>
                                            <div className="p-3">
                                                <p className="font-black text-[10px] uppercase mb-2">Company's Bank Details</p>
                                                <div className="grid grid-cols-[80px_1fr] mt-1 gap-y-1 text-[9px]">
                                                    <span className="font-bold text-slate-400">Bank Name</span><span className="font-black">: KVB Bank</span>
                                                    <span className="font-bold text-slate-400">A/c No.</span><span className="font-black">: 1617135000000754</span>
                                                    <span className="font-bold text-slate-400">Branch & IFS</span><span className="font-black">: Selaiyur & KVBL0001617</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 border-x border-b border-black min-h-[80px]">
                                            <div className="border-r border-black p-3 flex flex-col justify-between">
                                                <p className="font-black text-[9px] uppercase text-slate-400">Customer Seal and Signature</p>
                                            </div>
                                            <div className="p-3 flex flex-col text-right justify-between">
                                                <p className="font-black text-[11px] uppercase">for SREE MEDITEC</p>
                                                <p className="font-black text-[10px] uppercase mt-10">Authorised Signatory</p>
                                            </div>
                                        </div>
                                        <div className="text-center italic text-[7px] mt-2 text-slate-300 font-bold uppercase tracking-[0.4em]">This is a Computer Generated Invoice</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-10 overflow-hidden animate-in fade-in">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Product Registry</h3>
                                    <div className="relative w-72">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Filter index..." className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all w-full" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {products.map(prod => (
                                        <div key={prod.id} className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group shadow-sm hover:shadow-xl" onClick={() => { handleAddItem(prod); setBuilderTab('form'); }}>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors truncate uppercase">{prod.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">₹{(prod.sellingPrice || 0).toLocaleString()} • {prod.sku}</p>
                                            </div>
                                            <div className="ml-4 p-2.5 bg-white rounded-xl border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-md active:scale-90"><Plus size={20} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
        {children}
    </div>
);
