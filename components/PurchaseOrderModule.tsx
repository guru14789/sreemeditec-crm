import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, CreditCard, MoreVertical,
    FileText, User, CheckCircle, Percent, ImageIcon, ShieldCheck, ShoppingCart, Calendar, Building2, Save
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';
import { AutoSuggest } from './AutoSuggest';

const calculateDetailedTotals = (order: Partial<Invoice>) => {
    const items = order.items || [];
    const subTotal = items.reduce((sum, p) => sum + (p.quantity * (p.unitPrice || 0)), 0);
    const taxTotal = items.reduce((sum, p) => {
        const itemAmount = p.quantity * (p.unitPrice || 0);
        return sum + (itemAmount * ((p.taxRate || 0) / 100));
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

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

export const PurchaseOrderModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, addNotification, currentUser, financialYear } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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
        deliveryTime: 'Immediate',
        specialNote: '',
        documentType: 'PO'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.invoiceNumber) {
            const currentYearPOs = invoices.filter(i => i.invoiceNumber && i.invoiceNumber.includes(`SMCPO/${financialYear}/`));
            const nextNum = currentYearPOs.length + 1;
            setOrder(prev => ({
                ...prev,
                invoiceNumber: `SMCPO/${financialYear}/${nextNum}`
            }));
        }
    }, [viewState, editingId, invoices, financialYear, order.invoiceNumber]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    const handleDownloadPDF = async (data: Partial<Invoice>) => {
        try {
            const blob = await PDFService.generatePurchaseOrderPDF(data as Invoice, data.documentType !== 'SupplierPO');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.invoiceNumber || 'PurchaseOrder'}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF", err);
            addNotification('Download Failed', 'Could not generate PDF file.', 'alert');
        }
    };

    const handleAddItem = (prod?: any) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unitPrice: prod?.sellingPrice || 0,
            taxRate: prod?.taxRate || 18,
            amount: prod?.sellingPrice || 0,
            gstValue: (prod?.sellingPrice || 0) * ((prod?.taxRate || 18) / 100),
            priceWithGst: (prod?.sellingPrice || 0) * (1 + ((prod?.taxRate || 18) / 100))
        };
        setOrder(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setOrder(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.sellingPrice || 0;
                            updated.taxRate = masterProd.taxRate || 18;
                            updated.hsn = masterProd.hsn || '';
                        }
                    }
                    updated.amount = updated.quantity * (updated.unitPrice || 0);
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const handleSave = (status: 'Draft' | 'Finalized') => {
        if (!order.customerName || !order.items?.length) {
            addNotification('Invalid Data', 'Fill customer details and items.', 'alert');
            return;
        }
        const finalData: Invoice = {
            ...order as Invoice,
            id: editingId || `PO-${Date.now()}`,
            subtotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'PO',
            createdBy: currentUser?.name || 'System'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Purchase Order ${finalData.invoiceNumber} saved.`, 'success');
    };

    const renderPOTemplate = (data: Partial<Invoice>, totals: any) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="text-center mb-6">
                <h1 className="text-4xl font-black uppercase mb-1 tracking-tight">SREE MEDITEC</h1>
                <p className="text-[11px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[11px] font-bold">Mob: 9884818398</p>
            </div>

            <div className="border border-black text-center py-2 bg-slate-50 font-black text-sm uppercase tracking-widest mb-0">CUSTOMER PURCHASE ORDER</div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[10px] font-bold">
                <div className="border-r border-black p-2 flex gap-2"><span>SMCPO NO:</span><span className="text-medical-600 font-black">{data.invoiceNumber}</span></div>
                <div className="p-2 flex gap-2"><span>DATE:</span><span className="font-black">{formatDateDDMMYYYY(data.date)}</span></div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[10px] font-bold">
                <div className="border-r border-black p-2 flex gap-2"><span>CPO NO:</span><span className="font-black uppercase">{data.cpoNumber || '---'}</span></div>
                <div className="p-2 flex gap-2"><span>DATE:</span><span className="font-black">{formatDateDDMMYYYY(data.cpoDate)}</span></div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[11px] min-h-[80px]">
                <div className="border-r border-black p-3">
                    <p className="font-bold mb-1 underline uppercase text-[9px] tracking-widest text-slate-400">Consignee Identity:</p>
                    <p className="font-black uppercase leading-tight text-sm">{data.customerName}</p>
                    <p className="whitespace-pre-wrap text-[10px] mt-1 leading-tight font-medium uppercase">{data.customerAddress}</p>
                </div>
                <div className="p-3">
                    <p className="font-bold mb-1 underline uppercase text-[9px] tracking-widest text-slate-400">Delivery Destination:</p>
                    <p className="whitespace-pre-wrap text-[10px] leading-tight font-medium uppercase">{data.deliveryAddress || data.customerAddress}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[10px] font-bold uppercase">
                <div className="border-r border-black p-2 flex gap-2"><span>GSTIN:</span><span className="font-black">{data.customerGstin || '---'}</span></div>
                <div className="p-2 flex gap-2 bg-slate-50/50"><span>OWN GST:</span><span className="font-black">{data.bankDetails || '33APGPS4675G2ZL'}</span></div>
            </div>

            <div className="border-x border-black bg-slate-100 text-center py-1.5 font-black text-[10px] uppercase tracking-[0.3em]">Order Manifest</div>

            <div className="border border-black overflow-hidden">
                <table className="w-full border-collapse text-[10px]">
                    <thead className="bg-slate-50 font-black uppercase text-[8px] tracking-widest">
                        <tr className="border-b border-black">
                            <th className="border-r border-black p-2 w-10 text-center">#</th>
                            <th className="border-r border-black p-2 text-left">Description of Goods</th>
                            <th className="border-r border-black p-2 w-12 text-center">Qty</th>
                            <th className="border-r border-black p-2 w-24 text-right">Unit Rate</th>
                            <th className="border-r border-black p-2 w-24 text-right">Basic Amt</th>
                            <th className="border-r border-black p-2 w-16 text-center">Tax %</th>
                            <th className="p-2 w-28 text-right">Total with GST</th>
                        </tr>
                    </thead>
                    <tbody className="font-medium">
                        {(data.items || []).map((item, idx) => {
                            const amt = item.quantity * (item.unitPrice || 0);
                            const tax = amt * ((item.taxRate || 0) / 100);
                            return (
                                <tr key={idx} className="border-b border-black last:border-b-0 h-8">
                                    <td className="border-r border-black p-2 text-center">{idx + 1}</td>
                                    <td className="border-r border-black p-2 font-black uppercase">{item.description}</td>
                                    <td className="border-r border-black p-2 text-center font-black">{item.quantity}</td>
                                    <td className="border-r border-black p-2 text-right">{item.unitPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="border-r border-black p-2 text-right font-bold">{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="border-r border-black p-2 text-center font-bold">{item.taxRate}%</td>
                                    <td className="p-2 text-right font-black text-medical-700">{(amt + tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 8 - (data.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-black last:border-b-0 h-8">
                                <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-black border-t border-black">
                        <tr className="bg-slate-50">
                            <td colSpan={6} className="border-r border-black p-2 text-right uppercase text-[9px] tracking-widest">Aggregate Value (Inc. Tax)</td>
                            <td className="p-2 text-right text-sm">₹{totals.totalWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="border-r border-black p-2 text-right uppercase text-[9px] tracking-widest">Discount / Adjustments</td>
                            <td className="p-2 text-right text-rose-600">₹{(data.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="bg-slate-900 text-white text-base">
                            <td colSpan={6} className="border-r border-white/20 p-3 text-right uppercase tracking-[0.2em] text-[10px]">Net Order Value</td>
                            <td className="p-3 text-right font-black">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="border-x border-b border-black p-3 font-bold text-[10px] italic bg-slate-50/50">
                <span className="font-black uppercase tracking-tighter mr-4 underline">Advance Remittance:</span>
                {data.advanceAmount ? `Rs. ${data.advanceAmount.toLocaleString('en-IN')} via ${data.paymentMethod} on ${formatDateDDMMYYYY(data.advanceDate)}` : 'NIL / AS PER CONTRACT'}
            </div>

            <div className="border-x border-b border-black text-center py-1.5 font-black uppercase tracking-[0.3em] text-[10px] bg-slate-100">Settlement Matrix</div>

            <div className="grid grid-cols-4 border-x border-b border-black text-[9px] font-black uppercase bg-slate-50 text-center tracking-widest">
                <div className="border-r border-black p-1.5">Bank / Entity</div>
                <div className="border-r border-black p-1.5">Instrument</div>
                <div className="border-r border-black p-1.5">Value Date</div>
                <div className="p-1.5">Remittance</div>
            </div>
            <div className="grid grid-cols-4 border-x border-b border-black text-[11px] min-h-[30px] items-center">
                <div className="border-r border-black px-2 font-bold uppercase truncate">{data.bankAndBranch}</div>
                <div className="border-r border-black px-2 font-black text-center text-[10px]">{data.paymentMethod}</div>
                <div className="border-r border-black px-2 text-center font-bold text-slate-500">{formatDateDDMMYYYY(data.advanceDate)}</div>
                <div className="px-2 font-black text-right text-medical-600">₹{data.advanceAmount?.toLocaleString('en-IN')}</div>
            </div>

            <div className="border-x border-b border-black p-3 text-[10px] font-bold">
                <span className="uppercase tracking-widest text-slate-400 mr-4">Timeline:</span>
                <span className="font-black uppercase text-sm">{data.deliveryTime || '---'}</span>
            </div>

            <div className="border-x border-b border-black p-4 flex-1 min-h-[60px]">
                <p className="font-black underline uppercase text-[9px] tracking-widest text-slate-400 mb-2">Service & Supply Stipulations:</p>
                <p className="font-medium italic text-[11px] leading-relaxed uppercase">{data.specialNote || 'Standard warranty and supply terms as per company policy apply.'}</p>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black min-h-[120px]">
                <div className="border-r border-black p-6 flex flex-col justify-between">
                    <p className="font-black text-[10px] uppercase tracking-widest text-center">Customer Authority</p>
                    <div className="text-center">
                        <p className="text-[8px] font-black text-slate-300 uppercase">Seal & Signature Required</p>
                    </div>
                </div>
                <div className="p-6 flex flex-col justify-between bg-slate-50/20">
                    <p className="font-black text-[10px] uppercase tracking-widest text-center text-medical-600">Company Authorized</p>
                    <div className="text-center">
                        <p className="font-bold text-[10px] uppercase">{data.createdBy}</p>
                        <p className="text-[8px] font-black text-medical-600 mt-1 uppercase">FOR SREE MEDITEC</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setOrder({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'PO', bankDetails: '33APGPS4675G2ZL', bankAndBranch: 'ICICI Bank, Br: Selaiyur', accountNo: '603705016939', advanceDate: new Date().toISOString().split('T')[0], deliveryTime: 'Immediate' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Order</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center"><h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Purchase Registry</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">PO #</th>
                                    <th className="px-6 py-4">Consignee</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-right">Value</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices
                                    .filter(i => (i.invoiceNumber || '').startsWith('SMCPO'))
                                    .sort((a, b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true }))
                                    .map(inv => (
                                    <tr key={inv.id} onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 font-black">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div title={inv.createdBy} className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200">
                                                {inv.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-medical-600">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === inv.id ? null : inv.id); }} className={`p-2 rounded-xl transition-all ${activeMenuId === inv.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeMenuId === inv.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px]">
                                                        <button onClick={(e) => { e.stopPropagation(); setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"><Edit size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); setActiveMenuId(null); }} className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex-1 flex justify-center"><Download size={18} /></button>
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
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ShoppingCart size={18}/> Catalog</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-10 custom-scrollbar">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Calendar size={14} className="text-medical-500" />
                                            1. Registry Identity
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="PO Number *">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={order.invoiceNumber || ''} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMCPO-001" />
                                            </FormRow>
                                            <FormRow label="Document Date">
                                                <input type="date" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.date || ''} onChange={e => setOrder({...order, date: e.target.value})} />
                                            </FormRow>
                                            <FormRow label="Customer PO Ref">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={order.cpoNumber || ''} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="CPO-12345" />
                                            </FormRow>
                                            <FormRow label="Customer PO Date">
                                                <input type="date" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.cpoDate || ''} onChange={e => setOrder({...order, cpoDate: e.target.value})} />
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Building2 size={14} className="text-medical-500" />
                                            2. Consignee Profile
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Customer Name *">
                                                    <AutoSuggest
                                                        value={order.customerName || ''}
                                                        onChange={(val) => setOrder({ ...order, customerName: val })}
                                                        onSelect={(client) => {
                                                            setOrder(prev => ({
                                                                ...prev,
                                                                customerName: client.name,
                                                                customerHospital: client.hospital || '',
                                                                customerAddress: client.address || '',
                                                                customerGstin: client.gstin || '',
                                                                deliveryAddress: client.address || ''
                                                            }));
                                                        }}
                                                        suggestions={clients}
                                                        filterKey="name"
                                                        placeholder="Search client registry..."
                                                        className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5"
                                                    />
                                                </FormRow>
                                                <FormRow label="Billing Address">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[80px] resize-none uppercase" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Official address..." />
                                                </FormRow>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="GSTIN Identity">
                                                    <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={order.customerGstin || ''} onChange={e => setOrder({...order, customerGstin: e.target.value})} placeholder="00AAAAA0000A0A0" />
                                                </FormRow>
                                                <FormRow label="Delivery Site">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[80px] resize-none uppercase" value={order.deliveryAddress || ''} onChange={e => setOrder({...order, deliveryAddress: e.target.value})} placeholder="Destination address..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div className="flex justify-between items-center border-b pb-1">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <ListIcon size={14} className="text-medical-500" />
                                                3. Order Manifest
                                            </h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setBuilderTab('catalog')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Catalog</button>
                                                <button onClick={() => handleAddItem()} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pb-4">
                                            {order.items?.map((item, idx) => (
                                                <div key={item.id} className="group p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-medical-300 transition-all grid grid-cols-1 sm:grid-cols-12 gap-4 relative shadow-sm">
                                                    <button onClick={() => setOrder(prev => ({ ...prev, items: prev.items?.filter(it => it.id !== item.id) }))} className="absolute -top-2 -right-2 bg-white text-rose-400 hover:text-rose-600 p-2 rounded-full shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 transition-all z-10"><Trash2 size={14}/></button>
                                                    <div className="sm:col-span-6">
                                                        <FormRow label={`Item #${idx + 1}`}>
                                                            <AutoSuggest
                                                                value={item.description || ''}
                                                                onChange={(val) => updateItem(item.id, 'description', val)}
                                                                onSelect={(prod) => {
                                                                    updateItem(item.id, 'description', prod.name);
                                                                    updateItem(item.id, 'unitPrice', prod.sellingPrice || 0);
                                                                    updateItem(item.id, 'taxRate', prod.taxRate || 18);
                                                                    updateItem(item.id, 'hsn', prod.hsn || '');
                                                                }}
                                                                suggestions={products}
                                                                filterKey="name"
                                                                placeholder="Search product..."
                                                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none"
                                                            />
                                                        </FormRow>
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <FormRow label="Qty">
                                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-center font-black text-sm outline-none" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                        </FormRow>
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <FormRow label="Unit Rate">
                                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-right font-black text-sm outline-none" value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} />
                                                        </FormRow>
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <FormRow label="Subtotal (₹)">
                                                            <div className="h-[42px] flex items-center justify-end px-2 font-black text-medical-600 text-sm">₹{(item.amount || 0).toLocaleString('en-IN')}</div>
                                                        </FormRow>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <CreditCard size={14} className="text-medical-500" />
                                            4. Commercial Terms
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                            <FormRow label="Advance Received (₹)">
                                                <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none text-emerald-600" value={order.advanceAmount || ''} onChange={e => setOrder({...order, advanceAmount: Number(e.target.value)})} />
                                            </FormRow>
                                            <FormRow label="Value Date">
                                                <input type="date" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.advanceDate || ''} onChange={e => setOrder({...order, advanceDate: e.target.value})} />
                                            </FormRow>
                                            <FormRow label="Payment Instrument">
                                                <select className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-[11px] font-black uppercase outline-none" value={order.paymentMethod || 'Bank Transfer'} onChange={e => setOrder({...order, paymentMethod: e.target.value as any})}><option>Bank Transfer</option><option>Cheque</option><option>Cash</option><option>UPI</option></select>
                                            </FormRow>
                                            <FormRow label="Expected Delivery">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={order.deliveryTime || ''} onChange={e => setOrder({...order, deliveryTime: e.target.value})} placeholder="e.g. 2 weeks" />
                                            </FormRow>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormRow label="Statutory Discount (₹)">
                                                <input type="number" className="w-full h-[42px] bg-white border border-rose-200 rounded-xl px-4 py-2 text-sm font-black outline-none text-rose-600" value={order.discount || ''} onChange={e => setOrder({...order, discount: Number(e.target.value)})} />
                                            </FormRow>
                                            <FormRow label="Sreemeditec Representative">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-500" value={order.createdBy || currentUser?.name || ''} readOnly />
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4 pb-20">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <PenTool size={14} className="text-medical-500" />
                                            5. Special Stipulations
                                        </h3>
                                        <FormRow label="Additional Supply & Service Terms">
                                            <textarea className="w-full bg-white border border-slate-300 rounded-xl px-5 py-4 text-xs font-bold outline-none h-[100px] resize-none uppercase" value={order.specialNote || ''} onChange={e => setOrder({...order, specialNote: e.target.value})} placeholder="Payment milestones, warranty extensions etc..." />
                                        </FormRow>
                                    </section>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                                    <div className="flex-1 flex items-center justify-between px-2 order-2 sm:order-1">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Value</span>
                                            <span className="text-2xl font-black text-medical-600 tracking-tight">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <button onClick={() => { setViewState('history'); setEditingId(null); }} className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors shadow-sm">Discard</button>
                                    </div>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button onClick={() => handleSave('Draft')} className="flex-1 px-8 py-3.5 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-500/20 active:scale-95">Save Draft</button>
                                        <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(order); }} className="flex-1 px-8 py-3.5 bg-gradient-to-r from-medical-600 to-teal-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:from-medical-700 hover:to-teal-600 transition-all shadow-2xl shadow-medical-500/30 active:scale-95 flex items-center justify-center gap-2"><Save size={16}/> Finalize & Print</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.65] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderPOTemplate(order, totals)}
                                </div>
                            </div>
                        )}
                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-6 sm:p-10 overflow-hidden animate-in fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                                    <div><h3 className="font-black text-slate-800 uppercase tracking-tight text-2xl">Medical Equipment Catalog</h3><p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Select products to include in the purchase order</p></div>
                                    <div className="relative w-full sm:w-80"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Filter inventory..." className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all shadow-sm" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} /></div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(prod => (
                                        <div key={prod.id} className="p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-medical-400 hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group shadow-sm" onClick={() => handleAddItem(prod)}>
                                            <div><div className="flex items-center gap-2 mb-3"><span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">{prod.category || 'N/A'}</span></div><h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-medical-700 transition-colors uppercase line-clamp-2">{prod.name}</h4><p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">SKU: {prod.sku || '---'}</p></div>
                                            <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4"><div><p className="text-[8px] font-black text-slate-400 uppercase">List Price</p><p className="text-base font-black text-slate-900 tracking-tight">₹{(prod.sellingPrice || 0).toLocaleString()}</p></div><div className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-medical-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} /></div></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
