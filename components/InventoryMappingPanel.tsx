import React, { useState } from 'react';
import { Package, Plus, Trash2, Layers, Search, Barcode, AlertTriangle, BookmarkPlus, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, InvoiceItemInventoryMapping, ServiceTemplate } from '../types';
import { useData } from './DataContext';

interface InventoryMappingPanelProps {
  parentItemDescription: string;
  parentUnitPrice: number;
  parentQuantity: number;
  mappings: InvoiceItemInventoryMapping[];
  onChange: (newMappings: InvoiceItemInventoryMapping[]) => void;
  onApplyTemplateData?: (templateData: Partial<{ defaultUnitPrice: number; hsn: string; taxRate: number }>) => void;
}

export const InventoryMappingPanel: React.FC<InventoryMappingPanelProps> = ({
  parentItemDescription,
  parentUnitPrice,
  parentQuantity,
  mappings,
  onChange,
  onApplyTemplateData
}) => {
  const { products, serviceTemplates, addServiceTemplate, addNotification, showAlert } = useData();

  const [isOpen, setIsOpen] = useState(mappings.length > 0);
  const [productSearch, setProductSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [showTemplateLoadModal, setShowTemplateLoadModal] = useState(false);

  // Filtered inventory products based on search (Name, SKU, or Barcode)
  const matchingProducts = products.filter(p => {
    if (!productSearch.trim()) return false;
    const query = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  });

  const handleAddProduct = (product: Product) => {
    // Prevent duplicate mapping for exact same product
    if (mappings.some(m => m.inventoryProductId === product.id)) {
      addNotification('Duplicate Item', `${product.name} is already added to this assembly. Combined quantity updated.`, 'info');
      const updated = mappings.map(m => {
        if (m.inventoryProductId === product.id) {
          return { ...m, quantityUsed: m.quantityUsed + 1 };
        }
        return m;
      });
      onChange(updated);
    } else {
      const newMapping: InvoiceItemInventoryMapping = {
        id: `MAP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        inventoryProductId: product.id,
        productName: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        quantityUsed: 1,
        unit: product.unit || 'Nos',
        costPrice: product.purchasePrice || 0,
        sellingPrice: product.sellingPrice || 0
      };
      onChange([...mappings, newMapping]);
    }
    setProductSearch('');
    setShowSearchDropdown(false);
  };

  const handleUpdateQuantity = (mappingId: string, qtyStr: string) => {
    const qty = Math.max(0.01, parseFloat(qtyStr) || 0);
    const updated = mappings.map(m => m.id === mappingId ? { ...m, quantityUsed: qty } : m);
    onChange(updated);
  };

  const handleRemoveMapping = (mappingId: string) => {
    onChange(mappings.filter(m => m.id !== mappingId));
  };

  // Calculations
  const totalComponentCost = mappings.reduce((sum, m) => sum + ((m.costPrice || 0) * (m.quantityUsed || 0)), 0);
  const totalComponentValue = mappings.reduce((sum, m) => sum + ((m.sellingPrice || 0) * (m.quantityUsed || 0)), 0);
  const lineRevenue = (parentUnitPrice || 0);
  const lineGrossProfit = lineRevenue - totalComponentCost;

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      await showAlert('Please enter a name for this service assembly template.', 'Validation Error');
      return;
    }
    if (mappings.length === 0) {
      await showAlert('Add at least one inventory item to save as a template.', 'Validation Error');
      return;
    }

    const newTemplate: ServiceTemplate = {
      id: `TPL-${Date.now()}`,
      name: templateName.trim(),
      description: `Predefined assembly for ${parentItemDescription || 'Service'}`,
      defaultUnitPrice: parentUnitPrice || 0,
      mappings: mappings.map(m => ({
        inventoryProductId: m.inventoryProductId,
        productName: m.productName,
        quantityUsed: m.quantityUsed,
        unit: m.unit
      })),
      createdAt: new Date().toISOString()
    };

    try {
      await addServiceTemplate(newTemplate);
      addNotification('Template Saved', `Created reusable template "${newTemplate.name}"`, 'success');
      setShowTemplateSaveModal(false);
      setTemplateName('');
    } catch (e) {
      console.error('Failed to save template', e);
      addNotification('Save Failed', 'Could not save template.', 'alert');
    }
  };

  const handleLoadTemplate = (tpl: ServiceTemplate) => {
    const loadedMappings: InvoiceItemInventoryMapping[] = tpl.mappings.map(m => {
      const prod = products.find(p => p.id === m.inventoryProductId || p.name.toLowerCase() === m.productName.toLowerCase());
      return {
        id: `MAP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        inventoryProductId: prod ? prod.id : m.inventoryProductId,
        productName: prod ? prod.name : m.productName,
        sku: prod?.sku || '',
        barcode: prod?.barcode || '',
        quantityUsed: m.quantityUsed,
        unit: prod?.unit || m.unit || 'Nos',
        costPrice: prod?.purchasePrice || 0,
        sellingPrice: prod?.sellingPrice || 0
      };
    });

    onChange(loadedMappings);
    if (onApplyTemplateData && tpl.defaultUnitPrice) {
      onApplyTemplateData({ defaultUnitPrice: tpl.defaultUnitPrice, hsn: tpl.hsn, taxRate: tpl.taxRate });
    }
    addNotification('Template Applied', `Loaded ${loadedMappings.length} component products from "${tpl.name}"`, 'success');
    setShowTemplateLoadModal(false);
    setIsOpen(true);
  };

  return (
    <div className="mt-3 border border-indigo-200/60 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-slate-50/50 rounded-2xl p-4 transition-all">
      {/* Panel Header Toggle */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
            <Layers size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                Internal Inventory Mapping (Bill of Materials)
              </span>
              {mappings.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  {mappings.length} {mappings.length === 1 ? 'Item' : 'Items'} Linked
                </span>
              )}
            </div>
            <p className="text-[9px] font-semibold text-slate-500 mt-0.5">
              Customer sees only "{parentItemDescription || 'General Service'}". Mapped inventory products are deducted behind the scenes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Panel Expanded Content */}
      {isOpen && (
        <div className="mt-4 pt-3 border-t border-indigo-100/80 space-y-4 animate-in fade-in duration-200">
          
          {/* Action Bar: Template Operations */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2">
              {serviceTemplates.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowTemplateLoadModal(true); }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles size={12} /> Load Saved Assembly Template
                </button>
              )}
              {mappings.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowTemplateSaveModal(true); }}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <BookmarkPlus size={12} /> Save Assembly as Template
                </button>
              )}
            </div>

            {/* Profit Analytics Indicator */}
            {mappings.length > 0 && (
              <div className="flex items-center gap-3 text-[9px] font-bold px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500">Component Cost: <strong className="text-slate-800">₹{(totalComponentCost * (parentQuantity || 1)).toLocaleString('en-IN')}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">Est. Line Profit: <strong className={lineGrossProfit >= 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>₹{(lineGrossProfit * (parentQuantity || 1)).toLocaleString('en-IN')}</strong></span>
              </div>
            )}
          </div>

          {/* Product Search & Add Bar */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
              <Search size={14} className="text-indigo-400 shrink-0" />
              <input
                type="text"
                className="w-full text-xs font-semibold outline-none bg-transparent placeholder-slate-400"
                placeholder="Search inventory by Product Name, SKU, or Scan Barcode to link..."
                value={productSearch}
                onChange={e => {
                  setProductSearch(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
              />
              <Barcode size={16} className="text-slate-400 shrink-0" title="Barcode Scanner Supported" />
            </div>

            {/* Search Dropdown Results */}
            {showSearchDropdown && matchingProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100 custom-scrollbar">
                {matchingProducts.map(prod => {
                  const isLow = (prod.stock || 0) <= (prod.minLevel || 5);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddProduct(prod)}
                      className="p-2.5 hover:bg-indigo-50/80 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{prod.name}</span>
                        <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-400 mt-0.5">
                          {prod.sku && <span>SKU: {prod.sku}</span>}
                          {prod.barcode && <span>Barcode: {prod.barcode}</span>}
                          <span>Cost: ₹{(prod.purchasePrice || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold ${isLow ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700'}`}>
                          Stock: {prod.stock || 0} {prod.unit || 'Nos'}
                        </span>
                        <Plus size={14} className="text-indigo-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked Products Table */}
          {mappings.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Inventory Product</th>
                    <th className="px-3 py-2 text-center">Available Stock</th>
                    <th className="px-3 py-2 text-center w-28">Qty per Service</th>
                    <th className="px-3 py-2 text-right">Cost / Unit</th>
                    <th className="px-3 py-2 text-right">Total Sub-Cost</th>
                    <th className="px-3 py-2 text-center w-10">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {mappings.map(m => {
                    const matchedProd = products.find(p => p.id === m.inventoryProductId);
                    const currentStock = matchedProd?.stock ?? m.currentStock ?? 0;
                    const totalNeeded = (m.quantityUsed || 1) * (parentQuantity || 1);
                    const isInsufficient = currentStock < totalNeeded;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{m.productName}</span>
                            {m.sku && <span className="text-[8.5px] text-slate-400 font-mono">SKU: {m.sku}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isInsufficient ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                            {currentStock} {m.unit || 'Nos'}
                          </span>
                          {isInsufficient && (
                            <span className="block text-[7.5px] font-bold text-rose-600 mt-0.5">Needed: {totalNeeded}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              className="w-16 h-7 bg-slate-50 border border-slate-300 rounded-lg px-2 text-center text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                              value={m.quantityUsed}
                              onChange={e => handleUpdateQuantity(m.id, e.target.value)}
                            />
                            <span className="text-[9px] font-bold text-slate-400">{m.unit || 'Nos'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          ₹{(m.costPrice || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">
                          ₹{((m.costPrice || 0) * (m.quantityUsed || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(m.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove mapping"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-white/60 border border-dashed border-indigo-200 rounded-xl text-center">
              <Package size={24} className="mx-auto text-indigo-300 mb-1" />
              <p className="text-[10px] font-bold text-slate-500">No inventory products linked to this general service yet.</p>
              <p className="text-[8.5px] text-slate-400 mt-0.5">Search above to attach pipes, fittings, spares, or materials that get consumed when this item is billed.</p>
            </div>
          )}
        </div>
      )}

      {/* Save Template Modal */}
      {showTemplateSaveModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-md space-y-4 animate-in zoom-in-95">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Save Reusable Assembly Template</h3>
            <p className="text-[10px] font-semibold text-slate-500">
              Save this component list ({mappings.length} items) under a reusable template name to easily populate future invoices in 1-click.
            </p>
            <div className="space-y-1">
              <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Template Name *</label>
              <input
                type="text"
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold outline-none focus:bg-white"
                placeholder="e.g. Pipeline Work - Standard 15mm"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowTemplateSaveModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-md hover:bg-indigo-700"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {showTemplateLoadModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-lg space-y-4 animate-in zoom-in-95">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Load Reusable Assembly Template</h3>
            <p className="text-[10px] font-semibold text-slate-500">
              Select a saved assembly template to pre-fill component mapping and rate:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border rounded-xl p-2">
              {serviceTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl)}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-200 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{tpl.name}</h4>
                    <span className="text-[9px] text-indigo-600 font-bold block mt-0.5">
                      {tpl.mappings.length} Component Products • Default Rate: ₹{(tpl.defaultUnitPrice || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <Sparkles size={14} className="text-indigo-600" />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowTemplateLoadModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
