import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from './DataContext';
import { TabView } from '../types';
import { 
    Search, Compass, Users, Package, Shield, 
    Clipboard, ArrowRight, CornerDownLeft, Sparkles, User, Briefcase
} from 'lucide-react';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

type PaletteItemType = 'module' | 'client' | 'product' | 'vendor' | 'lead' | 'action';

interface PaletteItem {
    id: string;
    type: PaletteItemType;
    title: string;
    subtitle?: string;
    icon: any;
    action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const { 
        clients, products, vendors, leads, 
        setActiveTab, setPendingInvoiceData, setPendingSupplierPOData, setPendingServiceReportData, setPendingChallanData
    } = useData();

    const [query, setQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<'all' | 'modules' | 'clients' | 'products' | 'vendors' | 'leads' | 'actions'>('all');
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Build the static lists for modules and actions
    const items: PaletteItem[] = useMemo(() => {
        const list: PaletteItem[] = [];

        // 1. App Modules Jumps
        const modulesData = [
            { tab: TabView.DASHBOARD, label: 'Dashboard', icon: Compass, sub: 'Overview of key metrics and statistics' },
            { tab: TabView.LEADS, label: 'Lead CRM', icon: Users, sub: 'Manage hospital leads and follow-ups' },
            { tab: TabView.CLIENTS, label: 'Client Database', icon: ContactIcon, sub: 'CRM customer records and ledger mapping' },
            { tab: TabView.VENDORS, label: 'Vendor Database', icon: Briefcase, sub: 'Vendor directory and supplier mappings' },
            { tab: TabView.INVENTORY, icon: Package, label: 'Inventory', sub: 'Stock levels, batches, and item tracking' },
            { tab: TabView.CATALOG, icon: Sparkles, label: 'Product Catalog', sub: 'Item prices, specifications, and taxes' },
            { tab: TabView.BILLING, icon: Clipboard, label: 'Invoice Maker', sub: 'Create and manage sales tax invoices' },
            { tab: TabView.QUOTES, icon: Clipboard, label: 'Quotation Maker', sub: 'Generate sales quotations and proposals' },
            { tab: TabView.PO_BUILDER, icon: Clipboard, label: 'Customer PO Maker', sub: 'Raise client purchase orders' },
            { tab: TabView.SUPPLIER_PO, icon: Clipboard, label: 'Supplier PO Maker', sub: 'Draft external purchase orders to suppliers' },
            { tab: TabView.SERVICE_ORDERS, icon: Clipboard, label: 'Service Order Maker', sub: 'Record engineering service requests' },
            { tab: TabView.SERVICE_REPORTS, icon: Clipboard, label: 'Service Report Maker', sub: 'Document breakdown and maintenance calls' },
            { tab: TabView.INSTALLATION_REPORTS, icon: Clipboard, label: 'Install Report Maker', sub: 'Generate site commissioning certificates' },
            { tab: TabView.DELIVERY, icon: Clipboard, label: 'Delivery Challan', sub: 'Raise challans and goods dispatch records' },
            { tab: TabView.PURCHASE_REGISTER, icon: Clipboard, label: 'Purchase Entry', sub: 'Record inward bills and supplier invoices' },
            { tab: TabView.TASKS, icon: Clipboard, label: 'Task Manager', sub: 'Track checklist and project items' },
            { tab: TabView.ATTENDANCE, icon: Clipboard, label: 'Check-in/Out Logs', sub: 'Mark daily attendance and coordinates' },
            { tab: TabView.PAYROLL, icon: Clipboard, label: 'Payroll Portal', sub: 'Generate slips and compute staff pays' },
            { tab: TabView.EXPENSES, icon: Clipboard, label: 'Vouchers & Expenses', sub: 'Post double-entry vouchers' },
            { tab: TabView.PERFORMANCE, icon: Sparkles, label: 'Leaderboard', sub: 'Employee gamification metrics' },
            { tab: TabView.HR, icon: Shield, label: 'Staff Management', sub: 'Configure roles and system access grid' },
            { tab: TabView.REPORTS, icon: Clipboard, label: 'Reports Centre', sub: 'Analytical dashboards and Excel exports' },
            { tab: TabView.ACCOUNTING, icon: Shield, label: 'Accounts (TallyPrime)', sub: 'Tally-style ledgers, balance sheets, and trials' },
            { tab: TabView.CONFIG, icon: Shield, label: 'System Config', sub: 'Adjust financial periods and company profiles' },
        ];

        modulesData.forEach(m => {
            list.push({
                id: `mod-${m.tab}`,
                type: 'module',
                title: m.label,
                subtitle: m.sub,
                icon: m.icon,
                action: () => {
                    setActiveTab(m.tab);
                    onClose();
                }
            });
        });

        // 2. Direct Actions
        const actionsData = [
            {
                title: 'Draft New Invoice',
                sub: 'Jumps directly to Invoice builder form',
                action: () => {
                    setPendingInvoiceData({});
                    setActiveTab(TabView.BILLING);
                    onClose();
                }
            },
            {
                title: 'Draft New Quotation',
                sub: 'Jumps directly to Quotation builder form',
                action: () => {
                    setActiveTab(TabView.QUOTES);
                    onClose();
                }
            },
            {
                title: 'Log Daily Attendance',
                sub: 'Open check-in panel immediately',
                action: () => {
                    setActiveTab(TabView.ATTENDANCE);
                    onClose();
                }
            }
        ];

        actionsData.forEach((a, index) => {
            list.push({
                id: `act-${index}`,
                type: 'action',
                title: a.title,
                subtitle: a.sub,
                icon: Sparkles,
                action: a.action
            });
        });

        // 3. Client Database Records
        clients.forEach(c => {
            list.push({
                id: `cli-${c.id}`,
                type: 'client',
                title: c.name,
                subtitle: `Client • ${c.hospital || 'Private Hospital'} • ${c.phone || ''}`,
                icon: User,
                action: () => {
                    setActiveTab(TabView.CLIENTS);
                    onClose();
                }
            });
        });

        // 4. Products Catalog
        products.forEach(p => {
            list.push({
                id: `prod-${p.id}`,
                type: 'product',
                title: p.name,
                subtitle: `Product • SKU: ${p.sku || 'N/A'} • GST: ${p.gstRate}%`,
                icon: Package,
                action: () => {
                    setActiveTab(TabView.CATALOG);
                    onClose();
                }
            });
        });

        // 5. Vendor Database
        vendors.forEach(v => {
            list.push({
                id: `vend-${v.id}`,
                type: 'vendor',
                title: v.name,
                subtitle: `Vendor • ${v.phone || ''}`,
                icon: Briefcase,
                action: () => {
                    setActiveTab(TabView.VENDORS);
                    onClose();
                }
            });
        });

        // 6. Lead Tracker
        leads.forEach(l => {
            list.push({
                id: `lead-${l.id}`,
                type: 'lead',
                title: l.name,
                subtitle: `Lead • ${l.hospital || ''} • Status: ${l.status}`,
                icon: Users,
                action: () => {
                    setActiveTab(TabView.LEADS);
                    onClose();
                }
            });
        });

        return list;
    }, [clients, products, vendors, leads, setActiveTab, onClose, setPendingInvoiceData]);

    // Simple React icon proxy helper for Clients
    function ContactIcon(props: any) {
        return <Users {...props} />;
    }

    // Filtered Items
    const filteredItems = useMemo(() => {
        let result = items;

        // Apply Tab Filter
        if (selectedTab !== 'all') {
            result = result.filter(item => {
                if (selectedTab === 'modules') return item.type === 'module';
                if (selectedTab === 'clients') return item.type === 'client';
                if (selectedTab === 'products') return item.type === 'product';
                if (selectedTab === 'vendors') return item.type === 'vendor';
                if (selectedTab === 'leads') return item.type === 'lead';
                if (selectedTab === 'actions') return item.type === 'action';
                return true;
            });
        }

        // Apply Text Query Filter
        if (query.trim() !== '') {
            const lowQuery = query.toLowerCase();
            result = result.filter(
                item => 
                    item.title.toLowerCase().includes(lowQuery) || 
                    (item.subtitle && item.subtitle.toLowerCase().includes(lowQuery))
            );
        }

        return result;
    }, [items, selectedTab, query]);

    // Handle index bounds when filter matches update
    useEffect(() => {
        setActiveIndex(0);
    }, [query, selectedTab]);

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[activeIndex]) {
                    filteredItems[activeIndex].action();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, activeIndex, onClose]);

    // Scroll highlighted item into view automatically
    useEffect(() => {
        const listElement = listRef.current;
        if (listElement) {
            const activeElement = listElement.querySelector(`[data-index="${activeIndex}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:justify-start md:items-center md:pt-[10vh] md:px-4">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            {/* Panel Container */}
            <div className="relative w-full max-h-[85vh] md:h-auto md:max-h-[70vh] md:max-w-2xl bg-slate-900 dark:bg-slate-950 border-t md:border border-slate-700/50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:shadow-2xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-300">
                {/* Search Bar Input */}
                <div className="flex items-center px-4 md:px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
                    <Search className="text-emerald-500 shrink-0 mr-3" size={20} />
                    <input 
                        ref={inputRef}
                        type="text"
                        placeholder="Search anything..."
                        className="w-full bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-base md:text-lg font-bold"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <span className="hidden md:flex text-[10px] font-black text-slate-500 bg-slate-800 border border-slate-700 px-2 py-1 rounded-[2rem] tracking-tighter uppercase shrink-0">ESC</span>
                    <button onClick={onClose} className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-[2rem] shrink-0 ml-2">Cancel</button>
                </div>

                {/* Filter Pills Tab bar */}
                <div className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 bg-slate-900/50 overflow-x-auto scrollbar-none border-b border-slate-800/80 shrink-0">
                    {(['all', 'modules', 'clients', 'products', 'vendors', 'leads', 'actions'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setSelectedTab(tab)}
                            className={`px-4 py-2 rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                                selectedTab === tab 
                                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Search Results Dropdown List */}
                <div 
                    ref={listRef}
                    className="flex-1 overflow-y-auto p-2 md:p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800"
                >
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Compass size={48} className="text-slate-700 mb-4 animate-pulse" />
                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">No matching records found</p>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => {
                            const IconComp = item.icon;
                            const isSelected = idx === activeIndex;
                            return (
                                <div
                                    key={item.id}
                                    data-index={idx}
                                    onClick={item.action}
                                    className={`group flex items-center justify-between px-4 py-4 rounded-[2rem] cursor-pointer transition-all border mb-2 ${
                                        isSelected 
                                            ? 'bg-slate-800 border-slate-700 shadow-md md:translate-x-1' 
                                            : 'bg-transparent border-transparent hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`p-3 rounded-[2rem] shrink-0 transition-colors ${
                                            isSelected 
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                                : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            <IconComp size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm md:text-base font-bold truncate ${
                                                isSelected ? 'text-slate-100' : 'text-slate-300'
                                            }`}>{item.title}</p>
                                            {item.subtitle && (
                                                <p className="text-[10px] md:text-[11px] font-semibold text-slate-500 truncate mt-1">{item.subtitle}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 shrink-0">
                                        {isSelected && (
                                            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-900/30">
                                                <span>Go</span>
                                                <CornerDownLeft size={8} />
                                            </div>
                                        )}
                                        <ArrowRight size={16} className={`text-slate-600 transition-all ${
                                            isSelected ? 'translate-x-1 text-slate-400' : 'opacity-0 group-hover:opacity-100'
                                        }`} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Command Footer */}
                <div className="px-6 py-4 pb-8 md:pb-4 border-t border-slate-800 bg-slate-900 flex items-center justify-center md:justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">
                    <div className="hidden md:flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-[9px]">↑↓</span> Move</span>
                        <span className="flex items-center gap-1.5"><span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-[9px]">↵ Enter</span> Select</span>
                    </div>
                    <div>
                        <span className="opacity-50 text-slate-400 tracking-[0.2em]">Sree Meditec CRM</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
