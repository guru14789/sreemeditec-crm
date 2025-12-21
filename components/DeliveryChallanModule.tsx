
import React, { useState, useMemo, useEffect } from 'react';
import { DeliveryChallan, ChallanItem } from '../types';
import { 
    Truck, Plus, FileText, Printer, Search, Filter, Trash2, Calendar, Building2, User, Package, MapPin, CheckCircle2, Box, ArrowLeft, X, History, PenTool, Eye, List as ListIcon, Save, Download, Edit
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const DeliveryChallanModule: React.FC = () => {
    const { clients, products, addClient } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [challans, setChallans] = useState<DeliveryChallan[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [challan, setChallan] = useState<Partial<DeliveryChallan>>({
        challanNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'Dispatched',
        vehicleNumber: '',
        referenceOrder: ''
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !challan.challanNumber) {
            setChallan(prev => ({
                ...prev,
                challanNumber: `SMDC ${String(challans.length + 501).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, challans]);

    const handleAddItem = (prod?: any) => {
        const newItem: ChallanItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            quantity: 1,
            unit: 'nos',
            remarks: prod?.sku || ''
        };
        setChallan(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const handleSave = () => {
        if (!challan.customerName || !challan.items?.length) {
            alert("Please fill consignee and items.");
            return;
        }
        const finalData: DeliveryChallan = {
            ...challan as DeliveryChallan,
            id: editingId || `DC-${Date.now()}`
        };
        if (editingId) setChallans(prev => prev.map(c => c.id === editingId ? finalData : c));
        else setChallans(prev => [finalData, ...prev]);
        
        setViewState('history');
        setEditingId(null);
    };

    const handleEdit = (c: DeliveryChallan) => {
        setChallan(c);
        setEditingId(c.id);
        setViewState('builder');
        setBuilderTab('form');
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
            p.sku.toLowerCase().includes(catalogSearch.toLowerCase())
        );
    }, [products, catalogSearch]);

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setChallan({ date: new Date().toISOString().split('T')[0], items: [], status: 'Dispatched' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Challan</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center font-black uppercase text-xs tracking-tight text-slate-800">
                        <span>Dispatch Registry</span>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200"><Search size={14} className="text-slate-400" /><input placeholder="Search..." className="outline-none bg-transparent w-48 text-xs font-bold" /></div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr><th className="px-6 py-4">Challan #</th><th className="px-6 py-4">Consignee</th><th className="px-6 py-4">Items</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {challans.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-black">{c.challanNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{c.customerName}</td>
                                        <td className="px-6 py-4 text-slate-500">{c.items.length} units</td>
                                        <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">{c.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(c)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={18}/></button>
                                                <button className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"><Download size={18}/></button>
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
                    <div className="lg:hidden flex bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Items</button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white ${builderTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Registry</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={challan.challanNumber} readOnly />
                                    <input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" value={challan.date} onChange={e => setChallan({...challan, date: e.target.value})} />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Consignee Identity</h3>
                                <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={challan.customerName || ''} onChange={e => setChallan({...challan, customerName: e.target.value})} placeholder="Customer Name *" />
                                <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={challan.customerAddress || ''} onChange={e => setChallan({...challan, customerAddress: e.target.value})} placeholder="Delivery Address" />
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Logistics Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Vehicle No." value={challan.vehicleNumber} onChange={e => setChallan({...challan, vehicleNumber: e.target.value})} />
                                    <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Ref Order #" value={challan.referenceOrder} onChange={e => setChallan({...challan, referenceOrder: e.target.value})} />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Items to Dispatch</h3>
                                     <button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1 rounded-lg border border-medical-100">+ Add from Catalog</button>
                                </div>
                                <div className="space-y-3">
                                    {challan.items?.map((item) => (
                                        <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                                            <button onClick={() => setChallan({...challan, items: challan.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-8">
                                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Item Description" value={item.description} onChange={e => {
                                                        const updated = (challan.items || []).map(i => i.id === item.id ? {...i, description: e.target.value} : i);
                                                        setChallan({...challan, items: updated});
                                                    }} />
                                                </div>
                                                <div className="col-span-4">
                                                    <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="Qty" value={item.quantity} onChange={e => {
                                                        const updated = (challan.items || []).map(i => i.id === item.id ? {...i, quantity: Number(e.target.value)} : i);
                                                        setChallan({...challan, items: updated});
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!challan.items || challan.items.length === 0) && (
                                        <button onClick={() => setBuilderTab('catalog')} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 font-bold uppercase text-[10px] tracking-widest hover:border-medical-500 hover:text-medical-600 transition-all">Select items to dispatch</button>
                                    )}
                                </div>
                            </section>

                            <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50">
                                <button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={handleSave} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Generate Challan</button>
                            </div>
                        </div>

                        <div className={`w-full lg:w-1/2 bg-[#e0f2f1] border-l border-slate-200 flex flex-col lg:overflow-hidden ${builderTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
                             <div className="hidden lg:flex bg-[#81D7D3] p-1 shrink-0">
                                <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'preview' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Live Preview</button>
                                <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'catalog' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Quick Items</button>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                <div className={`h-full overflow-y-auto p-8 flex justify-center custom-scrollbar bg-slate-50/50 ${builderTab === 'preview' ? 'flex' : 'hidden'}`}>
                                     <div className="bg-white shadow-2xl text-black w-[210mm] min-h-[297mm] h-fit p-[20mm] origin-top scale-[0.6] sm:scale-[0.8] md:scale-[0.9] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95] transition-all" style={{ fontFamily: 'Calibri, sans-serif' }}>
                                        <div className="text-center mb-8 border-b-2 border-black pb-4">
                                            <h1 className="text-5xl font-black uppercase mb-1">SREE MEDITEC</h1>
                                            <p className="text-sm font-bold">New No: 18, Rajajipakkam, Chennai - 600 073.</p>
                                        </div>
                                        <div className="text-center mb-10"><h2 className="text-3xl font-black border-b-4 border-black inline-block px-10 pb-1 uppercase tracking-widest">Delivery Challan</h2></div>
                                        <div className="flex justify-between font-bold text-lg mb-10 px-2"><span>No: {challan.challanNumber}</span><span>Date: {challan.date}</span></div>
                                        <div className="grid grid-cols-2 gap-10 mb-10 px-2">
                                            <div><p className="font-black text-sm uppercase text-slate-400 mb-1">Consignee:</p><p className="font-black text-xl">{challan.customerName || '---'}</p><p className="text-slate-600 whitespace-pre-wrap">{challan.customerAddress}</p></div>
                                            <div><p className="font-black text-sm uppercase text-slate-400 mb-1">Transport:</p><p className="font-black text-lg">Vehicle No: {challan.vehicleNumber || '---'}</p><p className="text-slate-600">Ref: {challan.referenceOrder || 'N/A'}</p></div>
                                        </div>
                                        <div className="border-2 border-black mb-12 overflow-hidden rounded-sm">
                                            <table className="w-full border-collapse">
                                                <thead className="bg-slate-100 border-b-2 border-black text-sm font-black">
                                                    <tr><th className="p-3 border-r-2 border-black text-left w-12">Sl</th><th className="p-3 border-r-2 border-black text-left">Description of Goods</th><th className="p-3 text-center w-24">Quantity</th></tr>
                                                </thead>
                                                <tbody className="divide-y-2 divide-black">
                                                    {challan.items?.map((it, idx) => (
                                                        <tr key={it.id} className="text-sm font-bold align-top">
                                                            <td className="p-3 border-r-2 border-black text-center">{idx + 1}</td>
                                                            <td className="p-3 border-r-2 border-black">{it.description}</td>
                                                            <td className="p-3 text-center font-black">{it.quantity}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-20 flex justify-between px-2 pt-10 border-t border-slate-100">
                                            <div className="text-center"><div className="border-t-2 border-black w-40 mb-1"></div><p className="text-[10px] font-black uppercase">Receiver Sign</p></div>
                                            <div className="text-center"><p className="font-black text-xs uppercase mb-10">For Sree Meditec</p><div className="border-t-2 border-black w-40 mb-1"></div><p className="text-[10px] font-black uppercase">Authorized Sign</p></div>
                                        </div>
                                     </div>
                                </div>

                                <div className={`h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in ${builderTab === 'catalog' ? 'flex' : 'hidden'}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Stock Finder</h3>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" placeholder="Search SKU..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-4">
                                        {filteredProducts.map(prod => (
                                            <div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => handleAddItem(prod)}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-mono text-slate-400 font-bold">{prod.sku}</span>
                                                        {prod.stock < 5 && <span className="text-[8px] bg-rose-50 text-rose-500 px-1 py-0.5 rounded font-black uppercase">Low Stock</span>}
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{prod.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{prod.location || 'Primary Store'}</p>
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
        </div>
    );
};
