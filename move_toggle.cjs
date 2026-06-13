const fs = require('fs');

// 1. ServiceReportModule
const srPath = '/Users/sureshkumar/Downloads/nirva/components/ServiceReportModule.tsx';
let srContent = fs.readFileSync(srPath, 'utf8');

const srGridOld = `<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <FormRow label="Visit Charges (₹)">`;
const srGridNew = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <FormRow label="Visit Charges (₹)">`;
srContent = srContent.replace(srGridOld, srGridNew);

const srToggleOld = `                                            </FormRow>
                                            <div className="flex flex-col gap-1.5 w-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 min-h-[14px]">Round Off</label>
                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer h-[42px]" onClick={() => setReport(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                    <div className={\`w-8 h-4 rounded-full relative transition-all \${report.isRoundOff ? 'bg-medical-600' : 'bg-slate-300'}\`}>
                                                        <div className={\`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform \${report.isRoundOff ? 'translate-x-4' : 'translate-x-0'}\`} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Auto Round</span>
                                                </div>
                                            </div>
                                        </div>`;
const srToggleNew = `                                            </FormRow>
                                        </div>`;
srContent = srContent.replace(srToggleOld, srToggleNew);

const srFooterOld = `                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Receivable</span>
                                            <span className="text-xl font-black text-medical-600 tracking-tight">₹{finTotals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>`;
const srFooterNew = `                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Receivable</span>
                                                <span className="text-xl font-black text-medical-600 tracking-tight">₹{finTotals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-[36px]" onClick={() => setReport(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                <div className={\`w-7 h-3.5 rounded-full relative transition-all \${report.isRoundOff ? 'bg-medical-600' : 'bg-slate-300'}\`}>
                                                    <div className={\`absolute top-[2px] left-[2px] w-2.5 h-2.5 bg-white rounded-full transition-transform \${report.isRoundOff ? 'translate-x-3.5' : 'translate-x-0'}\`} />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Auto Round</span>
                                            </div>
                                        </div>`;
srContent = srContent.replace(srFooterOld, srFooterNew);

fs.writeFileSync(srPath, srContent, 'utf8');
console.log('ServiceReportModule updated.');

// 2. SupplierPOModule
const spoPath = '/Users/sureshkumar/Downloads/nirva/components/SupplierPOModule.tsx';
let spoContent = fs.readFileSync(spoPath, 'utf8');

const spoGridOld = `<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                            <FormRow label="Discount (₹)">`;
const spoGridNew = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormRow label="Discount (₹)">`;
spoContent = spoContent.replace(spoGridOld, spoGridNew);

const spoToggleOld = `                                            </FormRow>
                                            <div className="flex flex-col gap-1.5 w-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 min-h-[14px]">Round Off</label>
                                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-[42px]" onClick={() => setOrder(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                    <div className={\`w-8 h-4 rounded-full relative transition-all \${order.isRoundOff ? 'bg-medical-600' : 'bg-slate-300'}\`}>
                                                        <div className={\`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform \${order.isRoundOff ? 'translate-x-4' : 'translate-x-0'}\`} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Auto Round</span>
                                                </div>
                                            </div>
                                        </div>`;
const spoToggleNew = `                                            </FormRow>
                                        </div>`;
spoContent = spoContent.replace(spoToggleOld, spoToggleNew);

const spoFooterOld = `                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Grand Total</span>
                                            <span className="text-xl font-black text-teal-600">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>`;
const spoFooterNew = `                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Grand Total</span>
                                                <span className="text-xl font-black text-teal-600">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-[36px]" onClick={() => setOrder(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                <div className={\`w-7 h-3.5 rounded-full relative transition-all \${order.isRoundOff ? 'bg-teal-600' : 'bg-slate-300'}\`}>
                                                    <div className={\`absolute top-[2px] left-[2px] w-2.5 h-2.5 bg-white rounded-full transition-transform \${order.isRoundOff ? 'translate-x-3.5' : 'translate-x-0'}\`} />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Auto Round</span>
                                            </div>
                                        </div>`;
spoContent = spoContent.replace(spoFooterOld, spoFooterNew);

fs.writeFileSync(spoPath, spoContent, 'utf8');
console.log('SupplierPOModule updated.');
