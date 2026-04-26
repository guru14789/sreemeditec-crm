import React, { useState, useEffect } from 'react';
import { DeliveryChallan, StockMovement } from '../types';
import { 
    Plus, Download, Search, Trash2, 
    Save, Edit, Eye, List as ListIcon, PenTool, 
    History, FileText, MoreVertical, Truck, Package, User, Info
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';
import { jsPDF } from 'jspdf';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

export const DeliveryChallanModule: React.FC = () => {
    const { clients, products, deliveryChallans, addDeliveryChallan, updateDeliveryChallan, updateProduct, recordStockMovement, addNotification, financialYear } = useData();
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
        customerAddress: '',
        terms: '1. Goods once sold will not be taken back.\n2. Our responsibility ceases as soon as the goods leave our premises.\n3. Recipient acknowledges condition of goods upon arrival.',
        remarks: ''
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
            const blob = await PDFService.generateDeliveryChallanPDF(data);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.challanNumber || 'DeliveryChallan'}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF", err);
            alert("Error generating PDF.");
        }
    };

    const handleSave = async (status: 'Draft' | 'Dispatched') => {
        if (!challan.customerName || !challan.items?.length) {
            alert("Please fill customer details and add at least one item.");
            return;
        }

        const finalData: DeliveryChallan = {
            ...challan as DeliveryChallan,
            id: editingId || `DC-${Date.now()}`,
            status: status
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
        p.category.toLowerCase().includes(catalogSearch.toLowerCase())
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
        if (builderTab !== 'form') setBuilderTab('form');
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

    const onSelectItem = (p: any) => {
        handleAddItem(p);
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button 
                    onClick={() => setViewState('history')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={16} /> Registry
                </button>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setChallan({
                            challanNumber: '',
                            date: new Date().toISOString().split('T')[0],
                            items: [],
                            status: 'Draft',
                            customerName: '',
                            customerAddress: '',
                            terms: '1. Goods once sold will not be taken back.\n2. Our responsibility ceases as soon as the goods leave our premises.\n3. Recipient acknowledges condition of goods upon arrival.',
                            remarks: ''
                        });
                        setViewState('builder');
                    }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <PenTool size={16} /> New Challan
                </button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Delivery Challan Archive</h3>
                        <span className="px-3 py-1 bg-medical-50 text-medical-700 rounded-full text-[10px] font-black">
                            Total: {deliveryChallans.length}
                        </span>
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
                                {deliveryChallans.length > 0 ? deliveryChallans.map((c: any) => (
                                    <tr key={c.id} onClick={() => { setChallan(c); setEditingId(c.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0">
                                        <td className="px-6 py-4 font-black">{c.challanNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{c.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div 
                                                title={c.createdBy || 'System'}
                                                className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200 cursor-help"
                                            >
                                                {c.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${c.status === 'Dispatched' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveMenuId(activeMenuId === c.id ? null : c.id); 
                                                    }} 
                                                    className={`p-2 rounded-xl transition-all ${activeMenuId === c.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {activeMenuId === c.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px] border-slate-300">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setChallan(c); setEditingId(c.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Edit Challan"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(c); setActiveMenuId(null); }} 
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
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">
                                            No challans found in registry
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-300 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap transition-all ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><PenTool size={18}/> Form Builder</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap transition-all ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><ListIcon size={18}/> Catalog Selection</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap transition-all ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><Eye size={18}/> Visual Preview</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 space-y-12 custom-scrollbar bg-white">
                                <div className="max-w-5xl mx-auto space-y-12">
                                    {/* Section 1: Client & Logistics */}
                                    <section className="space-y-6">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><User size={14}/></div>
                                            Consignee Data
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Client Name</label>
                                                <input 
                                                    list="client-list"
                                                    value={challan.customerName}
                                                    onChange={e => {
                                                        const name = e.target.value;
                                                        const client = clients.find(c => c.hospital === name || c.name === name);
                                                        setChallan(prev => ({ 
                                                            ...prev, 
                                                            customerName: name,
                                                            customerAddress: client?.address || prev.customerAddress 
                                                        }));
                                                    }}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 uppercase shadow-sm"
                                                    placeholder="Search client registry..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Destination</label>
                                                <textarea 
                                                    value={challan.customerAddress}
                                                    onChange={e => setChallan(prev => ({ ...prev, customerAddress: e.target.value }))}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 min-h-[100px] shadow-sm"
                                                    placeholder="Detailed address..."
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Document Info */}
                                    <section className="space-y-6">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                                            <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><Info size={14}/></div>
                                            Challan Metadata
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Date</label>
                                                <input 
                                                    type="date"
                                                    value={challan.date}
                                                    onChange={e => setChallan(prev => ({ ...prev, date: e.target.value }))}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Challan Registry ID</label>
                                                <input 
                                                    value={challan.challanNumber}
                                                    onChange={e => setChallan(prev => ({ ...prev, challanNumber: e.target.value }))}
                                                    className="w-full px-5 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl font-black text-indigo-600 outline-none shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject / Purpose</label>
                                                <input 
                                                    value={challan.subject || ''}
                                                    onChange={e => setChallan(prev => ({ ...prev, subject: e.target.value }))}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="e.g. Service Exchange"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 3: Goods Manifest */}
                                    <section className="space-y-6">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><Package size={14}/></div>
                                                Goods Manifest
                                            </h3>
                                            <div className="flex gap-2 scale-90 origin-right">
                                                <button 
                                                    onClick={() => handleAddItem()}
                                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                                >
                                                    <Plus className="w-3 h-3" /> Manual Row
                                                </button>
                                                <button 
                                                    onClick={() => setBuilderTab('catalog')}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                                                >
                                                    <ListIcon className="w-3 h-3" /> From Catalog
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 px-2">
                                            {challan.items?.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 gap-4">
                                                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-inner"><Plus className="w-6 h-6 opacity-20" /></div>
                                                    <p className="font-bold uppercase tracking-widest text-[10px] text-center">Manifest is empty<br/><span className="text-[10px] opacity-50">Add items to begin delivery</span></p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {challan.items?.map((item, idx) => (
                                                        <div key={item.id} className="group relative bg-white hover:bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200 hover:border-indigo-300 transition-all shadow-sm flex items-center gap-6">
                                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <input 
                                                                    list="product-list"
                                                                    value={item.description}
                                                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                                    className="w-full bg-transparent font-black text-slate-800 outline-none uppercase placeholder:text-slate-300 text-sm"
                                                                    placeholder="Describe goods..."
                                                                />
                                                                <input 
                                                                    value={item.remarks || ''}
                                                                    onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                                                                    placeholder="Add serial numbers or specifications..."
                                                                    className="w-full bg-transparent text-[10px] font-bold text-slate-400 outline-none mt-1 uppercase"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                                                                <input 
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                    className="w-12 text-center font-black text-indigo-600 outline-none"
                                                                />
                                                                <input 
                                                                    value={item.unit || 'Nos'}
                                                                    onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                                                    className="w-12 text-[10px] uppercase font-black text-slate-400 outline-none border-l pl-3 border-slate-100"
                                                                />
                                                            </div>
                                                            <button 
                                                                onClick={() => setChallan(prev => ({ ...prev, items: prev.items?.filter(it => it.id !== item.id) }))}
                                                                className="opacity-0 group-hover:opacity-100 p-3 text-rose-400 hover:bg-rose-50 rounded-2xl transition-all"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Section 4: Terms & Footer */}
                                    <section className="space-y-6">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                                            <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg"><FileText size={14}/></div>
                                            Legal & Remarks
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terms & Conditions</label>
                                                <textarea 
                                                    value={challan.terms}
                                                    onChange={e => setChallan(prev => ({ ...prev, terms: e.target.value }))}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-600 min-h-[120px] text-xs shadow-sm"
                                                    placeholder="Standard delivery terms..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal / External Remarks</label>
                                                <textarea 
                                                    value={challan.remarks}
                                                    onChange={e => setChallan(prev => ({ ...prev, remarks: e.target.value }))}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-600 min-h-[120px] text-xs shadow-sm"
                                                    placeholder="Additional notes..."
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Action Bar */}
                                    <div className="pt-10 flex justify-center gap-6">
                                        <button 
                                            onClick={() => handleSave('Draft')}
                                            className="px-10 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center gap-3 shadow-md border-b-4 border-slate-100 active:border-b-0 active:translate-y-1"
                                        >
                                            <Save className="w-5 h-5" />
                                            Archive Draft
                                        </button>
                                        <button 
                                            onClick={() => handleSave('Dispatched')}
                                            className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl shadow-indigo-200 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
                                        >
                                            <Truck className="w-5 h-5" />
                                            Confirm & Dispatch
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-white">
                                <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input 
                                            placeholder="Search by name or category..."
                                            value={catalogSearch}
                                            onChange={e => setCatalogSearch(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCatalog.map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => onSelectItem(p)}
                                            className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group flex items-start gap-4"
                                            title="Click to add to manifest"
                                        >
                                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-700 uppercase truncate">{p.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">STOCK: {p.stock} {p.unit}</p>
                                                <div className="mt-2 flex gap-2">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded uppercase tracking-tighter">{p.category}</span>
                                                </div>
                                            </div>
                                            <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="w-5 h-5 text-indigo-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="bg-white w-[800px] shadow-2xl p-12 space-y-8 font-serif leading-relaxed text-slate-800">
                                    <div className="text-center space-y-1">
                                        <h2 className="text-3xl font-black font-sans tracking-tighter">SREE MEDITEC</h2>
                                        <p className="text-[10px] font-sans text-slate-500 uppercase tracking-[0.2em]">Medical Equipment & Spares Division</p>
                                    </div>

                                    <div className="flex justify-between items-start border-y-2 border-slate-300 py-6 font-sans">
                                        <div className="space-y-4 max-w-[50%]">
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Consignee Identity</h4>
                                                <p className="font-bold text-lg leading-tight uppercase">{challan.customerName || '---'}</p>
                                                <p className="text-xs text-slate-500 mt-1 uppercase whitespace-pre-wrap">{challan.customerAddress || '---'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-4">
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry Ref</h4>
                                                <p className="font-black text-indigo-600">{challan.challanNumber || 'SM/DC/---'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Execution Date</h4>
                                                <p className="font-black text-slate-800">{formatDateDDMMYYYY(challan.date)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Manifest Specification</h4>
                                        <table className="w-full font-sans border-collapse">
                                            <thead>
                                                <tr className="border-b-2 border-slate-300">
                                                    <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400 w-16">Item</th>
                                                    <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Description of Goods</th>
                                                    <th className="py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400 w-24">Qty</th>
                                                    <th className="py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400 w-32">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {challan.items?.map((it, idx) => (
                                                    <tr key={it.id}>
                                                        <td className="py-4 text-xs font-bold text-slate-400">#{idx + 1}</td>
                                                        <td className="py-4">
                                                            <p className="font-black text-sm uppercase">{it.description}</p>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <p className="font-black text-sm">{it.quantity} <span className="text-[8px] uppercase text-slate-400">{it.unit}</span></p>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{it.remarks || '---'}</p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pt-20 flex justify-between items-end font-sans">
                                        <div className="max-w-[50%] space-y-4">
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                <h5 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registry Terms</h5>
                                                <div className="text-[8px] text-slate-500 font-bold leading-relaxed uppercase whitespace-pre-wrap">
                                                    {challan.terms || 'No terms specified.'}
                                                </div>
                                                {challan.remarks && (
                                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                                        <h5 className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mb-1">Remarks</h5>
                                                        <p className="text-[8px] text-slate-400 font-medium italic">{challan.remarks}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right space-y-12">
                                            <div className="w-48 h-px bg-slate-200 ml-auto" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Authorised Personnel</p>
                                                <p className="text-[8px] font-bold text-indigo-400 uppercase mt-1">SREE MEDITEC REGISTRY</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="client-list">
                {clients.map(c => <option key={c.id} value={c.hospital || c.name} />)}
            </datalist>
            <datalist id="product-list">
                {products.map((p, idx) => <option key={idx} value={p.name} />)}
            </datalist>
        </div>
    );
};