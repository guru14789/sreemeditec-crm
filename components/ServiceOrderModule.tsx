
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, Save, PenTool, 
    History, Edit, Eye, List as ListIcon, Download, Calendar, ArrowLeft, CreditCard
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const ServiceOrderModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, addNotification, currentUser } = useData();
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
        bankDetails: '33APGPS4675G2ZL',
        deliveryAddress: '',
        bankAndBranch: 'ICICI Bank, Br: Selaiyur',
        accountNo: '603705016939',
        paymentMethod: 'Bank Transfer',
        advanceAmount: 0,
        advanceDate: new Date().toISOString().split('T')[0],
        deliveryTime: 'As per schedule',
        specialNote: '',
        documentType: 'ServiceOrder'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.invoiceNumber) {
            setOrder(prev => ({
                ...prev,
                invoiceNumber: `SMCSO ${String(invoices.filter(i => i.documentType === 'ServiceOrder').length + 201).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, invoices]);

    const handleDownloadPDF = (data: Partial<Invoice>) => {
        const doc = new jsPDF();
        const totals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const colWidth = (pageWidth - 20) / 2;

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, BajanaiKoil Street, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 24, { align: 'center' });
        doc.text('Mob: 9884818398', pageWidth / 2, 29, { align: 'center' });

        // Document Title
        doc.setLineWidth(0.1);
        doc.rect(margin, 34, pageWidth - 20, 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('CUSTOMER SERVICE ORDER', pageWidth / 2, 39.5, { align: 'center' });

        // Registry Grid
        autoTable(doc, {
            startY: 42,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [`SMCSO NO: ${data.invoiceNumber || ''}`, `DATE: ${formatDateDDMMYYYY(data.date)}`],
                [`SMPSR NO: ${data.cpoNumber || ''}`, `DATE: ${formatDateDDMMYYYY(data.cpoDate)}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        // Addresses Grid
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 25, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [`Name of the Customer and Address:\n\n${data.customerName || ''}\n${data.customerAddress || ''}`, `Delivery Address:\n\n${data.deliveryAddress || data.customerAddress || ''}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        // GST info Grid
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [`GST No: ${data.customerGstin || ''}`, `GST No: ${data.bankDetails || '33APGPS4675G2ZL'}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        // Order Details Section Header
        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 7);
        doc.setFont('helvetica', 'bold');
        doc.text('ORDER DETAILS', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4.5, { align: 'center' });

        // Items Table
        const itemsToPrint = [...(data.items || [])];
        while (itemsToPrint.length < 5) {
            itemsToPrint.push({ id: `placeholder-${itemsToPrint.length}`, description: '', hsn: '', quantity: 0, unitPrice: 0, taxRate: 0, amount: 0, gstValue: 0, priceWithGst: 0 });
        }

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 7,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            head: [['Sl no.', 'Product', 'Qty', 'Rate', 'Amount', 'Gst %', 'Gst value', 'Price with Gst']],
            body: itemsToPrint.map((it, idx) => {
                if (it.id.startsWith('placeholder')) return [idx + 1, '', '', '', '', '', '', ''];
                const amount = it.quantity * it.unitPrice;
                const gstValue = amount * (it.taxRate / 100);
                return [
                    idx + 1,
                    it.description,
                    it.quantity || '',
                    it.quantity ? it.unitPrice.toLocaleString('en-IN') : '',
                    it.quantity ? amount.toLocaleString('en-IN') : '',
                    it.quantity ? `${it.taxRate}%` : '',
                    it.quantity ? gstValue.toLocaleString('en-IN') : '',
                    it.quantity ? (amount + gstValue).toLocaleString('en-IN') : ''
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

        // Summary Rows
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
                [{ content: `Advance Payment details: ${data.advanceAmount ? `Rs. ${data.advanceAmount.toLocaleString('en-IN')} via ${data.paymentMethod} on ${formatDateDDMMYYYY(data.advanceDate)}` : '---'}`, colSpan: 2, styles: { fontStyle: 'bold' } }]
            ],
            columnStyles: { 0: { cellWidth: pageWidth - 20 - 30 }, 1: { cellWidth: 30 } }
        });

        // Payment Details Box Header
        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 6);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT DETAILS', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4, { align: 'center' });

        // Payment Details Grid
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 6,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            head: [['Bank and Branch:', 'Mode of payment:', 'Date:', 'Amount:']],
            body: [[data.bankAndBranch || '---', data.paymentMethod || '---', formatDateDDMMYYYY(data.advanceDate), (data.advanceAmount || 0).toLocaleString('en-IN')]],
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: colWidth * 0.6 }, 1: { cellWidth: colWidth * 0.6 }, 2: { cellWidth: colWidth * 0.4 }, 3: { cellWidth: colWidth * 0.4 } }
        });

        // Delivery Time
        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 8);
        doc.setFont('helvetica', 'bold');
        doc.text('Delivery time:', margin + 2, (doc as any).lastAutoTable.finalY + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(data.deliveryTime || '---', margin + 35, (doc as any).lastAutoTable.finalY + 5);

        // Special Notes
        const noteY = (doc as any).lastAutoTable.finalY + 8;
        const noteText = `Any special note regarding supply, payment terms(to be filled by company personal):\n\n${data.specialNote || 'Standard terms apply.'}`;
        const splitNote = doc.splitTextToSize(noteText, pageWidth - 24);
        const noteHeight = Math.max(20, (splitNote.length * 5) + 5);
        doc.rect(margin, noteY, pageWidth - 20, noteHeight);
        doc.setFont('helvetica', 'bold');
        doc.text(splitNote, margin + 2, noteY + 5);

        // Signature Blocks
        const sigY = noteY + noteHeight;
        doc.rect(margin, sigY, pageWidth - 20, 35);
        doc.line(pageWidth / 2, sigY, pageWidth / 2, sigY + 35);
        doc.setFontSize(8);
        doc.text('Customer seal and signature:', margin + 2, sigY + 5);
        doc.text('Sreemeditec representative signature:', pageWidth / 2 + 2, sigY + 5);

        doc.save(`${data.invoiceNumber || 'ServiceOrder'}.pdf`);
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
            gstValue: (prod?.price || 0) * ((prod?.taxRate || 18) / 100),
            priceWithGst: (prod?.price || 0) * (1 + ((prod?.taxRate || 18) / 100))
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
        if (!order.customerName || !order.items?.length) {
            alert("Fill customer details and items.");
            return;
        }
        const totals = calculateDetailedTotals(order);
        const finalData: Invoice = {
            ...order as Invoice,
            id: editingId || `SO-${Date.now()}`,
            subtotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'ServiceOrder',
            createdBy: currentUser?.name || 'System'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Service Order ${finalData.invoiceNumber} saved as ${status}.`, 'success');
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
            p.sku.toLowerCase().includes(catalogSearch.toLowerCase())
        );
    }, [products, catalogSearch]);

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    const renderSOTemplate = (data: Partial<Invoice>, totals: any) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col mx-auto border border-slate-200" style={{ fontFamily: '"Arial", sans-serif', fontSize: '12px' }}>
            <div className="text-center mb-4">
                <h1 className="text-4xl font-black uppercase mb-1 tracking-widest">SREE MEDITEC</h1>
                <p className="text-[11px] font-bold">New No: 18, Old No: 2, BajanaiKoil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[11px] font-bold">Mob: 9884818398</p>
            </div>

            <div className="border border-black text-center py-1.5 font-bold mb-0">CUSTOMER SERVICE ORDER</div>

            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">SMCSO NO: {data.invoiceNumber || '---'}</div>
                <div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.date)}</div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">SMPSR NO: {data.cpoNumber || '---'}</div>
                <div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.cpoDate)}</div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black min-h-[60px]">
                <div className="border-r border-black p-1.5">
                    <p className="font-bold mb-1 underline text-[10px]">Name of the Customer and Address:</p>
                    <p className="font-bold uppercase leading-tight">{data.customerName || '------------------'}</p>
                    <p className="whitespace-pre-wrap text-[11px]">{data.customerAddress}</p>
                </div>
                <div className="p-1.5">
                    <p className="font-bold mb-1 underline text-[10px]">Delivery Address:</p>
                    <p className="whitespace-pre-wrap text-[11px]">{data.deliveryAddress || data.customerAddress || '------------------'}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 flex gap-2"><span className="font-bold">GST No:</span><span>{data.customerGstin || '------------------'}</span></div>
                <div className="p-1.5 flex gap-2"><span className="font-bold">GST No:</span><span className="font-bold">{data.bankDetails || '33APGPS4675G2ZL'}</span></div>
            </div>

            <div className="border-x border-black text-center py-1 font-bold">ORDER DETAILS</div>

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
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? item.unitPrice.toLocaleString() : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? amt.toLocaleString() : ''}</td>
                                    <td className="border-r border-black p-1 text-center">{item.quantity ? `${item.taxRate}%` : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? tax.toLocaleString() : ''}</td>
                                    <td className="p-1 text-right font-bold">{item.quantity ? (amt + tax).toLocaleString() : ''}</td>
                                </tr>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 5 - (data.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-black last:border-b-0 h-8">
                                <td className="border-r border-black p-1 text-center">{ (data.items?.length || 0) + i + 1}</td>
                                <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Total</td>
                            <td className="p-1 text-right font-black">{totals.totalWithGst.toLocaleString()}</td>
                        </tr>
                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Discount/Buyback/adjustment</td>
                            <td className="p-1 text-right">{(data.discount || 0).toLocaleString()}</td>
                        </tr>
                        <tr className="border-t border-black font-black bg-slate-50 text-sm">
                            <td colSpan={7} className="border-r border-black p-1.5 text-right uppercase">Grand Total</td>
                            <td className="p-1.5 text-right">Rs. {totals.grandTotal.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="border-x border-b border-black p-1.5 font-bold italic">
                Advance Payment details: <span className="ml-4 font-normal not-italic">{data.advanceAmount ? `Rs. ${data.advanceAmount.toLocaleString()} paid via ${data.paymentMethod} on ${formatDateDDMMYYYY(data.advanceDate)}` : '------------------'}</span>
            </div>

            <div className="border-x border-b border-black text-center py-1 font-bold uppercase">Payment Details</div>

            <div className="grid grid-cols-4 border-x border-b border-black text-[10px] font-bold">
                <div className="border-r border-black p-1.5 col-span-1">Bank and Branch:</div>
                <div className="border-r border-black p-1.5 col-span-1">Mode of payment:</div>
                <div className="border-r border-black p-1.5 col-span-1">Date:</div>
                <div className="p-1.5 col-span-1">Amount:</div>
            </div>
            <div className="grid grid-cols-4 border-x border-b border-black text-[11px] min-h-[30px]">
                <div className="border-r border-black p-1.5 font-medium">{data.bankAndBranch}</div>
                <div className="border-r border-black p-1.5 font-bold">{data.paymentMethod}</div>
                <div className="border-r border-black p-1.5 font-mono">{formatDateDDMMYYYY(data.advanceDate)}</div>
                <div className="p-1.5 font-black text-right">{data.advanceAmount ? data.advanceAmount.toLocaleString() : ''}</div>
            </div>

            <div className="border-x border-b border-black p-1.5 font-bold">
                Delivery time: <span className="ml-4 font-medium">{data.deliveryTime || '------------------'}</span>
            </div>

            <div className="border-x border-b border-black p-1.5 min-h-[60px]">
                <p className="font-bold underline decoration-slate-300">Any special note regarding supply, payment terms(to be filled by company personal):</p>
                <p className="mt-1 font-medium italic">{data.specialNote || '------------------'}</p>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black flex-1 min-h-[100px]">
                <div className="border-r border-black p-2 flex flex-col justify-between">
                    <p className="font-bold">Customer seal and signature:</p>
                    <div className="border-t border-dotted border-black pt-1 w-3/4 mb-4"></div>
                </div>
                <div className="p-2 flex flex-col justify-between">
                    <p className="font-bold">Sreemeditec representative signature:</p>
                    <div className="border-t border-dotted border-black pt-1 w-3/4 mb-4"></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setOrder({ date: new Date().toISOString().split('T')[0], cpoDate: new Date().toISOString().split('T')[0], items: [], status: 'Completed', documentType: 'ServiceOrder', bankDetails: '33APGPS4675G2ZL', bankAndBranch: 'ICICI Bank, Br: Selaiyur', accountNo: '603705016939', advanceAmount: 0, discount: 0, deliveryTime: 'As per schedule', specialNote: '' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Service Order</button>
            </div>
            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-800 uppercase tracking-tight text-xs tracking-widest">Service Order Log</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Order #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-right">Grand Total</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.filter(i => i.documentType === 'ServiceOrder').map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-500">{inv.createdBy?.charAt(0) || 'S'}</div>
                                                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[100px]">{inv.createdBy || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-teal-700">₹{inv.grandTotal.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={18}/></button>
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
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Registry</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">SMCSO NO.</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.invoiceNumber} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMCSO-001" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.date} onChange={e => setOrder({...order, date: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">SMPSR NO.</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.cpoNumber} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="SMPSR-1234" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">SMPSR Date</label>
                                            <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.cpoDate} onChange={e => setOrder({...order, cpoDate: e.target.value})} />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer Details</h3>
                                    <input type="text"