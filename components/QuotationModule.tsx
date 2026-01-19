
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Calendar, ArrowLeft, Save,
    Image as ImageIcon, FileText, CheckCircle, Percent, Truck, CreditCard, ShieldCheck, User, X
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

const calculateDetailedTotals = (quote: Partial<Invoice>) => {
    const items = quote.items || [];
    
    // Gross Total is sum of item Amount columns (Rate*Qty + GST)
    const itemsGrossTotal = items.reduce((sum, it) => {
        const lineBase = it.unitPrice * it.quantity;
        const lineTax = lineBase * (it.taxRate / 100);
        return sum + lineBase + lineTax;
    }, 0);

    const freight = quote.freightAmount || 0;
    const freightGst = freight * ((quote.freightTaxRate || 18) / 100);
    const discount = quote.discount || 0;

    // Total GST line removed per request. 
    // Final Grand Total
    const grandTotal = itemsGrossTotal - discount + freight + freightGst;
    
    return { itemsGrossTotal, freight, freightGst, discount, grandTotal };
};

// Helper for typable/selectable inputs
const numericInputProps = {
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
};

export const QuotationModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, addNotification, currentUser, pendingQuoteData, setPendingQuoteData } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [logo, setLogo] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [seal, setSeal] = useState<string | null>(null);
    const [repName, setRepName] = useState('S. Suresh Kumar.');
    const [repPhone, setRepPhone] = useState('9884818398');

    const [quote, setQuote] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        subject: '',
        status: 'Draft',
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        customerGstin: '',
        phone: '',
        discount: 0,
        freightAmount: 0,
        freightTaxRate: 18,
        paymentTerms: '100% advance before delivery.',
        deliveryTerms: 'Ex-stock, subject to prior sale.',
        warrantyTerms: 'Standard 1 year warranty.',
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

    useEffect(() => {
        if (pendingQuoteData) {
            setViewState('builder');
            setBuilderTab('form');
            setQuote(prev => ({
                ...prev,
                ...pendingQuoteData,
                invoiceNumber: prev.invoiceNumber
            }));
            setPendingQuoteData(null);
            addNotification('Lead Loaded', 'Customer and product details pre-filled.', 'info');
        }
    }, [pendingQuoteData]);

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        const doc = new jsPDF();
        const totals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        const drawHeader = () => {
            if (logo) doc.addImage(logo, 'PNG', 10, 10, 25, 25);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajajipakkam, Chennai 600 073.', pageWidth / 2, 24, { align: 'center' });
            doc.text(`Mob: 9884818398.`, pageWidth / 2, 28, { align: 'center' });
            doc.text(`GST NO: 33APGPS4675G2ZL`, pageWidth / 2, 32, { align: 'center' });
        };
        drawHeader();

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Quotation', pageWidth / 2, 40, { align: 'center' });
        doc.line(pageWidth / 2 - 10, 41, pageWidth / 2 + 10, 41);

        doc.setFontSize(10);
        doc.text(`Ref: ${data.invoiceNumber}`, 15, 48);
        doc.text(`Date: ${formatDateDDMMYYYY(data.date)}`, pageWidth - 15, 48, { align: 'right' });

        doc.text('To,', 15, 56);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '---', 15, 61);
        doc.setFont('helvetica', 'normal');
        const addrLines = doc.splitTextToSize(data.customerAddress || '', 100);
        doc.text(addrLines, 15, 66);
        let currentY = 66 + (addrLines.length * 5);
        if (data.customerGstin) {
            doc.text(`GST: ${data.customerGstin}`, 15, currentY + 2);
            currentY += 7;
        } else currentY += 5;

        currentY += 8;
        doc.setFont('helvetica', 'bold');
        doc.text(`Sub: Reg. Price Quotation for ${data.subject || '---'}.`, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text('Sir, this is with ref to the discussion we had with you we are happy in submitting our quotation for the same.', 15, currentY + 6, { maxWidth: pageWidth - 30 });
        currentY += 14;

        // Build Table Body
        const tableBody: any[] = (data.items || []).map(it => {
            const gstAmt = (it.unitPrice * it.quantity) * (it.taxRate / 100);
            const lineTotal = (it.unitPrice * it.quantity) + gstAmt;
            return [
                it.description, it.model || '-', it.features ? it.features : '-', `${it.quantity}\n${it.unit}`,
                `Rs.${it.unitPrice.toFixed(2)}`, `${it.taxRate}%`, `Rs.${gstAmt.toFixed(2)}`,
                { content: `Rs.${lineTotal.toFixed(2)}\n${numberToWords(lineTotal)}`, styles: { halign: 'right' } }
            ];
        });

        // Add Fare Rows Tabularly
        if (totals.freight > 0) {
            tableBody.push([
                { content: 'Fare (Freight)', styles: { fontStyle: 'bold' } }, '', '', '1\nno', `Rs.${totals.freight.toFixed(2)}`, '0%', 'Rs.0.00',
                { content: `Rs.${totals.freight.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ]);
            tableBody.push([
                { content: `Freight GST (${data.freightTaxRate}%)`, styles: { fontStyle: 'italic' } }, '', '', '1\nno', `Rs.0.00`, `${data.freightTaxRate}%`, `Rs.${totals.freightGst.toFixed(2)}`,
                { content: `Rs.${totals.freightGst.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ]);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['Product', 'Model', 'Features', 'Qty', 'Rate', 'GST%', 'GST Amt', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center' },
            styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 20 }, 2: { cellWidth: 35 }, 3: { cellWidth: 10, halign: 'center' }, 4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 10, halign: 'center' }, 6: { cellWidth: 18, halign: 'right' }, 7: { cellWidth: 35 } }
        });

        let finalY = (doc as any).lastAutoTable.finalY;
        if (finalY + 45 > pageHeight - margin) { doc.addPage(); finalY = 20; }
        const summaryX = pageWidth - 80;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        
        let verticalOffset = 8;
        doc.text('Gross Total:', summaryX, finalY + verticalOffset);
        doc.text(`Rs.${totals.itemsGrossTotal.toFixed(2)}`, pageWidth - 15, finalY + verticalOffset, { align: 'right' });
        verticalOffset += 6;

        if (totals.discount > 0) {
            doc.setTextColor(225, 29, 72); // Rose-600
            doc.text('Discount:', summaryX, finalY + verticalOffset);
            doc.text(`-Rs.${totals.discount.toFixed(2)}`, pageWidth - 15, finalY + verticalOffset, { align: 'right' });
            doc.setTextColor(0, 0, 0); 
            verticalOffset += 6;
        }

        doc.setFontSize(11);
        doc.text('Grand Total:', summaryX, finalY + verticalOffset);
        doc.text(`Rs.${totals.grandTotal.toFixed(2)}`, pageWidth - 15, finalY + verticalOffset, { align: 'right' });
        
        finalY += (verticalOffset + 10);

        if (finalY + 45 > pageHeight - margin) { doc.addPage(); finalY = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms and condition:', 15, finalY);
        doc.setFont('helvetica', 'normal');
        const termsList = [
            ['Validity', `: The above price is valid up to 30 days from the date of submission of the Quotation.`],
            ['Taxes', `: GST is applicable to the price mentioned as per item-wise rates.`],
            ['Payment', `: ${data.paymentTerms}`],
            ['Banking details', `: Bank name: ICICI Bank, Branch: Selaiyur, A/C name: Sreemeditec,\n  A/C type: CA, A/C No: 603705016939, IFSC Code: ICIC0006037`],
            ['Delivery', `: ${data.deliveryTerms}`],
            ['Warranty', `: ${data.warrantyTerms}`]
        ];
        autoTable(doc, { startY: finalY + 2, margin: { left: 15 }, theme: 'plain', styles: { fontSize: 10.5, cellPadding: 1 }, columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 150 } }, body: termsList });

        let signOffY = (doc as any).lastAutoTable.finalY + 10;
        if (signOffY + 50 > pageHeight - margin) { doc.addPage(); signOffY = 20; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Thanking you and looking forward for your order.', 15, signOffY);
        doc.text('With Regards,', 15, signOffY + 8);
        doc.setFont('helvetica', 'bold');
        doc.text('For SREE MEDITEC,', 15, signOffY + 14);
        if (signature) doc.addImage(signature, 'PNG', 15, signOffY + 16, 35, 12);
        if (seal) doc.addImage(seal, 'PNG', 70, signOffY + 14, 22, 22);
        doc.text(repName, 15, signOffY + 36);
        doc.setFont('helvetica', 'normal');
        doc.text(repPhone, 15, signOffY + 41);
        doc.save(`${data.invoiceNumber || 'Quotation'}.pdf`);
    };

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            model: prod?.model || '',
            features: prod?.features || prod?.description || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unit: 'no',
            unitPrice: prod?.sellingPrice || 0,
            taxRate: prod?.taxRate || 12,
            amount: prod?.sellingPrice || 0,
            gstValue: (prod?.sellingPrice || 0) * ((prod?.taxRate || 12) / 100),
            priceWithGst: (prod?.sellingPrice || 0) * (1 + ((prod?.taxRate || 12) / 100))
        };
        setQuote(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleClientSelect = (inputValue: string) => {
        const client = clients.find(c => c.name === inputValue || c.hospital === inputValue);
        if (client) {
            setQuote(prev => ({
                ...prev,
                customerName: client.name,
                customerHospital: client.hospital || '',
                customerAddress: client.address || '',
                customerGstin: client.gstin || '',
                phone: client.phone || ''
            }));
        } else setQuote(prev => ({ ...prev, customerName: inputValue }));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setQuote(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.sellingPrice;
                            updated.taxRate = masterProd.taxRate || 12;
                            updated.model = masterProd.model || '';
                            updated.features = masterProd.features || masterProd.description || '';
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setter(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = (status: 'Draft' | 'Finalized') => {
        if (!quote.customerName || !quote.items?.length) {
            alert("Fill customer details and items.");
            return;
        }
        const totals = calculateDetailedTotals(quote);
        const finalData: Invoice = {
            ...quote as Invoice,
            id: editingId || `QT-${Date.now()}`,
            subtotal: totals.itemsGrossTotal,
            taxTotal: totals.freightGst,
            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'Quotation',
            createdBy: currentUser?.name || 'System'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Quotation ${finalData.invoiceNumber} saved.`, 'success');
    };

    const totals = calculateDetailedTotals(quote);

    const filteredCatalog = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(catalogSearch.toLowerCase()));
    }, [products, catalogSearch]);

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderTab('form'); setQuote({...quote, date: new Date().toISOString().split('T')[0], items: [], status: 'Draft'}); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Quote</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex justify-between items-center"><h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px]">Quotations Archive</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 font-bold uppercase text-[9px] text-slate-500 border-b dark:border-slate-700">
                                <tr><th className="px-6 py-4">Reference</th><th className="px-6 py-4">Consignee</th><th className="px-6 py-4">Author</th><th className="px-6 py-4 text-right">Grand Total</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {invoices.filter(i => i.documentType === 'Quotation').map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4 font-black dark:text-slate-300">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-400 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{inv.createdBy?.charAt(0) || 'S'}</div><span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{inv.createdBy || 'System'}</span></div></td>
                                        <td className="px-6 py-4 text-right font-black text-teal-700 dark:text-teal-400">₹{(inv.grandTotal || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setQuote(inv); setEditingId(inv.id); setViewState('builder'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={18}/></button>
                                                <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-emerald-500"><Download size={18}/></button>
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
                    <div className="flex bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'form' ? 'bg-white dark:bg-slate-900 text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'preview' ? 'bg-white dark:bg-slate-900 text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'catalog' ? 'bg-white dark:bg-slate-900 text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-12 custom-scrollbar bg-white dark:bg-slate-950 pb-20">
                                <section className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b dark:border-slate-800 pb-2 flex items-center gap-2"><FileText size={14}/> Quotation Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Reference No. *</label>
                                            <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all dark:text-white" value={quote.invoiceNumber} onChange={e => setQuote({...quote, invoiceNumber: e.target.value})} placeholder="SMQ-137" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Quotation Date</label>
                                            <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white" value={quote.date} onChange={e => setQuote({...quote, date: e.target.value})} />
                                        </div>
                                    </div>
                                </section>
                                <section className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b dark:border-slate-800 pb-2 flex items-center gap-2"><User size={14}/> Client Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Name *</label><input type="text" list="client-list" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 dark:text-white" value={quote.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Search or Enter Client Name" /></div>
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client GST Number</label><input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white" value={quote.customerGstin} onChange={e => setQuote({...quote, customerGstin: e.target.value})} placeholder="GSTIN" /></div>
                                        </div>
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Address</label><textarea rows={4} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none dark:text-white" value={quote.customerAddress || ''} onChange={e => setQuote({...quote, customerAddress: e.target.value})} placeholder="Full site or billing address..." /></div>
                                    </div>
                                </section>
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b dark:border-slate-800 pb-2">Subject</h3>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Subject Line</label><input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none dark:text-white" value={quote.subject} onChange={e => setQuote({...quote, subject: e.target.value})} placeholder="e.g. Ultrasound Gel (5L)" /></div>
                                </section>
                                <section className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b dark:border-slate-800 pb-2 gap-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle size={14}/> Product Details</h3><div className="flex gap-2 w-full sm:w-auto"><button onClick={() => setBuilderTab('catalog')} className="flex-1 sm:flex-none text-[10px] font-black text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-lg border border-teal-100 dark:border-teal-800 hover:bg-teal-100 transition-all">+ Catalog</button><button onClick={() => handleAddItem()} className="flex-1 sm:flex-none text-[10px] font-black text-medical-600 bg-medical-50 dark:bg-medical-900/20 px-3 py-1.5 rounded-lg border border-medical-100 dark:border-medical-800 hover:bg-medical-100 transition-all">+ Row</button></div></div>
                                    <div className="space-y-4">
                                        {quote.items?.map((item) => (
                                            <div key={item.id} className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] sm:rounded-[2rem] relative group hover:bg-white dark:hover:bg-slate-900 hover:border-medical-200 dark:hover:border-medical-900 transition-all">
                                                <button onClick={() => setQuote({...quote, items: quote.items?.filter(i => i.id !== item.id)})} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 transition-opacity opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                                    <div className="md:col-span-6 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Product Name</label><input type="text" list="prod-list" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold dark:text-white" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                                    <div className="md:col-span-6 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Model</label><input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold dark:text-white" value={item.model} onChange={e => updateItem(item.id, 'model', e.target.value)} /></div>
                                                    <div className="grid grid-cols-2 md:col-span-4 gap-4">
                                                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Qty</label><input type="number" {...numericInputProps} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-center dark:text-white" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                                        <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Type</label><select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold appearance-none dark:text-white" value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}><option value="nos">nos</option><option value="no">no</option><option value="jar">jar</option><option value="packet">packet</option><option value="meter">meter</option></select></div>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Rate</label><input type="number" {...numericInputProps} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-right dark:text-white" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                                    <div className="md:col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">GST %</label><input type="number" {...numericInputProps} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-center dark:text-white" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div>
                                                    <div className="md:col-span-3 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Total</label><div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-right text-medical-700 dark:text-medical-400 truncate">₹{(item.unitPrice * item.quantity * (1 + item.taxRate/100)).toLocaleString()}</div></div>
                                                    <div className="md:col-span-12 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Features</label><textarea className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold resize-none dark:text-white" rows={2} value={item.features} onChange={e => updateItem(item.id, 'features', e.target.value)} /></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section className="space-y-6"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b dark:border-slate-800 pb-2 flex items-center gap-2"><Percent size={14}/> Charges & Discounts</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Discount (₹)</label><input type="number" {...numericInputProps} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white" value={quote.discount} onChange={e => setQuote({...quote, discount: Number(e.target.value)})} placeholder="0.00" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fare / Freight (₹)</label><input type="number" {...numericInputProps} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white" value={quote.freightAmount} onChange={e => setQuote({...quote, freightAmount: Number(e.target.value)})} placeholder="0.00" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Freight GST %</label><input type="number" {...numericInputProps} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white" value={quote.freightTaxRate} onChange={e => setQuote({...quote, freightTaxRate: Number(e.target.value)})} placeholder="18" /></div></div></section>
                                <section className="space-y-6"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b dark:border-slate-800 pb-2 flex items-center gap-2"><CreditCard size={14}/> Terms & Conditions</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Payment Terms</label><textarea rows={3} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none dark:text-white" value={quote.paymentTerms} onChange={e => setQuote({...quote, paymentTerms: e.target.value})} /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Delivery Terms</label><textarea rows={3} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none dark:text-white" value={quote.deliveryTerms} onChange={e => setQuote({...quote, deliveryTerms: e.target.value})} /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Warranty Terms</label><textarea rows={3} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none dark:text-white" value={quote.warrantyTerms} onChange={e => setQuote({...quote, warrantyTerms: e.target.value})} /></div></div></section>
                                <section className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b dark:border-slate-800 pb-2 flex items-center gap-2"><ImageIcon size={14}/> Brand Assets</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rep Name *</label><input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white" value={repName} onChange={e => setRepName(e.target.value)} /></div>
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rep Phone *</label><input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white" value={repPhone} onChange={e => setRepPhone(e.target.value)} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <div className="p-4 sm:p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer relative group">
                                            {logo ? (
                                                <div className="relative w-full aspect-square max-w-[120px] mx-auto group/img">
                                                    <img src={logo} className="w-full h-full object-contain rounded-xl" />
                                                    <button onClick={(e) => { e.stopPropagation(); setLogo(null); }} className="absolute -top-3 -right-3 p-1.5 bg-rose-600 text-white rounded-full shadow-lg z-20 hover:bg-rose-700 active:scale-90 transition-all"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleImageUpload(e, setLogo)} />
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-medical-600 transition-colors"><ImageIcon size={20}/></div>
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Logo</p>
                                                </>
                                            )}
                                        </div>
                                        <div className="p-4 sm:p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer relative group">
                                            {signature ? (
                                                <div className="relative w-full aspect-square max-w-[120px] mx-auto group/img">
                                                    <img src={signature} className="w-full h-full object-contain rounded-xl" />
                                                    <button onClick={(e) => { e.stopPropagation(); setSignature(null); }} className="absolute -top-3 -right-3 p-1.5 bg-rose-600 text-white rounded-full shadow-lg z-20 hover:bg-rose-700 active:scale-90 transition-all"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleImageUpload(e, setSignature)} />
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-medical-600 transition-colors"><PenTool size={20}/></div>
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Signature</p>
                                                </>
                                            )}
                                        </div>
                                        <div className="p-4 sm:p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer relative group">
                                            {seal ? (
                                                <div className="relative w-full aspect-square max-w-[120px] mx-auto group/img">
                                                    <img src={seal} className="w-full h-full object-contain rounded-xl" />
                                                    <button onClick={(e) => { e.stopPropagation(); setSeal(null); }} className="absolute -top-3 -right-3 p-1.5 bg-rose-600 text-white rounded-full shadow-lg z-20 hover:bg-rose-700 active:scale-90 transition-all"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleImageUpload(e, setSeal)} />
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-medical-600 transition-colors"><ShieldCheck size={20}/></div>
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Stamp</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </section>
                                <div className="flex flex-col sm:flex-row gap-3 pt-10 sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t border-slate-50 dark:border-slate-800 z-30"><button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Discard</button><button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-4 bg-white dark:bg-slate-900 border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-50 dark:hover:bg-medical-900/20 transition-all">Save Draft</button><button onClick={() => { handleSave('Finalized'); handleDownloadPDF(quote); }} className="w-full sm:flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center justify-center gap-3 transition-all active:scale-95">Finalize & PDF</button></div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50 dark:bg-slate-900/30"><div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}><div className="bg-white p-[15mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-2xl mx-auto" style={{ fontFamily: 'Calibri, sans-serif' }}><div className="text-center mb-4">{logo && <img src={logo} className="h-16 object-contain mb-2 mx-auto" />}<h1 className="text-4xl font-bold uppercase mb-1">SREE MEDITEC</h1><p className="text-[10px] font-semibold">New No: 18, Old No: 2, Bajanai Koil Street, Rajajipakkam, Chennai 600 073.</p><p className="text-[10px] font-semibold">Mob: 9884818398.</p><p className="text-[10px] font-bold mt-1">GST NO: 33APGPS4675G2ZL</p></div><div className="text-center mb-8"><h2 className="text-xl font-bold underline uppercase tracking-widest">Quotation</h2></div><div className="flex justify-between font-bold mb-6 text-sm"><div>Ref: {quote.invoiceNumber}</div><div>Date: {formatDateDDMMYYYY(quote.date)}</div></div><div className="mb-6"><p className="font-bold text-sm">To,</p><p className="font-bold uppercase text-sm leading-tight">{quote.customerName || '---'}</p><p className="text-sm whitespace-pre-wrap leading-snug">{quote.customerAddress}</p>{quote.customerGstin && <p className="text-sm font-bold">GST: {quote.customerGstin}</p>}</div><div className="mt-6 mb-4 text-sm font-bold italic">Sub: Reg. Price Quotation for {quote.subject || 'Medical Equipment'}.</div><div className="mb-6 text-sm">Sir, this is with ref to the discussion we had with you we are happy in submitting our quotation for the same.</div><table className="w-full border-collapse border border-black text-[10px] mb-8"><thead><tr className="bg-slate-100 font-bold border-b border-black"><th className="border-r border-black p-1">Product</th><th className="border-r border-black p-1">Model</th><th className="border-r border-black p-1">Features</th><th className="border-r border-black p-1">Qty</th><th className="border-r border-black p-1">Rate</th><th className="border-r border-black p-1">GST%</th><th className="border-r border-black p-1">GST Amt</th><th className="p-1">Amount</th></tr></thead><tbody>
                                {(quote.items || []).map(it => { const rowGst = (it.unitPrice * it.quantity) * (it.taxRate / 100); const rowTotal = (it.unitPrice * it.quantity) + rowGst; return (<tr key={it.id} className="border-b border-black text-center align-top"><td className="border-r border-black p-1 text-left font-bold">{it.description}</td><td className="border-r border-black p-1">{it.model}</td><td className="border-r border-black p-1 text-left whitespace-pre-wrap">{it.features}</td><td className="border-r border-black p-1 font-bold">{it.quantity} {it.unit}</td><td className="border-r border-black p-1 text-right">Rs.{it.unitPrice.toFixed(2)}</td><td className="border-r border-black p-1">{it.taxRate}%</td><td className="border-r border-black p-1 text-right">Rs.{rowGst.toFixed(2)}</td><td className="p-1 text-right font-bold"><div>Rs.{rowTotal.toFixed(2)}</div><div className="text-[8px] font-normal italic">{numberToWords(rowTotal)}</div></td></tr>); })}
                                {totals.freight > 0 && (
                                    <>
                                        <tr className="border-b border-black text-center align-top bg-slate-50/20 font-bold italic">
                                            <td className="border-r border-black p-1 text-left">Fare (Freight)</td><td className="border-r border-black p-1"></td><td className="border-r border-black p-1"></td><td className="border-r border-black p-1">1 no</td><td className="border-r border-black p-1 text-right">Rs.{totals.freight.toFixed(2)}</td><td className="border-r border-black p-1">0%</td><td className="border-r border-black p-1 text-right">Rs.0.00</td><td className="p-1 text-right">Rs.{totals.freight.toFixed(2)}</td>
                                        </tr>
                                        <tr className="border-b border-black text-center align-top bg-slate-50/20 italic">
                                            <td className="border-r border-black p-1 text-left">Freight GST ({quote.freightTaxRate}%)</td><td className="border-r border-black p-1"></td><td className="border-r border-black p-1"></td><td className="border-r border-black p-1">1 no</td><td className="border-r border-black p-1 text-right">Rs.0.00</td><td className="border-r border-black p-1">{quote.freightTaxRate}%</td><td className="border-r border-black p-1 text-right">Rs.{totals.freightGst.toFixed(2)}</td><td className="p-1 text-right">Rs.{totals.freightGst.toFixed(2)}</td>
                                        </tr>
                                    </>
                                )}
                            </tbody></table><div className="flex flex-col items-end text-xs font-bold mb-10 space-y-1">
                                    <div className="w-[200px] flex justify-between border-b border-slate-200 py-1"><span>Gross Total:</span><span>Rs.{totals.itemsGrossTotal.toFixed(2)}</span></div>
                                    {totals.discount > 0 && <div className="w-[200px] flex justify-between border-b border-slate-200 py-1 text-rose-600"><span>Discount:</span><span>-Rs.{totals.discount.toFixed(2)}</span></div>}
                                    <div className="w-[250px] flex justify-between pt-3 text-lg border-t-2 border-black"><span>Grand Total:</span><span>Rs.{totals.grandTotal.toFixed(2)}</span></div>
                                </div><div className="text-sm space-y-2 mb-10"><h4 className="font-bold underline text-base">Terms and condition:</h4><div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-1 text-xs"><span className="font-bold">Validity:</span><span>: The above price is valid up to 30 days from the date of submission of the Quotation.</span><span className="font-bold">Taxes:</span><span>: GST is applicable to the price mentioned as per item-wise rates.</span><span className="font-bold">Payment:</span><span>: {quote.paymentTerms}</span><span className="font-bold">Banking details:</span><div className="pl-1">: Bank name: ICICI Bank<br/>Branch name: Selaiyur<br/>A/C name: Sreemeditec, A/C type: CA<br/>A/C No: 603705016939, IFSC Code: ICIC0006037</div><span className="font-bold">Delivery:</span><span>: {quote.deliveryTerms}</span><span className="font-bold">Warranty:</span><span>: {quote.warrantyTerms}</span></div></div><div className="text-base mb-12">Thanking you and looking forward for your order.</div><div className="flex justify-between items-end pb-6"><div className="flex flex-col items-start"><p className="text-base">With Regards,</p><p className="text-base font-bold">For SREE MEDITEC,</p><div className="h-12 flex items-center gap-4">{signature && <img src={signature} className="h-10 object-contain" />}{seal && <img src={seal} className="h-16 w-16 object-contain opacity-80" />}</div><p className="text-base font-bold mt-2">{repName}</p><p className="text-base">{repPhone}</p></div></div></div></div></div>
                        )}
                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white dark:bg-slate-900 flex flex-col p-4 sm:p-8 overflow-hidden animate-in fade-in"><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4"><div><h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-lg">Product Registry</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select items to populate quote lines</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Filter index..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all dark:text-white" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} /></div></div><div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{filteredCatalog.map(prod => (<div key={prod.id} className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] sm:rounded-[2rem] hover:border-medical-400 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer flex flex-col justify-between group" onClick={() => { handleAddItem(prod); setBuilderTab('form'); }}><div className="flex-1"><h4 className="font-black text-slate-800 dark:text-slate-100 text-base group-hover:text-medical-700 dark:group-hover:text-medical-400 transition-colors leading-tight">{prod.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">₹{(prod.sellingPrice || 0).toLocaleString()} • {prod.sku}</p></div><div className="mt-4 flex justify-end"><div className="p-2 bg-white dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 group-hover:bg-medical-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} /></div></div></div>))}{filteredCatalog.length === 0 && (<div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400"><Search size={32} className="mb-2 opacity-20" /><p className="text-xs font-black uppercase">No matching products</p></div>)}</div></div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};
