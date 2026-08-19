import React from 'react';
import { ModelVendorInfo } from '../types';
import { X } from 'lucide-react';

interface VendorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    vendors: ModelVendorInfo[];
    isPurchaseContext: boolean;
    onSelect: (vendor: ModelVendorInfo) => void;
}

export const VendorSelectionModal: React.FC<VendorSelectionModalProps> = ({
    isOpen, onClose, vendors, isPurchaseContext, onSelect
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-black text-lg text-slate-800">Select Vendor</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm font-bold text-slate-500 mb-4">
                        This model is supplied by multiple vendors. Please select which vendor's rate to apply:
                    </p>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {vendors.map(vendor => (
                            <div 
                                key={vendor.vendorId}
                                onClick={() => {
                                    onSelect(vendor);
                                    onClose();
                                }}
                                className="p-4 rounded-2xl border border-slate-200 hover:border-medical-500 hover:bg-medical-50/30 cursor-pointer transition-all flex justify-between items-center group"
                            >
                                <div>
                                    <h4 className="font-black text-sm text-slate-800">{vendor.vendorName}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">SKU: {vendor.sku || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-medical-600">
                                        ₹{(isPurchaseContext ? vendor.purchasePrice : vendor.sellingPrice).toLocaleString('en-IN')}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                        {isPurchaseContext ? 'Purchase Rate' : 'Selling Rate'} (GST: {vendor.gstRate}%)
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
