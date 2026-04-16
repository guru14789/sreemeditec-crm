
import React, { useState } from 'react';
import { useData } from './DataContext';
import { Search, Package, Tag, Filter, Grid, List, Info, ChevronRight, ShoppingBag, Layers, Percent } from 'lucide-react';
import { Product } from '../types';

export const CatalogModule: React.FC = () => {
    const { products } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (product.model?.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const calculateGstPrice = (price: number, taxRate: number = 18) => {
        return price + (price * (taxRate / 100));
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-300 dark:border-slate-800 shadow-sm shrink-0">
                <div className="flex items-center gap-5">
                    <div className="hidden md:flex p-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl items-center justify-center">
                        <ShoppingBag size={24} />
                    </div>
                    <div className="hidden md:block">
                        {/* Title hidden for cleaner UI */}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search catalog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all dark:text-white"
                        />
                    </div>
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Grid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Slider Removed for cleaner UI */}

            {/* Catalog Grid/List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-10">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all hover:border-emerald-500/50">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">{product.category}</div>
                                        <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {product.stock > 0 ? `${product.stock} IN STOCK` : 'OUT OF STOCK'}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-tight group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{product.model || 'Standard Model'}</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                Net Price <Info size={10} />
                                            </p>
                                            <p className="text-lg font-black text-slate-400 tracking-tighter line-through decoration-slate-300">₹{product.sellingPrice.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center justify-end gap-1.5">
                                                Inclusive Price <Tag size={12} />
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">₹{calculateGstPrice(product.sellingPrice, product.taxRate).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-900/10 transition-colors group-hover:border-emerald-100 dark:group-hover:border-emerald-900/30">
                                        <div className="flex items-center gap-2">
                                            <Percent size={14} className="text-emerald-600" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">GST Rate</span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">{product.taxRate || 18}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {/* List Header (Desktop Only) */}
                        <div className="hidden md:flex bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 px-8 items-center text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <div className="flex-[2]">Product Details</div>
                            <div className="flex-1 text-center">Net Price</div>
                            <div className="flex-1 text-center">Tax</div>
                            <div className="flex-1 text-right">Catalog Price (Inc)</div>
                        </div>

                        {/* List Items */}
                        {filteredProducts.map(product => (
                            <div key={product.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4 md:px-8 md:py-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex flex-col md:flex-row md:items-center gap-4 group">
                                <div className="flex md:flex-[2] items-center gap-4">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform"><Layers size={20} /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] md:text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight leading-tight line-clamp-2">{product.name}</p>
                                        <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{product.category}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest truncate">{product.sku}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex md:flex-3 items-center justify-between md:contents">
                                    {/* Mobile Labels are shown via contents logic */}
                                    <div className="md:flex-1 md:text-center">
                                        <span className="md:hidden text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Net Price</span>
                                        <span className="text-xs md:text-sm font-bold text-slate-400">₹{product.sellingPrice.toLocaleString()}</span>
                                    </div>
                                    
                                    <div className="md:flex-1 md:text-center">
                                        <span className="md:hidden text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tax</span>
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400">{product.taxRate || 18}%</span>
                                    </div>

                                    <div className="md:flex-1 text-right">
                                        <span className="md:hidden text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Price (INC)</span>
                                        <div className="inline-flex flex-col items-end">
                                            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">₹{calculateGstPrice(product.sellingPrice, product.taxRate).toLocaleString()}</span>
                                            <span className="hidden md:block text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-0.5 whitespace-nowrap">Price with GST</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="p-8 bg-slate-100 dark:bg-slate-800 rounded-[3rem] text-slate-300 mb-6 shadow-inner">
                            <ShoppingBag size={80} strokeWidth={1} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">No Items Found</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};
