import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, ProductVendorInfo } from '../types';
import { Package, AlertTriangle, Search, X, CheckCircle, Trash2, Plus, History, ScanBarcode, Send, Building2, MapPin, Edit2, RefreshCw, ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react';
import { useData } from './DataContext';
import { AutoSuggest } from './AutoSuggest';


const InlineInput: React.FC<{ 
    value: string | number, 
    onSave: (val: string | number) => void, 
    onCancel: () => void,
    type?: 'text' | 'number',
    className?: string
}> = ({ value, onSave, onCancel, type = 'text', className = "" }) => {
    const [tempValue, setTempValue] = useState(value);

    return (
        <input 
            autoFocus
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(type === 'number' ? Number(e.target.value) : e.target.value)}
            onBlur={() => { if (tempValue !== value) onSave(tempValue); else onCancel(); }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(tempValue);
                if (e.key === 'Escape') onCancel();
            }}
            className={`w-full bg-indigo-50 border border-indigo-300 rounded px-1.5 py-0.5 outline-none font-black animate-in zoom-in-95 duration-75 text-indigo-700 ${className}`}
        />
    );
};

export const InventoryModule: React.FC = () => {
    const { products, addProduct, updateProduct, removeProduct, stockMovements, recordStockMovement, clients, addClient, addNotification, addLog, searchRecords, vendors, showPrompt } = useData();
    const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');

    const [searchQuery, setSearchQuery] = useState('');
    const [serverProducts, setServerProducts] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);

    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [showEditProductModal, setShowEditProductModal] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [inlineEdit, setInlineEdit] = useState<{ id: string, field: string } | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenuId && !(event.target as Element).closest('.menu-container')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        category: 'Equipment',
        stock: 0,
        unit: 'nos',
        minLevel: 5,
        location: 'Warehouse A',
        purchasePrice: 0,
        sellingPrice: 0,
        hsn: '',
        taxRate: 5,
        description: ''
    });

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [newSpecs, setNewSpecs] = useState<{ key: string; value: string }[]>([]);
    const [editSpecs, setEditSpecs] = useState<{ key: string; value: string }[]>([]);

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

    const handleAddNewSpec = () => {
        setNewSpecs([...newSpecs, { key: '', value: '' }]);
    };
    const handleNewSpecChange = (index: number, field: 'key' | 'value', val: string) => {
        const updated = [...newSpecs];
        updated[index] = { ...updated[index], [field]: val };
        setNewSpecs(updated);
    };
    const handleRemoveNewSpec = (index: number) => {
        setNewSpecs(newSpecs.filter((_, i) => i !== index));
    };

    const handleAddEditSpec = () => {
        setEditSpecs([...editSpecs, { key: '', value: '' }]);
    };
    const handleEditSpecChange = (index: number, field: 'key' | 'value', val: string) => {
        const updated = [...editSpecs];
        updated[index] = { ...updated[index], [field]: val };
        setEditSpecs(updated);
    };
    const handleRemoveEditSpec = (index: number) => {
        setEditSpecs(editSpecs.filter((_, i) => i !== index));
    };

    const [newProductVendors, setNewProductVendors] = useState<ProductVendorInfo[]>([]);
    const [editProductVendors, setEditProductVendors] = useState<ProductVendorInfo[]>([]);

    const handleAddNewVendor = () => {
        setNewProductVendors([...newProductVendors, { vendorId: '', vendorName: '', purchasePrice: 0 }]);
    };
    const handleNewVendorChange = (index: number, field: keyof ProductVendorInfo, val: any) => {
        const updated = [...newProductVendors];
        updated[index] = { ...updated[index], [field]: val };
        if (field === 'vendorId') {
            const found = vendors.find(v => v.id === val);
            if (found) {
                updated[index].vendorName = found.name;
            }
        }
        setNewProductVendors(updated);
    };
    const handleRemoveNewVendor = (index: number) => {
        setNewProductVendors(newProductVendors.filter((_, i) => i !== index));
    };

    const handleAddEditVendor = () => {
        setEditProductVendors([...editProductVendors, { vendorId: '', vendorName: '', purchasePrice: 0 }]);
    };
    const handleEditVendorChange = (index: number, field: keyof ProductVendorInfo, val: any) => {
        const updated = [...editProductVendors];
        updated[index] = { ...updated[index], [field]: val };
        if (field === 'vendorId') {
            const found = vendors.find(v => v.id === val);
            if (found) {
                updated[index].vendorName = found.name;
            }
        }
        setEditProductVendors(updated);
    };
    const handleRemoveEditVendor = (index: number) => {
        setEditProductVendors(editProductVendors.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (showAddProductModal) {
            setNewSpecs([]);
            setNewProductVendors([]);
        }
    }, [showAddProductModal]);

    // Send for Demo Modal State
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [demoData, setDemoData] = useState({
        productId: '',
        quantity: 1,
        clientName: '',
        date: new Date().toISOString().split('T')[0],
        location: ''
    });

    // Barcode Scanner State
    const [showScanModal, setShowScanModal] = useState(false);
    const [scanQuery, setScanQuery] = useState('');
    const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
    const [scanStatus, setScanStatus] = useState<'found' | 'not-found' | 'idle'>('idle');
    const [scanOperation, setScanOperation] = useState<'In' | 'Out'>('In'); // Toggle for Add/Remove
    const [quickStockAmount, setQuickStockAmount] = useState<number>(1);
    const scanInputRef = useRef<HTMLInputElement>(null);

    const handleDeepSearch = async () => {
        if (!searchQuery.trim()) {
            setServerProducts([]);
            return;
        }
        setIsSearching(true);
        try {
            // First try searching by Product Name
            let results = await searchRecords<Product>("products", "name", searchQuery);
            // If nothing, try searching by SKU
            if (results.length === 0) {
                results = await searchRecords<Product>("products", "sku", searchQuery);
            }
            setServerProducts(results);
            if (results.length === 0) {
                addNotification('No Records', 'No matching products found in history.', 'info');
            }
        } catch (err) {
            console.error("Deep search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };



    // Filtered Products for Search
    const filteredProducts = useMemo(() => {
        if (serverProducts.length > 0) return serverProducts;
        return products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.supplier && p.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [products, searchQuery, serverProducts]);

    // Auto-focus input when scan modal opens and is in idle state
    useEffect(() => {
        if (showScanModal && scanStatus === 'idle' && scanInputRef.current) {
            setTimeout(() => {
                scanInputRef.current?.focus();
            }, 100);
        }
    }, [showScanModal, scanStatus]);

    const handleSaveProduct = async () => {
        if (!newProduct.name || !newProduct.sku || newProduct.sellingPrice === undefined) {
            alert("Please fill Name, SKU and Selling Price.");
            return;
        }
        const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const specsRecord: Record<string, string> = {};
        newSpecs.forEach(item => {
            if (item.key.trim()) {
                specsRecord[item.key.trim()] = item.value;
            }
        });

        const validVendors = newProductVendors.filter(v => v.vendorName.trim() !== '');
        const primarySupplier = validVendors.length > 0 ? validVendors[0].vendorName : (newProduct.supplier || '');
        const primaryPurchasePrice = validVendors.length > 0 ? Number(validVendors[0].purchasePrice || 0) : Number(newProduct.purchasePrice || 0);

        const productToAdd: Product = {
            id: `P-${Date.now()}-${shortId}`,
            name: newProduct.name!,
            category: newProduct.category as 'Equipment' | 'Consumable' | 'Spare Part' | 'Pipe Line' | 'Furniture' || 'Equipment',
            sku: newProduct.sku!,
            stock: Number(newProduct.stock) || 0,
            unit: newProduct.unit || 'nos',
            purchasePrice: primaryPurchasePrice,
            sellingPrice: Number(newProduct.sellingPrice) || 0,
            minLevel: Number(newProduct.minLevel) || 5,
            location: newProduct.location || 'Unassigned',
            hsn: newProduct.hsn || '',
            taxRate: newProduct.taxRate || 18,
            model: newProduct.model || '',
            description: newSpecs.map(s => `${s.key}: ${s.value}`).join('\n') || newProduct.description || '',
            specs: specsRecord,
            supplier: primarySupplier,
            vendors: validVendors,
            lastRestocked: (newProduct.stock || 0) > 0 ? new Date().toISOString().split('T')[0] : ''
        };
        await addProduct(productToAdd);
        await addLog('Inventory', 'Product Initialization', `New product master record created: ${productToAdd.name} (${productToAdd.sku}) with initial stock of ${productToAdd.stock} ${productToAdd.unit}.`);

        if ((newProduct.stock || 0) > 0) {
            await recordStockMovement({
                id: `MOV-INIT-${Date.now()}`,
                productId: productToAdd.id,
                productName: productToAdd.name,
                type: 'In',
                quantity: productToAdd.stock,
                date: new Date().toISOString().split('T')[0],
                reference: 'Opening Stock',
                purpose: 'Restock'
            });
        }

        setShowAddProductModal(false);
        addNotification('Product Indexed', `"${productToAdd.name}" successfully added to registry.`, 'success');
        setNewProduct({ category: 'Equipment', stock: 0, unit: 'nos', minLevel: 5, location: 'Warehouse A', name: '', sku: '', purchasePrice: 0, sellingPrice: 0, hsn: '', taxRate: 18, model: '', description: '', supplier: '' });
        setNewSpecs([]);
        setNewProductVendors([]);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingProduct({ ...product });
        const initialSpecs = Object.entries(product.specs || {}).map(([key, value]) => ({ key, value }));
        if (initialSpecs.length === 0 && product.description) {
            setEditSpecs(parseLegacyDescription(product.description));
        } else {
            setEditSpecs(initialSpecs);
        }
        if (product.vendors && product.vendors.length > 0) {
            setEditProductVendors(product.vendors);
        } else if (product.supplier) {
            const vObj = vendors.find(v => v.name.toLowerCase() === product.supplier!.toLowerCase());
            setEditProductVendors([{
                vendorId: vObj ? vObj.id : `legacy-${product.supplier}`,
                vendorName: product.supplier,
                purchasePrice: product.purchasePrice || 0
            }]);
        } else {
            setEditProductVendors([]);
        }
        setShowEditProductModal(true);
    };

    const handleUpdateSubmit = async () => {
        if (!editingProduct) return;
        if (!editingProduct.name || !editingProduct.sku) {
            alert("Name and SKU are required.");
            return;
        }

        const originalProduct = products.find(p => p.id === editingProduct.id);
        const stockDiff = (editingProduct.stock || 0) - (originalProduct?.stock || 0);

        const specsRecord: Record<string, string> = {};
        editSpecs.forEach(item => {
            if (item.key.trim()) {
                specsRecord[item.key.trim()] = item.value;
            }
        });

        const validVendors = editProductVendors.filter(v => v.vendorName.trim() !== '');
        const primarySupplier = validVendors.length > 0 ? validVendors[0].vendorName : (editingProduct.supplier || '');
        const primaryPurchasePrice = validVendors.length > 0 ? Number(validVendors[0].purchasePrice || 0) : Number(editingProduct.purchasePrice || 0);

        await updateProduct(editingProduct.id, {
            ...editingProduct,
            stock: Number(editingProduct.stock || 0),
            purchasePrice: primaryPurchasePrice,
            sellingPrice: Number(editingProduct.sellingPrice || 0),
            minLevel: Number(editingProduct.minLevel || 0),
            description: editSpecs.map(s => `${s.key}: ${s.value}`).join('\n') || editingProduct.description || '',
            specs: specsRecord,
            supplier: primarySupplier,
            vendors: validVendors
        });

        if (stockDiff !== 0) {
            await recordStockMovement({
                id: `MOV-MANUAL-${Date.now()}`,
                productId: editingProduct.id,
                productName: editingProduct.name,
                type: stockDiff > 0 ? 'In' : 'Out',
                quantity: Math.abs(stockDiff),
                date: new Date().toISOString().split('T')[0],
                reference: 'Manual Adjustment',
                purpose: stockDiff > 0 ? 'Restock' : 'Sale'
            });
        }

        setShowEditProductModal(false);
        setEditingProduct(null);
        addNotification('Record Updated', `"${editingProduct.name}" modified successfully.`, 'success');
    };

    const performDelete = async () => {
        if (!pendingDelete) return;
        setIsDeleting(true);
        try {
            await removeProduct(pendingDelete.id);
            addNotification('Registry Updated', `"${pendingDelete.name}" has been removed from cloud.`, 'warning');
            setPendingDelete(null);
        } catch (err) {
            console.error("Delete product error:", err);
            addNotification('Database Error', 'Could not remove item.', 'alert');
        } finally {
            setIsDeleting(false);
        }
    };
    const handleQuickUpdate = (id: string, field: string, value: string | number) => {
        const product = products.find(p => p.id === id);
        if (product) {
            updateProduct(id, { ...product, [field]: value });
            addNotification('Registry Adjusted', `Updated ${field} for ${product.name}`, 'success');
        }
        setInlineEdit(null);
    };

    const handleSendForDemo = async () => {
        if (!demoData.productId || demoData.quantity <= 0 || !demoData.clientName) {
            alert("Please fill all details.");
            return;
        }

        const product = products.find(p => p.id === demoData.productId);
        if (!product) return;

        if ((product.stock || 0) < demoData.quantity) {
            alert("Insufficient stock for this operation.");
            return;
        }

        const existingClient = clients.find(c => c.name === demoData.clientName);
        if (!existingClient) {
            addClient({
                id: `CLI-${Date.now()}`,
                name: demoData.clientName,
                hospital: demoData.location || '',
                address: demoData.location || '',
                gstin: '',
                status: 'Finalized'
            });
        }

        await updateProduct(product.id, { stock: (product.stock || 0) - demoData.quantity });
        await addLog('Inventory', 'Demo Dispatch', `Dispatched ${demoData.quantity} units of ${product.name} for demo to ${demoData.clientName} at ${demoData.location}.`);

        recordStockMovement({
            id: `MOV-DEMO-${Date.now()}`,
            productId: product.id,
            productName: product.name,
            type: 'Out',
            quantity: demoData.quantity,
            date: demoData.date,
            reference: `Demo: ${demoData.clientName} ${demoData.location ? `(${demoData.location})` : ''}`,
            purpose: 'Demo'
        });

        setShowDemoModal(false);
        addNotification('Demo Dispatch', `"${product.name}" units sent to ${demoData.clientName}.`, 'info');
        setDemoData({ productId: '', quantity: 1, clientName: '', date: new Date().toISOString().split('T')[0], location: '' });
        setActiveTab('history');
    };

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanQuery.trim()) return;

        const foundProduct = products.find(p => p.sku.toLowerCase() === scanQuery.toLowerCase());

        if (foundProduct) {
            setScannedProduct(foundProduct);
            setScanStatus('found');
            setScanOperation('In');
            setQuickStockAmount(1);
        } else {
            // IF SKU NOT FOUND: Automatically transition to Registration Form with SKU pre-filled
            setShowScanModal(false);
            setNewProduct({
                category: 'Equipment',
                stock: 0,
                unit: 'nos',
                minLevel: 5,
                location: 'Warehouse A',
                sku: scanQuery, // Pre-fill the SKU field
                name: '',
                purchasePrice: 0,
                sellingPrice: 0
            });
            setShowAddProductModal(true);
            addNotification('SKU Not Found', `Initializing registry for SKU: ${scanQuery}`, 'info');
            setScanQuery('');
            setScanStatus('idle');
        }
    };

    const handleStockUpdate = async () => {
        if (!scannedProduct || quickStockAmount <= 0) return;

        let newStock = scannedProduct.stock || 0;
        let lastRestocked = scannedProduct.lastRestocked;

        if (scanOperation === 'In') {
            newStock += quickStockAmount;
            lastRestocked = new Date().toISOString().split('T')[0];
        } else {
            if ((scannedProduct.stock || 0) < quickStockAmount) {
                alert(`Insufficient stock! Current stock is ${scannedProduct.stock}.`);
                return;
            }
            newStock -= quickStockAmount;
        }

        await updateProduct(scannedProduct.id, { stock: newStock, lastRestocked });
        await addLog('Inventory', scanOperation === 'In' ? 'Stock Restock' : 'Stock Dispatch', `${quickStockAmount} ${scannedProduct.unit} of ${scannedProduct.name} ${scanOperation === 'In' ? 'received into' : 'dispatched from'} central registry via scan.`);

        recordStockMovement({
            id: `MOV-SCAN-${Date.now()}`,
            productId: scannedProduct.id,
            productName: scannedProduct.name,
            type: scanOperation,
            quantity: quickStockAmount,
            date: new Date().toISOString().split('T')[0],
            reference: 'Barcode Scan',
            purpose: scanOperation === 'In' ? 'Restock' : 'Sale'
        });

        handleResetScan();
        addNotification('Stock Updated', `${quickStockAmount} units of ${scannedProduct.name} ${scanOperation === 'In' ? 'received' : 'dispatched'}.`, 'success');
    };

    const handleResetScan = () => {
        setScannedProduct(null);
        setScanStatus('idle');
        setScanQuery('');
        setQuickStockAmount(1);
        setTimeout(() => {
            if (scanInputRef.current) scanInputRef.current.focus();
        }, 50);
    };

    // --- REVISED CALCULATION LOGIC REMOVED AND MOVED TO APP HEADER ---

    return (
        <div className="h-full flex flex-col gap-2 md:gap-3 relative overflow-y-auto lg:overflow-hidden p-1.5 md:p-2 min-w-0 w-full">


            {/* Main Inventory Section */}
            <div className="flex-1 bg-white rounded-[2rem] md:rounded-3xl shadow-sm border border-slate-300 flex flex-col overflow-hidden min-h-0 min-w-0 w-full">

                {/* Toolbar with Tabs */}
                <div className="p-2.5 md:p-3 border-b border-slate-300 flex flex-col gap-2 md:gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-3 md:gap-6">
                        <div className="bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit shrink-0 flex gap-1">
                            <button
                                onClick={() => setActiveTab('stock')}
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'stock' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}
                            >
                                <Package size={12} /> Registry
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}
                            >
                                <History size={12} /> Movement
                            </button>
                        </div>

                        <div className="hidden sm:block relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                className="block w-full pl-10 pr-12 py-2 border border-slate-300 bg-slate-50/50 rounded-[2rem] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 sm:w-64 transition-all"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!e.target.value) setServerProducts([]);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
                            />
                        </div>
                    </div>

                    {activeTab === 'stock' && (
                        <div className="flex flex-col gap-3">
                            {/* Mobile Search */}
                            <div className="sm:hidden relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                className="block w-full pl-10 pr-12 py-2 border border-slate-300 bg-slate-50/50 rounded-[2rem] text-xs font-bold focus:outline-none focus:border-emerald-500 transition-all"
                                value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (!e.target.value) setServerProducts([]);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {isSearching ? (
                                        <RotateCcw size={12} className="animate-spin text-emerald-600" />
                                    ) : searchQuery ? (
                                        <button onClick={handleDeepSearch} className="p-1 hover:bg-slate-200 rounded-md transition-colors text-emerald-600">
                                            <ArrowUpRight size={12} />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex flex-row gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShowScanModal(true); handleResetScan(); }}
                                    className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm">
                                    <ScanBarcode size={12} /> Scan
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShowDemoModal(true); }}
                                    className="bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm">
                                    <Send size={12} /> Demo
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShowAddProductModal(true); }}
                                    className="bg-gradient-to-br from-emerald-800 to-emerald-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-[0_8px_16px_-4px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 ml-auto">
                                    <Plus size={12} /> Register
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    {activeTab === 'stock' ? (
                        <table className="w-full text-left text-[11px] text-slate-600 min-w-[1200px] table-fixed">
                             <thead className="bg-[#fcfdfd] text-[8px] sm:text-[9px] md:text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-20 border-b border-slate-300 shadow-[0_1px_0_0_#f1f5f9]">
                                <tr>
                                    <th className="px-3 py-1.5 w-[18%] bg-[#fcfdfd]">Product Master</th>
                                    <th className="px-3 py-1.5 w-[12%] bg-[#fcfdfd]">Cat & SKU</th>
                                    <th className="px-3 py-1.5 w-[12%] bg-[#fcfdfd]">Supplier</th>
                                    <th className="px-3 py-1.5 text-right w-[10%] bg-[#fcfdfd]">Stock</th>
                                    <th className="px-3 py-1.5 text-right w-[10%] bg-[#fcfdfd]">Purchase</th>
                                    <th className="px-3 py-1.5 text-right w-[8%] bg-[#fcfdfd]">Selling</th>
                                    <th className="px-3 py-1.5 text-center w-[6%] bg-[#fcfdfd]">GST</th>
                                    <th className="px-3 py-1.5 text-right w-[10%] bg-[#fcfdfd]">Total Asset</th>
                                    <th className="px-3 py-1.5 w-[10%] bg-[#fcfdfd]">Location</th>
                                    <th className="px-3 py-1.5 w-[10%] bg-[#fcfdfd]">Status</th>
                                    <th className="px-3 py-1.5 text-right w-[100px] bg-[#fcfdfd]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 relative z-10">
                                {filteredProducts.map((product) => {
                                    const stock = product.stock || 0;

                                    const purchasePrice = product.purchasePrice || 0;
                                    const sellingPrice = product.sellingPrice || 0;

                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0">
                                            <td className="px-3 py-1.5 editable-cell" onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'name' }); }}>
                                                {inlineEdit?.id === product.id && inlineEdit.field === 'name' ? (
                                                    <InlineInput value={product.name} onSave={(v) => handleQuickUpdate(product.id, 'name', v)} onCancel={() => setInlineEdit(null)} />
                                                ) : (
                                                    <div className="font-black text-slate-800 truncate text-[11px]" title={product.name}>{product.name}</div>
                                                )}
                                                <div 
                                                    className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate cursor-text"
                                                    onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'model' }); }}
                                                >
                                                    {inlineEdit?.id === product.id && inlineEdit.field === 'model' ? (
                                                        <InlineInput value={product.model || ''} onSave={(v) => handleQuickUpdate(product.id, 'model', v)} onCancel={() => setInlineEdit(null)} className="text-[11px]" />
                                                    ) : (
                                                        product.model || 'Standard Model'
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 editable-cell" onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'category' }); }}>
                                                {inlineEdit?.id === product.id && inlineEdit.field === 'category' ? (
                                                    <InlineInput value={product.category} onSave={(v) => handleQuickUpdate(product.id, 'category', v)} onCancel={() => setInlineEdit(null)} className="text-indigo-600" />
                                                ) : (
                                                    <div className="text-[11px] font-black text-indigo-600 uppercase truncate">{product.category}</div>
                                                )}
                                                <div 
                                                    className="text-[9px] font-mono text-slate-400 mt-0.5 truncate cursor-text"
                                                    onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'sku' }); }}
                                                >
                                                    {inlineEdit?.id === product.id && inlineEdit.field === 'sku' ? (
                                                        <InlineInput value={product.sku} onSave={(v) => handleQuickUpdate(product.id, 'sku', v)} onCancel={() => setInlineEdit(null)} className="text-[11px] font-mono" />
                                                    ) : (
                                                        product.sku
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="flex flex-col gap-1 max-w-[200px]">
                                                    {product.vendors && product.vendors.length > 0 ? (
                                                        product.vendors.map((pv, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 text-[11px] font-bold text-slate-600 truncate bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800/80">
                                                                <Building2 size={8} className="text-slate-400 shrink-0" />
                                                                <span className="truncate">{pv.vendorName}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 w-full overflow-hidden">
                                                            <Building2 size={10} className="shrink-0" />
                                                            <span className="truncate">{product.supplier || 'Not set'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-black text-slate-800 editable-cell" onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'stock' }); }}>
                                                {inlineEdit?.id === product.id && inlineEdit.field === 'stock' ? (
                                                    <InlineInput type="number" value={stock} onSave={(v) => handleQuickUpdate(product.id, 'stock', Number(v))} onCancel={() => setInlineEdit(null)} className="text-right" />
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[11px]">{stock}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase leading-none">{product.unit || 'nos'}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-black text-slate-400 italic">
                                                <div className="flex flex-col gap-1 items-end">
                                                    {product.vendors && product.vendors.length > 0 ? (
                                                        product.vendors.map((pv, idx) => (
                                                            <div key={idx} className="text-[11px] font-black text-rose-600/80">
                                                                ₹{pv.purchasePrice.toLocaleString('en-IN')}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-[11px]">₹{purchasePrice.toLocaleString('en-IN')}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-black text-teal-700 editable-cell" onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'sellingPrice' }); }}>
                                                {inlineEdit?.id === product.id && inlineEdit.field === 'sellingPrice' ? (
                                                    <InlineInput type="number" value={product.sellingPrice || 0} onSave={(v) => handleQuickUpdate(product.id, 'sellingPrice', Number(v))} onCancel={() => setInlineEdit(null)} className="text-right" />
                                                ) : (
                                                    <span className="text-[11px]">₹{sellingPrice.toLocaleString('en-IN')}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-1.5 text-center editable-cell" onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'taxRate' }); }}>
                                                {inlineEdit?.id === product.id && inlineEdit.field === 'taxRate' ? (
                                                    <InlineInput type="number" value={product.taxRate || 0} onSave={(v) => handleQuickUpdate(product.id, 'taxRate', Number(v))} onCancel={() => setInlineEdit(null)} className="text-center" />
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-slate-700 text-[11px]">{product.taxRate || 0}%</span>
                                                        <span className="text-[9px] text-slate-400 font-bold">₹{((sellingPrice * (product.taxRate || 0)) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-black text-medical-800 bg-medical-50/10 text-[11px]">
                                                ₹{(stock * (product.purchasePrice || 0)).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-3 py-1.5 editable-cell" onClick={(e) => { e.stopPropagation(); setInlineEdit({ id: product.id, field: 'location' }); }}>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 truncate">
                                                    <MapPin size={10} className="shrink-0" />
                                                    {inlineEdit?.id === product.id && inlineEdit.field === 'location' ? (
                                                        <InlineInput value={product.location || ''} onSave={(v) => handleQuickUpdate(product.id, 'location', v)} onCancel={() => setInlineEdit(null)} className="text-[11px]" />
                                                    ) : (
                                                        <span className="truncate">{product.location}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="flex items-center gap-1.5 text-emerald-600 text-[9px] md:text-[11px] font-black uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 w-fit">
                                                    <CheckCircle size={10} className="shrink-0" /> <span className="hidden sm:inline">Optimal</span><span className="sm:hidden">OK</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-right">
                                                <div className="relative flex justify-end menu-container">
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setActiveMenuId(activeMenuId === product.id ? null : product.id); 
                                                        }} 
                                                        className={`p-1.5 md:p-2 rounded-[2rem] transition-all ${activeMenuId === product.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                    >
                                                        <RefreshCw size={14} className={activeMenuId === product.id ? 'animate-spin-slow' : ''} />
                                                    </button>
                                                    
                                                    {activeMenuId === product.id && (
                                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-[2rem] shadow-xl border border-slate-200 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                            <div className="p-2 space-y-1">
                                                                <button onClick={() => { handleOpenEdit(product); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-[2rem] transition-colors">
                                                                    <Edit2 size={14} className="text-indigo-500" /> Edit Product
                                                                </button>
                                                                <button onClick={() => { setPendingDelete({ id: product.id, name: product.name }); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-[2rem] transition-colors">
                                                                    <Trash2 size={14} className="text-rose-500" /> Delete Product
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                    </table>
                    ) : (
                        <table className="w-full text-left text-[11px] text-slate-600 min-w-[800px]">
                            <thead className="bg-[#fcfdfd] text-[8px] md:text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-20 border-b border-slate-300 shadow-[0_1px_0_0_#f1f5f9]">
                                <tr>
                                    <th className="px-3 py-1.5 bg-[#fcfdfd]">Date</th>
                                    <th className="px-3 py-1.5 bg-[#fcfdfd]">Nature</th>
                                    <th className="px-3 py-1.5 bg-[#fcfdfd]">Product</th>
                                    <th className="px-3 py-1.5 text-right bg-[#fcfdfd]">Qty</th>
                                    <th className="px-3 py-1.5 bg-[#fcfdfd] font-inter">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 relative z-10">
                                {stockMovements.length > 0 ? (
                                    stockMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((movement) => (
                                        <tr key={movement.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0">
                                            <td className="px-3 py-1.5 text-slate-500 font-bold">{movement.date}</td>
                                            <td className="px-3 py-1.5">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] md:text-[11px] font-black uppercase tracking-wider border ${movement.type === 'In'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : movement.purpose === 'Demo'
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : 'bg-orange-50 text-orange-700 border-orange-200'
                                                    }`}>
                                                    {movement.type === 'In' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                    {movement.type === 'In' ? 'Receipt' : movement.purpose === 'Demo' ? 'Demo' : 'Sales'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5 font-black text-slate-800 truncate max-w-[150px] md:max-w-none">{movement.productName}</td>
                                            <td className="px-3 py-1.5 text-right font-black text-[12px] text-slate-700">
                                                {movement.quantity}
                                            </td>
                                            <td className="px-3 py-1.5 font-mono text-[9px] md:text-[11px] text-slate-400 max-w-xs truncate"><span className="font-inter font-bold tracking-widest">{movement.reference}</span></td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20 text-slate-300 italic font-black uppercase tracking-widest opacity-30">No activity logged in registry</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Purge Item?</h3>
                        <p className="text-slate-500 text-[16px] mt-2 leading-relaxed">
                            Permanently remove <b>{pendingDelete.name}</b> from master inventory? This will impact all stock reports.
                        </p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest">Cancel</button>
                            <button onClick={performDelete} disabled={isDeleting} className="flex-1 py-2 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2">
                                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : "Delete Item"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditProductModal && editingProduct && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Edit Registry Item</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Inventory Adjustment</p>
                            </div>
                            <button onClick={() => setShowEditProductModal(false)}><X size={28} className="text-slate-400 hover:text-slate-600 transition-colors" /></button>
                        </div>
                        <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name *</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none focus:border-medical-500" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                <select className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none appearance-none" value={editingProduct.category || 'Equipment'} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as any })}>
                                    <option>Equipment</option>
                                    <option>Consumable</option>
                                    <option>Spare Part</option>
                                    <option>Pipe Line</option>
                                    <option>Furniture</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Model *</label>
                                    <div className="relative">
                                        <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-[2rem] pl-3 pr-10 py-2 text-[16px] font-bold outline-none" value={editingProduct.sku} onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })} />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (showPrompt) {
                                                    const pwd = await showPrompt("Enter admin password to generate SKU", "Generate SKU", "password");
                                                    if (pwd === "admin") {
                                                        let newSku = "";
                                                        let isDuplicate = true;
                                                        while (isDuplicate) {
                                                            newSku = Math.floor(10000000 + Math.random() * 90000000).toString();
                                                            isDuplicate = products.some(p => p.sku === newSku);
                                                        }
                                                        setEditingProduct({ ...editingProduct, sku: newSku });
                                                        addNotification('SKU Generated', `New SKU ${newSku} generated successfully.`, 'success');
                                                    } else if (pwd !== null) {
                                                        addNotification('Error', 'Incorrect password.', 'error');
                                                    }
                                                }
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full p-1.5 transition-colors"
                                            title="Auto Generate SKU"
                                        >
                                            <ScanBarcode size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Type (nos/pkt)</label>
                                    <input type="text" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none uppercase" value={editingProduct.unit || ''} onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value.toLowerCase() })} placeholder="nos" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selling Rate (₹)</label>
                                <input type="number" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none text-emerald-600" value={editingProduct.sellingPrice || 0} onChange={e => setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })} />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Available Stock</label>
                                    <input type="number" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none text-indigo-600" value={editingProduct.stock || 0} onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Alert Level</label>
                                    <input type="number" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" value={editingProduct.minLevel || 0} onChange={e => setEditingProduct({ ...editingProduct, minLevel: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HSN Code</label>
                                    <input type="text" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" value={editingProduct.hsn || ''} onChange={e => setEditingProduct({ ...editingProduct, hsn: e.target.value })} placeholder="HSN Code" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Percentage (%)</label>
                                    <input type="number" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" value={editingProduct.taxRate || 0} onChange={e => setEditingProduct({ ...editingProduct, taxRate: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Calculation (Selling Price + GST)</label>
                                <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black text-medical-600 flex justify-between items-center">
                                    <span>Calculated Rate:</span>
                                    <span>₹{((editingProduct.sellingPrice || 0) * (1 + (editingProduct.taxRate || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-800">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendors & Purchasing Rates</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAddEditVendor} 
                                        className="text-[10px] font-black text-medical-600 hover:text-medical-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={12} /> Add Vendor entry
                                    </button>
                                </div>
                                {editProductVendors.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {editProductVendors.map((pv, index) => (
                                            <div key={index} className="flex gap-2 items-center w-full min-w-0 animate-in slide-in-from-top-1 duration-75">
                                                <select className="flex-1 min-w-0 bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-xs font-black outline-none focus:border-medical-500 appearance-none"
                                                    value={pv.vendorId}
                                                    onChange={e => handleEditVendorChange(index, 'vendorId', e.target.value)}
                                                >
                                                    <option value="">-- Select Vendor --</option>
                                                    {vendors.map(v => (
                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                    ))}
                                                    {pv.vendorId && !vendors.some(v => v.id === pv.vendorId) && (
                                                        <option value={pv.vendorId}>{pv.vendorName}</option>
                                                    )}
                                                </select>
                                                <div className="relative w-32 shrink-0">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Price" 
                                                        className="w-full bg-white border border-slate-300 rounded-[2rem] pl-6 pr-3 py-2 text-xs font-bold outline-none focus:border-medical-500" 
                                                        value={pv.purchasePrice || ''} 
                                                        onChange={e => handleEditVendorChange(index, 'purchasePrice', Number(e.target.value))} 
                                                    />
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveEditVendor(index)} 
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-colors shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 border border-dashed border-slate-300 rounded-[2rem] text-center text-xs text-slate-400">
                                        No vendors associated yet. Click "Add Vendor entry".
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specifications & Info</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAddEditSpec} 
                                        className="text-[10px] font-black text-medical-600 hover:text-medical-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={12} /> Add Spec Row
                                    </button>
                                </div>
                                {editSpecs.length > 0 ? (
                                    <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-slate-50 p-3 space-y-2.5">
                                        {editSpecs.map((spec, index) => (
                                            <div key={index} className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-75">
                                                <input 
                                                    type="text" 
                                                    placeholder="Spec Name (e.g. Dimensions)" 
                                                    className="flex-1 bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-xs font-bold outline-none focus:border-medical-500" 
                                                    value={spec.key} 
                                                    onChange={e => handleEditSpecChange(index, 'key', e.target.value)} 
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Value (e.g. 10x20 cm)" 
                                                    className="flex-1 bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-xs font-bold outline-none focus:border-medical-500" 
                                                    value={spec.value} 
                                                    onChange={e => handleEditSpecChange(index, 'value', e.target.value)} 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveEditSpec(index)} 
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-colors shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 border border-dashed border-slate-300 rounded-[2rem] text-center text-xs text-slate-400">
                                        No specifications added yet. Click "Add Spec Row" to define technical details.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-300 flex gap-2.5 bg-slate-50/50">
                            <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-4 bg-white border border-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Discard</button>
                            <button onClick={handleUpdateSubmit} className="flex-[2] py-4 bg-medical-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-medical-500/20 active:scale-95 transition-all">Commit Registry Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showAddProductModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Register New Item</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Registry Entry</p>
                            </div>
                            <button onClick={() => setShowAddProductModal(false)}><X size={28} className="text-slate-400" /></button>
                        </div>
                        <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none focus:border-medical-500" placeholder="Product Name *" value={newProduct.name || ''} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-2 text-[16px] font-bold outline-none" placeholder="SKU / Unique ID *" value={newProduct.sku || ''} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} />
                                <select className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none appearance-none" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value as any })}>
                                    <option>Equipment</option><option>Consumable</option><option>Spare Part</option><option>Pipe Line</option><option>Furniture</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Selling Rate (₹) *</label>
                                <input type="number" className="w-full border border-slate-300 bg-white rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none text-emerald-600" placeholder="0.00" value={newProduct.sellingPrice || ''} onChange={e => setNewProduct({ ...newProduct, sellingPrice: Number(e.target.value) })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <input type="number" className="w-full border border-slate-300 bg-white rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" placeholder="Initial Stock" value={newProduct.stock || ''} onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })} />
                                <input type="text" className="w-full border border-slate-300 bg-white rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none uppercase" placeholder="Unit (nos, pkt, mtr)" value={newProduct.unit || ''} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value.toLowerCase() })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <input type="number" className="w-full border border-slate-300 bg-white rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" placeholder="Min Alert Level" value={newProduct.minLevel || ''} onChange={e => setNewProduct({ ...newProduct, minLevel: Number(e.target.value) })} />
                                <input type="text" className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-2 text-[16px] font-bold outline-none" placeholder="Warehouse Location" value={newProduct.location || ''} onChange={e => setNewProduct({ ...newProduct, location: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">HSN Code</label>
                                    <input type="text" className="w-full border border-slate-300 bg-white rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" placeholder="HSN Code" value={newProduct.hsn || ''} onChange={e => setNewProduct({ ...newProduct, hsn: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">GST Percentage (%)</label>
                                    <input type="number" className="w-full border border-slate-300 bg-white rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" placeholder="18" value={newProduct.taxRate || ''} onChange={e => setNewProduct({ ...newProduct, taxRate: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tax Calculation (Selling Price + GST)</label>
                                <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-[2rem] px-3 py-2 text-[16px] font-black text-medical-600 flex justify-between items-center">
                                    <span>Calculated Rate:</span>
                                    <span>₹{((newProduct.sellingPrice || 0) * (1 + (newProduct.taxRate || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-850">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendors & Purchasing Rates</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAddNewVendor} 
                                        className="text-[10px] font-black text-medical-600 hover:text-medical-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={12} /> Add Vendor entry
                                    </button>
                                </div>
                                {newProductVendors.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {newProductVendors.map((pv, index) => (
                                            <div key={index} className="flex gap-2 items-center w-full min-w-0 animate-in slide-in-from-top-1 duration-75">
                                                <select className="flex-1 min-w-0 bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-xs font-black outline-none focus:border-medical-500 appearance-none"
                                                    value={pv.vendorId}
                                                    onChange={e => handleNewVendorChange(index, 'vendorId', e.target.value)}
                                                >
                                                    <option value="">-- Select Vendor --</option>
                                                    {vendors.map(v => (
                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                    ))}
                                                </select>
                                                <div className="relative w-32 shrink-0">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                                    <input 
                                                        type="number" 
                                                        placeholder="Price" 
                                                        className="w-full bg-white border border-slate-300 rounded-[2rem] pl-6 pr-3 py-2 text-xs font-bold outline-none focus:border-medical-500" 
                                                        value={pv.purchasePrice || ''} 
                                                        onChange={e => handleNewVendorChange(index, 'purchasePrice', Number(e.target.value))} 
                                                    />
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveNewVendor(index)} 
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-colors shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 border border-dashed border-slate-300 rounded-[2rem] text-center text-xs text-slate-400">
                                        No vendors associated yet. Click "Add Vendor entry".
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Specifications & Info</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAddNewSpec} 
                                        className="text-[10px] font-black text-medical-600 hover:text-medical-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={12} /> Add Spec Row
                                    </button>
                                </div>
                                {newSpecs.length > 0 ? (
                                    <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-slate-50 p-3 space-y-2.5">
                                        {newSpecs.map((spec, index) => (
                                            <div key={index} className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-75">
                                                <input 
                                                    type="text" 
                                                    placeholder="Spec Name (e.g. Dimensions)" 
                                                    className="flex-1 bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-xs font-bold outline-none focus:border-medical-500" 
                                                    value={spec.key} 
                                                    onChange={e => handleNewSpecChange(index, 'key', e.target.value)} 
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Value (e.g. 10x20 cm)" 
                                                    className="flex-1 bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-xs font-bold outline-none focus:border-medical-500" 
                                                    value={spec.value} 
                                                    onChange={e => handleNewSpecChange(index, 'value', e.target.value)} 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveNewSpec(index)} 
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-colors shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 border border-dashed border-slate-300 rounded-[2rem] text-center text-xs text-slate-400">
                                        No specifications added yet. Click "Add Spec Row" to define technical details.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-300 flex gap-2.5 bg-slate-50/50">
                            <button onClick={() => setShowAddProductModal(false)} className="flex-1 py-4 bg-white border border-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Cancel</button>
                            <button onClick={handleSaveProduct} className="flex-[2] py-4 bg-medical-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Initialize Item</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scan Barcode Modal */}
            {showScanModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Barcode Scanner</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual SKU Entry / Scan Simulation</p>
                            </div>
                            <button onClick={() => setShowScanModal(false)}><X size={28} className="text-slate-400" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            {scanStatus === 'idle' && (
                                <form onSubmit={handleScanSubmit} className="space-y-4">
                                    <div className="p-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                                        <ScanBarcode size={64} className="mb-4 opacity-40 animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Awaiting SKU Signal...</p>
                                    </div>
                                    <input
                                        ref={scanInputRef}
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] px-3 py-4 text-center text-lg font-playfair font-bold tracking-tight tracking-widest outline-none focus:border-medical-500"
                                        placeholder="ENTER SKU MANUALLY"
                                        value={scanQuery}
                                        onChange={e => setScanQuery(e.target.value)}
                                        autoFocus
                                    />
                                    <button type="submit" className="w-full py-4 bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-lg">Verify SKU</button>
                                </form>
                            )}

                            {scanStatus === 'found' && scannedProduct && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-800 flex items-center gap-2.5">
                                        <div className="p-3 bg-emerald-500 text-white rounded-[2rem] shadow-lg"><Package size={24} /></div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-emerald-900 dark:text-emerald-100 truncate text-[16px] uppercase">{scannedProduct.name}</h4>
                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Stock: {scannedProduct.stock || 0} {scannedProduct.unit}</p>
                                        </div>
                                    </div>

                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem]">
                                        <button onClick={() => setScanOperation('In')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all ${scanOperation === 'In' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}>Stock In</button>
                                        <button onClick={() => setScanOperation('Out')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all ${scanOperation === 'Out' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Stock Out</button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setQuickStockAmount(Math.max(1, quickStockAmount - 1))} className="w-12 h-12 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black">-</button>
 <input type="number" className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] py-2 text-center font-bold text-xl tracking-tight tracking-tight" value={quickStockAmount} onChange={e => setQuickStockAmount(Number(e.target.value))} />
                                            <button onClick={() => setQuickStockAmount(quickStockAmount + 1)} className="w-12 h-12 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black">+</button>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={handleResetScan} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-[2rem] font-black uppercase text-[10px] tracking-widest">Reset</button>
                                        <button onClick={handleStockUpdate} className={`flex-[2] py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white shadow-lg ${scanOperation === 'In' ? 'bg-emerald-600' : 'bg-orange-600'}`}>Process {scanOperation}</button>
                                    </div>
                                </div>
                            )}

                            {scanStatus === 'not-found' && (
                                <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
                                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm"><AlertTriangle size={40} /></div>
                                    <div>
                                        <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-lg">Unrecognized SKU</h4>
                                        <p className="text-xs text-slate-400 font-bold mt-2 px-6">The scanned identifier "{scanQuery}" does not match any items in the master registry.</p>
                                    </div>
                                    <button onClick={handleResetScan} className="w-full py-4 bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl">Retry Scan</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Send for Demo Modal */}
            {showDemoModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Demo Dispatch</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Temporary Equipment Assignment</p>
                            </div>
                            <button onClick={() => setShowDemoModal(false)}><X size={28} className="text-slate-400" /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Equipment *</label>
                                <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] px-3 py-2 text-[16px] font-bold outline-none appearance-none" value={demoData.productId} onChange={e => setDemoData({ ...demoData, productId: e.target.value })}>
                                    <option value="">Choose item from stock...</option>
                                    {products.filter(p => (p.stock || 0) > 0).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock || 0} {p.unit})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispatch Units</label>
                                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none" value={demoData.quantity} onChange={e => setDemoData({ ...demoData, quantity: Number(e.target.value) })} min={1} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispatch Date</label>
                                    <input type="date" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] px-3 py-2 text-[16px] font-bold outline-none" value={demoData.date} onChange={e => setDemoData({ ...demoData, date: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Client / Hospital *</label>
                                <AutoSuggest
                                    value={demoData.clientName || ''}
                                    onChange={val => setDemoData({ ...demoData, clientName: val })}
                                    onSelect={client => setDemoData({ ...demoData, clientName: client.name })}
                                    suggestions={clients}
                                    filterKey="name"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] px-3 py-2 text-[16px] font-black outline-none"
                                    placeholder="Search customer index..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Location</label>
                                <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] px-3 py-2 text-[16px] font-bold outline-none" placeholder="Installation Point" value={demoData.location} onChange={e => setDemoData({ ...demoData, location: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-300 dark:border-slate-800 flex gap-2.5 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={() => setShowDemoModal(false)} className="flex-1 py-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Cancel</button>
                            <button onClick={handleSendForDemo} className="flex-[2] py-4 bg-purple-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 active:scale-95 transition-all">Authorize Dispatch</button>
                        </div>
                    </div>
                </div>
            )}
            <datalist id="vendor-list">
                {vendors.map(v => (
                    <option key={v.id} value={v.name}>
                        {v.gstin ? `GST: ${v.gstin}` : ''}
                    </option>
                ))}
            </datalist>
        </div>
    );
};
