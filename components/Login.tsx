
import React, { useState } from 'react';
import { Mail, Lock, LogIn, ShieldCheck, Chrome, AlertCircle, RefreshCw, Database, ShieldAlert, Plus, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { useData } from './DataContext';

export const Login: React.FC = () => {
  const { login, loginWithGoogle, dbError, employees, seedDatabase } = useData();
  const [activeTab, setActiveTab] = useState<'email' | 'google'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [copied, setCopied] = useState(false);

  // FIX: Robustly extract string from error to prevent circular structure serialization errors
  const handleAuthError = (err: any) => {
    // Ensure we only use string messages for state
    let errorMessage = "An unexpected authentication error occurred.";
    
    if (typeof err === 'string') {
        errorMessage = err;
    } else if (err?.message) {
        errorMessage = String(err.message);
    } else if (err?.code) {
        errorMessage = `Error Code: ${err.code}`;
    }

    const errorCode = err?.code || "";

    if (errorCode === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.hostname);
        setError("Security Restriction: This domain is not whitelisted in the Cloud Auth console.");
    } else if (errorMessage.includes("not in the Sree Meditec staff registry")) {
        setError(errorMessage + " Please check if you used the correct work email.");
    } else if (errorMessage.includes("is empty")) {
        setError("System Error: No staff records found. Initialize the database below.");
    } else {
        setError(errorMessage);
    }
    
    console.warn("Authentication Exception:", errorMessage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'email' && (!email || !password)) {
        setError("Please enter both Gmail address and security key.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setUnauthorizedDomain(null);

    try {
      if (activeTab === 'email') {
        await login(email, password);
      } else {
        await loginWithGoogle();
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
      setIsSeeding(true);
      setError(null);
      try {
          await seedDatabase();
      } catch (err: any) {
          handleAuthError(err);
      } finally {
          setIsSeeding(false);
      }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setUnauthorizedDomain(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (!unauthorizedDomain) return;
    navigator.clipboard.writeText(unauthorizedDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-emerald-500/5 transition-transform hover:scale-105">
             <ShieldCheck size={40} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase leading-none">SREE MEDITEC</h1>
          <p className="text-xs font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-[0.4em] mt-3">Enterprise OS</p>
        </div>

        {dbError && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest">Database Restricted</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase">Backend connection warning. Syncing in offline mode.</p>
                </div>
            </div>
        )}

        {(employees.length === 0 || error?.includes("registry is empty")) && !dbError && (
             <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-[2rem] text-center space-y-4 animate-in zoom-in duration-500 shadow-sm">
                <Database size={32} className="mx-auto text-indigo-600" />
                <div>
                    <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Workspace Fresh</h3>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase mt-1 leading-relaxed">
                        The employee registry is empty. Initialize the master admin records to begin.
                    </p>
                </div>
                <button 
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95">
                    {isSeeding ? <RefreshCw size={14} className="animate-spin" /> : <><Plus size={14} strokeWidth={4} /> Initialize Workspace</>}
                </button>
             </div>
        )}

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-8">
            <button 
                onClick={() => { setActiveTab('email'); setError(null); setUnauthorizedDomain(null); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'email' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                Email Access
            </button>
            <button 
                onClick={() => { setActiveTab('google'); setError(null); setUnauthorizedDomain(null); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'google' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                Google Auth
            </button>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 shadow-sm">
                <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
            </div>
        )}

        {unauthorizedDomain && (
            <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-[1.5rem] animate-in zoom-in-95">
                <h4 className="text-[10px] font-black text-blue-800 dark:text-blue-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-blue-600" /> Whitelisting Required
                </h4>
                <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300 leading-relaxed">
                    This domain needs to be authorized in your Firebase Project settings to use Google Auth.
                </p>
                <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                    <code className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">{unauthorizedDomain}</code>
                    <button 
                        onClick={handleCopyDomain}
                        className={`p-1.5 rounded-lg transition-all ${copied ? 'text-emerald-500 bg-emerald-50' : 'text-blue-400 hover:bg-blue-50'}`}
                    >
                        {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </button>
                </div>
                <a 
                    href="https://console.firebase.google.com/project/sreemeditec-app/authentication/settings" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <ExternalLink size={14} /> Open Firebase Settings
                </a>
            </div>
        )}

        {activeTab === 'email' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail size={18} className="text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input 
                        type="email"
                        required
                        placeholder="your.name@gmail.com"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all dark:text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input 
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-[1.25rem] transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-8 disabled:opacity-70 disabled:cursor-not-allowed">
                {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <><LogIn size={20} /> Sign In</>}
            </button>
          </form>
        ) : (
          <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-center space-y-2 mb-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Standard organizational sign-on</p>
            </div>
            <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50">
                {isLoading ? <RefreshCw size={20} className="animate-spin text-emerald-600" /> : <Chrome size={20} className="text-emerald-600" />}
                <span>{isLoading ? 'Verifying...' : 'Login by Google Auth'}</span>
            </button>
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white dark:bg-slate-900 px-4 text-slate-300">Enterprise Policy</span></div>
            </div>
            <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed italic px-4">
                Staff identity verified against the Sree Meditec employee registry. Use your registered work Gmail account.
            </p>
          </div>
        )}
        
        <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800/50 text-center">
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Sree Meditec • Infrastructure Management v1.8.5</p>
        </div>
      </div>
    </div>
  );
};
