import React, { useState, useEffect } from 'react';
import { DeliveryChallan, StockMovement } from '../types';
import { 
    Plus, Download, Search, Trash2, 
    Save, Edit, Eye, List as ListIcon, PenTool, 
    History, FileText, MoreVertical, Truck, Package, User, Info
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';
import { AutoSuggest } from './AutoSuggest';

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

export const DeliveryChallanModule: React.FC = () => {
    const { clients, products, deliveryChallans, addDeliveryChallan, updateDeliveryChallan, updateProduct, recordStockMovement, addNotification, currentUser, financialYear } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [challan, setChallan] = useState<Partial<DeliveryChallan>>({
        challanNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'Draft',
        customerName: '',
        customerAddress: '',
        terms: '1. Goods once sold will not be taken back.\n2. Our responsibility ceases as soon as the goods leave our premises.\n3. Recipient acknowledges condition of goods upon arrival.',
        remarks: '',
        subject: ''
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !challan.challanNumber) {
            const currentYearChallans = deliveryChallans.filter(c => c.challanNumber && c.challanNumber.includes(`/${financialYear}/`));
            const nextNum = currentYearChallans.length + 1;
            setChallan(prev => ({
                ...prev,
                challanNumber: `SM/DC/${financialYear}/${nextNum}`
            }));
        }
    }, [viewState, deliveryChallans, editingId, challan.challanNumber, financialYear]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleDownloadPDF = async (data: Partial<DeliveryChallan>) => {
        try {
            const blob = await PDFService.generateDeliveryChallanPDF(data as DeliveryChallan);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.challanNumber || 'DeliveryChallan'}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF", err);
            addNotification('Download Failed', 'Could not generate PDF file.', 'alert');
        }
    };

    const handleSave = async (status: 'Draft' | 'Dispatched') => {
        if (!challan.customerName || !challan.items?.length) {
            addNotification('Invalid Data', 'Please fill customer details and add items.', 'alert');
            return;
        }

        const finalData: DeliveryChallan = {
            ...challan as DeliveryChallan,
            id: editingId || `DC-${Date.now()}`,
            status: status,
            createdBy: currentUser?.name || 'System'
        };

        try {
            if (editingId) {
                await updateDeliveryChallan(editingId, finalData);
            } else {
                await addDeliveryChallan(finalData);
            }

            if (status === 'Dispatched') {
                for (const item of finalData.items) {
                    const product = products.find(p => p.name === item.description);
                    if (product) {
                        const newStock = Math.max(0, product.stock - item.quantity);
                        await updateProduct(product.id, { stock: newStock });
                        
                        const movement: StockMovement = {
                            id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            productId: product.id,
                            productName: product.name,
                            type: 'Out',
                            quantity: item.quantity,
                            date: finalData.date,
                            reference: finalData.challanNumber,
                            purpose: 'Sale'
                        };
                        await recordStockMovement(movement);
                    }
                }
            }

            setViewState('history');
            setEditingId(null);
            addNotification('Registry Updated', `Challan ${finalData.challanNumber} archived.`, 'success');
        } catch (err) {
            console.error("Save error:", err);
            addNotification('Save Failed', 'Could not persist data.', 'alert');
        }
    };

    const filteredCatalog = products.filter(p => 
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
        (p.category || '').toLowerCase().includes(catalogSearch.toLowerCase())
    );

    const handleAddItem = (p?: any) => {
        setChallan(prev => ({
            ...prev,
            items: [
                ...(prev.items || []),
                { 
                    id: `ITM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                    description: p?.name || '', 
                    quantity: 1, 
                    unit: p?.unit || 'Nos', 
                    remarks: '' 
                }
            ]
        }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const updateItem = (id: string, field: string, value: any) => {
        setChallan(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unit = masterProd.unit || 'Nos';
                        }
                    }
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setEditingId(null); setChallan({ challanNumber: '', date: new Date().toISOString().split('T')[0], items: [], status: 'Draft', customerName: '', customerAddress: '', terms: '1. Goods once sold will not be taken back.\n2. Our responsibility ceases as soon as the goods leave our premises.\n3. Recipient acknowledges condition of goods upon arrival.', remarks: '', subject: '' }); setViewState('builder'); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Challan</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Delivery Challan Archive</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Challan #</th>
                                    <th className="px-6 py-4">Consignee</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {deliveryChallans
                                    .sort((a, b) => (b.challanNumber || '').localeCompare(a.challanNumber || '', undefined, { numeric: true }))
                                    .map((c: any) => (
                                    <tr key={c.id} onClick={() => { setChallan(c); setEditingId(c.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0">
                                        <td className="px-6 py-4 font-black">{c.challanNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{c.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div title={c.createdBy || 'System'} className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200">
                                                {c.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${c.status === 'Dispatched' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === c.id ? null : c.id); }} className={`p-2 rounded-xl transition-all ${activeMenuId === c.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeMenuId === c.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px]">
                                                        <button onClick={(e) => { e.stopPropagation(); setChallan(c); setEditingId(c.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"><Edit size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(c); setActiveMenuId(null); }} className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex-1 flex justify-center"><Download size={18} /></button>
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
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Catalog</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-8 custom-scrollbar">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <FileText size={14} className="text-medical-500" />
                                            1. Registry Details
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="Challan No. *">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={challan.challanNumber || ''} onChange={e => setChallan({...challan, challanNumber: e.target.value})} placeholder="SM/DC-001" />
                                            </FormRow>
                                            <FormRow label="Date">
                                                <input type="date" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={challan.date || ''} onChange={e => setChallan({...challan, date: e.target.value})} />
                                            </FormRow>
                                            <div className="sm:col-span-2">
                                                <FormRow label="Subject / Purpose">
                                                    <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={challan.subject || ''} onChange={e => setChallan({...challan, subject: e.target.value})} placeholder="e.g. Service Exchange / Installation" />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <User size={14} className="text-medical-500" />
                                            2. Consignee Identity
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Customer Name *">
                                                    <AutoSuggest
                                                        value={challan.customerName || ''}
                                                        onChange={(val) => setChallan({ ...challan, customerName: val })}
                                                        onSelect={(client) => {
                                                            setChallan(prev => ({
                                                                ...prev,
                                                                customerName: client.hospital || client.name,
                                                                customerAddress: client.address || ''
                                                            }));
                                                        }}
                                                        suggestions={clients}
                                                        filterKey="hospital"
                                                        placeholder="Search client registry..."
                                                        className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                                                    />
                                                </FormRow>
                                                <FormRow label="Delivery Address">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none h-[100px] resize-none" value={challan.customerAddress || ''} onChange={e => setChallan({...challan, customerAddress: e.target.value})} placeholder="Detailed shipping address..." />
                                                </FormRow>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Terms & Conditions">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium text-slate-500 outline-none h-[180px] resize-none" value={challan.terms || ''} onChange={e => setChallan({...challan, terms: e.target.value})} placeholder="Legal terms..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div className="flex justify-between items-center border-b pb-1">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <Package size={14} className="text-medical-500" />
                                                3. Goods Manifest
                                            </h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setBuilderTab('catalog')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Store</button>
                                                <button onClick={() => handleAddItem()} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pb-24">
                                            {challan.items?.map((item, idx) => (
                                                <div key={item.id} className="group relative bg-slate-50 hover:bg-medical-50/20 p-4 rounded-xl border border-slate-200 hover:border-medical-300 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-medical-500 group-hover:text-white transition-all shrink-0 shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0 w-full">
                                                        <AutoSuggest
                                                            value={item.description || ''}
                                                            onChange={(val) => updateItem(item.id, 'description', val)}
                                                            onSelect={(prod) => {
                                                                updateItem(item.id, 'description', prod.name);
                                                                updateItem(item.id, 'unit', prod.unit || 'Nos');
                                                            }}
                                                            suggestions={products}
                                                            filterKey="name"
                                                            className="w-full bg-transparent font-black text-slate-800 outline-none uppercase placeholder:text-slate-300 text-sm h-[24px]"
                                                            placeholder="Select Part..."
                                                        />
                                                        <input 
                                                            value={item.remarks || ''}
                                                            onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                                                            placeholder="Serial Number / Batch No / Purpose"
                                                            className="w-full bg-transparent text-[10px] font-bold text-slate-400 outline-none mt-1 uppercase"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
                                                        <input 
                                                            type="number"
                                                            value={item.quantity || ''}
                                                            onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="w-10 bg-transparent text-center font-black text-medical-600 outline-none text-sm"
                                                        />
                                                        <input 
                                                            value={item.unit || ''}
                                                            onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                                            className="w-12 bg-transparent text-center font-black text-slate-400 outline-none text-[10px] border-l border-slate-100 pl-2 uppercase"
                                                            placeholder="Unit"
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => setChallan(prev => ({ ...prev, items: prev.items?.filter(it => it.id !== item.id) }))}
                                                        className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4 pb-20">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Info size={14} className="text-medical-500" />
                                            4. Additional Remarks
                                        </h3>
                                        <FormRow label="Internal Execution Remarks">
                                            <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none h-[80px] resize-none" value={challan.remarks || ''} onChange={e => setChallan({...challan, remarks: e.target.value})} placeholder="Internal notes (not visible on PDF)..." />
                                        </FormRow>
                                    </section>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                                    <button 
                                        onClick={() => { setViewState('history'); setEditingId(null); }}
                                        className="w-full sm:w-auto px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors order-2 sm:order-1"
                                    >
                                        Discard
                                    </button>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button 
                                            onClick={() => handleSave('Draft')}
                                            className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-500/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Save size={16} /> Save Draft
                                        </button>
                                        <button 
                                            onClick={() => handleSave('Dispatched')}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-medical-600 to-teal-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:from-medical-700 hover:to-teal-600 transition-all shadow-xl shadow-medical-500/30 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Truck size={16} /> Confirm & Dispatch
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="bg-white w-[800px] shadow-2xl p-12 space-y-8 font-sans leading-relaxed text-slate-800 border border-slate-200">
                                    <div className="text-center space-y-1">
                                        <h2 className="text-4xl font-black tracking-tighter">SREE MEDITEC</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Execution & Delivery Division</p>
                                    </div>
                                    <div className="flex justify-between items-start border-y-2 border-slate-100 py-6">
                                        <div className="max-w-[60%]">
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Consignee Identity</h4>
                                            <p className="font-black text-xl leading-tight uppercase text-slate-800">{challan.customerName || '---'}</p>
                                            <p className="text-xs font-bold text-slate-500 mt-2 uppercase whitespace-pre-wrap">{challan.customerAddress || '---'}</p>
                                        </div>
                                        <div className="text-right space-y-4">
                                            <div>
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Challan Ref</h4>
                                                <p className="font-black text-medical-600 text-lg">{challan.challanNumber || 'SM/DC/---'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Execution Date</h4>
                                                <p className="font-black text-slate-800">{formatDateDDMMYYYY(challan.date)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b pb-2">Manifest Specification</h4>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="py-2 text-left text-[10px] font-black uppercase text-slate-400 w-12">Item</th>
                                                    <th className="py-2 text-left text-[10px] font-black uppercase text-slate-400">Description</th>
                                                    <th className="py-2 text-right text-[10px] font-black uppercase text-slate-400 w-24">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {challan.items?.map((it, idx) => (
                                                    <tr key={it.id} className="border-b border-slate-50">
                                                        <td className="py-3 text-[11px] font-black text-slate-300">#{idx + 1}</td>
                                                        <td className="py-3">
                                                            <p className="font-black text-sm uppercase text-slate-800">{it.description}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{it.remarks}</p>
                                                        </td>
                                                        <td className="py-3 text-right font-black text-sm text-slate-700">
                                                            {it.quantity} <span className="text-[9px] text-slate-400 uppercase ml-1">{it.unit}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="pt-20 flex justify-between items-end">
                                        <div className="max-w-[50%] p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Terms & Conditions</h5>
                                            <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase whitespace-pre-wrap">{challan.terms}</p>
                                        </div>
                                        <div className="text-right space-y-12">
                                            <div className="w-48 h-px bg-slate-200 ml-auto" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Authorized Personnel</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-4 sm:p-8 overflow-hidden animate-in fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Stock Registry</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Select items for dispatch</p>
                                    </div>
                                    <div className="relative w-full sm:w-80">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Filter Catalog..." className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredCatalog.map(p => (
                                        <div key={p.id} className="p-5 bg-white border border-slate-300 rounded-[1.5rem] hover:border-medical-400 transition-all cursor-pointer flex flex-col justify-between group shadow-sm" onClick={() => handleAddItem(p)}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">{p.category || 'N/A'}</span>
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase ml-auto">{p.stock} IN STOCK</span>
                                                </div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-medical-700 transition-colors">{p.name}</h4>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">SKU: {p.sku || '---'}</p>
                                                <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-medical-600 group-hover:text-white transition-all">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
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