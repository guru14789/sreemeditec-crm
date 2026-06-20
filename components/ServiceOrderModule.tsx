import { ToggleSwitch } from './ToggleSwitch';
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem, Client, Product, TabView } from '../types';
import { 
    Plus, Search, Trash2, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Wrench, MoreVertical, Package, User, MapPin, AlertCircle
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';
import { AutoSuggest } from './AutoSuggest';
import { FiledStatusIndicator } from './FiledStatusIndicator';

const calculateDetailedTotals = (order: Partial<Invoice>) => {
    const items = order.items || [];
    const subTotal = items.reduce((sum, p) => sum + (Number(p.quantity || 0) * (p.unitPrice || 0)), 0);
    const taxTotal = items.reduce((sum, p) => {
        const itemAmount = Number(p.quantity || 0) * (p.unitPrice || 0);
        return sum + (itemAmount * ((p.taxRate || 0) / 100));
    }, 0);
    const totalWithGst = subTotal + taxTotal;
    const discount = order.discount || 0;
    const grandTotalRaw = totalWithGst - discount;
    let roundOff = 0;
    let grandTotal = grandTotalRaw;
    if (order.isRoundOff) {
        grandTotal = Math.round(grandTotalRaw);
        roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    }
    return { subTotal, taxTotal, totalWithGst, discount, grandTotal, roundOff, grandTotalRaw };
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

export const ServiceOrderModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, removeInvoice, addNotification, currentUser, financialYear, isSystemAdmin, setPendingServiceReportData, setActiveTab, showConfirm, previewPDF } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'spares'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [filingFilter, setFilingFilter] = useState<'All' | 'Filed' | 'Not Filed' | 'Not Updated'>('All');
    const [searchQuery, setSearchQuery] = useState('');

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
        phone: '',
        equipmentName: '',
        model: '',
        serialNumber: '',
        machineStatus: 'Warranty',
        department: '',
        machineLocation: '',
        engineerName: '',
        problemReported: '',
        visitType: 'Breakdown',
        priority: 'Medium',
        expectedResolutionDate: new Date().toISOString().split('T')[0],
        documentType: 'ServiceOrder'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.invoiceNumber) {
            const currentYearSOs = invoices.filter(i => i.documentType === 'ServiceOrder' && i.invoiceNumber && i.invoiceNumber.includes(`/${financialYear}/`));
            const nextNum = currentYearSOs.length + 1;
            setOrder(prev => ({
                ...prev,
                invoiceNumber: `SMCSO/${financialYear}/${nextNum}`
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
        return products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.sku || '').toLowerCase().includes(query)
        );
    }, [products, catalogSearch]);

    const handleClientSelect = (client: Client) => {
        setOrder(prev => ({
            ...prev,
            customerName: client.name,
            customerHospital: client.hospital || client.name || '',
            customerAddress: client.address || '',
            customerGstin: client.gstin || '',
            phone: client.phone || ''
        }));
    };

    const handleDownloadPDF = async (data: Partial<Invoice>) => {
        try {
            const blob = await PDFService.generateServiceOrderPDF(data as Invoice);
            previewPDF(blob, `${data.invoiceNumber || 'ServiceOrder'}.pdf`);
        } catch (err) {
            console.error(err);
            addNotification('Error', 'Failed to generate Service Order PDF.', 'alert');
        }
    };

    const handleAddItem = (prod?: Product, index?: number) => {
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
        setOrder(prev => {
            const current = prev.items || [];
            const idx = index ?? current.length;
            return { ...prev, items: [...current.slice(0, idx), newItem, ...current.slice(idx)] };
        });
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
                            updated.unitPrice = masterProd.sellingPrice || 0;
                            updated.taxRate = masterProd.taxRate || 18;
                            updated.hsn = masterProd.hsn || '';
                        }
                    }
                    updated.amount = Number(updated.quantity || 0) * (updated.unitPrice || 0);
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const handleSave = async (status: 'Draft' | 'Finalized') => {
        if (!order.customerHospital || !order.equipmentName) {
            addNotification('Missing Info', 'Customer and Equipment details are mandatory.', 'alert');
            return null;
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

        try {
            if (editingId) await updateInvoice(editingId, finalData);
            else await addInvoice(finalData);

            setViewState('history');
            setEditingId(null);
            addNotification('Order Archived', `Service Order ${finalData.invoiceNumber} recorded.`, 'success');
            return finalData;
        } catch (error) {
            console.error('Failed to save service order:', error);
            addNotification('Error', 'Failed to save the service order to the registry.', 'error');
            return null;
        }
    };

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    const renderServiceTemplate = (data: Partial<Invoice>, totals: any) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col mx-auto" style={{ fontFamily: '"Arial", sans-serif', fontSize: '11px' }}>
            <div className="text-center mb-4">
                <h1 className="text-4xl font-playfair font-bold tracking-tight uppercase mb-1">SREE MEDITEC</h1>
                <p className="text-[10px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[10px] font-bold">Mob: 9884818398 / 7200025642 | Email: sreemeditec@gmail.com</p>
            </div>
            <div className="border border-black text-center py-1.5 font-bold mb-0">SERVICE ORDER</div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">ORDER NO: {data.invoiceNumber}</div>
                <div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.date)}</div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">VISIT TYPE: {data.visitType || '---'}</div>
                <div className="p-1.5 font-bold">PRIORITY: {data.priority || '---'}</div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold uppercase">Due Date: {formatDateDDMMYYYY(data.expectedResolutionDate)}</div>
                <div className="p-1.5 font-bold uppercase">Status: {data.status || '---'}</div>
            </div>
            
            <div className="grid grid-cols-2 border-x border-b border-black min-h-[80px]">
                <div className="border-r border-black p-2 space-y-1">
                    <p className="font-bold underline mb-1 uppercase">Customer Details:</p>
                    <p className="font-black text-sm uppercase leading-tight">{data.customerHospital || '---'}</p>
                    <p className="font-bold uppercase text-[10px]">{data.customerName}</p>
                    <p className="whitespace-pre-wrap leading-tight text-[10px] text-slate-700">{data.customerAddress}</p>
                    <p className="font-bold">GST: {data.customerGstin}</p>
                    <p className="font-bold">Phone: {data.phone}</p>
                </div>
                <div className="p-2 space-y-1">
                    <p className="font-bold underline mb-1 uppercase">Equipment Blueprint:</p>
                    <p className="font-black text-sm uppercase leading-tight">{data.equipmentName || '---'}</p>
                    <div className="grid grid-cols-2 text-[10px]">
                        <span>Model: <span className="font-bold">{data.model || '---'}</span></span>
                        <span>S/N: <span className="font-bold">{data.serialNumber || '---'}</span></span>
                        <span>Dept: <span className="font-bold">{data.department || '---'}</span></span>
                        <span>Loc: <span className="font-bold">{data.machineLocation || '---'}</span></span>
                    </div>
                    <p className="font-bold mt-2">Status: <span className="uppercase">{data.machineStatus}</span></p>
                    <p className="font-bold">Assigned: {data.engineerName}</p>
                    <p className="font-bold italic text-rose-600 mt-1">Problem: {data.problemReported}</p>
                </div>
            </div>

            <div className="border-x border-black text-center py-1 font-bold bg-slate-50 uppercase tracking-widest text-[10px]">Order Itemization (Spares & Service)</div>
            <div className="border border-black">
                <table className="w-full border-collapse text-[10px]">
                    <thead>
                        <tr className="border-b border-black font-bold bg-slate-50">
                            <th className="border-r border-black p-1 w-10 text-center">Sl no.</th>
                            <th className="border-r border-black p-1 text-center">Description / Spares</th>
                            <th className="border-r border-black p-1 w-10 text-center">Qty</th>
                            <th className="border-r border-black p-1 w-20 text-center">Rate</th>
                            <th className="border-r border-black p-1 w-20 text-center">Taxable</th>
                            <th className="border-r border-black p-1 w-12 text-center">Gst %</th>
                            <th className="border-r border-black p-1 w-20 text-center">Gst value</th>
                            <th className="p-1 w-24 text-center">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.items || []).map((item, idx) => {
                            const amt = Number(item.quantity || 0) * (item.unitPrice || 0);
                            const tax = amt * ((item.taxRate || 0) / 100);
                            return (
                                <tr key={idx} className="border-b border-black last:border-b-0 h-8">
                                    <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border-r border-black p-1 font-bold">{item.description}</td>
                                    <td className="border-r border-black p-1 text-center">{item.quantity || ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? (item.unitPrice || 0).toLocaleString('en-IN') : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? amt.toLocaleString('en-IN') : ''}</td>
                                    <td className="border-r border-black p-1 text-center">{item.quantity ? `${item.taxRate}%` : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? tax.toLocaleString('en-IN') : ''}</td>
                                    <td className="p-1 text-right font-black">{item.quantity ? (amt + tax).toLocaleString('en-IN') : ''}</td>
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
                            <td colSpan={7} className="border-r border-black p-1 text-right">Sub-Total (Before Discount)</td>
                            <td className="p-1 text-right font-black">{(totals.totalWithGst || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right text-rose-600">Adjustments / Discount</td>
                            <td className="p-1 text-right text-rose-600">{(data.discount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                        {data.isRoundOff && totals.roundOff !== 0 && (
                            <tr className="border-t border-black font-bold">
                                <td colSpan={7} className="border-r border-black p-1 text-right">Round Off</td>
                                <td className="p-1 text-right">{totals.roundOff > 0 ? '+' : ''}{totals.roundOff}</td>
                            </tr>
                        )}
                        <tr className="border-t border-black font-black bg-slate-50 text-xs">
                            <td colSpan={7} className="border-r border-black p-1.5 text-right uppercase tracking-widest">Grand Total (Net Amount)</td>
                            <td className="p-1.5 text-right font-black">Rs. {(totals.grandTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black flex-1 min-h-[120px]">
                <div className="border-r border-black p-3 flex flex-col justify-between">
                    <div>
                        <p className="font-black underline mb-2 uppercase text-[9px]">Official Declaration:</p>
                        <p className="text-[9px] leading-relaxed italic text-slate-600">We declare that this service order records the actual spares used and labor performed for the equipment mentioned. All particulars are true and correct.</p>
                    </div>
                    <div className="mt-8 border-t border-dotted border-black pt-1 w-3/4 text-[9px] font-bold">Customer Seal & Signature</div>
                </div>
                <div className="p-3 flex flex-col justify-between text-right">
                    <div>
                        <p className="font-black text-[10px]">for SREE MEDITEC</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Medical Engineering Division</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="w-32 h-12 mb-2 bg-slate-50/50 border border-slate-100 rounded-lg flex items-center justify-center text-[8px] text-slate-300 italic uppercase tracking-tighter">Seal / Signature</div>
                        <p className="font-black border-t border-black w-fit pt-1 text-[9px] uppercase tracking-widest">Authorised Personnel</p>
                    </div>
                </div>
            </div>
            <p className="text-center text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-[0.3em]">This is a Computer Generated Service Order Registry</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit shrink-0 flex gap-1">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-2 ${viewState === 'history'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setOrder({ invoiceNumber: '', date: new Date().toISOString().split('T')[0], items: [], discount: 0, status: 'Pending', customerName: '', customerHospital: '', customerAddress: '', customerGstin: '', phone: '', equipmentName: '', model: '', serialNumber: '', machineStatus: 'Warranty', department: '', machineLocation: '', engineerName: '', problemReported: '', visitType: 'Breakdown', priority: 'Medium', expectedResolutionDate: new Date().toISOString().split('T')[0], documentType: 'ServiceOrder', isRoundOff: false }); setBuilderTab('form'); }} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-2 ${viewState === 'builder'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><PenTool size={16} /> New Job Card</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Service Order History</h3>
                        <div className="flex items-center gap-2">
                            <select 
                                value={filingFilter}
                                onChange={(e) => setFilingFilter(e.target.value as any)}
                                className="bg-white border border-slate-300 rounded-[2rem] text-[10px] font-bold px-3 py-2 outline-none cursor-pointer focus:ring-4 focus:ring-medical-500/5 uppercase"
                            >
                                <option value="All">All Filing</option>
                                <option value="Filed">Filed</option>
                                <option value="Not Filed">Not Filed</option>
                                <option value="Not Updated">Not Updated</option>
                            </select>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search service orders..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-[2rem] text-[10px] font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase placeholder:normal-case"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-4 py-2 font-inter">Order #</th>
                                    <th className="px-4 py-2">Institution</th>
                                    <th className="px-4 py-2">Machine</th>
                                    <th className="px-4 py-2 text-right">Value</th>
                                    <th className="px-4 py-2 text-center">Filed Status</th>
                                    <th className="px-4 py-2 text-center">Priority</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices
                                    .filter(i => i.documentType === 'ServiceOrder')
                                    .filter(i => {
                                        if (!searchQuery) return true;
                                        const query = searchQuery.toLowerCase();
                                        return (
                                            (i.invoiceNumber || '').toLowerCase().includes(query) ||
                                            (i.customerHospital || '').toLowerCase().includes(query) ||
                                            (i.equipmentName || '').toLowerCase().includes(query) ||
                                            (i.model || '').toLowerCase().includes(query)
                                        );
                                    })
                                    .filter(i => {
                                        if (filingFilter === 'All') return true;
                                        if (filingFilter === 'Not Updated') return !i.filedStatus || i.filedStatus === 'Not Updated';
                                        return i.filedStatus === filingFilter;
                                    })
                                    .sort((a, b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true }))
                                    .map(inv => (
                                    <tr key={inv.id} onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                        <td className="px-4 py-2 font-black"><span className="font-inter font-bold tracking-widest">{inv.invoiceNumber}</span></td>
                                        <td className="px-4 py-2 font-bold text-slate-700 uppercase">{inv.customerHospital}</td>
                                        <td className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{inv.equipmentName} ({inv.model})</td>
                                        <td className="px-4 py-2 text-right font-black text-teal-700">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <FiledStatusIndicator 
                                                id={inv.id}
                                                filedStatus={inv.filedStatus}
                                                filedHistory={inv.filedHistory}
                                                currentUser={currentUser?.name || 'System'}
                                                onUpdate={async (docId, updates) => {
                                                    await updateInvoice(docId, updates);
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inv.priority === 'Urgent' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{inv.priority}</span></td>
                                        <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className={`relative flex justify-end ${activeMenuId === inv.id ? 'z-50' : 'z-0'}`}>
                                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === inv.id ? null : inv.id); }} className={`p-2 rounded-[2rem] transition-all ${activeMenuId === inv.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeMenuId === inv.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-[2rem] p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px]">
                                                        <button title="Generate Service Report" onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPendingServiceReportData({
                                                                customerName: inv.customerName,
                                                                customerHospital: inv.customerHospital,
                                                                customerAddress: inv.customerAddress,
                                                                phone: inv.phone,
                                                                equipmentName: inv.equipmentName,
                                                                model: inv.model,
                                                                serialNumber: inv.serialNumber,
                                                                department: inv.department,
                                                                engineerName: inv.engineerName,
                                                                problemReported: inv.problemReported,
                                                                visitType: inv.visitType,
                                                                referenceOrderNumber: inv.invoiceNumber,
                                                                referenceOrderId: inv.id
                                                            });
                                                            setActiveTab(TabView.SERVICE_REPORTS);
                                                            setActiveMenuId(null);
                                                        }} className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-[2rem] transition-all flex-1 flex justify-center"><Wrench size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-[2rem] transition-all flex-1 flex justify-center"><Edit size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); setActiveMenuId(null); }} className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-[2rem] transition-all flex-1 flex justify-center"><Download size={18} /></button>
                                                        {isSystemAdmin && (
                                                            <button onClick={async (e) => { e.stopPropagation(); const confirmed = await showConfirm('Are you sure you want to delete this record?'); if (confirmed) { await removeInvoice(inv.id); addNotification('Record Deleted', 'The service record has been removed.', 'success'); } setActiveMenuId(null); }} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-all flex-1 flex justify-center"><Trash2 size={18} /></button>
                                                        )}
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
                    <div className="bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner flex gap-1 shrink-0 m-6">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><PenTool size={18}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><Eye size={18}/> Print Layout</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 custom-scrollbar">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">1. Registry Metrics</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="SMCSO No. *">
                                                <input type="text" className="w-full h-[36px] bg-slate-50 border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-black outline-none" value={order.invoiceNumber || ''} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMCSO-001" />
                                            </FormRow>
                                            <FormRow label="Date">
                                                <input type="date" className="w-full h-[36px] bg-slate-50 border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.date || ''} onChange={e => setOrder({...order, date: e.target.value})} />
                                            </FormRow>
                                            <FormRow label="Visit Type">
                                                <select className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none appearance-none" value={order.visitType} onChange={e => setOrder({...order, visitType: e.target.value})}><option value="Breakdown">Breakdown</option><option value="AMC / PM">AMC / PM</option><option value="Installation">Installation</option><option value="Demo">Demo</option></select>
                                            </FormRow>
                                            <FormRow label="Priority">
                                                <select className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none appearance-none" value={order.priority} onChange={e => setOrder({...order, priority: e.target.value as 'Urgent' | 'High' | 'Medium' | 'Low'})}><option value="Urgent">Urgent</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">2. Client Index</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-1 p-5 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                                                <FormRow label="Search Client *">
                                                    <AutoSuggest
                                                        value={order.customerHospital || ''}
                                                        onChange={(val) => setOrder({ ...order, customerHospital: val })}
                                                        onSelect={handleClientSelect}
                                                        suggestions={clients}
                                                        filterKey="hospital"
                                                        placeholder="Search Hospital registry..."
                                                        className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none"
                                                    />
                                                </FormRow>
                                                <FormRow label="Contact Person">
                                                    <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-bold outline-none" value={order.customerName || ''} onChange={e => setOrder({...order, customerName: e.target.value})} />
                                                </FormRow>
                                                <FormRow label="Phone Index">
                                                    <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-bold outline-none" value={order.phone || ''} onChange={e => setOrder({...order, phone: e.target.value})} />
                                                </FormRow>
                                            </div>
                                            <div className="md:col-span-2 p-5 bg-slate-50 rounded-[2rem] border border-slate-200">
                                                <FormRow label="Institution Address">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-medium outline-none h-[180px] resize-none" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Location details..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">3. Machine Engineering Blueprint</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <FormRow label="Instrument Name *"><input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.equipmentName} onChange={e => setOrder({...order, equipmentName: e.target.value})} /></FormRow>
                                            <FormRow label="Model Identifier"><input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.model} onChange={e => setOrder({...order, model: e.target.value})} /></FormRow>
                                            <FormRow label="Serial Number (S/N)"><input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.serialNumber} onChange={e => setOrder({...order, serialNumber: e.target.value})} /></FormRow>
                                            <FormRow label="Machine Status">
                                                <select className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none appearance-none" value={order.machineStatus} onChange={e => setOrder({...order, machineStatus: e.target.value})}><option value="Warranty">Warranty</option><option value="AMC / PM">AMC / PM</option><option value="Out of Warranty">Out of Warranty</option></select>
                                            </FormRow>
                                            <FormRow label="Department"><input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.department} onChange={e => setOrder({...order, department: e.target.value})} /></FormRow>
                                            <FormRow label="Internal Location"><input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.machineLocation} onChange={e => setOrder({...order, machineLocation: e.target.value})} /></FormRow>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                            <FormRow label="Problem Reported"><textarea className="w-full bg-rose-50/20 border border-rose-100 rounded-[2rem] px-3 py-1.5 text-xs font-bold outline-none h-[80px] resize-none text-rose-700" value={order.problemReported} onChange={e => setOrder({...order, problemReported: e.target.value})} /></FormRow>
                                            <FormRow label="Assigned Engineer"><input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.engineerName} onChange={e => setOrder({...order, engineerName: e.target.value})} /></FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-2">
                                        <div className="border-b pb-1">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">4. Spares & Service Manifest</h3>
                                        </div>
                                        <div className="space-y-3 pb-24">
                                            {(order.items || []).length > 0 ? (order.items || []).map((item, idx) => (
                                                <div key={item.id} className="group space-y-3">
                                                    <div className="relative bg-slate-50 hover:bg-medical-50/20 p-4 rounded-[2rem] border border-slate-200 hover:border-medical-300 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 shadow-sm">{idx + 1}</div>
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
                                                                                    unitPrice: prod.sellingPrice || 0,
                                                                                    taxRate: prod.taxRate || 18,
                                                                                    hsn: prod.hsn || '',
                                                                                    amount: it.quantity * (prod.sellingPrice || 0)
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
                                                                placeholder="Select Part / Service..."
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
                                                            <input type="number" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} className="w-10 bg-transparent text-center font-black text-medical-600 outline-none text-sm" />
                                                            <span className="text-[9px] font-black text-slate-300">×</span>
                                                            <input type="number" value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} className="w-20 bg-transparent font-black text-slate-700 outline-none text-sm" />
                                                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                                                <input type="number" value={item.taxRate || ''} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} className="w-8 bg-transparent text-center font-black text-emerald-600 outline-none text-xs" />
                                                                <span className="text-[9px] font-black text-slate-400">%</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setOrder(prev => ({ ...prev, items: prev.items?.filter(it => it.id !== item.id) }))} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                                    </div>
                                                    <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setBuilderTab('spares')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Inventory</button>
                                                            <button onClick={() => handleAddItem(undefined, idx + 1)} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setBuilderTab('spares')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Inventory</button>
                                                    <button onClick={() => handleAddItem()} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-lg z-20 shrink-0">
                                    <div className="flex-1 flex items-center justify-between px-2 order-2 sm:order-1">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Job Value</span>
                                                {order.isRoundOff && totals.roundOff !== 0 && (
                                                    <span className={`text-[10px] font-bold ${totals.roundOff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        ({totals.roundOff > 0 ? '+' : ''}{totals.roundOff})
                                                    </span>
                                                )}
                                            </div>
 <span className="text-xl font-bold tracking-tight text-teal-600">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-[2rem] border border-slate-200 hover:bg-slate-200/60 transition-all cursor-pointer group h-[32px] select-none">
                                                <ToggleSwitch checked={!!order.isRoundOff} onChange={() => setOrder(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))} />
                                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">Round Off</span>
                                            </div>
                                            <button onClick={() => { setViewState('history'); setEditingId(null); }} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Abort</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button onClick={() => handleSave('Draft')} className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-500/20 active:scale-95">Save Draft</button>
                                        <button onClick={async () => { const finalized = await handleSave('Finalized'); if (finalized) handleDownloadPDF(finalized); }} className="flex-1 px-6 py-3 bg-medical-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-medical-700 transition-all shadow-xl shadow-medical-500/30 active:scale-95 flex items-center justify-center gap-2"><Download size={18} /> Finalize & PDF</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderServiceTemplate(order, totals)}
                                </div>
                            </div>
                        )}
                        {builderTab === 'spares' && (
                            <div className="h-full bg-white flex flex-col p-4 sm:p-8 overflow-hidden animate-in fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                                    <div><h3 className="font-black text-slate-800 uppercase tracking-tight text-lg sm:text-xl">Spares Registry</h3><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Select items for service job</p></div>
                                    <div className="relative w-full sm:w-80"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Filter Spares..." className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} /></div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    {filteredSpares.map(prod => (
                                        <div key={prod.id} className="p-5 rounded-[1.5rem] border bg-white border-slate-300 hover:border-medical-400 shadow-sm transition-all cursor-pointer flex flex-col justify-between group" onClick={() => handleAddItem(prod)}>
                                            <div className="flex-1"><div className="flex items-center gap-2 mb-2"><span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border bg-slate-100 text-slate-500 border-slate-300">{prod.category || 'N/A'}</span></div><h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-medical-700 transition-colors">{prod.name}</h4></div>
                                            <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-4"><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Rate</p><p className="text-sm font-black text-slate-800 tracking-tight">₹{(prod.sellingPrice || 0).toLocaleString('en-IN')}</p></div><div className="p-2 rounded-[2rem] bg-white text-medical-600 border border-slate-300 group-hover:bg-medical-600 group-hover:text-white transition-all"><Plus size={20} /></div></div>
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
