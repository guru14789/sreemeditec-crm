import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, Save, PenTool, 
    History, Edit, Eye, List as ListIcon, Download, Calendar
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

export const ServiceOrderModule: React.FC = () => {
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

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Sree Meditec', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(9);
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 27, { align: 'center' });
        doc.text('Mob: 9884818398', pageWidth / 2, 32, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(10, 35, pageWidth - 10, 35);

        // Title
        doc.setFontSize(11);
        doc.rect(10, 40, pageWidth - 20, 8, 'S');
        doc.text('CUSTOMER SERVICE ORDER', pageWidth / 2, 45.5, { align: 'center' });

        // Registry Table
        autoTable(doc, {
            startY: 52,
            head: [],
            body: [
                [`Smcso No: ${data.invoiceNumber || '---'}`, `Date: ${formatDateDDMMYYYY(data.date)}`],
                [`Smpsr No: ${data.cpoNumber || '---'}`, `Date: ${formatDateDDMMYYYY(data.cpoDate)}`]
            ],
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: (pageWidth - 20) / 2 }, 1: { cellWidth: (pageWidth - 20) / 2 } }
        });

        // Addresses
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 2,
            head: [['Customer and Address:', 'Delivery Address:']],
            body: [[
                `${data.customerName || ''}\n${data.customerAddress || ''}`,
                `${data.deliveryAddress || 'Same as billing.'}`
            ]],
            theme: 'grid',
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontSize: 8 },
            styles: { fontSize: 9, cellPadding: 3, minCellHeight: 25 },
            columnStyles: { 0: { cellWidth: (pageWidth - 20) / 2 }, 1: { cellWidth: (pageWidth - 20) / 2 } }
        });

        // GST info
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 2,
            body: [[`Gst No: ${data.customerGstin || '---'}`, `Gst No: ${data.bankDetails || '33APGPS4675G2ZL'}`]],
            theme: 'grid',
            styles: { fontSize: 9, fontStyle: 'bold' }
        });

        // Order Items
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            head: [['Sl no.', 'Part Description / Service', 'Qty', 'Rate', 'Amount', 'Gst %', 'Gst value', 'Price with Gst']],
            body: (data.items || []).map((item, idx) => [
                idx + 1,
                item.description,
                item.quantity,
                item.unitPrice.toLocaleString(),
                item.amount.toLocaleString(),
                item.taxRate,
                item.gstValue.toLocaleString(),
                item.priceWithGst.toLocaleString()
            ]),
            theme: 'grid',
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontSize: 8, halign: 'center' },
            styles: { fontSize: 8, halign: 'left' },
            columnStyles: { 
                0: { halign: 'center', cellWidth: 10 }, 
                2: { halign: 'center', cellWidth: 12 },
                5: { halign: 'center', cellWidth: 12 },
                7: { fontStyle: 'bold' }
            }
        });

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.rect(10, finalY + 2, pageWidth - 20, 20);
        doc.setFontSize(9);
        doc.text(`Total Spares: ${totals.totalWithGst.toLocaleString()}`, 15, finalY + 8);
        doc.text(`Discount / Adjustment: ${totals.discount.toLocaleString()}`, 15, finalY + 13);
        doc.setFont('helvetica', 'bold');
        doc.text(`Grand Total (Incl Service Charges): Rs. ${totals.grandTotal.toLocaleString()}`, 15, finalY + 18);

        // Payment Details Section
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details', pageWidth / 2, finalY + 28, { align: 'center' });
        autoTable(doc, {
            startY: finalY + 30,
            head: [['Bank and Branch:', 'Acc No:', 'Mode:', 'Req. Date:', 'Net Pay:']],
            body: [[
                'As per record',
                'As per record',
                data.paymentMethod || 'Bank Transfer',
                formatDateDDMMYYYY(data.date),
                totals.grandTotal.toLocaleString()
            ]],
            theme: 'grid',
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontSize: 8, halign: 'center' },
            styles: { fontSize: 9, halign: 'center' }
        });

        // Delivery and Note
        const notesY = (doc as any).lastAutoTable.finalY + 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Delivery Time: ${data.deliveryTime}`, 10, notesY);
        doc.setFont('helvetica', 'normal');
        doc.text('Any special note regarding supply, payment terms:', 10, notesY + 7);
        doc.setFont('helvetica', 'italic');
        doc.text(data.specialNote || 'Standard service terms apply.', 10, notesY + 12, { maxWidth: pageWidth - 20 });

        // Signature area
        const sigY = doc.internal.pageSize.getHeight() - 40;
        doc.setFont('helvetica', 'bold');
        doc.line(10, sigY, 80, sigY);
        doc.text('Customer seal and signature:', 10, sigY + 5);

        doc.line(pageWidth - 80, sigY, pageWidth - 10, sigY);
        doc.text('FOR SREE MEDITEC REPRESENTATIVE:', pageWidth - 80, sigY + 5);

        doc.save(`${data.invoiceNumber || 'ServiceOrder'}.pdf`);
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
            id: editingId || `SO-${Date.now()}`,
            subtotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            documentType: 'ServiceOrder'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        
        handleDownloadPDF(finalData);
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

    const renderSOTemplate = (data: Partial<Invoice>, totals: { subTotal: number, taxTotal: number, totalWithGst: number, discount: number, grandTotal: number }) => (
        <div 
            className="bg-white p-[15mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-sm mx-auto" 
            style={{ 
                fontFamily: 'Calibri, "Segoe UI", Candara, Segoe, Optima, Arial, sans-serif',
                boxSizing: 'border-box'
            }}
        >
            <div className="text-center mb-4 border-b border-black pb-2">
                <h1 className="text-4xl font-bold uppercase tracking-widest leading-none mb-1">Sree Meditec</h1>
                <p className="text-[12px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[12px] font-bold">Mob: 9884818398</p>
            </div>
            
            <div className="border border-black text-center py-1 mb-2 bg-slate-50">
                <h2 className="text-sm font-bold uppercase">CUSTOMER SERVICE ORDER</h2>
            </div>
            
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px]">
                <div className="border-r border-black p-1.5"><span className="font-bold">Smcso No: </span><span className="font-bold">{data.invoiceNumber || '---'}</span></div>
                <div className="p-1.5"><span className="font-bold">Date: </span><span>{formatDateDDMMYYYY(data.date)}</span></div>
            </div>
            
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px]">
                <div className="border-r border-black p-1.5"><span className="font-bold">Smpsr No: </span><span className="font-bold">{data.cpoNumber || '---'}</span></div>
                <div className="p-1.5"><span className="font-bold">Date: </span><span>{formatDateDDMMYYYY(data.cpoDate)}</span></div>
            </div>
            
            <div className="grid grid-cols-2 border-x border-t border-black text-[12px] min-h-[50px]">
                <div className="border-r border-black p-1.5"><p className="font-bold mb-1 underline decoration-slate-300 text-[10px]">Customer and Address:</p><p className="font-bold uppercase">{data.customerName}</p><p className="whitespace-pre-wrap">{data.customerAddress}</p></div>
                <div className="p-1.5"><p className="font-bold mb-1 underline decoration-slate-300 text-[10px]">Delivery Address:</p><p className="whitespace-pre-wrap leading-tight">{data.deliveryAddress || 'Same as billing.'}</p></div>
            </div>
            
            <div className="grid grid-cols-2 border border-black text-[12px]">
                <div className="border-r border-black p-1.5 flex gap-2"><span className="font-bold">Gst No:</span><span>{data.customerGstin || '---'}</span></div>
                <div className="p-1.5 flex gap-2"><span className="font-bold">Gst No:</span><span className="font-bold">{data.bankDetails || '33APGPS4675G2ZL'}</span></div>
            </div>
            
            <div className="border-x border-b border-black text-center py-0.5 bg-slate-50">
                <h3 className="text-[12px] font-bold">Order Details</h3>
            </div>
            
            <div className="border-x border-black">
                <table className="w-full border-collapse text-[12px]">
                    <thead>
                        <tr className="border-b border-black font-bold bg-slate-50">
                            <th className="border-r border-black p-1 text-center w-[10mm]">Sl no.</th>
                            <th className="border-r border-black p-1 text-center">Part Description / Service</th>
                            <th className="border-r border-black p-1 text-center w-[12mm]">Qty</th>
                            <th className="border-r border-black p-1 text-center w-[20mm]">Rate</th>
                            <th className="border-r border-black p-1 text-center w-[22mm]">Amount</th>
                            <th className="border-r border-black p-1 text-center w-[12mm]">Gst %</th>
                            <th className="border-r border-black p-1 text-center w-[22mm]">Gst value</th>
                            <th className="p-1 text-center w-[30mm]">Price with Gst</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items?.map((item, idx) => (
                            <tr key={idx} className="border-b border-black last:border-b-0">
                                <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                                <td className="border-r border-black p-1 text-left"><div className="font-bold">{item.description}</div></td>
                                <td className="border-r border-black p-1 text-center">{item.quantity}</td>
                                <td className="border-r border-black p-1 text-right pr-1">{item.unitPrice.toLocaleString()}</td>
                                <td className="border-r border-black p-1 text-right pr-1">{item.amount.toLocaleString()}</td>
                                <td className="border-r border-black p-1 text-center">{item.taxRate}%</td>
                                <td className="border-r border-black p-1 text-right pr-1">{item.gstValue.toLocaleString()}</td>
                                <td className="p-1 text-right font-bold pr-1">{item.priceWithGst.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="border border-black">
                <div className="grid grid-cols-[1fr_30mm] border-b border-black text-[12px]"><div className="p-1.5 text-left border-r border-black font-bold">Total Spares</div><div className="p-1.5 text-right pr-1 font-black">{totals.totalWithGst.toLocaleString()}</div></div>
                <div className="grid grid-cols-[1fr_30mm] border-b border-black text-[12px]"><div className="p-1.5 text-left border-r border-black font-bold">Discount / Adjustment:</div><div className="p-1.5 text-right pr-1 font-bold">{totals.discount.toLocaleString()}</div></div>
                <div className="grid grid-cols-[1fr_30mm] border-b border-black text-[12px]"><div className="p-1.5 text-left border-r border-black font-bold text-sm">Grand Total (Incl Service Charges)</div><div className="p-1.5 text-right pr-1 font-black text-sm">{totals.grandTotal.toLocaleString()}</div></div>
                <div className="p-1.5 text-[12px] border-b border-black last:border-b-0"><span className="font-bold">Advance payment details:</span> <span className="ml-2">{data.advanceAmount ? `Rs. ${data.advanceAmount.toLocaleString()} received via ${data.paymentMethod} on ${formatDateDDMMYYYY(data.advanceDate)}` : 'Not recorded.'}</span></div>
            </div>
            
            <div className="border-x border-b border-black text-center py-0.5 bg-slate-50"><h3 className="text-[12px] font-bold">Payment Details</h3></div>
            <div className="grid grid-cols-[1fr_1fr_1fr_0.6fr_0.6fr] border-x border-b border-black text-[11px] font-bold"><div className="border-r border-black p-1.5">Bank and Branch:</div><div className="border-r border-black p-1.5">Acc No:</div><div className="border-r border-black p-1.5">Mode:</div><div className="border-r border-black p-1.5">Req. Date:</div><div className="p-1.5">Net Pay:</div></div>
            <div className="grid grid-cols-[1fr_1fr_1fr_0.6fr_0.6fr] border-x border-b border-black text-[12px] min-h-[28px]"><div className="border-r border-black p-1.5 font-medium uppercase">As per record</div><div className="border-r border-black p-1.5 font-medium uppercase">As per record</div><div className="border-r border-black p-1.5 font-bold uppercase">{data.paymentMethod}</div><div className="border-r border-black p-1.5 font-mono">{formatDateDDMMYYYY(data.date)}</div><div className="p-1.5 font-black text-right pr-2">{totals.grandTotal.toLocaleString()}</div></div>
            
            <div className="grid grid-cols-[1fr_1.8fr] border-x border-b border-black text-[12px] min-h-[28px]">
                <div className="border-r border-black p-1.5 font-bold uppercase">Delivery time:</div>
                <div className="p-1.5 font-bold">{data.deliveryTime}</div>
            </div>
            <div className="border-x border-b border-black p-1.5 text-[11px]">
                <p className="font-bold leading-tight underline decoration-slate-300">Any special note regarding supply, payment terms (to be filled by company personal):</p>
                <p className="mt-1 font-medium italic min-h-[40px]">{data.specialNote || 'Standard service terms apply.'}</p>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[12px] mt-0">
                <div className="border-r border-black p-2 flex flex-col justify-between min-h-[100px]">
                    <p className="font-bold">Customer seal and signature:</p>
                    <div className="flex-1 flex items-end pb-2">
                        <div className="w-full border-t border-dotted border-black pt-1 text-[10px] uppercase font-black text-slate-400">Authorised Signatory & Seal</div>
                    </div>
                </div>
                <div className="p-2 flex flex-col justify-between relative overflow-hidden min-h-[100px]">
                    <div className="relative z-10">
                        <p className="font-bold text-left uppercase">FOR SREE MEDITEC REPRESENTATIVE:</p>
                    </div>
                    <div className="flex justify-between items-end relative z-10 pt-10">
                        <div className="text-left"><div className="h-12 w-full"></div></div>
                        <div className="w-24 h-24 border-4 border-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-200 uppercase text-center rotate-12 select-none -mr-4 -mb-4 opacity-40">Official<br/>Company Seal</div>
                    </div>
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
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-800 uppercase tracking-tight text-xs tracking-widest">Service Order Log</h3><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-64" /></div></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr><th className="px-6 py-4">Order #</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4 text-right">Grand Total</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">{invoices.filter(i => i.documentType === 'ServiceOrder').map(inv => (<tr key={inv.id} className="hover:bg-slate-50 transition-colors group"><td className="px-6 py-4 font-black">{inv.invoiceNumber}</td><td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td><td className="px-6 py-4 text-right font-black text-teal-700">₹{inv.grandTotal.toLocaleString()}</td><td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">{inv.status}</span></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={18}/></button><button onClick={() => handleDownloadPDF(inv)} className="p-2 text-slate-400 hover:text-emerald-500"><Download size={18}/></button></div></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="lg:hidden flex bg-slate-50 border-b border-slate-200 shrink-0"><button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button><button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button><button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Items</button></div>
                    <div className="flex-1 flex overflow-hidden">
                        <div className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white ${builderTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Registry</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Smcso No.</label>
                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.invoiceNumber} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMCSO No." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.date} onChange={e => setOrder({...order, date: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Smpsr No.</label>
                                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.cpoNumber} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="SMPSR No." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Smpsr Date</label>
                                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={order.cpoDate} onChange={e => setOrder({...order, cpoDate: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer & Logistics</h3>
                                <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={order.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Customer Name *" />
                                <div className="grid grid-cols-2 gap-4">
                                    <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Billing Address" />
                                    <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={order.deliveryAddress || ''} onChange={e => setOrder({...order, deliveryAddress: e.target.value})} placeholder="Delivery Address" />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Details</h3><div className="flex gap-2"><button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all">+ Manual Row</button><button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all">+ Add Catalog</button></div></div>
                                <div className="space-y-4">{order.items?.map((item) => (<div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group"><button onClick={() => setOrder({...order, items: order.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button><div className="grid grid-cols-12 gap-3"><div className="col-span-12 md:col-span-9"><input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} /></div><div className="col-span-12 md:col-span-3"><input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="Qty" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div></div></div>))}</div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment & Delivery Terms</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Advance payment details:</label>
                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.advanceAmount} onChange={e => setOrder({...order, advanceAmount: Number(e.target.value)})} placeholder="Advance Amount" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Discount / adjustment:</label>
                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.discount} onChange={e => setOrder({...order, discount: Number(e.target.value)})} placeholder="Discount" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Delivery Time</label>
                                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.deliveryTime} onChange={e => setOrder({...order, deliveryTime: e.target.value})} placeholder="e.g. As per schedule" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payment Mode</label>
                                        <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={order.paymentMethod} onChange={e => setOrder({...order, paymentMethod: e.target.value as any})}>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="NEFT">NEFT</option>
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Special Notes / Terms</label>
                                    <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={order.specialNote || ''} onChange={e => setOrder({...order, specialNote: e.target.value})} placeholder="Additional terms or instructions..." />
                                </div>
                            </section>

                            <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50"><button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button><button onClick={handleSave} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Finalize Service Order</button></div>
                        </div>
                        <div className={`w-full lg:w-1/2 bg-slate-100 border-l border-slate-200 flex flex-col lg:overflow-hidden ${builderTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
                            <div className="hidden lg:flex bg-[#81D7D3] p-1 shrink-0">
                                <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'preview' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Live Order Preview</button>
                                <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'catalog' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Parts Catalog</button>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <div className={`h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar ${builderTab === 'preview' ? 'flex' : 'hidden'}`}>
                                    <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                        {renderSOTemplate(order, totals)}
                                    </div>
                                </div>
                                <div className={`h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in ${builderTab === 'catalog' ? 'flex' : 'hidden'}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Select Spares</h3>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" placeholder="Filter Spares..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-4">
                                        {filteredProducts.map(prod => (
                                            <div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => handleAddItem(prod)}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[8px] font-black uppercase text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">{prod.category}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{prod.sku}</span>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{prod.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Available: {prod.stock} units</p>
                                                </div>
                                                <div className="ml-4 p-1.5 bg-white rounded-lg border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <datalist id="prod-list">{products.filter(p => p.category !== 'Equipment').map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};