
import React, { useState } from 'react';
import { useData } from './DataContext';
import { Search, Package, Tag, Filter, Grid, List, Info, ChevronRight, ShoppingBag, Layers, Percent, X, MapPin } from 'lucide-react';
import { Product } from '../types';

export const CatalogModule: React.FC = () => {
    const { products } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

    const parseLegacyDescription = (desc: string): { key: string; value: string }[] => {
        if (!desc) return [];
        const lines = desc.split('\n');
        const result: { key: string; value: string }[] = [];
        let hasKeyValuePairs = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx > 0 && colonIdx < trimmed.length - 1) {
                const k = trimmed.substring(0, colonIdx).trim();
                const v = trimmed.substring(colonIdx + 1).trim();
                if (k && v) {
                    result.push({ key: k, value: v });
                    hasKeyValuePairs = true;
                }
            }
        }
        if (!hasKeyValuePairs) {
            result.push({ key: 'Overview', value: desc.trim() });
        }
        return result;
    };

    const getProductSpecs = (product: Product): { key: string; value: string }[] => {
        if (product.specs && Object.keys(product.specs).length > 0) {
            return Object.entries(product.specs).map(([key, value]) => ({ key, value }));
        }
        if (product.description) {
            return parseLegacyDescription(product.description);
        }
        return [];
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-emerald-950 to-green-900 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 p-4 md:p-6 rounded-[2rem] md:rounded-[36px] shadow-[0_30px_60px_-15px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="hidden md:flex items-center gap-5 relative z-10 w-full md:w-auto">
          <div className="w-14 h-14 bg-emerald-900/60 rounded-full flex items-center justify-center text-emerald-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_2px_rgba(255,255,255,0.1)] transition-transform group-hover:scale-110 shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-[28px] font-playfair font-bold tracking-tight text-white uppercase leading-none">Product Catalog</h2>
            <p className="text-[9px] font-extrabold text-emerald-300/80 uppercase tracking-[0.2em] mt-1">Inventory & Pricing Directory</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative z-10">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/50 group-focus-within/search:text-white transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-3 pl-11 pr-4 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all shadow-inner"
            />
          </div>
          <div className="flex bg-emerald-900/40 p-1 rounded-[2rem] border border-emerald-700/50 shadow-inner w-full sm:w-auto justify-center">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 px-6 sm:px-3 rounded-[2rem] transition-all flex-1 sm:flex-none flex justify-center ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-100/50 hover:text-emerald-100'}`}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 px-6 sm:px-3 rounded-[2rem] transition-all flex-1 sm:flex-none flex justify-center ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-100/50 hover:text-emerald-100'}`}
            >
              <List size={16} />
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
                            <div 
                                key={product.id} 
                                onClick={() => setSelectedProduct(product)}
                                className="group relative bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-4 md:p-6 flex flex-col gap-4 md:gap-6 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#c5a059] to-[#e5c185] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="px-2 md:px-3 py-0.5 md:py-1 bg-slate-100 dark:bg-slate-800 rounded-[2rem] text-[9px] font-black text-slate-500 uppercase tracking-widest">{product.category}</div>
                                        <div className={`px-2 md:px-3 py-0.5 md:py-1 rounded-[2rem] text-[9px] font-black uppercase tracking-widest ${product.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {product.stock > 0 ? `${product.stock} IN STOCK` : 'OUT OF STOCK'}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-base md:text-lg font-playfair font-bold text-slate-800 dark:text-white uppercase tracking-tight leading-tight group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{product.model || 'Standard Model'}</p>
                                        {getProductSpecs(product).length > 0 && (
                                            <div className="mt-2.5 md:mt-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2 md:pt-2.5">
                                                {getProductSpecs(product).slice(0, 3).map((spec, idx) => (
                                                    <div key={idx} className="flex justify-between text-[10px] leading-tight">
                                                        <span className="font-bold text-slate-400 uppercase tracking-wider truncate max-w-[45%]">{spec.key}</span>
                                                        <span className="font-extrabold text-slate-600 dark:text-slate-300 truncate max-w-[50%]">{spec.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 md:pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3 md:space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center gap-1.5">
                                                Net Price <Info size={10} />
                                            </p>
 <p className="text-base md:text-lg font-bold tracking-tight text-slate-400 tracking-tighter line-through decoration-slate-300">₹{product.sellingPrice.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 md:mb-1.5 flex items-center justify-end gap-1.5">
                                                Inclusive Price <Tag size={12} />
                                            </p>
 <p className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tracking-tighter">₹{calculateGstPrice(product.sellingPrice, product.taxRate).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>

                                    <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-slate-800 flex justify-between items-center group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-900/10 transition-colors group-hover:border-emerald-100 dark:group-hover:border-emerald-900/30">
                                        <div className="flex items-center gap-2">
                                            <Percent size={14} className="text-emerald-600" />
                                            <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase">GST Rate</span>
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
                        <div className="hidden md:flex bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-4 px-8 items-center text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <div className="flex-[2]">Product Details</div>
                            <div className="flex-1 text-center">Net Price</div>
                            <div className="flex-1 text-center">Tax</div>
                            <div className="flex-1 text-right">Catalog Price (Inc)</div>
                        </div>

                        {/* List Items */}
                        {filteredProducts.map(product => (
                            <div 
                                key={product.id} 
                                onClick={() => setSelectedProduct(product)}
                                className="relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4 md:px-8 md:py-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:shadow-[0_15px_30px_-10px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 transition-all duration-300 flex flex-col md:flex-row md:items-center gap-4 group cursor-pointer overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#c5a059] to-[#e5c185] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex md:flex-[2] items-start gap-3 md:gap-4">
                                    <div className="p-2 md:p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-[1.5rem] md:rounded-[2rem] group-hover:scale-110 transition-transform shrink-0"><Layers size={20} className="w-4 h-4 md:w-5 md:h-5" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm md:text-base font-playfair font-bold text-slate-800 dark:text-white uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-emerald-600 transition-colors">{product.name}</p>
                                        <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{product.category}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest truncate">{product.sku}</span>
                                        </div>
                                        {getProductSpecs(product).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                {getProductSpecs(product).slice(0, 3).map((spec, idx) => (
                                                    <div key={idx} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-[2rem] text-[9px] font-black border border-slate-100 dark:border-slate-850 flex gap-1.5 items-center max-w-[200px] truncate">
                                                        <span className="text-slate-405 dark:text-slate-500 uppercase tracking-widest">{spec.key}:</span>
                                                        <span className="text-slate-600 dark:text-slate-300 truncate">{spec.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex md:flex-3 items-center justify-between md:contents">
                                    {/* Mobile Labels are shown via contents logic */}
                                    <div className="md:flex-1 md:text-center">
                                        <span className="md:hidden text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Net Price</span>
                                        <span className="text-xs md:text-sm font-bold text-slate-400">₹{product.sellingPrice.toLocaleString('en-IN')}</span>
                                    </div>
                                    
                                    <div className="md:flex-1 md:text-center">
                                        <span className="md:hidden text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tax</span>
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400">{product.taxRate || 18}%</span>
                                    </div>

                                    <div className="md:flex-1 text-right">
                                        <span className="md:hidden text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Price (INC)</span>
                                        <div className="inline-flex flex-col items-end">
                                            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">₹{calculateGstPrice(product.sellingPrice, product.taxRate).toLocaleString('en-IN')}</span>
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
                        <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-white uppercase tracking-tighter leading-none">No Items Found</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            {/* Detailed Specs Modal */}
            {selectedProduct && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in animate-out fade-out"
                    onClick={() => setSelectedProduct(null)}
                >
                    <div 
                        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 animate-out zoom-out-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-[2rem] shrink-0">
                                    <Layers size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-white uppercase tracking-tight leading-tight">
                                        {selectedProduct.name}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            {selectedProduct.category}
                                        </span>
                                        {selectedProduct.model && (
                                            <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                                Model: {selectedProduct.model}
                                            </span>
                                        )}
                                        <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            SKU: {selectedProduct.sku}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedProduct(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-[2rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            {/* Specs Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Stock and Location */}
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                        <Package size={12} /> Stock & Availability
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Stock</span>
                                            <span className={`text-xs font-black uppercase ${selectedProduct.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {selectedProduct.stock} {selectedProduct.unit || 'units'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${selectedProduct.stock > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'}`}>
                                                {selectedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Storage Location</span>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1">
                                                <MapPin size={10} className="text-slate-400" />
                                                {selectedProduct.godown || selectedProduct.location || 'Not Specified'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reorder Level</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                {selectedProduct.reorderLevel || selectedProduct.minLevel || 0} {selectedProduct.unit || 'units'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing details */}
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                        <Tag size={12} /> Commercial Pricing
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Selling Price</span>
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                                ₹{selectedProduct.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">GST Tax Rate</span>
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Percent size={10} /> {selectedProduct.taxRate || 18}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HSN Code</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                {selectedProduct.hsn || 'Not Specified'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Inclusive Price</span>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                ₹{calculateGstPrice(selectedProduct.sellingPrice, selectedProduct.taxRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description & Technical Specs */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                    <Info size={12} /> Technical Specifications & Info
                                </h3>
                                {getProductSpecs(selectedProduct).length > 0 ? (
                                    <div className="overflow-hidden rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900">
                                        <div className="hidden md:grid grid-cols-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                            <div className="p-3 text-[10px] font-black text-slate-405 dark:text-slate-550 uppercase tracking-wider">Specification</div>
                                            <div className="p-3 text-[10px] font-black text-slate-405 dark:text-slate-550 uppercase tracking-wider">Detail</div>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {getProductSpecs(selectedProduct).map((spec, idx) => (
                                                <div key={idx} className="p-3 md:p-0 md:grid md:grid-cols-2 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors flex flex-col gap-1 md:gap-0">
                                                    <div className="md:p-3 text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase md:normal-case tracking-wider md:tracking-normal">{spec.key}</div>
                                                    <div className="md:p-3 text-xs font-black text-slate-800 dark:text-slate-200 break-words">{spec.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-305 leading-relaxed">
                                        No detailed technical specifications or description available for this catalog item.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-[2rem] text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Close Specifications
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
