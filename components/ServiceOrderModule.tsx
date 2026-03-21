
import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { 
    History, Edit, Eye, Download, MoreVertical
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
    const { invoices, addInvoice, updateInvoice, addNotification, currentUser } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [order, setOrder] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
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

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

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
        doc.text('CUSTOMER SERVICE ORDER', pageWidth / 2, 39.5, { align: 'center' });

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

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            head: [['Sl no.', 'Product', 'Qty', 'Rate', 'Amount', 'Gst %', 'Gst value', 'Price with Gst']],
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
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: (totals.totalWithGst || 0).toLocaleString('en-IN'), styles: { halign: 'right', fontStyle: 'bold' } }],
                [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 9 } }, { content: (totals.grandTotal || 0).toLocaleString('en-IN'), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }]
            ]
        });

        doc.save(`${data.invoiceNumber || 'ServiceOrder'}.pdf`);
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
        addNotification('Registry Updated', `Service Order ${finalData.invoiceNumber} saved.`, 'success');
    };



    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setOrder({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'ServiceOrder' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><Edit size={16} /> New Service Order</button>
            </div>
            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center"><h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Service Order Log</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Order #</th>
                                    <th className="px-6 py-4">Consignee</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-right">Grand Total</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.filter(i => i.documentType === 'ServiceOrder').map(inv => (
                                    <tr key={inv.id} onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0">
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
                                        <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveMenuId(activeMenuId === inv.id ? null : inv.id); 
                                                    }} 
                                                    className={`p-2 rounded-xl transition-all ${activeMenuId === inv.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {activeMenuId === inv.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px] border-slate-300">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Edit Service Order"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Download PDF"
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
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-300 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Edit size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Order #</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.invoiceNumber} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.date} onChange={e => setOrder({...order, date: e.target.value})} />
                             </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Name</label>
                            <input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold" value={order.customerName} onChange={e => setOrder({...order, customerName: e.target.value})} />
                        </div>
                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <button onClick={() => setViewState('history')} className="px-6 py-2 bg-slate-100 rounded-xl text-xs font-black uppercase">Discard</button>
                            <button onClick={() => handleSave('Draft')} className="px-6 py-2 border-2 border-medical-500 text-medical-600 rounded-xl text-xs font-black uppercase">Save Draft</button>
                            <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(order); }} className="px-10 py-2 bg-medical-600 text-white rounded-xl text-xs font-black uppercase shadow-lg">Finalize & PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
