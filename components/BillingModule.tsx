
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem, Client } from '../types';
import { 
    Receipt, Plus, FileText, Printer, Download, Search, Trash2, 
    Calendar, Building2, User, IndianRupee, X, Save, Box, 
    ArrowLeft, Edit, Eye, List as ListIcon, PenTool, CheckCircle2, CreditCard, Percent,
    // Fix: Added missing 'History' icon to imports
    History
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
    return result ? '(' + result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' only)' : '';
};

const calculateDetailedTotals = (invoice: Partial<Invoice>) => {
    const items = invoice.items || [];
    const subtotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const taxTotal = items.reduce((sum, p) => sum + ((p.quantity * p.unitPrice) * (p.taxRate / 100)), 0);
    const freight = invoice.freightAmount || 0;
    const freightGst = freight * ((invoice.freightTaxRate || 18) / 100);
    const discount = invoice.discount || 0;
    const grandTotal = subtotal + taxTotal + freight + freightGst - discount;
    return { subtotal, taxTotal, freight, freightGst, discount, grandTotal };
};

export const BillingModule: React.FC<{ variant?: 'billing' | 'quotes' }> = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, updateProduct, recordStockMovement, addNotification } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [invoice, setInvoice] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        status: 'Pending',
        discount: 0,
        freightAmount: 0,
        freightTaxRate: 18,
        paymentTerms: 'Payment due within 15 days.',
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        customerGstin: '',
        documentType: 'PO'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !invoice.invoiceNumber) {
            setInvoice(prev => ({
                ...prev,
                invoiceNumber: `SMI ${String(invoices.filter(i => i.documentType === 'PO' || !i.documentType).length + 201).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, invoices]);

    const totals = useMemo(() => calculateDetailedTotals(invoice), [invoice]);

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        const doc = new jsPDF();
        const docTotals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('SREE MEDITEC', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 26, { align: 'center' });
        doc.text('Mob: 9884818398 | GSTIN: 33APGPS4675G2ZL', pageWidth / 2, 31, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('TAX INVOICE', pageWidth / 2, 42, { align: 'center' });
        doc.line(pageWidth / 2 - 20, 43, pageWidth / 2 + 20, 43);

        // Meta Info
        doc.setFontSize(9);
        doc.text(`Invoice No: ${data.invoiceNumber}`, margin, 52);
        doc.text(`Date: ${formatDateDDMMYYYY(data.date)}`, pageWidth - margin - 40, 52);
        doc.text(`Due Date: ${formatDateDDMMYYYY(data.dueDate)}`, pageWidth - margin - 40, 57);

        // Consignee
        doc.text('Billed To:', margin, 65);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '---', margin, 70);
        doc.setFont('helvetica', 'normal');
        const addrLines = doc.splitTextToSize(data.customerAddress || '', 100);
        doc.text(addrLines, margin, 75);
        
        if (data.customerGstin) {
            doc.text(`GSTIN: ${data.customerGstin}`, margin, 75 + (addrLines.length * 5));
        }

        // Table
        autoTable(doc, {
            startY: 95,
            head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'GST%', 'Amount']],
            body: (data.items || []).map((it, idx) => [
                idx + 1,
                it.description,
                it.hsn || '---',
                it.quantity,
                it.unitPrice.toFixed(2),
                `${it.taxRate}%`,
                (it.quantity * it.unitPrice).toFixed(2)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center' },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 
                0: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 10, halign: 'center' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 15, halign: 'center' },
                6: { cellWidth: 30, halign: 'right' }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // Totals
        const summaryX = pageWidth - 80;
        doc.setFont('helvetica', 'bold');
        doc.text('Subtotal:', summaryX, finalY + 10);
        doc.text(docTotals.subtotal.toFixed(2), pageWidth - 15, finalY + 10, { align: 'right' });
        doc.text('Total GST:', summaryX, finalY + 16);
        doc.text(docTotals.taxTotal.toFixed(2), pageWidth - 15, finalY + 16, { align: 'right' });
        
        if (data.freightAmount) {
            doc.text('Freight Charges:', summaryX, finalY + 22);
            doc.text(data.freightAmount.toFixed(2), pageWidth - 15, finalY + 22, { align: 'right' });
        }

        doc.setFontSize(11);
        doc.text('Grand Total:', summaryX, finalY + 30);
        doc.text(`Rs. ${docTotals.grandTotal.toFixed(2)}`, pageWidth - 15, finalY + 30, { align: 'right' });

        // Total in Words
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(`Total in words: ${numberToWords(docTotals.grandTotal)}`, margin, finalY + 40);

        // Bank Details
        doc.setFont('helvetica', 'bold');
        doc.text('Bank Details:', margin, finalY + 55);
        doc.setFont('helvetica', 'normal');
        doc.text('Bank: ICICI Bank | Branch: Selaiyur', margin, finalY + 60);
        doc.text('A/C No: 603705016939 | IFSC: ICIC0006037', margin, finalY + 65);

        // Footer Sign
        doc.setFont('helvetica', 'bold');
        doc.text('For SREE MEDITEC', pageWidth - 15, finalY + 85, { align: 'right' });
        doc.text('Authorized Signatory', pageWidth - 15, finalY + 105, { align: 'right' });

        doc.save(`Invoice_${data.invoiceNumber}.pdf`);
    };

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unitPrice: prod?.price || 0,
            taxRate: prod?.taxRate || 18,
            amount: prod?.price || 0,
            gstValue: (prod?.price || 0) * ( (prod?.taxRate || 18) / 100 ),
            priceWithGst: (prod?.price || 0) * (1 + ( (prod?.taxRate || 18) / 100 ))
        };
        setInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const handleClientSelect = (inputValue: string) => {
        const client = clients.find(c => c.name === inputValue || c.hospital === inputValue);
        if (client) {
            setInvoice(prev => ({
                ...prev,
                customerName: client.name,
                customerHospital: client.hospital || '',
                customerAddress: client.address || '',
                customerGstin: client.gstin || ''
            }));
        } else {
            setInvoice(prev => ({ ...prev, customerName: inputValue }));
        }
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setInvoice(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.price;
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
        if (!invoice.customerName || !invoice.items?.length) {
            alert("Please fill customer details and add at least one item.");
            return;
        }

        const invTotals = calculateDetailedTotals(invoice);
        const finalData: Invoice = {
            ...invoice as Invoice,
            id: editingId || `INV-${Date.now()}`,
            subtotal: invTotals.subtotal,
            taxTotal: invTotals.taxTotal + invTotals.freightGst,
            grandTotal: invTotals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'PO'
        };

        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);

        // Inventory deduction only for finalized invoices
        if (status === 'Finalized') {
            (invoice.items || []).forEach(item => {
                const product = products.find(p => p.name === item.description);
                if (product) {
                    updateProduct(product.id, { stock: Math.max(0, product.stock - item.quantity) });
                    recordStockMovement({
                        id: `MOV-INV-${Date.now()}-${item.id}`,
                        productId: product.id,
                        productName: product.name,
                        type: 'Out',
                        quantity: item.quantity,
                        date: invoice.date!,
                        reference: finalData.invoiceNumber,
                        purpose: 'Sale'
                    });
                }
            });
        }

        setViewState('history');
        setEditingId(null);
        addNotification('Invoice Saved', `Registry updated for document ${finalData.invoiceNumber}.`, 'success');
    };

    const renderInvoiceTemplate = (data: Partial<Invoice>, totals: any) => (
        <div className="bg-white p-[15mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-2xl mx-auto overflow-hidden select-none" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="text-center mb-6">
                <h1 className="text-5xl font-bold uppercase mb-2">SREE MEDITEC</h1>
                <p className="text-[12px] text-slate-700">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[12px] font-bold">GSTIN: 33APGPS4675G2ZL | Mob: 9884818398</p>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-xl font-bold border-b-2 border-black inline-block pb-0.5 uppercase tracking-widest">TAX INVOICE</h2>
            </div>

            <div className="grid grid-cols-2 gap-10 mb-8 font-bold text-sm">
                <div>
                    <p className="text-slate-500 uppercase text-[10px] mb-1">Invoice Details</p>
                    <p>No: {data.invoiceNumber}</p>
                    <p>Date: {formatDateDDMMYYYY(data.date)}</p>
                    <p>Due: {formatDateDDMMYYYY(data.dueDate)}</p>
                </div>
                <div className="text-right">
                    <p className="text-slate-500 uppercase text-[10px] mb-1">Billed To</p>
                    <p className="uppercase">{data.customerName || '---'}</p>
                    <p className="font-normal text-[11px] whitespace-pre-wrap">{data.customerAddress}</p>
                    {data.customerGstin && <p className="mt-1">GSTIN: {data.customerGstin}</p>}
                </div>
            </div>

            <table className="w-full border-collapse border border-black text-[11px] mb-6">
                <thead>
                    <tr className="bg-slate-100 font-bold border-b border-black">
                        <th className="border-r border-black p-2 w-10 text-center">#</th>
                        <th className="border-r border-black p-2 text-left">Description</th>
                        <th className="border-r border-black p-2 w-16 text-center">HSN/SAC</th>
                        <th className="border-r border-black p-2 w-10 text-center">Qty</th>
                        <th className="border-r border-black p-2 w-24 text-right">Rate</th>
                        <th className="border-r border-black p-2 w-12 text-center">GST%</th>
                        <th className="p-2 w-24 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {(data.items || []).map((it, idx) => (
                        <tr key={idx} className="border-b border-black last:border-b-0 h-10 align-top">
                            <td className="border-r border-black p-2 text-center">{idx + 1}</td>
                            <td className="border-r border-black p-2 font-bold uppercase">{it.description}</td>
                            <td className="border-r border-black p-2 text-center">{it.hsn || '---'}</td>
                            <td className="border-r border-black p-2 text-center">{it.quantity}</td>
                            <td className="border-r border-black p-2 text-right">{it.unitPrice.toFixed(2)}</td>
                            <td className="border-r border-black p-2 text-center">{it.taxRate}%</td>
                            <td className="p-2 text-right font-bold">{(it.quantity * it.unitPrice).toFixed(2)}</td>
                        </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 10 - (data.items?.length || 0)) }).map((_, i) => (
                        <tr key={i} className="border-b border-black last:border-b-0 h-8">
                            <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-between items-start gap-10 text-sm">
                <div className="flex-1 space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Amount in Words</p>
                        <p className="font-bold italic text-[11px] uppercase">{numberToWords(totals.grandTotal)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Information</p>
                        <p className="font-bold text-[11px]">Bank: ICICI Bank | Branch: Selaiyur</p>
                        <p className="font-bold text-[11px]">A/C No: 603705016939 | IFSC: ICIC0006037</p>
                    </div>
                </div>
                <div className="w-[220px] space-y-2">
                    <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold">{totals.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Total GST:</span><span className="font-bold">{(totals.taxTotal + totals.freightGst).toFixed(2)}</span></div>
                    {data.freightAmount ? <div className="flex justify-between"><span>Freight:</span><span className="font-bold">{data.freightAmount.toFixed(2)}</span></div> : null}
                    {data.discount ? <div className="flex justify-between text-rose-600"><span>Discount:</span><span className="font-bold">-{data.discount.toFixed(2)}</span></div> : null}
                    <div className="flex justify-between text-lg font-black border-t-2 border-black pt-2 mt-2"><span>Total:</span><span>₹{totals.grandTotal.toFixed(2)}</span></div>
                </div>
            </div>

            <div className="mt-auto pt-20 flex justify-between items-end">
                <div className="text-[10px] italic text-slate-400">Computer generated invoice. No signature required.</div>
                <div className="text-center">
                    <p className="font-bold text-sm">For SREE MEDITEC</p>
                    <div className="h-12"></div>
                    <p className="font-bold text-[11px] uppercase pt-2 border-t border-black">Authorized Signatory</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setInvoice({ date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], items: [], status: 'Pending', discount: 0, freightAmount: 0 }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Invoice</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Financial Audit Log</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Invoice #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4 text-center">Date</th>
                                    <th className="px-6 py-4 text-right">Grand Total</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.filter(i => i.documentType === 'PO' || !i.documentType).map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4 text-center text-slate-400 font-medium">{formatDateDDMMYYYY(inv.date)}</td>
                                        <td className="px-6 py-4 text-right font-black text-medical-700">₹{inv.grandTotal.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setInvoice(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={18}/></button>
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
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Header & Timing</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Invoice Number</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={invoice.invoiceNumber} onChange={e => setInvoice({...invoice, invoiceNumber: e.target.value})} placeholder="SMI-001" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Invoice Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={invoice.dueDate} onChange={e => setInvoice({...invoice, dueDate: e.target.value})} />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Billed To Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name *</label>
                                                <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={invoice.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Search or Enter Client Name" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client GSTIN</label>
                                                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={invoice.customerGstin} onChange={e => setInvoice({...invoice, customerGstin: e.target.value})} placeholder="33XXXXX" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Billing Address</label>
                                            <textarea rows={4} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none transition-all focus:ring-4 focus:ring-medical-500/5" value={invoice.customerAddress || ''} onChange={e => setInvoice({...invoice, customerAddress: e.target.value})} placeholder="Hospital Name, Street, City, ZIP..." />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Line Items</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all">+ Add From Store</button>
                                            <button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1.5 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all">+ New Row</button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {invoice.items?.map((item) => (
                                            <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                                                <button onClick={() => setInvoice({...invoice, items: invoice.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                                <div className="grid grid-cols-12 gap-3">
                                                    <div className="col-span-12 md:col-span-6">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1">Product Description</label>
                                                        <input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black" placeholder="Item Name" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-6 md:col-span-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1 text-center">HSN/SAC</label>
                                                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.hsn} onChange={e => updateItem(item.id, 'hsn', e.target.value)} />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-1">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1 text-center">Qty</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-2">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1 text-right">Unit Rate</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-right" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                                    </div>
                                                    <div className="col-span-12 md:col-span-1">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1 text-center">GST %</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-center" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {invoice.items?.length === 0 && (
                                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                                                <Box size={40} className="mb-2 opacity-20" />
                                                <p className="text-xs font-black uppercase tracking-widest text-center px-4">No items added to invoice</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CreditCard size={16}/> Adjustments & Charges</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lump-sum Discount (₹)</label>
                                            <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={invoice.discount} onChange={e => setInvoice({...invoice, discount: Number(e.target.value)})} placeholder="0.00" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Freight Charges (₹)</label>
                                            <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={invoice.freightAmount} onChange={e => setInvoice({...invoice, freightAmount: Number(e.target.value)})} placeholder="0.00" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Freight GST %</label>
                                            <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={invoice.freightTaxRate} onChange={e => setInvoice({...invoice, freightTaxRate: Number(e.target.value)})} placeholder="18" />
                                        </div>
                                    </div>
                                </section>

                                <div className="flex flex-col sm:flex-row gap-4 pt-10 sticky bottom-0 bg-white pb-6 border-t border-slate-50 z-30">
                                    <button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Discard</button>
                                    <button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-4 bg-white border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-50 transition-all">Save Draft</button>
                                    <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(invoice); }} className="w-full sm:flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center justify-center gap-3 transition-all active:scale-95">
                                        <Save size={18} /> Finalize & PDF
                                    </button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.65] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderInvoiceTemplate(invoice, totals)}
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Product Selection</h3>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map(prod => (
                                        <div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => handleAddItem(prod)}>
                                            <div className="flex-1">
                                                <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{prod.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">₹{prod.price.toLocaleString()} • {prod.sku}</p>
                                            </div>
                                            <div className="ml-4 p-1.5 bg-white rounded-lg border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm"><Plus size={16} /></div>
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
