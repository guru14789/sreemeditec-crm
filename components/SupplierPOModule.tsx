import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem } from '../types';
import { 
    Plus, Search, Trash2, Save, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Building2, CreditCard, Package, Star, FileText, MoreVertical
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';
import { AutoSuggest } from './AutoSuggest';

const DEFAULT_DELIVERY_ADDRESS = 'Sreemeditec,\nNew No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.';

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

export const SupplierPOModule: React.FC = () => {
    const { vendors, products, invoices, addInvoice, updateInvoice, addNotification, currentUser, financialYear } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'spares'>('form');
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
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
        bankAndBranch: 'ICICI Bank, Br: Selaiyur',
        accountNo: '603705016939',
        paymentMethod: 'Bank Transfer',
        advanceAmount: 0,
        advanceDate: new Date().toISOString().split('T')[0],
        deliveryTime: 'Immediate',
        specialNote: '',
        documentType: 'SupplierPO',
        paymentTerms: 'Terms: 100% against delivery or as agreed.'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.invoiceNumber) {
            const currentYearPOs = invoices.filter(i => i.documentType === 'SupplierPO' && i.invoiceNumber && i.invoiceNumber.includes(`/${financialYear}/`));
            const nextNum = currentYearPOs.length + 1;
            setOrder(prev => ({
                ...prev,
                invoiceNumber: `SMPOC/${financialYear}/${nextNum}`
            }));
        }
    }, [viewState, editingId, invoices, financialYear, order.invoiceNumber]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const filteredSpares = useMemo(() => {
        const query = catalogSearch.toLowerCase();
        let list = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.sku || '').toLowerCase().includes(query) ||
            (p.category || '').toLowerCase().includes(query)
        );
        
        if (order.customerName) {
            const vendorMatch = list.filter(p => (p.supplier || '').toLowerCase() === order.customerName?.toLowerCase());
            const others = list.filter(p => (p.supplier || '').toLowerCase() !== order.customerName?.toLowerCase());
            return [...vendorMatch, ...others];
        }
        
        return list;
    }, [products, catalogSearch, order.customerName]);

    const handleVendorSelect = (vendor: any) => {
        setOrder(prev => ({
            ...prev,
            customerName: vendor.name,
            customerAddress: vendor.address || '',
            customerGstin: vendor.gstin || ''
        }));
        addNotification('Vendor Detected', `Linked ${vendor.name} to procurement order.`, 'success');
    };

    const handleDownloadPDF = async (data: Partial<Invoice>) => {
        try {
            const blob = await PDFService.generatePurchaseOrderPDF(data as Invoice, false);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.invoiceNumber || 'SupplierPO'}.pdf`;
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
            unitPrice: prod?.purchasePrice || 0,
            taxRate: prod?.taxRate || 18,
            amount: prod?.purchasePrice || 0,
            gstValue: (prod?.purchasePrice || 0) * ((prod?.taxRate || 18) / 100),
            priceWithGst: (prod?.purchasePrice || 0) * (1 + ((prod?.taxRate || 18) / 100))
        };
        setOrder(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'spares') setBuilderTab('form');
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setOrder(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.purchasePrice || 0;
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
            addNotification('Invalid Data', 'Fill vendor details and items.', 'alert');
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
        addNotification('Registry Updated', `Supplier PO ${finalData.invoiceNumber} saved.`, 'success');
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
                            const amt = item.quantity * (item.unitPrice || 0);
                            const tax = amt * ((item.taxRate || 0) / 100);
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
                        {Array.from({ length: Math.max(0, 5 - (data.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-black last:border-b-0 h-8">
                                <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                            </tr>
                        ))}
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
                            <td className="p-1.5 text-right font-black">Rs. {(totals.grandTotal || 0).toLocaleString()}</td>
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
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderTab('form'); setOrder({ date: new Date().toISOString().split('T')[0], cpoDate: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'SupplierPO', bankDetails: '33APGPS4675G2ZL', deliveryAddress: DEFAULT_DELIVERY_ADDRESS, advanceAmount: 0, discount: 0, deliveryTime: 'Immediate', specialNote: '', paymentTerms: 'Terms: 100% against delivery or as agreed.' }); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Procurement</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Procurement History</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">PO #</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-right">Grand Total</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices
                                    .filter(i => i.documentType === 'SupplierPO')
                                    .sort((a, b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true }))
                                    .map(inv => (
                                    <tr key={inv.id} onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 font-black">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div title={inv.createdBy || 'System'} className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200">
                                                {inv.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-teal-700">₹{(inv.grandTotal || 0).toLocaleString()}</td>
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
                        <button onClick={() => setBuilderTab('spares')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'spares' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Store</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-8 custom-scrollbar">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">1. Registry Details</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="SMPOC No. *">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={order.invoiceNumber || ''} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMPOC-001" />
                                            </FormRow>
                                            <FormRow label="Date">
                                                <input type="date" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.date || ''} onChange={e => setOrder({...order, date: e.target.value})} />
                                            </FormRow>
                                            <FormRow label="Vendor Ref">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.cpoNumber || ''} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="Ref-1234" />
                                            </FormRow>
                                            <FormRow label="Ref Date">
                                                <input type="date" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.cpoDate || ''} onChange={e => setOrder({...order, cpoDate: e.target.value})} />
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">2. Vendor & Delivery</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Vendor *">
                                                    <AutoSuggest
                                                        value={order.customerName || ''}
                                                        onChange={(val) => setOrder({ ...order, customerName: val })}
                                                        onSelect={handleVendorSelect}
                                                        suggestions={vendors}
                                                        filterKey="name"
                                                        placeholder="Search Vendor registry..."
                                                        className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                                                    />
                                                </FormRow>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormRow label="Vendor GST">
                                                        <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold outline-none" placeholder="Vendor GSTIN" value={order.customerGstin || ''} onChange={e => setOrder({...order, customerGstin: e.target.value})} />
                                                    </FormRow>
                                                    <FormRow label="Our GST">
                                                        <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold outline-none" placeholder="Billing GSTIN" value={order.bankDetails || ''} onChange={e => setOrder({...order, bankDetails: e.target.value})} />
                                                    </FormRow>
                                                </div>
                                                <FormRow label="Vendor Address">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[80px] resize-none" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Vendor location..." />
                                                </FormRow>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Delivery Destination">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[180px] resize-none" value={order.deliveryAddress || ''} onChange={e => setOrder({...order, deliveryAddress: e.target.value})} placeholder="Shipping address..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div className="flex justify-between items-center border-b pb-1">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">3. Order Manifest</h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setBuilderTab('spares')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Store</button>
                                                <button onClick={() => handleAddItem()} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pb-24">
                                            {order.items?.map((item, idx) => (
                                                <div key={item.id} className="group relative bg-slate-50 hover:bg-medical-50/20 p-4 rounded-xl border border-slate-200 hover:border-medical-300 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-medical-500 group-hover:text-white transition-all shrink-0 shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0 w-full">
                                                        <AutoSuggest
                                                            value={item.description || ''}
                                                            onChange={(val) => updateItem(item.id, 'description', val)}
                                                            onSelect={(prod) => {
                                                                setOrder(prev => {
                                                                    const updatedItems = (prev.items || []).map(it => {
                                                                        if (it.id === item.id) {
                                                                            return {
                                                                                ...it,
                                                                                description: prod.name,
                                                                                unitPrice: prod.purchasePrice || 0,
                                                                                taxRate: prod.taxRate || 18,
                                                                                hsn: prod.hsn || '',
                                                                                amount: it.quantity * (prod.purchasePrice || 0)
                                                                            };
                                                                        }
                                                                        return it;
                                                                    });
                                                                    return { ...prev, items: updatedItems };
                                                                });
                                                            }}
                                                            suggestions={products}
                                                            filterKey="name"
                                                            className="w-full bg-transparent font-black text-slate-800 outline-none uppercase placeholder:text-slate-300 text-sm h-[24px]"
                                                            placeholder="Select Part..."
                                                        />
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-medical-500 uppercase tracking-widest">HSN: {item.hsn || '---'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
                                                        <input 
                                                            type="number"
                                                            value={(item.quantity || '')}
                                                            onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                            className="w-10 bg-transparent text-center font-black text-medical-600 outline-none text-sm"
                                                        />
                                                        <span className="text-[9px] font-black text-slate-300">×</span>
                                                        <input 
                                                            type="number"
                                                            value={(item.unitPrice || '')}
                                                            onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                            className="w-20 bg-transparent font-black text-slate-700 outline-none text-sm"
                                                        />
                                                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                                            <input 
                                                                type="number"
                                                                value={(item.taxRate || '')}
                                                                onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))}
                                                                className="w-8 bg-transparent text-center font-black text-emerald-600 outline-none text-xs"
                                                            />
                                                            <span className="text-[9px] font-black text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => setOrder(prev => ({ ...prev, items: prev.items?.filter(it => it.id !== item.id) }))}
                                                        className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all self-end sm:self-center"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4 pb-20">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">4. Terms & Instructions</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="Delivery Time">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.deliveryTime || 'Immediate'} onChange={e => setOrder({...order, deliveryTime: e.target.value})} placeholder="Immediate / 1 Week" />
                                            </FormRow>
                                            <FormRow label="Payment Terms">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.paymentTerms || ''} onChange={e => setOrder({...order, paymentTerms: e.target.value})} placeholder="Terms: 100% against delivery" />
                                            </FormRow>
                                            <div className="sm:col-span-2">
                                                <FormRow label="Special Instructions">
                                                    <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={order.specialNote || ''} onChange={e => setOrder({...order, specialNote: e.target.value})} placeholder="Packing / supply notes..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                                    <div className="flex-1 flex items-center justify-between px-2 order-2 sm:order-1">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Grand Total</span>
                                            <span className="text-xl font-black text-teal-600">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <button 
                                            onClick={() => { setViewState('history'); setEditingId(null); }}
                                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button 
                                            onClick={() => handleSave('Draft')}
                                            className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-500/20 active:scale-95"
                                        >
                                            Save Draft
                                        </button>
                                        <button 
                                            onClick={() => { handleSave('Finalized'); handleDownloadPDF(order); }}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-medical-600 to-teal-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:from-medical-700 hover:to-teal-600 transition-all shadow-xl shadow-medical-500/30 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Finalize & Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderPOTemplate(order, totals)}
                                </div>
                            </div>
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
                                        <input type="text" placeholder="Filter Store..." className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                
                                {order.customerName && (
                                    <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-indigo-700">
                                        <Star size={18} fill="currentColor" className="text-indigo-400 shrink-0" />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Prioritizing products indexed for "{order.customerName}"</span>
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    {filteredSpares.map(prod => {
                                        const isVendorMatch = (prod.supplier || '').toLowerCase() === order.customerName?.toLowerCase();
                                        return (
                                            <div key={prod.id} 
                                                 className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                                                     isVendorMatch 
                                                     ? 'bg-indigo-50/20 border-indigo-200 shadow-md ring-1 ring-indigo-100' 
                                                     : 'bg-white border-slate-300 hover:border-medical-400 shadow-sm'
                                                 }`} 
                                                 onClick={() => handleAddItem(prod)}>
                                                {isVendorMatch && <div className="absolute top-0 right-0 p-2 bg-indigo-600 text-white rounded-bl-2xl"><Star size={12} fill="currentColor" /></div>}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${isVendorMatch ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>{prod.category || 'N/A'}</span>
                                                        <span className="text-[9px] font-mono text-slate-400 tracking-tighter uppercase">{prod.sku || 'N/A'}</span>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-medical-700 transition-colors">{prod.name}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase truncate">{prod.supplier || 'N/A Supplier'}</p>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Buy Rate</p>
                                                        <p className="text-sm font-black text-slate-800 tracking-tight">₹{(prod.purchasePrice || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className={`p-2 rounded-xl border shadow-sm transition-all group-hover:scale-110 ${isVendorMatch ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-medical-600 border-slate-300 group-hover:bg-medical-600 group-hover:text-white'}`}>
                                                        <Plus size={20} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
