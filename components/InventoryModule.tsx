import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, ProductVendorInfo } from '../types';
import { Package, AlertTriangle, Search, X, CheckCircle, Trash2, Plus, History, ScanBarcode, Send, Building2, MapPin, Edit2, RefreshCw, ArrowUpRight, ArrowDownLeft, RotateCcw, FileText, Eye, EyeOff, ChevronDown, ChevronRight, Barcode, Info, Tag, Layers } from 'lucide-react';
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
    const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
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

    // Advanced Hierarchical Form States
    const [hierarchicalSubcategory, setHierarchicalSubcategory] = useState('');
    const [hierarchicalBrands, setHierarchicalBrands] = useState<any[]>([]); // Array of BrandDetail
    const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
    const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
    const [expandedProductsTree, setExpandedProductsTree] = useState<Record<string, boolean>>({});

    // Dynamic autocomplete helper states
    const [categoriesIndex, setCategoriesIndex] = useState<string[]>(['Equipment', 'Consumable', 'Spare Part', 'Pipe Line', 'Furniture']);

    useEffect(() => {
        if (showAddProductModal) {
            setNewSpecs([]);
            setNewProductVendors([]);
            setHierarchicalSubcategory('');
            setHierarchicalBrands([]);
            setExpandedBrands({});
            setExpandedModels({});
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

    const inventorySummary = useMemo(() => {
        let totalAssetValue = 0;
        let totalItemsCount = 0;

        products.forEach(product => {
            let pStock = 0;
            let pAsset = 0;

            if (product.brands && product.brands.length > 0) {
                product.brands.forEach(brand => {
                    if (brand.models) {
                        brand.models.forEach(model => {
                            if (model.vendors) {
                                model.vendors.forEach(v => {
                                    pStock += Number(v.stock || 0);
                                    pAsset += Number(v.stock || 0) * Number(v.purchasePrice || 0);
                                });
                            }
                        });
                    }
                });
            } else {
                pStock = Number(product.stock || 0);
                pAsset = pStock * Number(product.purchasePrice || 0);
            }
            totalAssetValue += pAsset;
            totalItemsCount += pStock;
        });

        return { totalAssetValue, totalItemsCount };
    }, [products]);

    // Filtered Products for Search
    const filteredProducts = useMemo(() => {
        const list = serverProducts.length > 0 ? serverProducts : products;
        const baseList = list.map(item => {
            const realTime = products.find(p => p.id === item.id);
            return realTime ? realTime : item;
        });
        
        if (serverProducts.length > 0) return baseList;
        
        return baseList.filter(p => {
            const q = searchQuery.toLowerCase();
            const matchesBasic = (
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
                (p.supplier && p.supplier.toLowerCase().includes(q)) ||
                (p.model && p.model.toLowerCase().includes(q)) ||
                (p.location && p.location.toLowerCase().includes(q)) ||
                (p.hsn && p.hsn.toLowerCase().includes(q))
            );
            if (matchesBasic) return true;

            const matchesVendors = p.vendors?.some(v => 
                v.vendorName.toLowerCase().includes(q) || 
                v.vendorId.toLowerCase().includes(q)
            );
            if (matchesVendors) return true;

            const matchesBrands = p.brands?.some(b => 
                b.name.toLowerCase().includes(q) ||
                b.models?.some(m => 
                    m.name.toLowerCase().includes(q) ||
                    m.hsnCode?.toLowerCase().includes(q) ||
                    m.category?.toLowerCase().includes(q) ||
                    m.description?.toLowerCase().includes(q) ||
                    m.vendors?.some(mv => mv.vendorName.toLowerCase().includes(q) || mv.sku.toLowerCase().includes(q))
                )
            );
            return !!matchesBrands;
        });
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
        if (!newProduct.name || !newProduct.sku) {
            alert("Please fill Name and SKU.");
            return;
        }

        // Validate duplicates
        if (hierarchicalBrands && hierarchicalBrands.length > 0) {
            for (const brand of hierarchicalBrands) {
                for (const model of brand.models || []) {
                    const isDup = products.some(p => 
                        p.name.trim().toLowerCase() === newProduct.name!.trim().toLowerCase() &&
                        (p.brands || []).some(b => 
                            b.name.trim().toLowerCase() === brand.name.trim().toLowerCase() &&
                            (b.models || []).some(m => m.name.trim().toLowerCase() === model.name.trim().toLowerCase())
                        )
                    );
                    if (isDup) {
                        alert(`Duplicate Entry Warning: The combination of Product "${newProduct.name}", Brand "${brand.name}", and Model "${model.name}" already exists!`);
                        return;
                    }
                }
            }
        }

        const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const specsRecord: Record<string, string> = {};
        newSpecs.forEach(item => {
            if (item.key.trim()) {
                specsRecord[item.key.trim()] = item.value;
            }
        });

        // Compute aggregate stock/prices from all nested model-vendors
        let totalStock = Number(newProduct.stock) || 0;
        let avgPurchasePrice = Number(newProduct.purchasePrice) || 0;
        let avgSellingPrice = Number(newProduct.sellingPrice) || 0;

        if (hierarchicalBrands && hierarchicalBrands.length > 0) {
            let modelVendorCount = 0;
            let stockSum = 0;
            let purchaseSum = 0;
            let sellingSum = 0;

            hierarchicalBrands.forEach(b => {
                (b.models || []).forEach((m: any) => {
                    (m.vendors || []).forEach((v: any) => {
                        stockSum += Number(v.stock || 0);
                        purchaseSum += Number(v.purchasePrice || 0);
                        sellingSum += Number(v.sellingPrice || 0);
                        modelVendorCount++;
                    });
                });
            });

            if (modelVendorCount > 0) {
                totalStock = stockSum;
                avgPurchasePrice = Math.round(purchaseSum / modelVendorCount);
                avgSellingPrice = Math.round(sellingSum / modelVendorCount);
            }
        }

        const validVendors = newProductVendors.filter(v => v.vendorName.trim() !== '');
        const primarySupplier = validVendors.length > 0 ? validVendors[0].vendorName : (newProduct.supplier || '');

        const productToAdd: Product = {
            id: `P-${Date.now()}-${shortId}`,
            name: newProduct.name!,
            category: newProduct.category as 'Equipment' | 'Consumable' | 'Spare Part' | 'Pipe Line' | 'Furniture' || 'Equipment',
            subcategory: hierarchicalSubcategory || '',
            sku: newProduct.sku!,
            stock: totalStock,
            unit: newProduct.unit || 'nos',
            purchasePrice: avgPurchasePrice || newProduct.purchasePrice || 0,
            sellingPrice: avgSellingPrice || newProduct.sellingPrice || 0,
            minLevel: Number(newProduct.minLevel) || 5,
            location: newProduct.location || 'Unassigned',
            hsn: newProduct.hsn || '',
            taxRate: newProduct.taxRate || 18,
            model: newProduct.model || '',
            description: newSpecs.map(s => `${s.key}: ${s.value}`).join('\n') || newProduct.description || '',
            specs: specsRecord,
            supplier: primarySupplier,
            vendors: validVendors,
            lastRestocked: totalStock > 0 ? new Date().toISOString().split('T')[0] : '',
            brands: hierarchicalBrands || []
        };

        await addProduct(productToAdd);
        await addLog('Inventory', 'Product Initialization', `New product master record created: ${productToAdd.name} (${productToAdd.sku}) with initial stock of ${productToAdd.stock} ${productToAdd.unit}.`);

        if (totalStock > 0) {
            await recordStockMovement({
                id: `MOV-INIT-${Date.now()}`,
                productId: productToAdd.id,
                productName: productToAdd.name,
                type: 'In',
                quantity: totalStock,
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
        setHierarchicalSubcategory('');
        setHierarchicalBrands([]);
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
        setHierarchicalSubcategory(product.subcategory || '');
        setHierarchicalBrands(product.brands || []);
        setShowEditProductModal(true);
    };

    const handleUpdateSubmit = async () => {
        if (!editingProduct) return;
        if (!editingProduct.name || !editingProduct.sku) {
            alert("Name and SKU are required.");
            return;
        }

        const originalProduct = products.find(p => p.id === editingProduct.id);

        const specsRecord: Record<string, string> = {};
        editSpecs.forEach(item => {
            if (item.key.trim()) {
                specsRecord[item.key.trim()] = item.value;
            }
        });

        // Compute aggregate stock/prices from all nested model-vendors
        let totalStock = Number(editingProduct.stock) || 0;
        let avgPurchasePrice = Number(editingProduct.purchasePrice) || 0;
        let avgSellingPrice = Number(editingProduct.sellingPrice) || 0;

        if (hierarchicalBrands && hierarchicalBrands.length > 0) {
            let modelVendorCount = 0;
            let stockSum = 0;
            let purchaseSum = 0;
            let sellingSum = 0;

            hierarchicalBrands.forEach(b => {
                (b.models || []).forEach((m: any) => {
                    (m.vendors || []).forEach((v: any) => {
                        stockSum += Number(v.stock || 0);
                        purchaseSum += Number(v.purchasePrice || 0);
                        sellingSum += Number(v.sellingPrice || 0);
                        modelVendorCount++;
                    });
                });
            });

            if (modelVendorCount > 0) {
                totalStock = stockSum;
                avgPurchasePrice = Math.round(purchaseSum / modelVendorCount);
                avgSellingPrice = Math.round(sellingSum / modelVendorCount);
            }
        }

        const stockDiff = totalStock - (originalProduct?.stock || 0);
        const validVendors = editProductVendors.filter(v => v.vendorName.trim() !== '');
        const primarySupplier = validVendors.length > 0 ? validVendors[0].vendorName : (editingProduct.supplier || '');

        await updateProduct(editingProduct.id, {
            ...editingProduct,
            stock: totalStock,
            purchasePrice: avgPurchasePrice || editingProduct.purchasePrice || 0,
            sellingPrice: avgSellingPrice || editingProduct.sellingPrice || 0,
            minLevel: Number(editingProduct.minLevel || 0),
            description: editSpecs.map(s => `${s.key}: ${s.value}`).join('\n') || editingProduct.description || '',
            specs: specsRecord,
            supplier: primarySupplier,
            vendors: validVendors,
            subcategory: hierarchicalSubcategory || '',
            brands: hierarchicalBrands || []
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
        setHierarchicalSubcategory('');
        setHierarchicalBrands([]);
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
            updateProduct(id, { [field]: value });
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

            {/* Dashboard Summary */}
            <div className="bg-gradient-to-r from-emerald-900 to-indigo-900 rounded-3xl p-4 sm:p-5 shadow-[0_15px_30px_-10px_rgba(6,78,59,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-emerald-300">
                        <Package size={18} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Total Inventory Value (Total Assets)</h4>
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                            ₹{inventorySummary.totalAssetValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 pl-0 sm:pl-5">
                    <div>
                        <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Total Items (Stock)</h4>
                        <div className="text-lg font-black text-slate-100">{inventorySummary.totalItemsCount.toLocaleString('en-IN')} NOS</div>
                    </div>
                </div>
            </div>

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
                        <table className="w-full text-left text-[11px] text-slate-600 min-w-[1200px]">
                             <thead className="bg-[#fcfdfd] text-[8px] sm:text-[9px] md:text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-20 border-b border-slate-300 shadow-[0_1px_0_0_#f1f5f9]">
                                <tr>
                                    <th className="px-3 py-1.5 w-[25%] bg-[#fcfdfd]">Product Master</th>
                                    <th className="px-3 py-1.5 w-[10%] bg-[#fcfdfd]">Cat & SKU</th>
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
                                    let calculatedStock = 0;
                                    let calculatedAsset = 0;
                                    let purchasePricesList: number[] = [];
                                    let sellingPricesList: number[] = [];
                                    let locationsList: string[] = [];

                                    if (product.location) locationsList.push(product.location);
                                    if (product.godown && !locationsList.includes(product.godown)) locationsList.push(product.godown);
                                    
                                    if (product.brands && product.brands.length > 0) {
                                        product.brands.forEach(brand => {
                                            if (brand.models) {
                                                brand.models.forEach(model => {
                                                    if (model.shelfNumber && !locationsList.includes(model.shelfNumber)) locationsList.push(model.shelfNumber);
                                                    if (model.boxNumber && !locationsList.includes(model.boxNumber)) locationsList.push(model.boxNumber);

                                                    if (model.vendors && model.vendors.length > 0) {
                                                        model.vendors.forEach(v => {
                                                            const vStock = Number(v.stock || 0);
                                                            const vPPrice = Number(v.purchasePrice || 0);
                                                            const vSPrice = Number(v.sellingPrice || 0);
                                                            calculatedStock += vStock;
                                                            calculatedAsset += vStock * vPPrice;
                                                            if (vPPrice > 0) purchasePricesList.push(vPPrice);
                                                            if (vSPrice > 0) sellingPricesList.push(vSPrice);
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        calculatedStock = Number(product.stock || 0);
                                        calculatedAsset = calculatedStock * Number(product.purchasePrice || 0);
                                        if (product.purchasePrice) purchasePricesList.push(Number(product.purchasePrice));
                                        if (product.sellingPrice) sellingPricesList.push(Number(product.sellingPrice));

                                        if (product.vendors && product.vendors.length > 0) {
                                            product.vendors.forEach(pv => {
                                                if (pv.purchasePrice) purchasePricesList.push(Number(pv.purchasePrice));
                                            });
                                        }
                                    }

                                    // Fallback to top-level prices if arrays are empty
                                    if (purchasePricesList.length === 0 && (product.purchasePrice || 0) > 0) {
                                        purchasePricesList.push(Number(product.purchasePrice));
                                    }
                                    if (sellingPricesList.length === 0 && (product.sellingPrice || 0) > 0) {
                                        sellingPricesList.push(Number(product.sellingPrice));
                                    }

                                    const stock = calculatedStock;
                                    const avgPurchasePrice = purchasePricesList.length > 0 
                                        ? purchasePricesList.reduce((a, b) => a + b, 0) / purchasePricesList.length 
                                        : Number(product.purchasePrice || 0);
                                    const avgSellingPrice = sellingPricesList.length > 0 
                                        ? sellingPricesList.reduce((a, b) => a + b, 0) / sellingPricesList.length 
                                        : Number(product.sellingPrice || 0);
                                    const displayLocation = locationsList.length > 0 ? locationsList.join(' • ') : (product.location || 'Warehouse A');
                                    const isExpanded = !!expandedProductsTree[product.id];

                                    return (
                                        <React.Fragment key={product.id}>
                                            <tr className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0" onClick={() => setExpandedProductsTree({ ...expandedProductsTree, [product.id]: !isExpanded })}>
                                                <td className="px-3 py-1.5 editable-cell">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400 shrink-0">
                                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="font-black text-slate-800 text-[11px] whitespace-normal break-words" title={product.name}>{product.name}</div>
                                                            {product.subcategory && (
                                                                <div className="text-[8px] text-indigo-500 font-bold uppercase whitespace-normal break-words">{product.subcategory}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <div className="text-[11px] font-black text-indigo-600 uppercase truncate">{product.category}</div>
                                                    <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">{product.sku}</div>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <div className="flex flex-col gap-1 max-w-[200px]">
                                                        {product.brands && product.brands.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {product.brands.map((b, idx) => (
                                                                    <span key={idx} className="text-[8px] font-black uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{b.name}</span>
                                                                ))}
                                                            </div>
                                                        ) : product.vendors && product.vendors.length > 0 ? (
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
                                                <td className="px-3 py-1.5 text-right font-black text-slate-800">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[11px]">{stock}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase leading-none">{product.unit || 'nos'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-right font-black text-slate-400 italic">
                                                    <span className="text-[11px]">
                                                        {avgPurchasePrice > 0 ? `₹${Math.round(avgPurchasePrice).toLocaleString('en-IN')}` : '₹0'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right font-black text-teal-700">
                                                    <span className="text-[11px]">
                                                        {avgSellingPrice > 0 ? `₹${Math.round(avgSellingPrice).toLocaleString('en-IN')}` : '₹0'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-slate-700 text-[11px]">{product.taxRate || 0}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-right font-black text-medical-800 bg-medical-50/10 text-[11px]">
                                                    ₹{calculatedAsset.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 truncate" title={displayLocation}>
                                                        <MapPin size={10} className="shrink-0" />
                                                        <span className="truncate max-w-[120px]">{displayLocation}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <div className="flex items-center gap-1.5 text-emerald-600 text-[9px] md:text-[11px] font-black uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 w-fit">
                                                        <CheckCircle size={10} className="shrink-0" /> <span className="hidden sm:inline">Optimal</span><span className="sm:hidden">OK</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="relative flex items-center justify-end gap-1 menu-container">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDetailsProduct(product);
                                                            }}
                                                            title="View Full Brand, Model & Supplier Details"
                                                            className="p-1.5 md:p-2 rounded-[2rem] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-wider shadow-sm"
                                                        >
                                                            <Eye size={13} />
                                                            <span className="hidden sm:inline">View</span>
                                                        </button>

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
                                                            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                <div className="p-2 space-y-1">
                                                                    <button onClick={() => { setDetailsProduct(product); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-[2rem] transition-colors">
                                                                        <Eye size={14} className="text-indigo-500" /> View Details
                                                                    </button>
                                                                    <button onClick={() => { handleOpenEdit(product); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-[2rem] transition-colors">
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

                                            {/* Expandable Hierarchical Brand → Model → Vendor Tree or Direct Specs / Suppliers */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/70 dark:bg-slate-850">
                                                    <td colSpan={11} className="p-4 pl-6 md:pl-10">
                                                        <div className="space-y-4 border-l-2 border-indigo-400 pl-4 py-1">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Layers size={14} className="text-indigo-600" />
                                                                    <h5 className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">Product Master Breakdown & Hierarchy</h5>
                                                                </div>
                                                                <button
                                                                    onClick={() => setDetailsProduct(product)}
                                                                    className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-[2rem] uppercase tracking-wider flex items-center gap-1 transition-all"
                                                                >
                                                                    <Eye size={11} /> Open Full Details Modal
                                                                </button>
                                                            </div>

                                                            {/* If product has brands & models */}
                                                            {product.brands && product.brands.length > 0 ? (
                                                                <div className="space-y-3">
                                                                    {product.brands.map((brand: any) => (
                                                                        <div key={brand.id} className="space-y-2 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Brand</span>
                                                                                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase">{brand.name || 'Generic / Unbranded'}</span>
                                                                                </div>
                                                                                <span className="text-[9px] font-bold text-slate-400">{(brand.models || []).length} Models</span>
                                                                            </div>

                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                                                                {(brand.models || []).map((model: any) => (
                                                                                    <div key={model.id} className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                                                                                        <div className="flex justify-between items-start border-b border-slate-200/60 pb-1.5">
                                                                                            <div>
                                                                                                <div className="font-black text-[11px] text-indigo-600 uppercase flex items-center gap-1.5">
                                                                                                    <Tag size={11} /> {model.name || 'Standard Model'}
                                                                                                </div>
                                                                                                {model.category && (
                                                                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">{model.category}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            {model.hsnCode && (
                                                                                                <span className="text-[8px] font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border text-slate-500">HSN: {model.hsnCode}</span>
                                                                                            )}
                                                                                        </div>

                                                                                        {model.description && (
                                                                                            <p className="text-[9px] text-slate-600 dark:text-slate-300 italic line-clamp-2">{model.description}</p>
                                                                                        )}

                                                                                        {/* Specs */}
                                                                                        {model.specs && model.specs.length > 0 && (
                                                                                            <div className="text-[9px] space-y-1">
                                                                                                <span className="font-black text-slate-400 uppercase text-[8px] tracking-wider">Specifications:</span>
                                                                                                <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                                                                                    {model.specs.map((spec: any, idx: number) => (
                                                                                                        <div key={idx} className="truncate" title={`${spec.key}: ${spec.value}`}>
                                                                                                            <span className="font-bold text-slate-400">{spec.key}:</span> <span className="font-black text-slate-700 dark:text-slate-200">{spec.value}</span>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Vendors pricing details */}
                                                                                        {model.vendors && model.vendors.length > 0 ? (
                                                                                            <div className="text-[9px] space-y-1">
                                                                                                <span className="font-black text-slate-400 uppercase text-[8px] tracking-wider flex items-center gap-1">
                                                                                                    <Building2 size={10} /> Suppliers & Stock:
                                                                                                </span>
                                                                                                <div className="space-y-1">
                                                                                                    {model.vendors.map((v: any, idx: number) => (
                                                                                                        <div key={idx} className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5">
                                                                                                            <div className="flex justify-between items-center font-black text-slate-700 dark:text-slate-200">
                                                                                                                <span className="truncate max-w-[130px] flex items-center gap-1">
                                                                                                                    <Building2 size={9} className="text-slate-400" /> {v.vendorName || 'Supplier'}
                                                                                                                </span>
                                                                                                                <span className="text-emerald-600 text-[8px] font-black bg-emerald-50 px-1 py-0.2 rounded">Stock: {v.stock}</span>
                                                                                                            </div>
                                                                                                            <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold">
                                                                                                                <span>SKU: <span className="font-mono text-slate-700 dark:text-slate-300">{v.sku || '—'}</span></span>
                                                                                                                <span>P: <b className="text-slate-700 dark:text-slate-200">₹{v.purchasePrice}</b> | S: <b className="text-teal-700">₹{v.sellingPrice}</b></span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="text-[8px] text-slate-400 italic">No specific supplier mapped to this model</div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                /* Non-hierarchical / standard product details fallback */
                                                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Model / Reference</span>
                                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 block">{product.model || 'Standard'}</span>
                                                                        </div>
                                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Primary Supplier</span>
                                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-1">
                                                                                <Building2 size={12} className="text-slate-400" /> {product.supplier || 'Not Specified'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Storage / Godown</span>
                                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-1">
                                                                                <MapPin size={12} className="text-slate-400" /> {product.location || 'Warehouse A'} {product.godown ? `(${product.godown})` : ''}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {product.vendors && product.vendors.length > 0 && (
                                                                        <div className="space-y-1.5">
                                                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Associated Suppliers ({product.vendors.length})</span>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                                                {product.vendors.map((pv, idx) => (
                                                                                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px]">
                                                                                        <span className="font-black text-slate-700 dark:text-slate-200 flex items-center gap-1 truncate">
                                                                                            <Building2 size={10} className="text-slate-400" /> {pv.vendorName}
                                                                                        </span>
                                                                                        {pv.purchasePrice > 0 && (
                                                                                            <span className="font-bold text-slate-500">₹{pv.purchasePrice}</span>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {product.specs && Object.keys(product.specs).length > 0 && (
                                                                        <div className="space-y-1">
                                                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Technical Specifications</span>
                                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                                {Object.entries(product.specs).map(([k, v], idx) => (
                                                                                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[9px]">
                                                                                        <span className="font-bold text-slate-400 block">{k}:</span>
                                                                                        <span className="font-black text-slate-700 dark:text-slate-200">{v}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
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

            {/* Edit Product Modal (Hierarchical Builder Wizard) */}
            {showEditProductModal && editingProduct && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase">Edit Hierarchical Product</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Category → Subcategory → Product → Brand → Model → Vendor</p>
                            </div>
                            <button onClick={() => setShowEditProductModal(false)}><X size={28} className="text-slate-400 hover:text-slate-655" /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Step 1: Base Product Master */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">1. Master Product Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Product Name *</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2.5 text-xs font-black outline-none focus:border-medical-500" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5 font-bold">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category *</label>
                                        <select className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2.5 text-xs font-black outline-none appearance-none" value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as any })}>
                                            <option>Equipment</option>
                                            <option>Consumable</option>
                                            <option>Spare Part</option>
                                            <option>Pipe Line</option>
                                            <option>Furniture</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Subcategory</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2.5 text-xs font-black outline-none focus:border-medical-500" value={hierarchicalSubcategory} onChange={e => setHierarchicalSubcategory(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                    <div className="space-y-1.5 relative">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Product SKU *</label>
                                        <div className="relative">
                                            <input type="text" className="w-full border border-slate-355 bg-white rounded-[2rem] pl-4 pr-10 py-2 text-xs font-bold outline-none" value={editingProduct.sku} onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })} />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    let newSku = Math.floor(10000000 + Math.random() * 90000000).toString();
                                                    while (products.some(p => p.sku === newSku)) {
                                                        newSku = Math.floor(10000000 + Math.random() * 90000000).toString();
                                                    }
                                                    setEditingProduct({ ...editingProduct, sku: newSku });
                                                    addNotification('SKU Generated', `New SKU ${newSku} generated successfully.`, 'success');
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full p-1.5 transition-colors"
                                                title="Generate SKU"
                                            >
                                                <ScanBarcode size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unit Type</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2 text-xs font-black outline-none" value={editingProduct.unit} onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value.toLowerCase() })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">HSN Code</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2 text-xs font-black outline-none" value={editingProduct.hsn || ''} onChange={e => setEditingProduct({ ...editingProduct, hsn: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Min Level</label>
                                        <input type="number" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2 text-xs font-black outline-none" value={editingProduct.minLevel || ''} onChange={e => setEditingProduct({ ...editingProduct, minLevel: Number(e.target.value) })} />
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Brands & Models Specification Builder */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">2. Brand & Model Hierarchy Configuration</h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newBrandId = `B-${Date.now()}`;
                                            setHierarchicalBrands([...hierarchicalBrands, { id: newBrandId, name: '', models: [] }]);
                                            setExpandedBrands({ ...expandedBrands, [newBrandId]: true });
                                        }}
                                        className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={10} /> Add Brand
                                    </button>
                                </div>

                                {hierarchicalBrands.length === 0 ? (
                                    <div className="p-8 border border-dashed border-slate-300 rounded-[2rem] text-center text-xs text-slate-400">
                                        No brands defined yet. Click "Add Brand" to build your hierarchical tree.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {hierarchicalBrands.map((brand, bIdx) => (
                                            <div key={brand.id} className="border border-slate-200 dark:border-slate-800 rounded-[1.5rem] bg-slate-50/50 p-4 space-y-3">
                                                <div className="flex justify-between items-center gap-4">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedBrands({ ...expandedBrands, [brand.id]: !expandedBrands[brand.id] })}
                                                            className="p-1 hover:bg-slate-200 rounded"
                                                        >
                                                            {expandedBrands[brand.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            placeholder="Brand Name (e.g. Philips, GE)"
                                                            className="flex-1 max-w-xs border border-slate-300 bg-white rounded-[2rem] px-3 py-1.5 text-xs font-black outline-none focus:border-medical-500"
                                                            value={brand.name}
                                                            onChange={e => {
                                                                const updated = [...hierarchicalBrands];
                                                                updated[bIdx].name = e.target.value;
                                                                setHierarchicalBrands(updated);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const modelId = `M-${Date.now()}`;
                                                                const updated = [...hierarchicalBrands];
                                                                updated[bIdx].models.push({
                                                                    id: modelId,
                                                                    name: '',
                                                                    specs: [],
                                                                    description: '',
                                                                    vendors: [],
                                                                    images: [],
                                                                    documents: []
                                                                });
                                                                setHierarchicalBrands(updated);
                                                                setExpandedBrands({ ...expandedBrands, [brand.id]: true });
                                                                setExpandedModels({ ...expandedModels, [modelId]: true });
                                                            }}
                                                            className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1 uppercase tracking-wider flex items-center gap-0.5"
                                                        >
                                                            <Plus size={10} /> Add Model
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setHierarchicalBrands(hierarchicalBrands.filter(b => b.id !== brand.id));
                                                            }}
                                                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Models render */}
                                                {expandedBrands[brand.id] && (
                                                    <div className="pl-6 border-l-2 border-slate-200 space-y-3 mt-2">
                                                        {brand.models.map((model: any, mIdx: number) => (
                                                            <div key={model.id} className="bg-white rounded-xl p-3 border border-slate-200 space-y-3">
                                                                <div className="flex justify-between items-center gap-3">
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedModels({ ...expandedModels, [model.id]: !expandedModels[model.id] })}
                                                                            className="p-1 hover:bg-slate-100 rounded"
                                                                        >
                                                                            {expandedModels[model.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                        </button>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Model Name / Reference Number"
                                                                            className="flex-1 max-w-xs border border-slate-200 bg-slate-50 rounded-[2rem] px-3 py-1 text-xs font-bold outline-none"
                                                                            value={model.name}
                                                                            onChange={e => {
                                                                                const updated = [...hierarchicalBrands];
                                                                                updated[bIdx].models[mIdx].name = e.target.value;
                                                                                setHierarchicalBrands(updated);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...hierarchicalBrands];
                                                                            updated[bIdx].models = updated[bIdx].models.filter((m: any) => m.id !== model.id);
                                                                            setHierarchicalBrands(updated);
                                                                        }}
                                                                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>

                                                                {expandedModels[model.id] && (
                                                                    <div className="pl-4 space-y-3 border-l border-slate-100 mt-2">
                                                                        
                                                                        {/* Specifications Text Area */}
                                                                         <div className="space-y-1">
                                                                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Model Specifications</label>
                                                                             <textarea
                                                                                 placeholder="Enter specifications (e.g. Dimensions: 50x30cm, weight: 10kg...)"
                                                                                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none resize-none"
                                                                                 rows={3}
                                                                                 value={model.description || ''}
                                                                                 onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].description = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }}
                                                                             />
                                                                         </div>

                                                                         {/* Storage & Classification */}
                                                                         <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-2">
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Category</label>
                                                                                 <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white" value={model.category || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].category = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }}>
                                                                                     <option value="">Select Category</option>
                                                                                     <option value="Equipment">Equipment</option>
                                                                                     <option value="Consumable">Consumable</option>
                                                                                     <option value="Spare Part">Spare Part</option>
                                                                                     <option value="Pipe Line">Pipe Line</option>
                                                                                     <option value="Furniture">Furniture</option>
                                                                                 </select>
                                                                             </div>
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">HSN Code</label>
                                                                                 <input type="text" placeholder="e.g. 9018" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={model.hsnCode || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].hsnCode = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }} />
                                                                             </div>
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Box Number</label>
                                                                                 <input type="text" placeholder="e.g. B-12" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={model.boxNumber || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].boxNumber = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }} />
                                                                             </div>
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Shelf Number</label>
                                                                                 <input type="text" placeholder="e.g. S-04" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={model.shelfNumber || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].shelfNumber = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }} />
                                                                             </div>
                                                                         </div>

                                                                         {/* Vendors Configurations pricing/stock */}
                                                                        <div className="space-y-2">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Linked Vendors</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const updated = [...hierarchicalBrands];
                                                                                        const bName = (brand.name || 'Brand').replace(/\s+/g, '').toUpperCase();
                                                                                        const mName = (model.name || 'Model').replace(/\s+/g, '').toUpperCase();
                                                                                        updated[bIdx].models[mIdx].vendors.push({
                                                                                            vendorId: '',
                                                                                            vendorName: '',
                                                                                            sku: `${editingProduct.sku || 'SKU'}-${bName}-${mName}-${Date.now().toString().slice(-4)}`,
                                                                                            purchasePrice: 0,
                                                                                            sellingPrice: 0,
                                                                                            gstRate: 18,
                                                                                            leadTimeDays: 7,
                                                                                            warrantyMonths: 12,
                                                                                            stock: 0
                                                                                        });
                                                                                        setHierarchicalBrands(updated);
                                                                                    }}
                                                                                    className="text-[9px] font-black text-indigo-500 uppercase tracking-wider flex items-center gap-0.5"
                                                                                >
                                                                                    <Plus size={10} /> Link Vendor entry
                                                                                </button>
                                                                            </div>
                                                                            {model.vendors.map((vendor: any, vIdx: number) => (
                                                                                <div key={vIdx} className="border border-slate-100 rounded-lg p-2 bg-slate-50 space-y-2">
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                                        <select
                                                                                            className="w-full border border-slate-200 rounded px-2 py-1 text-[11px] font-bold bg-white"
                                                                                            value={vendor.vendorId}
                                                                                            onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                const f = vendors.find(v => v.id === e.target.value);
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].vendorId = e.target.value;
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].vendorName = f ? f.name : '';
                                                                                                setHierarchicalBrands(updated);
                                                                                            }}
                                                                                        >
                                                                                            <option value="">-- Select Vendor --</option>
                                                                                            {vendors.map(v => (
                                                                                                <option key={v.id} value={v.id}>{v.name}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                        <div className="relative">
                                                                                            <input type="text" placeholder="Vendor SKU" className="w-full border border-slate-200 rounded px-2 pr-8 py-1 text-[11px] bg-white font-mono" value={vendor.sku} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].sku = e.target.value;
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    let random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
                                                                                                    const updated = [...hierarchicalBrands];
                                                                                                    updated[bIdx].models[mIdx].vendors[vIdx].sku = random8;
                                                                                                    setHierarchicalBrands(updated);
                                                                                                    addNotification('SKU Generated', `New Vendor SKU ${random8} generated.`, 'success');
                                                                                                }}
                                                                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-full p-1 transition-colors"
                                                                                                title="Generate SKU Sequence"
                                                                                            >
                                                                                                <ScanBarcode size={10} />
                                                                                            </button>
                                                                                        </div>
                                                                                        <input type="number" placeholder="Warranty (Months)" className="w-full border border-slate-200 rounded px-2 py-1 text-[11px] bg-white" value={vendor.warrantyMonths} onChange={e => {
                                                                                            const updated = [...hierarchicalBrands];
                                                                                            updated[bIdx].models[mIdx].vendors[vIdx].warrantyMonths = Number(e.target.value);
                                                                                            setHierarchicalBrands(updated);
                                                                                        }} />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">P:</span>
                                                                                            <input type="number" placeholder="Purchase" className="w-full pl-4 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.purchasePrice || ''} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].purchasePrice = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">S:</span>
                                                                                            <input type="number" placeholder="Selling" className="w-full pl-4 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.sellingPrice || ''} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].sellingPrice = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">GST:</span>
                                                                                            <input type="number" placeholder="GST" className="w-full pl-7 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.gstRate} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].gstRate = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">L/T:</span>
                                                                                            <input type="number" placeholder="Days" className="w-full pl-7 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.leadTimeDays} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].leadTimeDays = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative flex items-center gap-1">
                                                                                            <input type="number" placeholder="Stock" className="w-full px-1 py-1 border border-slate-200 rounded text-[11px] font-bold text-indigo-700 bg-indigo-50/50" value={vendor.stock || ''} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].stock = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                            <button type="button" onClick={() => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors = updated[bIdx].models[mIdx].vendors.filter((_: any, idx: number) => idx !== vIdx);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} className="text-rose-500 hover:bg-rose-50 p-1 rounded shrink-0"><Trash2 size={10} /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                        <div className="p-8 border-t border-slate-200 dark:border-slate-800 flex gap-2.5 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-4 bg-white border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Discard</button>
                            <button onClick={handleUpdateSubmit} className="flex-[2] py-4 bg-medical-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-medical-500/20 active:scale-95 transition-all">Commit Registry Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Product Modal (Hierarchical Builder Wizard) */}
            {showAddProductModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase">Hierarchical Product Registry</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Category → Subcategory → Product → Brand → Model → Vendor</p>
                            </div>
                            <button onClick={() => setShowAddProductModal(false)}><X size={28} className="text-slate-400 hover:text-slate-655" /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Step 1: Base Product Master */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">1. Master Product Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Product Name *</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2.5 text-xs font-black outline-none focus:border-medical-500" placeholder="e.g. Defibrillator" value={newProduct.name || ''} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5 font-bold">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category *</label>
                                        <select className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2.5 text-xs font-black outline-none appearance-none" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value as any })}>
                                            <option>Equipment</option>
                                            <option>Consumable</option>
                                            <option>Spare Part</option>
                                            <option>Pipe Line</option>
                                            <option>Furniture</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Subcategory</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2.5 text-xs font-black outline-none focus:border-medical-500" placeholder="e.g. ICU Equipment" value={hierarchicalSubcategory} onChange={e => setHierarchicalSubcategory(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                    <div className="space-y-1.5 relative">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Product SKU *</label>
                                        <div className="relative">
                                            <input type="text" className="w-full border border-slate-355 bg-white rounded-[2rem] pl-4 pr-10 py-2 text-xs font-bold outline-none" placeholder="SKU / Unique ID" value={newProduct.sku || ''} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    let newSku = Math.floor(10000000 + Math.random() * 90000000).toString();
                                                    while (products.some(p => p.sku === newSku)) {
                                                        newSku = Math.floor(10000000 + Math.random() * 90000000).toString();
                                                    }
                                                    setNewProduct({ ...newProduct, sku: newSku });
                                                    addNotification('SKU Generated', `New SKU ${newSku} generated successfully.`, 'success');
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full p-1.5 transition-colors"
                                                title="Generate SKU"
                                            >
                                                <ScanBarcode size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unit Type</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2 text-xs font-black outline-none" placeholder="nos" value={newProduct.unit || ''} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value.toLowerCase() })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">HSN Code</label>
                                        <input type="text" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2 text-xs font-black outline-none" placeholder="HSN Code" value={newProduct.hsn || ''} onChange={e => setNewProduct({ ...newProduct, hsn: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Min Level</label>
                                        <input type="number" className="w-full border border-slate-350 bg-white rounded-[2rem] px-4 py-2 text-xs font-black outline-none" placeholder="5" value={newProduct.minLevel || ''} onChange={e => setNewProduct({ ...newProduct, minLevel: Number(e.target.value) })} />
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Brands & Models Specification Builder */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">2. Brand & Model Hierarchy Configuration</h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newBrandId = `B-${Date.now()}`;
                                            setHierarchicalBrands([...hierarchicalBrands, { id: newBrandId, name: '', models: [] }]);
                                            setExpandedBrands({ ...expandedBrands, [newBrandId]: true });
                                        }}
                                        className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={10} /> Add Brand
                                    </button>
                                </div>

                                {hierarchicalBrands.length === 0 ? (
                                    <div className="p-8 border border-dashed border-slate-300 rounded-[2rem] text-center text-xs text-slate-400">
                                        No brands defined yet. Click "Add Brand" to build your hierarchical tree.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {hierarchicalBrands.map((brand, bIdx) => (
                                            <div key={brand.id} className="border border-slate-200 dark:border-slate-800 rounded-[1.5rem] bg-slate-50/50 p-4 space-y-3">
                                                <div className="flex justify-between items-center gap-4">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedBrands({ ...expandedBrands, [brand.id]: !expandedBrands[brand.id] })}
                                                            className="p-1 hover:bg-slate-200 rounded"
                                                        >
                                                            {expandedBrands[brand.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            placeholder="Brand Name (e.g. Philips, GE)"
                                                            className="flex-1 max-w-xs border border-slate-300 bg-white rounded-[2rem] px-3 py-1.5 text-xs font-black outline-none focus:border-medical-500"
                                                            value={brand.name}
                                                            onChange={e => {
                                                                const updated = [...hierarchicalBrands];
                                                                updated[bIdx].name = e.target.value;
                                                                setHierarchicalBrands(updated);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const modelId = `M-${Date.now()}`;
                                                                const updated = [...hierarchicalBrands];
                                                                updated[bIdx].models.push({
                                                                    id: modelId,
                                                                    name: '',
                                                                    specs: [],
                                                                    description: '',
                                                                    vendors: [],
                                                                    images: [],
                                                                    documents: []
                                                                });
                                                                setHierarchicalBrands(updated);
                                                                setExpandedBrands({ ...expandedBrands, [brand.id]: true });
                                                                setExpandedModels({ ...expandedModels, [modelId]: true });
                                                            }}
                                                            className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1 uppercase tracking-wider flex items-center gap-0.5"
                                                        >
                                                            <Plus size={10} /> Add Model
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setHierarchicalBrands(hierarchicalBrands.filter(b => b.id !== brand.id));
                                                            }}
                                                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Models render */}
                                                {expandedBrands[brand.id] && (
                                                    <div className="pl-6 border-l-2 border-slate-200 space-y-3 mt-2">
                                                        {brand.models.map((model: any, mIdx: number) => (
                                                            <div key={model.id} className="bg-white rounded-xl p-3 border border-slate-200 space-y-3">
                                                                <div className="flex justify-between items-center gap-3">
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedModels({ ...expandedModels, [model.id]: !expandedModels[model.id] })}
                                                                            className="p-1 hover:bg-slate-100 rounded"
                                                                        >
                                                                            {expandedModels[model.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                        </button>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Model Name / Reference Number"
                                                                            className="flex-1 max-w-xs border border-slate-200 bg-slate-50 rounded-[2rem] px-3 py-1 text-xs font-bold outline-none"
                                                                            value={model.name}
                                                                            onChange={e => {
                                                                                const updated = [...hierarchicalBrands];
                                                                                updated[bIdx].models[mIdx].name = e.target.value;
                                                                                setHierarchicalBrands(updated);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...hierarchicalBrands];
                                                                            updated[bIdx].models = updated[bIdx].models.filter((m: any) => m.id !== model.id);
                                                                            setHierarchicalBrands(updated);
                                                                        }}
                                                                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>

                                                                {expandedModels[model.id] && (
                                                                    <div className="pl-4 space-y-3 border-l border-slate-100 mt-2">
                                                                        
                                                                        {/* Specifications Text Area */}
                                                                         <div className="space-y-1">
                                                                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Model Specifications</label>
                                                                             <textarea
                                                                                 placeholder="Enter specifications (e.g. Dimensions: 50x30cm, weight: 10kg...)"
                                                                                 className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none resize-none"
                                                                                 rows={3}
                                                                                 value={model.description || ''}
                                                                                 onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].description = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }}
                                                                             />
                                                                         </div>

                                                                         {/* Storage & Classification */}
                                                                         <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-2">
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Category</label>
                                                                                 <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white" value={model.category || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].category = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }}>
                                                                                     <option value="">Select Category</option>
                                                                                     <option value="Equipment">Equipment</option>
                                                                                     <option value="Consumable">Consumable</option>
                                                                                     <option value="Spare Part">Spare Part</option>
                                                                                     <option value="Pipe Line">Pipe Line</option>
                                                                                     <option value="Furniture">Furniture</option>
                                                                                 </select>
                                                                             </div>
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">HSN Code</label>
                                                                                 <input type="text" placeholder="e.g. 9018" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={model.hsnCode || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].hsnCode = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }} />
                                                                             </div>
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Box Number</label>
                                                                                 <input type="text" placeholder="e.g. B-12" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={model.boxNumber || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].boxNumber = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }} />
                                                                             </div>
                                                                             <div className="space-y-1">
                                                                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Shelf Number</label>
                                                                                 <input type="text" placeholder="e.g. S-04" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={model.shelfNumber || ''} onChange={e => {
                                                                                     const updated = [...hierarchicalBrands];
                                                                                     updated[bIdx].models[mIdx].shelfNumber = e.target.value;
                                                                                     setHierarchicalBrands(updated);
                                                                                 }} />
                                                                             </div>
                                                                         </div>

                                                                         {/* Vendors Configurations pricing/stock */}
                                                                        <div className="space-y-2">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Linked Vendors</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const updated = [...hierarchicalBrands];
                                                                                        updated[bIdx].models[mIdx].vendors.push({
                                                                                            vendorId: '',
                                                                                            vendorName: '',
                                                                                            sku: `${newProduct.sku || 'SKU'}-${brand.name || 'B'}-${model.name || 'M'}-${Date.now().toString().slice(-4)}`,
                                                                                            purchasePrice: 0,
                                                                                            sellingPrice: 0,
                                                                                            gstRate: 18,
                                                                                            leadTimeDays: 7,
                                                                                            warrantyMonths: 12,
                                                                                            stock: 0
                                                                                        });
                                                                                        setHierarchicalBrands(updated);
                                                                                    }}
                                                                                    className="text-[9px] font-black text-indigo-500 uppercase tracking-wider flex items-center gap-0.5"
                                                                                >
                                                                                    <Plus size={10} /> Link Vendor entry
                                                                                </button>
                                                                            </div>
                                                                            {model.vendors.map((vendor: any, vIdx: number) => (
                                                                                <div key={vIdx} className="border border-slate-100 rounded-lg p-2 bg-slate-50 space-y-2">
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                                        <select
                                                                                            className="w-full border border-slate-200 rounded px-2 py-1 text-[11px] font-bold bg-white"
                                                                                            value={vendor.vendorId}
                                                                                            onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                const f = vendors.find(v => v.id === e.target.value);
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].vendorId = e.target.value;
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].vendorName = f ? f.name : '';
                                                                                                setHierarchicalBrands(updated);
                                                                                            }}
                                                                                        >
                                                                                            <option value="">-- Select Vendor --</option>
                                                                                            {vendors.map(v => (
                                                                                                <option key={v.id} value={v.id}>{v.name}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                        <div className="relative">
                                                                                            <input type="text" placeholder="Vendor SKU" className="w-full border border-slate-200 rounded px-2 pr-8 py-1 text-[11px] bg-white font-mono" value={vendor.sku} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].sku = e.target.value;
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    let random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
                                                                                                    const updated = [...hierarchicalBrands];
                                                                                                    updated[bIdx].models[mIdx].vendors[vIdx].sku = random8;
                                                                                                    setHierarchicalBrands(updated);
                                                                                                    addNotification('SKU Generated', `New Vendor SKU ${random8} generated.`, 'success');
                                                                                                }}
                                                                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-full p-1 transition-colors"
                                                                                                title="Generate SKU Sequence"
                                                                                            >
                                                                                                <ScanBarcode size={10} />
                                                                                            </button>
                                                                                        </div>
                                                                                        <input type="number" placeholder="Warranty (Months)" className="w-full border border-slate-200 rounded px-2 py-1 text-[11px] bg-white" value={vendor.warrantyMonths} onChange={e => {
                                                                                            const updated = [...hierarchicalBrands];
                                                                                            updated[bIdx].models[mIdx].vendors[vIdx].warrantyMonths = Number(e.target.value);
                                                                                            setHierarchicalBrands(updated);
                                                                                        }} />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">P:</span>
                                                                                            <input type="number" placeholder="Purchase" className="w-full pl-4 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.purchasePrice || ''} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].purchasePrice = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">S:</span>
                                                                                            <input type="number" placeholder="Selling" className="w-full pl-4 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.sellingPrice || ''} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].sellingPrice = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">GST:</span>
                                                                                            <input type="number" placeholder="GST" className="w-full pl-7 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.gstRate} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].gstRate = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">L/T:</span>
                                                                                            <input type="number" placeholder="Days" className="w-full pl-7 pr-1 py-1 border border-slate-200 rounded text-[11px]" value={vendor.leadTimeDays} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].leadTimeDays = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                        </div>
                                                                                        <div className="relative flex items-center gap-1">
                                                                                            <input type="number" placeholder="Stock" className="w-full px-1 py-1 border border-slate-200 rounded text-[11px] font-bold text-indigo-700 bg-indigo-50/50" value={vendor.stock || ''} onChange={e => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors[vIdx].stock = Number(e.target.value);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} />
                                                                                            <button type="button" onClick={() => {
                                                                                                const updated = [...hierarchicalBrands];
                                                                                                updated[bIdx].models[mIdx].vendors = updated[bIdx].models[mIdx].vendors.filter((_: any, idx: number) => idx !== vIdx);
                                                                                                setHierarchicalBrands(updated);
                                                                                            }} className="text-rose-500 hover:bg-rose-50 p-1 rounded shrink-0"><Trash2 size={10} /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                        <div className="p-8 border-t border-slate-200 dark:border-slate-800 flex gap-2.5 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={() => setShowAddProductModal(false)} className="flex-1 py-4 bg-white border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Cancel</button>
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
            {/* Product Details Modal (Brand, Model, Supplier/Vendor, Pricing, Specs) */}
            {detailsProduct && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                        {/* Modal Header */}
                        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50/80 dark:bg-slate-800/60">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                        {detailsProduct.category}
                                    </span>
                                    {detailsProduct.subcategory && (
                                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                            {detailsProduct.subcategory}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-400">SKU: {detailsProduct.sku}</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-playfair font-bold text-slate-800 dark:text-slate-100">
                                    {detailsProduct.name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const p = detailsProduct;
                                        setDetailsProduct(null);
                                        handleOpenEdit(p);
                                    }}
                                    className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full transition-colors"
                                    title="Edit Product"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => setDetailsProduct(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        {(() => {
                            let mCalculatedStock = 0;
                            let mPurchasePrices: number[] = [];
                            let mSellingPrices: number[] = [];
                            let mLocations: string[] = [];

                            if (detailsProduct.location) mLocations.push(detailsProduct.location);
                            if (detailsProduct.godown && !mLocations.includes(detailsProduct.godown)) mLocations.push(detailsProduct.godown);

                            if (detailsProduct.brands && detailsProduct.brands.length > 0) {
                                detailsProduct.brands.forEach(brand => {
                                    if (brand.models) {
                                        brand.models.forEach(model => {
                                            if (model.shelfNumber && !mLocations.includes(model.shelfNumber)) mLocations.push(model.shelfNumber);
                                            if (model.boxNumber && !mLocations.includes(model.boxNumber)) mLocations.push(model.boxNumber);

                                            if (model.vendors && model.vendors.length > 0) {
                                                model.vendors.forEach(v => {
                                                    const vStock = Number(v.stock || 0);
                                                    const vPPrice = Number(v.purchasePrice || 0);
                                                    const vSPrice = Number(v.sellingPrice || 0);
                                                    mCalculatedStock += vStock;
                                                    if (vPPrice > 0) mPurchasePrices.push(vPPrice);
                                                    if (vSPrice > 0) mSellingPrices.push(vSPrice);
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                mCalculatedStock = Number(detailsProduct.stock || 0);
                                if (detailsProduct.purchasePrice) mPurchasePrices.push(Number(detailsProduct.purchasePrice));
                                if (detailsProduct.sellingPrice) mSellingPrices.push(Number(detailsProduct.sellingPrice));

                                if (detailsProduct.vendors && detailsProduct.vendors.length > 0) {
                                    detailsProduct.vendors.forEach(pv => {
                                        if (pv.purchasePrice) mPurchasePrices.push(Number(pv.purchasePrice));
                                    });
                                }
                            }

                            if (mPurchasePrices.length === 0 && (detailsProduct.purchasePrice || 0) > 0) {
                                mPurchasePrices.push(Number(detailsProduct.purchasePrice));
                            }
                            if (mSellingPrices.length === 0 && (detailsProduct.sellingPrice || 0) > 0) {
                                mSellingPrices.push(Number(detailsProduct.sellingPrice));
                            }

                            const mAvgPurchase = mPurchasePrices.length > 0 ? mPurchasePrices.reduce((a, b) => a + b, 0) / mPurchasePrices.length : Number(detailsProduct.purchasePrice || 0);
                            const mAvgSelling = mSellingPrices.length > 0 ? mSellingPrices.reduce((a, b) => a + b, 0) / mSellingPrices.length : Number(detailsProduct.sellingPrice || 0);
                            const mDisplayLoc = mLocations.length > 0 ? mLocations.join(' • ') : (detailsProduct.location || 'Warehouse A');

                            return (
                                <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                    {/* Key Summary Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Stock</span>
                                            <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">
                                                {mCalculatedStock} <span className="text-xs font-bold text-slate-400 uppercase">{detailsProduct.unit || 'nos'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Avg Purchase Price</span>
                                            <div className="text-lg font-black text-slate-600 dark:text-slate-300 mt-1">
                                                ₹{Math.round(mAvgPurchase).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Avg Selling Price</span>
                                            <div className="text-lg font-black text-teal-600 dark:text-teal-400 mt-1">
                                                ₹{Math.round(mAvgSelling).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Location(s)</span>
                                            <div className="text-xs font-black text-slate-700 dark:text-slate-200 mt-1.5 flex items-center gap-1 truncate" title={mDisplayLoc}>
                                                <MapPin size={12} className="text-indigo-500 shrink-0" />
                                                <span className="truncate">{mDisplayLoc}</span>
                                            </div>
                                        </div>
                                    </div>

                            {/* Main Supplier / Primary Vendor Info */}
                            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <Building2 size={14} /> Supplier & Vendor Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Primary Supplier</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                                            {detailsProduct.supplier || 'Not Specified'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tax & HSN Compliance</span>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 mt-0.5 block">
                                            GST: {detailsProduct.taxRate || 0}% {detailsProduct.hsn ? `| HSN: ${detailsProduct.hsn}` : ''}
                                        </span>
                                    </div>
                                </div>

                                {detailsProduct.vendors && detailsProduct.vendors.length > 0 && (
                                    <div className="pt-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                                            Associated Vendors ({detailsProduct.vendors.length})
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {detailsProduct.vendors.map((v, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Building2 size={14} className="text-indigo-500 shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className="font-black text-slate-800 dark:text-slate-100 block truncate">{v.vendorName || 'Supplier'}</span>
                                                            <span className="text-[9px] font-mono text-slate-400 block">{v.vendorId}</span>
                                                        </div>
                                                    </div>
                                                    {v.purchasePrice > 0 && (
                                                        <span className="font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border text-[11px]">
                                                            ₹{v.purchasePrice.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                                    {/* Brand & Model Hierarchical Details */}
                                    {detailsProduct.brands && detailsProduct.brands.length > 0 ? (
                                        <div className="space-y-4">
                                            <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                                                <Layers size={14} /> Brands & Models Details ({detailsProduct.brands.length} Brands)
                                            </h4>

                                            <div className="space-y-4">
                                                {detailsProduct.brands.map((brand: any) => (
                                                    <div key={brand.id} className="bg-slate-50/70 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2.5 py-1 rounded-lg">
                                                                    Brand
                                                                </span>
                                                                <h5 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">
                                                                    {brand.name || 'Generic / Unbranded'}
                                                                </h5>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                {(brand.models || []).length} Models
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                            {(brand.models || []).map((model: any) => (
                                                                <div key={model.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                                                                    <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-2">
                                                                        <div>
                                                                            <div className="font-black text-xs text-indigo-600 uppercase flex items-center gap-1.5">
                                                                                <Tag size={12} /> {model.name || 'Standard Model'}
                                                                            </div>
                                                                            {model.category && (
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 block">{model.category}</span>
                                                                            )}
                                                                        </div>
                                                                        {model.hsnCode && (
                                                                            <span className="text-[9px] font-mono bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border text-slate-500 font-bold">
                                                                                HSN: {model.hsnCode}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {model.description && (
                                                                        <p className="text-[10px] text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                                            {model.description}
                                                                        </p>
                                                                    )}

                                                                    {/* Model Specifications */}
                                                                    {model.specs && model.specs.length > 0 && (
                                                                        <div className="space-y-1">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                                                                Specifications:
                                                                            </span>
                                                                            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px]">
                                                                                {model.specs.map((spec: any, idx: number) => (
                                                                                    <div key={idx} className="truncate">
                                                                                        <span className="font-bold text-slate-400">{spec.key}: </span>
                                                                                        <span className="font-black text-slate-700 dark:text-slate-200">{spec.value}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Model Vendors & Stock */}
                                                                    {model.vendors && model.vendors.length > 0 ? (
                                                                        <div className="space-y-1.5">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                                                <Building2 size={11} /> Suppliers, Pricing & Stock:
                                                                            </span>
                                                                            <div className="space-y-1.5">
                                                                                {model.vendors.map((mv: any, vIdx: number) => (
                                                                                    <div key={vIdx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-1 text-[10px]">
                                                                                        <div className="flex justify-between items-center font-black text-slate-800 dark:text-slate-100">
                                                                                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                                                                                                <Building2 size={10} className="text-slate-400" /> {mv.vendorName || 'Supplier'}
                                                                                            </span>
                                                                                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-black">
                                                                                                Stock: {mv.stock || 0}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold flex-wrap gap-1">
                                                                                            <span>SKU: <b className="font-mono text-slate-700 dark:text-slate-300">{mv.sku || '—'}</b></span>
                                                                                            <span>Purchase: <b className="text-slate-800 dark:text-slate-200">₹{mv.purchasePrice}</b></span>
                                                                                            <span>Selling: <b className="text-teal-700 dark:text-teal-400">₹{mv.sellingPrice}</b></span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-[9px] text-slate-400 italic">No specific supplier mapped to this model</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Direct Model / Description / Specs */
                                        <div className="space-y-3">
                                            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                                                    <Tag size={14} /> Model & Description
                                                </h4>
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Model / Reference</span>
                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">{detailsProduct.model || 'Standard'}</span>
                                                </div>
                                                {detailsProduct.description && (
                                                    <div>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">{detailsProduct.description}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {detailsProduct.specs && Object.keys(detailsProduct.specs).length > 0 && (
                                                <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                                                        Technical Specifications
                                                    </h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                        {Object.entries(detailsProduct.specs).map(([k, v], idx) => (
                                                            <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">{k}</span>
                                                                <span className="font-black text-slate-800 dark:text-slate-100 mt-0.5 block">{String(v)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Modal Footer */}
                        <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-slate-400">ID: {detailsProduct.id}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDetailsProduct(null)}
                                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-[2rem] font-black text-xs uppercase tracking-wider hover:bg-slate-300 transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        const p = detailsProduct;
                                        setDetailsProduct(null);
                                        handleOpenEdit(p);
                                    }}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    <Edit2 size={13} /> Edit Product
                                </button>
                            </div>
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
