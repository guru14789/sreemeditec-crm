
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Download, Search, Trash2, 
    Save, Edit, Eye, List as ListIcon, PenTool, 
    History, MoreVertical
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
    const freight = Number(invoice.freightAmount) || 0;
    const freightTax = (freight * (Number(invoice.freightTaxRate) || 0)) / 100;
    
    const itemsTaxable = items.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)), 0);
    const itemsTax = items.reduce((sum, p) => sum + (((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)) * ((Number(p.taxRate) || 0) / 100)), 0);
    
    const taxableValue = itemsTaxable + freight;
    const taxTotal = itemsTax + freightTax;
    
    const cgst = taxTotal / 2;
    const sgst = taxTotal / 2;
    const totalQty = items.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const grandTotal = taxableValue + taxTotal;
    const freightTotal = freight + freightTax;
    
    return { taxableValue, taxTotal, cgst, sgst, grandTotal, totalQty, freight, freightTax, itemsTax, freightTotal };
};

export const BillingModule: React.FC<{ variant?: 'billing' | 'quotes' }> = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, updateProduct, recordStockMovement, addNotification, currentUser, addLog } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [invoice, setInvoice] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'Pending',
        customerName: '',
        customerAddress: '',
        customerGstin: '',
        smcpoNumber: 'verbal',
        buyerName: '',
        buyerAddress: '',
        buyerGstin: '',
        deliveryTime: 'Immediately',
        specialNote: 'Chennai',
        dispatchedThrough: 'Person',
        documentType: 'Invoice'
    });


    useEffect(() => {
        if (viewState === 'builder' && !editingId && !invoice.invoiceNumber) {
            setInvoice(prev => ({
                ...prev,
                invoiceNumber: `SM/26-27/${String(invoices.filter(i => (i.invoiceNumber || '').startsWith('SM/')).length + 135).padStart(4, '0')}`
            }));
        }
    }, [viewState, editingId, invoices.length]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const totals = useMemo(() => calculateDetailedTotals(invoice), [invoice]);

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        addLog('Billing', 'Downloaded PDF', `Exported document ${data.invoiceNumber || 'New'} as PDF`);
        const doc = new jsPDF();
        const docTotals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        
        // Align top divider with the first major vertical line in the table (after Description of Goods)
        const col0W = 10;
        const col1W = 80;
        const midX = margin + col0W + col1W; // This is the vertical line after Description column
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Tax Invoice', midX, 10, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('(ORIGINAL FOR RECIPIENT)', pageWidth - margin, 10, { align: 'right' });

        doc.setLineWidth(0.1);
        const startY = 12;
        const totalHeaderH = 100;
        doc.rect(margin, startY, pageWidth - (margin * 2), totalHeaderH);
        doc.line(midX, startY, midX, startY + totalHeaderH);

        // LEFT COLUMN (Company, Consignee, Buyer)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SREE MEDITEC', margin + 2, startY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Old No.2 New No.18, Bajanai Koil Street,', margin + 2, startY + 11);
        doc.text('Rajakilpakkam, Chennai -73', margin + 2, startY + 15);
        doc.text('Ph.9884818398/ 7200025642', margin + 2, startY + 19);
        doc.text('GSTIN/UIN: 33APGPS4675G2ZL', margin + 2, startY + 23);
        doc.text('E-Mail : sreemeditec@gmail.com', margin + 2, startY + 27);


        doc.line(margin, startY + 35, midX, startY + 35);
        doc.setFontSize(7);
        doc.text('Consignee (Ship to)', margin + 2, startY + 39);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin + 2, startY + 43);
        doc.setFont('helvetica', 'normal');
        const cAddr = doc.splitTextToSize(data.customerAddress || '', midX - margin - 5);
        doc.text(cAddr, margin + 2, startY + 47);
        const cGstY = startY + 47 + (cAddr.length * 3) + 2;
        doc.text(`GSTIN/UIN       : ${data.customerGstin || ''}`, margin + 2, cGstY);


        doc.line(margin, startY + 67, midX, startY + 67);
        doc.text('Buyer (Bill to)', margin + 2, startY + 71);
        doc.setFont('helvetica', 'bold');
        doc.text(data.buyerName || data.customerName || '', margin + 2, startY + 75);
        doc.setFont('helvetica', 'normal');
        const bAddr = doc.splitTextToSize(data.buyerAddress || data.customerAddress || '', midX - margin - 5);
        doc.text(bAddr, margin + 2, startY + 79);
        const bGstY = startY + 79 + (bAddr.length * 3) + 2;
        doc.text(`GSTIN/UIN       : ${data.buyerGstin || data.customerGstin || ''}`, margin + 2, bGstY);
        doc.text('Place of Supply : Tamil Nadu', margin + 2, bGstY + 3);


        // RIGHT COLUMN (Metadata)
        const innerMid = midX + ((pageWidth - margin - midX) / 2);
        const metadataRows = [
            { l: 'Invoice No.', v: data.invoiceNumber, r: 'Dated', rv: formatDateDDMMYYYY(data.date) },
            { l: 'Delivery Note', v: '', r: 'Mode/Terms of Payment', rv: data.deliveryTime || 'Immediately' },
            { l: 'Reference No. & Date.', v: '', r: 'Other References', rv: '' },
            { l: 'Buyer\'s Order No.', v: data.smcpoNumber, r: 'Dated', rv: formatDateDDMMYYYY(data.date) },
            { l: 'Dispatch Doc No.', v: '', r: 'Delivery Note Date', rv: '' },
            { l: 'Dispatched through', v: data.dispatchedThrough || 'Person', r: 'Destination', rv: data.specialNote || 'Chennai' },
            { l: 'Terms of Delivery', v: '', r: '', rv: '' }
        ];


        metadataRows.forEach((row, i) => {
            const y = startY + (i * 14);
            if (i > 0) doc.line(midX, y, pageWidth - margin, y);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(row.l, midX + 1, y + 4);
            doc.text(row.r, innerMid + 1, y + 4);
            doc.setFont('helvetica', 'bold');
            doc.text(row.v || '', midX + 1, y + 9);
            doc.text(row.rv || '', innerMid + 1, y + 9);
            if (i < 6) doc.line(innerMid, y, innerMid, y + 14);
        });

        const itemsBody = (data.items || []).map((it, idx) => {
            const base = it.quantity * it.unitPrice;
            return [
                idx + 1, 
                { content: it.features ? `${it.description}\n${it.features}` : it.description, styles: { fontStyle: 'bold' } as any }, 
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
            ['', { content: 'Freight', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', `${data.freightTaxRate || 0}%`, '', '', '', '', docTotals.freight.toFixed(2)],
            ['', { content: 'Output CGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', docTotals.cgst.toFixed(2)],
            ['', { content: 'Output SGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', docTotals.sgst.toFixed(2)]
        );

        autoTable(doc, {
            startY: startY + totalHeaderH,
            margin: { left: margin, right: margin },
            head: [['Sl\nNo.', 'Description of Goods', 'HSN/SAC', 'GST Rate', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount']],
            body: itemsBody,
            foot: [[
                '', 
                { content: 'Total', styles: { halign: 'right', fontStyle: 'bold' } as any }, 
                '', 
                '', 
                { content: `${docTotals.totalQty.toFixed(2)} nos`, styles: { halign: 'center', fontStyle: 'bold' } as any }, 
                '', 
                '', 
                '', 
                { content: `Rs. ${docTotals.grandTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } as any }
            ]],
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center', fontSize: 7, cellPadding: 1 },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 8, cellPadding: 1 },
            styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 
                0: { cellWidth: col0W, halign: 'center' },
                1: { cellWidth: col1W },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 12, halign: 'center' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 15, halign: 'right' },
                6: { cellWidth: 10, halign: 'center' },
                7: { cellWidth: 8, halign: 'center' },
                8: { cellWidth: pageWidth - (margin * 2) - col0W - col1W - 15 - 12 - 20 - 15 - 10 - 8, halign: 'right' }
            }
        });

        const tableFinalY = (doc as any).lastAutoTable.finalY;
        const wordsY = tableFinalY + 8;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Amount Chargeable (in words): INR ${numberToWords(docTotals.grandTotal)}`, margin, wordsY);
        doc.text('E. & O.E', pageWidth - margin, wordsY, { align: 'right' });


        const taxBody = [
            [
                '9402', 
                docTotals.taxableValue.toFixed(2), 
                '9%', 
                docTotals.cgst.toFixed(2), 
                '9%', 
                docTotals.sgst.toFixed(2), 
                (docTotals.cgst + docTotals.sgst).toFixed(2)
            ],
            [
                { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } as any },
                { content: docTotals.taxableValue.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any },
                '',
                { content: docTotals.cgst.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any },
                '',
                { content: docTotals.sgst.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any },
                { content: (docTotals.cgst + docTotals.sgst).toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any }
            ]
        ];

        autoTable(doc, {
            startY: wordsY + 6,
            margin: { left: margin, right: margin },
            head: [
                [
                    { content: 'HSN/SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } as any },
                    { content: 'Taxable\nValue', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } as any },
                    { content: 'CGST', colSpan: 2, styles: { halign: 'center' } as any },
                    { content: 'SGST/UTGST', colSpan: 2, styles: { halign: 'center' } as any },
                    { content: 'Total\nTax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } as any }
                ],
                ['Rate', 'Amount', 'Rate', 'Amount']
            ],
            body: taxBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: {
                0: { halign: 'center' },
                1: { halign: 'right' },
                2: { halign: 'center' },
                3: { halign: 'right' },
                4: { halign: 'center' },
                5: { halign: 'right' },
                6: { halign: 'right' }
            }
        });

        const taxY = (doc as any).lastAutoTable.finalY + 5;
        doc.setFontSize(8);
        doc.text(`Tax Amount (in words) : INR ${numberToWords(docTotals.cgst + docTotals.sgst)}`, margin, taxY);

        const footerH = 60;
        const bottomY = taxY + 8;
        doc.rect(margin, bottomY, pageWidth - (margin * 2), footerH);
        doc.setFont('helvetica', 'bold');
        doc.text('Declaration', margin + 2, bottomY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const declLines = doc.splitTextToSize('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', (midX - margin) - 4);
        doc.text(declLines, margin + 2, bottomY + 10);

        doc.line(midX, bottomY, midX, bottomY + footerH);
        doc.line(margin, bottomY + 25, pageWidth - margin, bottomY + 25);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Company\'s Bank Details', midX + 2, bottomY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Bank Name', midX + 2, bottomY + 10); doc.text(': KVB Bank', midX + 30, bottomY + 10);
        doc.text('A/c No.', midX + 2, bottomY + 14); doc.text(': 1617135000000754', midX + 30, bottomY + 14);
        doc.text('Branch & IFS Code', midX + 2, bottomY + 18); doc.text(': Selaiyur & KVBL0001617', midX + 30, bottomY + 18);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer\'s Seal and Signature', margin + 2, bottomY + 55);
        doc.text('for SREE MEDITEC', pageWidth - margin - 2, bottomY + 35, { align: 'right' });
        doc.text('Authorised Signatory', pageWidth - margin - 2, bottomY + 55, { align: 'right' });



        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('This is a Computer Generated Invoice', pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

        doc.save(`Invoice_${data.invoiceNumber || 'New'}.pdf`);
    };

    const handleSave = async (status: 'Draft' | 'Finalized') => {
        if (!invoice.customerName || !invoice.items?.length) {
            alert("Please fill customer details and add at least one item.");
            return;
        }

        const invTotals = calculateDetailedTotals(invoice);
        const finalData: Invoice = {
            ...invoice as Invoice,
            id: editingId || `INV-${Date.now()}`,
            items: (invoice.items || []).map(item => ({
                ...item,
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                taxRate: Number(item.taxRate) || 0,
                amount: Number(item.amount) || 0,
                gstValue: Number(item.gstValue) || 0,
                priceWithGst: Number(item.priceWithGst) || 0
            })),
            freightAmount: Number(invoice.freightAmount) || 0,
            freightTaxRate: Number(invoice.freightTaxRate) || 0,
            subtotal: invTotals.taxableValue,
            taxTotal: invTotals.taxTotal,
            grandTotal: invTotals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'PO',
            createdBy: currentUser?.name || 'System'
        };

        try {
            if (editingId) {
                await updateInvoice(editingId, finalData);
            } else {
                await addInvoice(finalData);
            }

            if (status === 'Finalized') {
                for (const item of finalData.items) {
                    const product = products.find(p => p.name === item.description);
                    if (product) {
                        const newStock = Math.max(0, product.stock - item.quantity);
                        await updateProduct(product.id, { stock: newStock });
                        
                        await recordStockMovement({
                            id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            productId: product.id,
                            productName: product.name,
                            type: 'Out',
                            quantity: item.quantity,
                            date: finalData.date,
                            reference: finalData.invoiceNumber,
                            purpose: 'Sale'
                        });
                    }
                }
            }

            setViewState('history');
            setEditingId(null);
            addNotification('Registry Updated', `Invoice ${finalData.invoiceNumber} archived.`, 'success');
        } catch (err) {
            console.error("Save error:", err);
            addNotification('Save Failed', 'Could not persist invoice.', 'alert');
        }
    };

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            features: prod?.description || '',
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
                    let finalVal = value;
                    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
                        // Allow typing decimals by only converting if it is a safe complete number strings
                        // we keep the raw string so user can type "10."
                        finalVal = value === '' ? '' : (isNaN(Number(value)) ? item[field] : value);
                    }
                    
                    const updated = { ...item, [field]: finalVal };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.sellingPrice;
                            updated.hsn = masterProd.hsn || '';
                            updated.features = masterProd.description || '';
                            updated.taxRate = masterProd.taxRate || 18;
                        }
                    }
                    // Calculations work with strings automatically in JS math
                    updated.amount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
                    updated.gstValue = updated.amount * ((Number(updated.taxRate) || 0) / 100);
                    updated.priceWithGst = updated.amount + updated.gstValue;
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setInvoice({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', smcpoNumber: 'verbal', deliveryTime: 'Immediately', specialNote: 'Chennai' }); setBuilderTab('form'); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Invoice</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Financial Archive</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Invoice #</th>
                                    <th className="px-6 py-4">Consignee</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-right">Grand Total</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices
                                    .filter(i => (i.invoiceNumber || '').startsWith('SM/'))
                                    .sort((a, b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true }))
                                    .map(inv => (
                                    <tr key={inv.id} onClick={() => { setInvoice(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0">
                                        <td className="px-6 py-4 font-black">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div 
                                                title={inv.createdBy || 'System'}
                                                className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200 cursor-help"
                                            >
                                                {inv.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-teal-700">₹{(inv.grandTotal || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveMenuId(activeMenuId === inv.id ? null : inv.id); 
                                                    }} 
                                                    className={`p-2 rounded-xl transition-all ${activeMenuId === inv.id ? 'bg-medical-50 text-medical-600' : 'text-slate-300 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {activeMenuId === inv.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px]">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setInvoice(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Edit Invoice"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex-1 flex justify-center"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-300 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Print Layout</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar bg-white">
                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">1. Registry Metadata</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <FormRow label="Invoice No."><input type="text" className="w-full h-[46px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all text-center" value={invoice.invoiceNumber} onChange={e => setInvoice({...invoice, invoiceNumber: e.target.value})} /></FormRow>
                                        <FormRow label="Dated"><input type="date" className="w-full h-[46px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} /></FormRow>
                                        <FormRow label="Buyer Order #">
                                            <select className="w-full h-[46px] bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none cursor-pointer" value={invoice.smcpoNumber} onChange={e => setInvoice({...invoice, smcpoNumber: e.target.value})}>
                                                <option value="Mail confirmation">Mail confirmation</option>
                                                <option value="Verbal">Verbal</option>
                                                <option value="PO">PO</option>
                                                <option value="Telephonic">Telephonic</option>
                                            </select>
                                        </FormRow>
                                        <FormRow label="Dispatch Mode">
                                            <select className="w-full h-[46px] bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none cursor-pointer" value={invoice.dispatchedThrough} onChange={e => setInvoice({...invoice, dispatchedThrough: e.target.value})}>
                                                <option value="Person">Person</option>
                                                <option value="Courier">Courier</option>
                                                <option value="Transport">Transport</option>
                                            </select>
                                        </FormRow>
                                        <FormRow label="Destination"><input type="text" className="w-full h-[46px] bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold" value={invoice.specialNote} onChange={e => setInvoice({...invoice, specialNote: e.target.value})} /></FormRow>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">2. Party Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">Consignee (Ship to)</h4>
                                                <div className="space-y-4">
                                                    <FormRow label="Consignee Name *">
                                                        <input type="text" list="client-list" className="w-full bg-white border border-slate-300 rounded-xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={invoice.customerName || ''} onChange={e => {
                                                            const client = clients.find(c => c.name === e.target.value || c.hospital === e.target.value);
                                                            setInvoice(prev => ({
                                                                ...prev,
                                                                customerName: e.target.value,
                                                                customerAddress: client ? client.address : prev.customerAddress,
                                                                customerGstin: client ? client.gstin : prev.customerGstin,
                                                                buyerName: prev.buyerName || (client ? client.name : ''),
                                                                buyerAddress: prev.buyerAddress || (client ? client.address : ''),
                                                                buyerGstin: prev.buyerGstin || (client ? client.gstin : '')
                                                            }));
                                                        }} placeholder="Search registry..." />
                                                    </FormRow>
                                                    <FormRow label="Consignee GSTIN">
                                                        <input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-5 py-3 text-sm font-bold outline-none" value={invoice.customerGstin} onChange={e => setInvoice({...invoice, customerGstin: e.target.value})} placeholder="33XXXXX" />
                                                    </FormRow>
                                                    <FormRow label="Site / Shipping Address">
                                                        <textarea rows={3} className="w-full bg-white border border-slate-300 rounded-xl px-5 py-3 text-sm font-bold outline-none resize-none" value={invoice.customerAddress || ''} onChange={e => setInvoice({...invoice, customerAddress: e.target.value})} placeholder="Full shipping address..." />
                                                    </FormRow>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-6 bg-medical-50/10 rounded-2xl border border-medical-100">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-[9px] font-black text-medical-600 uppercase tracking-wider">Buyer (Bill to)</h4>
                                                    <button onClick={() => setInvoice(prev => ({ ...prev, buyerName: prev.customerName, buyerAddress: prev.customerAddress, buyerGstin: prev.customerGstin }))} className="text-[8px] font-bold text-medical-500 underline uppercase tracking-tighter">Copy Consignee</button>
                                                </div>
                                                <div className="space-y-4">
                                                    <FormRow label="Buyer Name">
                                                        <input type="text" list="client-list" className="w-full bg-white border border-slate-300 rounded-xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={invoice.buyerName || ''} onChange={e => {
                                                            const client = clients.find(c => c.name === e.target.value || c.hospital === e.target.value);
                                                            setInvoice(prev => ({
                                                                ...prev,
                                                                buyerName: e.target.value,
                                                                buyerAddress: client ? client.address : prev.buyerAddress,
                                                                buyerGstin: client ? client.gstin : prev.buyerGstin
                                                            }));
                                                        }} placeholder="Billing Entity Name" />
                                                    </FormRow>
                                                    <FormRow label="Buyer GSTIN">
                                                        <input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-5 py-3 text-sm font-bold outline-none" value={invoice.buyerGstin || ''} onChange={e => setInvoice({...invoice, buyerGstin: e.target.value})} placeholder="33XXXXX" />
                                                    </FormRow>
                                                    <FormRow label="Billing Address">
                                                        <textarea rows={3} className="w-full bg-white border border-slate-300 rounded-xl px-5 py-3 text-sm font-bold outline-none resize-none" value={invoice.buyerAddress || ''} onChange={e => setInvoice({...invoice, buyerAddress: e.target.value})} placeholder="Full billing address..." />
                                                    </FormRow>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-300 pb-2">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">3. Manifest Items</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => setBuilderTab('catalog')} className="text-[9px] font-black text-teal-600 bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all uppercase tracking-widest">+ Store</button>
                                            <button onClick={() => handleAddItem()} className="text-[9px] font-black text-medical-600 bg-medical-50 px-4 py-2 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all uppercase tracking-widest">+ Custom Row</button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {invoice.items?.map((item) => (
                                            <div key={item.id} className="p-6 bg-slate-50 border border-slate-300 rounded-[1.5rem] relative group hover:bg-white hover:border-medical-200 transition-all">
                                                <button onClick={() => setInvoice({...invoice, items: invoice.items?.filter(i => i.id !== item.id)})} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                                <div className="grid grid-cols-12 gap-6">
                                                    <div className="col-span-12 md:col-span-5">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Description</label>
                                                        <input type="text" list="prod-list" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black" placeholder="Item Name" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-4 md:col-span-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">HSN</label>
                                                        <input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.hsn} onChange={e => updateItem(item.id, 'hsn', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">Qty</label>
                                                        <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-right">Rate</label>
                                                        <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black text-right" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-2 md:col-span-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">GST %</label>
                                                        <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-12">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Features / Specifications</label>
                                                        <textarea rows={2} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-[11px] font-bold outline-none resize-none" placeholder="Detailed specifications..." value={item.features || ''} onChange={e => updateItem(item.id, 'features', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="p-6 bg-medical-50/30 border border-medical-200 rounded-[1.5rem] mt-6">
                                            <div className="grid grid-cols-12 gap-6 items-center">
                                                <div className="col-span-12 md:col-span-6">
                                                    <label className="text-[9px] font-black text-medical-600 uppercase block mb-1">Additional Charges (Freight / Packing)</label>
                                                    <p className="text-[10px] text-slate-400 font-bold italic">Leave 0 if not applicable</p>
                                                </div>
                                                <div className="col-span-6 md:col-span-3">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-right">Amount (₹)</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black text-right" value={invoice.freightAmount ?? 0} onChange={e => setInvoice({...invoice, freightAmount: e.target.value as any})} />
                                                </div>
                                                <div className="col-span-6 md:col-span-3">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">GST %</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black text-center" value={invoice.freightTaxRate ?? 0} onChange={e => setInvoice({...invoice, freightTaxRate: e.target.value as any})} />
                                                </div>
                                            </div>
                                        </div>
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
                                        <div className="grid grid-cols-[1.5fr_1fr] border border-black overflow-hidden">
                                            {/* LEFT COLUMN */}
                                            <div className="flex flex-col border-r border-black overflow-hidden">
                                                <div className="p-3 border-b border-black">
                                                    <h1 className="text-xl font-bold text-black mb-1 leading-none">SREE MEDITEC</h1>
                                                    <p className="text-[10px]">Old No.2 New No.18, Bajanai Koil Street,</p>
                                                    <p className="text-[10px]">Rajakilpakkam, Chennai -73</p>
                                                    <p className="text-[10px]">Ph.9884818398/ 7200025642</p>
                                                    <p className="font-bold mt-1 text-[10px]">GSTIN/UIN: 33APGPS4675G2ZL</p>
                                                    <p className="text-[9px]">E-Mail : sreemeditec@gmail.com</p>

                                                </div>
                                                <div className="p-2 border-b border-black min-h-[85px] flex flex-col text-[10px] leading-tight">
                                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Consignee (Ship to)</p>
                                                    <p className="font-bold uppercase mb-1">{invoice.customerName}</p>
                                                    <p className="whitespace-pre-wrap flex-1">{invoice.customerAddress}</p>
                                                    <div className="mt-2 pt-1 border-t border-slate-50">
                                                        <p className="font-bold">GSTIN/UIN &nbsp; : {invoice.customerGstin}</p>
                                                    </div>

                                                </div>
                                                <div className="p-2 flex flex-col text-[10px] leading-tight flex-1">
                                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Buyer (Bill to)</p>
                                                    <p className="font-bold uppercase mb-1">{invoice.buyerName || invoice.customerName}</p>
                                                    <p className="whitespace-pre-wrap flex-1">{invoice.buyerAddress || invoice.customerAddress}</p>
                                                    <div className="mt-2 pt-1 border-t border-slate-50">
                                                        <p className="font-bold">GSTIN/UIN &nbsp; : {invoice.buyerGstin || invoice.customerGstin}</p>
                                                        <p>Place of Supply : Tamil Nadu</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN */}
                                            <div className="flex flex-col bg-slate-50/10">
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Invoice No.<br/><span className="font-bold text-[10px]">{invoice.invoiceNumber}</span></div>
                                                     <div className="p-2 h-[45px]">Dated<br/><span className="font-bold text-[10px]">{formatDateDDMMYYYY(invoice.date)}</span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Delivery Note<br/><span className="font-bold text-[9px]"></span></div>
                                                     <div className="p-2 h-[45px]">Mode/Terms of Payment<br/><span className="font-bold text-[9px]">{invoice.deliveryTime}</span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Reference No. & Date.<br/><span className="font-bold text-[9px]"></span></div>
                                                     <div className="p-2 h-[45px]">Other References<br/><span className="font-bold text-[9px]"></span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Buyer's Order No.<br/><span className="font-bold text-[9px]">{invoice.smcpoNumber}</span></div>
                                                     <div className="p-1.5 h-[45px]">Dated<br/><span className="font-bold text-[9px]">{formatDateDDMMYYYY(invoice.date)}</span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Dispatch Doc No.<br/><span className="font-bold text-[9px]"></span></div>
                                                     <div className="p-2 h-[45px]">Delivery Note Date<br/><span className="font-bold text-[9px]"></span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Dispatched through<br/><span className="font-bold text-[9px]">{invoice.dispatchedThrough}</span></div>
                                                     <div className="p-2 h-[45px]">Destination<br/><span className="font-bold text-[9px]">{invoice.specialNote}</span></div>
                                                </div>

                                                <div className="p-2 flex-1 min-h-[45px] text-[8px] font-bold">Terms of Delivery</div>
                                            </div>
                                        </div>

                                        <table className="w-full border-x border-b border-black text-center text-[10px] mt-0 table-fixed">
                                            <thead className="bg-slate-50 font-bold border-b border-black">
                                                <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm]">
                                                    <th className="border-r border-black p-1 flex items-center justify-center">Sl No.</th>
                                                    <th className="border-r border-black p-1 text-left flex items-center">Description of Goods</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center">HSN/SAC</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center">GST Rate</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">Qty</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">Rate</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">per</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">Disc.%</th>
                                                    <th className="p-1 text-right flex items-center justify-end font-black pr-2">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(invoice.items || []).map((it, idx) => {
                                                    const base = (it.quantity || 0) * (it.unitPrice || 0);
                                                    return (
                                                        <tr key={`${idx}-m`} className="grid grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm] border-b border-slate-300">
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center">{idx + 1}</td>
                                                            <td className="border-r border-black p-1.5 text-left flex flex-col justify-center overflow-hidden">
                                                                <span className="font-bold uppercase truncate text-[9px]">{it.description}</span>
                                                                {it.features && <span className="text-[7px] italic text-slate-500 whitespace-pre-wrap mt-0.5 leading-tight">{it.features}</span>}
                                                             </td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center text-[9px]">{it.hsn}</td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center text-[9px]">{it.taxRate}%</td>
                                                            <td className="border-r border-black p-1.5 text-center font-bold flex items-center justify-center text-[10px]">{(it.quantity || 0).toFixed(2)} nos</td>
                                                            <td className="border-r border-black p-1.5 text-right flex items-center justify-end text-[10px]">{(it.unitPrice || 0).toFixed(2)}</td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center text-[9px]">nos</td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center"></td>
                                                            <td className="p-1.5 text-right font-black flex items-center justify-end pr-2 text-[10px]">₹ {base.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                 {(invoice.freightAmount || 0) > 0 && (
                                                    <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm] h-5 italic border-b border-slate-50">
                                                        <td className="border-r border-black"></td>
                                                        <td className="border-r border-black p-1 text-left flex items-center">Freight</td>
                                                        <td className="border-r border-black"></td>
                                                        <td className="border-r border-black p-1 text-center flex items-center justify-center">{(invoice.freightTaxRate || 0)}%</td>
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                        <td className="p-1 text-right flex items-center justify-end font-bold pr-2">{totals.freightTotal.toFixed(2)}</td>
                                                    </tr>
                                                 )}
                                                 <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm] h-5 italic border-b border-slate-50">
                                                     <td className="border-r border-black"></td>
                                                     <td className="border-r border-black p-1 text-left flex items-center font-bold">Output CGST (9%)</td>
                                                     <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                     <td className="p-1 text-right flex items-center justify-end font-bold pr-2">{totals.cgst.toFixed(2)}</td>
                                                 </tr>
                                                 <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm] h-5 italic border-b border-slate-50">
                                                     <td className="border-r border-black"></td>
                                                     <td className="border-r border-black p-1 text-left flex items-center font-bold">Output SGST (9%)</td>
                                                     <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                     <td className="p-1 text-right flex items-center justify-end font-bold pr-2">{totals.sgst.toFixed(2)}</td>
                                                 </tr>
                                                {Array.from({ length: Math.max(0, 8 - (invoice.items?.length || 0)) }).map((_, i) => (
                                                    <tr key={`f-${i}`} className="grid grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm] h-6 border-b border-slate-50 opacity-10">
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm] border-t border-black font-black bg-slate-50 text-[11px]">
                                                    <td className="border-r border-black"></td>
                                                    <td className="border-r border-black p-1.5 text-right flex items-center justify-end font-bold">Total</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="border-r border-black p-1.5 text-center flex items-center justify-center font-black">{(totals.totalQty || 0).toFixed(2)} nos</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="p-1.5 text-right flex items-center justify-end font-black text-teal-800 pr-2">Rs. {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        <div className="mt-4">
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-[10px]"><span className="font-bold">Amount Chargeable (in words) :</span> <span className="font-black uppercase">INR {numberToWords(totals.grandTotal)}</span></p>
                                                <p className="font-black text-[10px]">E. & O.E</p>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <table className="w-full border border-black text-[9px] table-fixed">
                                                <thead>
                                                    <tr className="border-b border-black font-bold">
                                                        <th rowSpan={2} className="border-r border-black p-1 align-middle text-center w-[20%]">HSN/SAC</th>
                                                        <th rowSpan={2} className="border-r border-black p-1 align-middle text-center w-[15%]">Taxable Value</th>
                                                        <th colSpan={2} className="border-r border-black p-1 text-center w-[25%]">CGST</th>
                                                        <th colSpan={2} className="border-r border-black p-1 text-center w-[25%]">SGST/UTGST</th>
                                                        <th rowSpan={2} className="p-1 align-middle text-center w-[15%]">Total Tax Amount</th>
                                                    </tr>
                                                    <tr className="border-b border-black font-bold">
                                                        <th className="border-r border-black p-1 text-center">Rate</th>
                                                        <th className="border-r border-black p-1 text-center">Amount</th>
                                                        <th className="border-r border-black p-1 text-center">Rate</th>
                                                        <th className="border-r border-black p-1 text-center">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-black">
                                                        <td className="border-r border-black p-1 text-center">9402</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.taxableValue.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1 text-center">9%</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.cgst.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1 text-center">9%</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.sgst.toFixed(2)}</td>
                                                        <td className="p-1 text-right">{(totals.cgst + totals.sgst).toFixed(2)}</td>
                                                    </tr>
                                                    <tr className="font-bold bg-slate-50/50">
                                                        <td className="border-r border-black p-1 text-right">Total</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.taxableValue.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1"></td>
                                                        <td className="border-r border-black p-1 text-right">{totals.cgst.toFixed(2)}</td>
                                                        <td className="border-r border-black p-1"></td>
                                                        <td className="border-r border-black p-1 text-right">{totals.sgst.toFixed(2)}</td>
                                                        <td className="p-1 text-right">{(totals.cgst + totals.sgst).toFixed(2)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <p className="mt-2 text-[9px] font-bold">Tax Amount (in words) : INR {numberToWords(totals.cgst + totals.sgst)}</p>
                                        </div>

                                        <div className="mt-6 border border-black flex flex-col text-[9px]">
                                            <div className="grid grid-cols-2 p-2">
                                                <div className="space-y-1">
                                                    <p className="font-bold border-b border-black w-fit pb-0.5">Declaration</p>
                                                    <p className="leading-tight text-[8px]">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                                                </div>
                                                <div className="space-y-1 border-l border-black pl-4">
                                                    <p className="font-bold">Company's Bank Details</p>
                                                    <div className="grid grid-cols-[80px_1fr] text-[8px]">
                                                        <span>Bank Name</span><span className="font-bold">: KVB Bank</span>
                                                        <span>A/c No.</span><span className="font-bold">: 1617135000000754</span>
                                                        <span>Branch & IFS Code</span><span className="font-bold">: Selaiyur & KVBL0001617</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 pt-20 border-t border-black p-2">
                                                <div className="flex flex-col justify-end pt-2 text-slate-400 font-bold">
                                                    <p className="text-[8px] uppercase">Customer's Seal and Signature</p>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <p className="font-bold text-[10px]">for SREE MEDITEC</p>
                                                    <div className="h-32"></div>
                                                    <p className="font-bold border-t border-black w-fit pt-1">Authorised Signatory</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-auto pt-4 text-center text-[8px] italic text-slate-500 w-full font-bold">This is a Computer Generated Invoice</p>
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
                                        <input type="text" placeholder="Filter index..." className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all w-full" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {products.map(prod => (
                                        <div key={prod.id} className="p-6 bg-slate-50 border border-slate-300 rounded-[2rem] hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group shadow-sm hover:shadow-xl" onClick={() => { handleAddItem(prod); setBuilderTab('form'); }}>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors truncate uppercase">{prod.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">₹{(prod.sellingPrice || 0).toLocaleString()} • {prod.sku}</p>
                                            </div>
                                            <div className="ml-4 p-2.5 bg-white rounded-xl border border-slate-300 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-md active:scale-90"><Plus size={20} /></div>
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
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);
