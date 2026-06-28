import React, { useState, useRef } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { ServiceTask, ServiceTaskAttachment } from '../types';
import {
  Wrench, CheckCircle, AlertCircle, Loader, Upload, X, Paperclip,
  Phone, Mail, MapPin, User, Building2, FileText, Send, ChevronDown, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const SERVICE_CATEGORIES = [
  'Installation', 'Repair', 'Maintenance', 'AMC Service',
  'Calibration', 'Upgrade', 'Demo', 'Training', 'Other'
];

const PRIORITIES = [
  { value: 'Low', label: 'Low', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'Medium', label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'High', label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'Urgent', label: 'Urgent', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const PublicServiceForm: React.FC = () => {
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [files, setFiles] = useState<{ name: string; type: string; size: number; data: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittedTask, setSubmittedTask] = useState<{ taskNumber: string; form: typeof form } | null>(null);

  const [form, setForm] = useState({
    customerName: '', companyName: '', customerPhone: '', customerEmail: '',
    subject: '', equipment: '', serviceCategory: '', issue: '', location: '',
    priority: 'Medium' as ServiceTask['priority']
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || !selected.length) return;
    const newFiles: typeof files = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      if (file.size > 5 * 1024 * 1024) { setErrorMsg(`${file.name} exceeds 5MB limit.`); continue; }
      newFiles.push({ name: file.name, type: file.type, size: file.size, data: await fileToBase64(file) });
    }
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const generatePDF = () => {
    const data = submittedTask || { taskNumber: '', form };
    const { taskNumber, form: f } = data;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    let y = 20;

    const header = () => {
      doc.setFillColor(18, 140, 126);
      doc.rect(0, 0, pageW, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Service Request', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Reference: ${taskNumber}`, pageW / 2, 28, { align: 'center' });
      y = 45;
    };

    const section = (title: string) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(18, 140, 126);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 18, y + 6);
      y += 14;
    };

    const row = (label: string, value: string) => {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 18, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '-', 60, y);
      y += 7;
    };

    header();
    section('Customer Details');
    row('Name', f.customerName);
    row('Company', f.companyName);
    row('Phone', f.customerPhone);
    row('Email', f.customerEmail);

    section('Service Details');
    row('Subject', f.subject);
    row('Equipment', f.equipment);
    row('Category', f.serviceCategory);
    row('Priority', f.priority);
    row('Location', f.location);
    row('Issue', f.issue);

    if (files.length > 0) {
      section('Attachments');
      files.forEach(fl => {
        row('File', fl.name);
      });
    }

    section('Timeline');
    row('Submitted', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a system-generated document from Sree Meditech CRM', pageW / 2, 290, { align: 'center' });
    doc.save(`Service_Request_${taskNumber}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.equipment.trim() || !form.issue.trim()) {
      setErrorMsg('Please fill in all required fields.'); return;
    }
    setStep('submitting'); setErrorMsg('');
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const taskId = `SRV-${timestamp}-${rand}`;
      const taskNumber = `SRV-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const attachments: ServiceTaskAttachment[] = files.map(f => ({
        name: f.name, type: f.type, size: f.size, data: f.data,
        uploadedBy: form.customerName, uploadedAt: new Date().toISOString(), category: 'customer_submission' as const
      }));
      const task: ServiceTask = {
        id: taskId, taskNumber,
        customerName: form.customerName.trim(), companyName: form.companyName.trim() || undefined,
        customerPhone: form.customerPhone.trim(), customerEmail: form.customerEmail.trim() || undefined,
        subject: form.subject.trim() || undefined, equipment: form.equipment.trim(),
        serviceCategory: form.serviceCategory || undefined, issue: form.issue.trim(),
        priority: form.priority, status: 'New', createdAt: new Date().toISOString(),
        location: form.location.trim() || undefined, source: 'public_form',
        comments: [], attachments, activityLog: []
      };
      await setDoc(doc(db, 'serviceTasks', taskId), task);
      setSubmittedTask({ taskNumber, form: { ...form } });
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit. Please try again.');
      setStep('error');
    }
  };

  if (step === 'success') {
    return (
      <div className="h-dvh bg-gradient-to-b from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center animate-in zoom-in-95 border border-slate-200/50 dark:border-slate-800/50">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/30">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 tracking-tight mb-2">Request Submitted!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Thank you, <strong className="text-slate-700 dark:text-slate-300">{form.customerName}</strong>. Your service request for <strong className="text-slate-700 dark:text-slate-300">{form.equipment}</strong> has been received. Our team will review and contact you shortly.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-5 mb-6 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Reference Number</p>
            <p className="text-xl font-playfair font-bold tracking-tight text-teal-600 dark:text-teal-400 tracking-tight font-mono">{submittedTask?.taskNumber}</p>
          </div>
          <button onClick={generatePDF} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-[2rem] px-6 py-3.5 text-sm transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 active:scale-[0.98]">
            <Download size={16} />
            Download PDF
          </button>
          <p className="text-xs font-medium text-slate-400 mt-4">A confirmation will be sent to your mobile.</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-4 py-3 text-sm text-slate-800 dark:text-slate-200 font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 dark:focus:ring-teal-400/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const inputIconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";
  const labelClass = "text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-0.5 mb-1.5 block";

  return (
    <div className="h-dvh bg-gradient-to-b from-slate-50 via-white to-emerald-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-y-auto">
      <div className="flex flex-col items-center px-4 sm:px-6 py-6 sm:py-10 pt-[max(env(safe-area-inset-top,24px),calc(env(safe-area-inset-top,24px)+1.5rem))] min-h-full">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 max-w-xl w-full border border-slate-100 dark:border-slate-800/50">

          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-7 sm:p-9 text-white rounded-t-[2.5rem]">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl" />
            <div className="relative">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-[2rem] flex items-center justify-center mb-4 shadow-lg shadow-black/5 ring-1 ring-white/20">
                <Wrench size={24} />
              </div>
              <h1 className="text-xl sm:text-2xl font-playfair font-bold tracking-tight">Service Request</h1>
              <p className="text-sm text-white/75 mt-2 leading-relaxed max-w-md font-medium">Submit a service request. Our team will review and assign an engineer.</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-7 sm:p-9 space-y-7">

            {/* Your Details */}
            <div>
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg"><User size={15} className="text-teal-600 dark:text-teal-400" /></div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Your Details</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Full Name <span className="text-rose-400">*</span></label>
                  <input type="text" required placeholder="Rajesh Kumar" className={inputClass} value={form.customerName} onChange={e => handleChange('customerName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Company / Hospital</label>
                  <div className="relative">
                    <Building2 size={15} className={inputIconClass} />
                    <input type="text" placeholder="City Hospital" className={`${inputClass} pl-10`} value={form.companyName} onChange={e => handleChange('companyName', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelClass}>Mobile Number <span className="text-rose-400">*</span></label>
                  <div className="relative">
                    <Phone size={15} className={inputIconClass} />
                    <input type="tel" required placeholder="9876543210" className={`${inputClass} pl-10`} value={form.customerPhone} onChange={e => handleChange('customerPhone', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <div className="relative">
                    <Mail size={15} className={inputIconClass} />
                    <input type="email" placeholder="rajesh@hospital.com" className={`${inputClass} pl-10`} value={form.customerEmail} onChange={e => handleChange('customerEmail', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg"><Wrench size={15} className="text-teal-600 dark:text-teal-400" /></div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Service Details</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Subject</label>
                  <input type="text" placeholder="Brief title for this request" className={inputClass} value={form.subject} onChange={e => handleChange('subject', e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Equipment / Product <span className="text-rose-400">*</span></label>
                    <input type="text" required placeholder="e.g. Ventilator, MRI" className={inputClass} value={form.equipment} onChange={e => handleChange('equipment', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Service Category</label>
                    <div className="relative">
                      <select className={`${inputClass} pr-10`} value={form.serviceCategory} onChange={e => handleChange('serviceCategory', e.target.value)}>
                        <option value="">Select category...</option>
                        {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Priority</label>
                    <div className="relative">
                      <ChevronDown size={15} className={inputIconClass} />
                      <select className={`${inputClass} pr-10`} value={form.priority} onChange={e => handleChange('priority', e.target.value)}>
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Location / Address</label>
                    <div className="relative">
                      <MapPin size={15} className={inputIconClass} />
                      <input type="text" placeholder="Full address or landmark" className={`${inputClass} pl-10`} value={form.location} onChange={e => handleChange('location', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Issue Description <span className="text-rose-400">*</span></label>
                  <textarea required rows={4} placeholder="Describe the problem in detail. Include any error messages, unusual behavior, or specific requirements..." className={`${inputClass} resize-none`} value={form.issue} onChange={e => handleChange('issue', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg"><Paperclip size={15} className="text-teal-600 dark:text-teal-400" /></div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Attachments</span>
              </div>
              <div onClick={() => fileInputRef.current?.click()} className="relative border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-[2rem] p-7 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 dark:hover:border-teal-600/50 transition-all group">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] inline-flex mb-3 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 transition-all">
                  <Upload size={22} className="text-slate-400 group-hover:text-teal-500 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Upload Images, Documents, or Videos</p>
                <p className="text-xs text-slate-400 mt-1.5">Max 5MB per file &middot; Supports JPG, PNG, PDF, DOC</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} className="hidden" />
              </div>
              {files.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {files.map((f, i) => (
                    <div key={i} className="group relative bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                      {f.type?.startsWith('image/') ? (
                        <img src={f.data} alt={f.name} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="w-full h-20 flex items-center justify-center bg-slate-100 dark:bg-slate-800"><FileText size={22} className="text-slate-400" /></div>
                      )}
                      <button type="button" onClick={() => removeFile(i)} className="absolute top-1.5 right-1.5 p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white text-slate-500"><X size={11} /></button>
                      <div className="p-2.5">
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">{f.name}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-900/15 border border-rose-200 dark:border-rose-800/30 rounded-[2rem]">
                <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">{errorMsg}</p>
              </div>
            )}

            <button type="submit" disabled={step === 'submitting'}
              className="w-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-teal-200/50 dark:shadow-teal-900/30 hover:from-teal-700 hover:to-emerald-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              {step === 'submitting' ? (
                <><Loader size={16} className="animate-spin" /> Submitting...</>
              ) : (
                <><Send size={16} /> Submit Service Request</>
              )}
            </button>

            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center">Your request will be sent directly to our service team. No login required.</p>
          </form>
        </div>
      </div>
    </div>
  );
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
