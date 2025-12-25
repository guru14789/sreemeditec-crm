import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Calendar, ArrowLeft, Save
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
    const subtotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const totalGst = items.reduce((sum, p) => sum + ((p.quantity * p.unitPrice) * (p.taxRate / 100)), 0);
    const grandTotal = subtotal + totalGst;
    return { subtotal, totalGst, grandTotal };
};

export const QuotationModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [quote, setQuote] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        subject: '',
        status: 'Draft',
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        phone: '',
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
                invoiceNumber: `SMQ ${String(invoices.filter(i => i.documentType === 'Quotation').length + 136).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, invoices]);

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        const doc = new jsPDF();
        const totals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('SREE MEDITEC', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajajipakkam, Chennai 600 073.', pageWidth / 2, 27, { align: 'center' });
        doc.text(`Mob: 9884818398.`, pageWidth / 2, 32, { align: 'center' });
        doc.text(`GST NO: 33APGPS4675G2ZL`, pageWidth / 2, 37, { align: 'center' });

        // Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Quotation', pageWidth / 2, 47, { align: 'center' });
        doc.line(pageWidth / 2 - 12, 48.5, pageWidth / 2 + 12, 48.5);

        // Ref & Date
        doc.setFontSize(11);
        doc.text(`Ref: ${data.invoiceNumber}`, 15, 58);
        doc.text(`Date: ${data.date}`, pageWidth - 50, 58);

        // To Address
        doc.text('To,', 15, 68);
        doc.text(data.customerName || '---', 15, 74);
        doc.setFont('helvetica', 'normal');
        const addrLines = doc.splitTextToSize(data.customerAddress || '', 100);
        doc.text(addrLines, 15, 80);
        if (data.phone) doc.text(`Phone: ${data.phone}`, 15, 80 + (addrLines.length * 5));

        // Sub & Greeting
        const startYSub = 85 + (addrLines.length * 6);
        doc.setFont('helvetica', 'bold');
        doc.text(`Sub: Reg. Price Quotation for ${data.subject || '---'}.`, 15, startYSub);
        doc.setFont('helvetica', 'normal');
        doc.text('Sir, this is with ref to the discussion we had with you we are happy in submitting our quotation for the same.', 15, startYSub + 7, { maxWidth: pageWidth - 30 });

        // Table
        autoTable(doc, {
            startY: startYSub + 15,
            head: [['Product', 'Model', 'Features', 'Qty', 'Rate', 'GST%', 'GST Amt', 'Amount']],
            body: (data.items || []).map(it => {
                const gstAmt = (it.unitPrice * it.quantity) * (it.taxRate / 100);
                const lineTotal = (it.unitPrice * it.quantity) + gstAmt;
                return [
                    it.description,
                    it.model || '-',
                    it.features ? `• ${it.features}` : '-',
                    { content: `${it.quantity}\nno`, styles: { halign: 'center' } },
                    `Rs.${it.unitPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}`,
                    `${it.taxRate}%`,
                    `Rs.${gstAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}`,
                    { content: `Rs.${lineTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}\n${numberToWords(lineTotal)}`, styles: { halign: 'right' } }
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 
                0: { cellWidth: 35 }, 1: { cellWidth: 20 }, 2: { cellWidth: 40 },
                3: { cellWidth: 12 }, 4: { cellWidth: 20 }, 5: { cellWidth: 12 },
                6: { cellWidth: 20 }, 7: { cellWidth: 30 }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // Totals
        doc.setFont('helvetica', 'bold');
        doc.text('Gross Total:', pageWidth - 80, finalY + 10);
        doc.text(`Rs.${totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, pageWidth - 15, finalY + 10, { align: 'right' });
        
        doc.text('Sub Total (Taxable):', pageWidth - 80, finalY + 17);
        doc.text(`Rs.${totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, pageWidth - 15, finalY + 17, { align: 'right' });
        
        doc.text('Total GST:', pageWidth - 80, finalY + 24);
        doc.text(`Rs.${totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, pageWidth - 15, finalY + 24, { align: 'right' });

        doc.setLineWidth(0.5);
        doc.line(pageWidth - 85, finalY + 30, pageWidth - 10, finalY + 30);
        doc.setFontSize(13);
        doc.text('Grand Total:', pageWidth - 80, finalY + 38);
        doc.text(`Rs.${totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, pageWidth - 15, finalY + 38, { align: 'right' });

        // Terms
        const termsY = finalY + 50;
        doc.setFontSize(11);
        doc.text('Terms and condition:', 15, termsY);
        doc.line(15, termsY + 1, 55, termsY + 1);

        doc.setFontSize(10);
        const termsList = [
            ['Validity', `: The above price is valid up to 30 days from the date of submission of the Quotation.`],
            ['Taxes', `: GST is applicable to the price mentioned as per item-wise rates.`],
            ['Payment', `: ${data.paymentTerms}`],
            ['Banking details', `: Bank name: ICICI Bank\n  Branch name: Selaiyur\n  A/C name: Sreemeditec,\n  A/C type: CA\n  A/C No: 603705016939\n  IFSC Code: ICIC0006037`],
            ['Delivery', `: Within 10 days from the date of the receipt of your purchase order.`],
            ['Warranty', `: Warranty against manufacturing defects for a period of one year from the date of delivery.`]
        ];

        let currentTermsY = termsY + 8;
        termsList.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 15, currentTermsY);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(value, pageWidth - 65);
            doc.text(lines, 45, currentTermsY);
            currentTermsY += (lines.length * 5) + 2;
        });

        // Footer greeting
        if (currentTermsY > 250) doc.addPage();
        const footerY = doc.internal.pageSize.getHeight() - 50;
        doc.text('Thanking you and looking forward for your order.', 15, footerY);
        doc.setFont('helvetica', 'bold');
        doc.text('With Regards,', 15, footerY + 10);
        doc.text('For SREE MEDITEC,', 15, footerY + 16);
        doc.text('S. Suresh Kumar.', 15, footerY + 35);
        doc.setFont('helvetica', 'normal');
        doc.text('9884818398', 15, footerY + 41);

        doc.save(`${data.invoiceNumber || 'Quotation'}.pdf`);
    };

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            model: prod?.model || '',
            features: prod?.description || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unit: 'no',
            unitPrice: prod?.price || 0,
            taxRate: prod?.taxRate || 18,
            amount: prod?.price || 0,
            gstValue: (prod?.price || 0) * ((prod?.taxRate || 18) / 100),
            priceWithGst: (prod?.price || 0) * (1 + ((prod?.taxRate || 18) / 100))
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
                phone: client.phone || ''
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
                            updated.taxRate = masterProd.taxRate || 18;
                            updated.model = masterProd.model || '';
                            updated.features = masterProd.description || '';
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
            alert("Fill customer details and items.");
            return;
        }
        const totals = calculateDetailedTotals(quote);
        const finalData: Invoice = {
            ...quote as Invoice,
            id: editingId || `QT-${Date.now()}`,
            subtotal: totals.subtotal,
            taxTotal: totals.totalGst,
            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'Quotation'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
    };

    const totals = useMemo(() => calculateDetailedTotals(quote), [quote]);

    const renderQuotationTemplate = (data: Partial<Invoice>, totals: any) => (
        <div id="quotation-template" className="bg-white p-[15mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-2xl mx-auto" style={{ fontFamily: 'Calibri, sans-serif', color: '#000' }}>
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="text-5xl font-bold uppercase mb-1">SREE MEDITEC</h1>
                <p className="text-sm font-medium">New No: 18, Old No: 2, Bajanai Koil Street, Rajajipakkam, Chennai 600 073.</p>
                <p className="text-sm font-medium">Mob: 9884818398.</p>
                <p className="text-sm font-medium">GST NO: 33APGPS4675G2ZL</p>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold underline inline-block pb-0.5 uppercase tracking-wide">Quotation</h2>
            </div>

            <div className="flex justify-between font-bold mb-6 text-base">
                <div>Ref: {data.invoiceNumber}</div>
                <div>Date: {data.date}</div>
            </div>

            <div className="mb-4 text-base font-bold">To,</div>
            <div className="mb-6 ml-0 text-base min-h-[80px]">
                <div className="font-bold uppercase">{data.customerName || '------------------'}</div>
                <div className="whitespace-pre-wrap">{data.customerAddress}</div>
                {data.phone && <div>Phone: {data.phone}</div>}
            </div>

            <div className="mb-4 text-base font-bold italic">
                Sub: Reg. Price Quotation for {data.subject || '------------------'}.
            </div>

            <div className="mb-6 text-base">
                Sir, this is with ref to the discussion we had with you we are happy in submitting our quotation for the same.
            </div>

            {/* Main Table */}
            <div className="mb-8 overflow-hidden">
                <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                        <tr className="bg-[#E5E7EB] font-bold text-center border-b border-black">
                            <th className="border-r border-black p-2 w-[18%]">Product</th>
                            <th className="border-r border-black p-2 w-[12%]">Model</th>
                            <th className="border-r border-black p-2 w-[18%]">Features</th>
                            <th className="border-r border-black p-2 w-[8%]">Qty</th>
                            <th className="border-r border-black p-2 w-[12%]">Rate</th>
                            <th className="border-r border-black p-2 w-[8%]">GST %</th>
                            <th className="border-r border-black p-2 w-[12%]">GST Amt</th>
                            <th className="p-2 w-[15%]">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.items || []).map((it, idx) => {
                            const gstAmt = (it.unitPrice * it.quantity) * (it.taxRate / 100);
                            const lineTotal = (it.unitPrice * it.quantity) + gstAmt;
                            return (
                                <tr key={it.id} className="border-b border-black align-top text-center">
                                    <td className="border-r border-black p-2 text-left font-bold">{it.description}</td>
                                    <td className="border-r border-black p-2">{it.model || '-'}</td>
                                    <td className="border-r border-black p-2 text-left text-[10px]">
                                        {it.features && it.features.split('\n').map((f, i) => <div key={i}>• {f}</div>)}
                                    </td>
                                    <td className="border-r border-black p-2">
                                        <div className="font-bold">{it.quantity}</div>
                                        <div className="text-[10px] italic">no</div>
                                    </td>
                                    <td className="border-r border-black p-2 text-right">Rs.{it.unitPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    <td className="border-r border-black p-2">{it.taxRate}%</td>
                                    <td className="border-r border-black p-2 text-right">Rs.{gstAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    <td className="p-2 text-right">
                                        <div className="font-bold">Rs.{lineTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                                        <div className="text-[9px] italic text-slate-500 leading-tight">{numberToWords(lineTotal)}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col items-end text-base font-bold mb-10 space-y-2">
                <div className="w-[300px] flex justify-between border-b border-slate-300 py-1">
                    <span>Gross Total:</span>
                    <span>Rs.{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="w-[300px] flex justify-between border-b border-slate-300 py-1">
                    <span>Sub Total (Taxable):</span>
                    <span>Rs.{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="w-[300px] flex justify-between border-b border-slate-300 py-1">
                    <span>Total GST:</span>
                    <span>Rs.{totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="w-[350px] flex justify-between pt-4 text-2xl border-t-2 border-black">
                    <span>Grand Total:</span>
                    <span>Rs.{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="text-sm space-y-3 mb-10">
                <h4 className="font-bold underline text-base">Terms and condition:</h4>
                <div className="grid grid-cols-[130px_1fr] gap-y-2">
                    <span className="font-bold">Validity :</span>
                    <span>The above price is valid up to 30 days from the date of submission of the Quotation.</span>
                    <span className="font-bold">Taxes :</span>
                    <span>GST is applicable to the price mentioned as per item-wise rates.</span>
                    <span className="font-bold">Payment :</span>
                    <span>{data.paymentTerms}</span>
                    <span className="font-bold">Banking details :</span>
                    <div className="leading-relaxed">
                        Bank name: ICICI Bank<br/>
                        Branch name: Selaiyur<br/>
                        A/C name: Sreemeditec,<br/>
                        A/C type: CA<br/>
                        A/C No: 603705016939<br/>
                        IFSC Code: ICIC0006037
                    </div>
                    <span className="font-bold">Delivery :</span>
                    <span>{data.deliveryTerms}</span>
                    <span className="font-bold">Warranty :</span>
                    <span>{data.warrantyTerms}</span>
                </div>
            </div>

            <div className="text-base mb-16 italic">
                Thanking you and looking forward for your order.
            </div>

            {/* Footer */}
            <div className="mt-auto flex justify-between items-end">
                <div className="text-base font-bold">
                    <p className="mb-8 leading-tight">With Regards,<br/>For SREE MEDITEC,</p>
                    <div className="h-16"></div>
                    <p className="text-xl">S. Suresh Kumar.</p>
                    <p className="text-sm font-normal">9884818398</p>
                </div>
                <div className="w-32 h-32 border-4 border-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-200 uppercase text-center rotate-12 select-none">Official<br/>Company Seal</div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderTab('form'); setQuote({ date: new Date().toISOString().split('T')[0], items: [], status: 'Draft', paymentTerms: '50% advance with purchase order payable in the name of Sreemeditec and balance 50% on delivery of Machine.', deliveryTerms: 'Within 10 days from the date of the receipt of your purchase order.', warrantyTerms: 'Warranty against manufacturing defects for a period of one year from the date of delivery.', bankAndBranch: 'ICICI Bank, Branch: Selaiyur', accountNo: '603705016939' }); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Quote</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs tracking-widest">Quotations Log</h3>
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-64" /></div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr><th className="px-6 py-4">Quote #</th><th className="px-6 py-4">Consignee</th><th className="px-6 py-4 text-right">Grand Total</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">{invoices.filter(i => i.documentType === 'Quotation').map(inv => (<tr key={inv.id} className="hover:bg-slate-50 transition-colors group"><td className="px-6 py-4 font-black">{inv.invoiceNumber}</td><td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td><td className="px-6 py-4 text-right font-black text-teal-700">₹{inv.grandTotal.toLocaleString()}</td><td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">{inv.status}</span></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setQuote(inv); setEditingId(inv.id); setViewState('builder'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={18}/></button><button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-emerald-500"><Download size={18}/></button></div></td></tr>))}</tbody>
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
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Context</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={quote.invoiceNumber} onChange={e => setQuote({...quote, invoiceNumber: e.target.value})} placeholder="SMQ No." />
                                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={quote.date} onChange={e => setQuote({...quote, date: e.target.value})} />
                                    </div>
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={quote.subject} onChange={e => setQuote({...quote, subject: e.target.value})} placeholder="Reg. Price Quotation for..." />
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Client</h3>
                                    <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={quote.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Search Client..." />
                                    <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={quote.customerAddress || ''} onChange={e => setQuote({...quote, customerAddress: e.target.value})} placeholder="Full Address" />
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={quote.phone} onChange={e => setQuote({...quote, phone: e.target.value})} placeholder="Phone Number" />
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Items</h3><div className="flex gap-2"><button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1 rounded-lg border border-medical-100">+ Manual</button><button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100">+ Catalog</button></div></div>
                                    <div className="space-y-4">{quote.items?.map((item) => (
                                        <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                                            <button onClick={() => setQuote({...quote, items: quote.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-12 md:col-span-6"><label className="text-[9px] font-bold text-slate-400 uppercase">Product</label><input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div>
                                                <div className="col-span-12 md:col-span-6"><label className="text-[9px] font-bold text-slate-400 uppercase">Model</label><input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={item.model} onChange={e => updateItem(item.id, 'model', e.target.value)} /></div>
                                                <div className="col-span-12"><label className="text-[9px] font-bold text-slate-400 uppercase">Features</label><textarea className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={item.features} onChange={e => updateItem(item.id, 'features', e.target.value)} /></div>
                                                <div className="col-span-3"><label className="text-[9px] font-bold text-slate-400 uppercase text-center block">Qty</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                                <div className="col-span-3"><label className="text-[9px] font-bold text-slate-400 uppercase text-right block">Rate</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                                <div className="col-span-3"><label className="text-[9px] font-bold text-slate-400 uppercase text-center block">GST%</label><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div>
                                                <div className="col-span-3"><label className="text-[9px] font-bold text-slate-400 uppercase text-right block">GST Amt</label><div className="w-full bg-slate-100 px-3 py-2 text-xs font-black text-right rounded-xl">{(item.unitPrice * item.quantity * item.taxRate / 100).toFixed(2)}</div></div>
                                            </div>
                                        </div>
                                    ))}</div>
                                </section>

                                <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50">
                                    <button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                                    <button onClick={() => handleSave('Draft')} className="flex-1 py-3 bg-white border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-50">Save Draft</button>
                                    <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(quote); }} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Finalize & Download</button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderQuotationTemplate(quote, totals)}
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Select Products</h3>
                                    <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Filter..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} /></div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map(prod => (
                                        <div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => { handleAddItem(prod); setBuilderTab('form'); }}>
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
