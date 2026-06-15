import React, { useState, useRef } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { ServiceTask, ServiceTaskAttachment } from '../types';
import { Wrench, CheckCircle, AlertCircle, Loader, Upload, X, Paperclip, Phone, Mail, MapPin, User } from 'lucide-react';

const SERVICE_CATEGORIES = [
  'Installation',
  'Repair',
  'Maintenance',
  'AMC Service',
  'Calibration',
  'Upgrade',
  'Demo',
  'Training',
  'Other'
];

export const PublicServiceForm: React.FC = () => {
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [files, setFiles] = useState<{ name: string; type: string; size: number; data: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    customerName: '',
    companyName: '',
    customerPhone: '',
    customerEmail: '',
    subject: '',
    equipment: '',
    serviceCategory: '',
    issue: '',
    location: '',
    priority: 'Medium' as ServiceTask['priority']
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || !selected.length) return;
    const newFiles: typeof files = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(`${file.name} exceeds 5MB limit.`);
        continue;
      }
      const data = await fileToBase64(file);
      newFiles.push({ name: file.name, type: file.type, size: file.size, data });
    }
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.equipment.trim() || !form.issue.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setStep('submitting');
    setErrorMsg('');

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const taskId = `SRV-${timestamp}-${rand}`;
      const taskNumber = `SRV-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const attachments: ServiceTaskAttachment[] = files.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        data: f.data,
        uploadedBy: form.customerName,
        uploadedAt: new Date().toISOString(),
        category: 'customer_submission' as const
      }));

      const task: ServiceTask = {
        id: taskId,
        taskNumber,
        customerName: form.customerName.trim(),
        companyName: form.companyName.trim() || undefined,
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        subject: form.subject.trim() || undefined,
        equipment: form.equipment.trim(),
        serviceCategory: form.serviceCategory || undefined,
        issue: form.issue.trim(),
        priority: form.priority,
        status: 'New',
        createdAt: new Date().toISOString(),
        location: form.location.trim() || undefined,
        source: 'public_form',
        comments: [],
        attachments,
        activityLog: []
      };

      await setDoc(doc(db, 'serviceTasks', taskId), task);
      setStep('success');
    } catch (err: any) {
      console.error('Service request failed:', err);
      setErrorMsg(err.message || 'Failed to submit. Please try again.');
      setStep('error');
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl max-w-md w-full p-10 text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-3">Request Submitted!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Thank you, <strong className="text-slate-700 dark:text-slate-300">{form.customerName}</strong>. Your service request for <strong className="text-slate-700 dark:text-slate-300">{form.equipment}</strong> has been received. Our service team will review and contact you shortly.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-6">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference Number</p>
            <p className="text-lg font-black text-teal-600 tracking-tight">{form.issue ? `SRV-${Date.now().toString().slice(-6)}` : ''}</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400">You will receive a confirmation shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-start md:items-center justify-center p-4 md:p-6 pt-[max(env(safe-area-inset-top,24px),24px)]">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 md:p-8 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Wrench size={28} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Service Request</h1>
          <p className="text-sm text-white/70 mt-2 leading-relaxed max-w-lg">Submit a service request. Our team will review and assign an engineer.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {/* Section: Customer Info */}
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={14} className="text-teal-600" /> Your Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                  value={form.customerName}
                  onChange={e => handleChange('customerName', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. City Hospital"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                  value={form.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number *</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                    value={form.customerPhone}
                    onChange={e => handleChange('customerPhone', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="rajesh@hospital.com"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                    value={form.customerEmail}
                    onChange={e => handleChange('customerEmail', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Service Info */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Wrench size={14} className="text-teal-600" /> Service Details</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                <input
                  type="text"
                  placeholder="Brief title for this request"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                  value={form.subject}
                  onChange={e => handleChange('subject', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipment / Product *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ventilator, MRI, PC"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                    value={form.equipment}
                    onChange={e => handleChange('equipment', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Category</label>
                  <select
                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all appearance-none"
                    value={form.serviceCategory}
                    onChange={e => handleChange('serviceCategory', e.target.value)}
                  >
                    <option value="">Select category...</option>
                    {SERVICE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                  <select
                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all appearance-none"
                    value={form.priority}
                    onChange={e => handleChange('priority', e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location / Address</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Full address or landmark"
                      className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
                      value={form.location}
                      onChange={e => handleChange('location', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the problem in detail. Include any error messages, unusual behavior, or specific requirements..."
                  className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all resize-none"
                  value={form.issue}
                  onChange={e => handleChange('issue', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section: Attachments */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Paperclip size={14} className="text-teal-600" /> Attachments</h3>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-all group"
            >
              <Upload size={24} className="mx-auto text-slate-400 group-hover:text-teal-500 transition-colors mb-2" />
              <p className="text-[11px] font-bold text-slate-500 group-hover:text-teal-600 transition-colors">Click to upload images, documents, or videos</p>
              <p className="text-[9px] text-slate-400 mt-1">Max 5MB per file</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {files.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {files.map((f, i) => (
                  <div key={i} className="relative group bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {f.type?.startsWith('image/') ? (
                      <img src={f.data} alt={f.name} className="w-full h-20 object-cover" />
                    ) : (
                      <div className="w-full h-20 flex items-center justify-center">
                        <Paperclip size={20} className="text-slate-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600"
                    >
                      <X size={12} />
                    </button>
                    <div className="p-2">
                      <p className="text-[8px] font-bold text-slate-500 truncate">{f.name}</p>
                      <p className="text-[7px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={step === 'submitting'}
            className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:from-teal-700 hover:to-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {step === 'submitting' ? (
              <><Loader size={16} className="animate-spin" /> Submitting...</>
            ) : (
              <><Wrench size={16} /> Submit Service Request</>
            )}
          </button>

          <p className="text-[9px] font-bold text-slate-400 text-center">Your request will be sent directly to our service team. No login required.</p>
        </form>
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
