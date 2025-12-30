
import React, { useState } from 'react';
import { Mail, Lock, LogIn, ShieldCheck, Chrome, AlertCircle, RefreshCw, Database, ShieldAlert, Plus, ExternalLink, Copy } from 'lucide-react';
import { useData } from './DataContext';

export const Login: React.FC = () => {
  const { login, loginWithGoogle, dbError, employees, seedDatabase, addNotification } = useData();
  const [activeTab, setActiveTab] = useState<'email' | 'google'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleAuthError = (err: any) => {
    // Robust detection of unauthorized domain error
    const errorCode = err.code || '';
    const errorMessage = err.message || '';
    
    if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        setUnauthorizedDomain(window.location.hostname);
        setError("Firebase Domain Restriction: This domain is not authorized to use Google Authentication.");
    } else {
        setError(err.message || "Failed to authenticate. Please check your credentials.");
    }
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
      try {
          await seedDatabase();
          setError(null);
          addNotification('System Ready', 'Baseline data generated.', 'success');
      } catch (err: any) {
          setError("Seed failed: " + err.message);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 md:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-emerald-500/5">
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
                    <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300 leading-relaxed">
                        Firestore Security Rules are blocking access. Go to Firebase Console &gt; Firestore &gt; Rules and set them to public read/write for testing.
                    </p>
                </div>
            </div>
        )}

        {employees.length === 0 && !dbError && (
             <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-[2rem] text-center space-y-4 animate-in zoom-in duration-500">
                <Database size={32} className="mx-auto text-indigo-600" />
                <div>
                    <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Fresh Instance Detected</h3>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase mt-1 leading-relaxed">
                        Your Cloud Registry is empty. Click below to initialize demo data and admin accounts.
                    </p>
                </div>
                <button 
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    {isSeeding ? <RefreshCw size={14} className="animate-spin" /> : <><Plus size={14} /> Initialize Workspace</>}
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
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
            </div>
        )}

        {unauthorizedDomain && (
            <div className="mb-6 p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-[1.5rem] animate-in zoom-in-95">
                <h4 className="text-[10px] font-black text-indigo-800 dark:text-indigo-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-indigo-600" /> Whitelisting Required
                </h4>
                <p className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    Google Authentication requires this domain to be authorized in your Firebase project.
                </p>
                <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
                    <code className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{unauthorizedDomain}</code>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(unauthorizedDomain);
                            addNotification('Copied', 'Domain hostname copied to clipboard.', 'info');
                        }}
                        className="p-1 hover:bg-indigo-50 rounded text-indigo-400"
                    >
                        <Copy size={12} />
                    </button>
                </div>
                <a 
                    href="https://console.firebase.google.com/project/sreemeditec-app/authentication/settings" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20"
                >
                    <ExternalLink size={14} /> Open Firebase Settings
                </a>
                <p className="mt-3 text-[9px] text-center text-indigo-400 font-bold uppercase tracking-tighter">
                    Go to: Settings > Authorized Domains > Add Domain
                </p>
            </div>
        )}

        {activeTab === 'email' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gmail Address</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail size={18} className="text-slate-300 group-focus-within:text-medical-500 transition-colors" />
                    </div>
                    <input 
                        type="email"
                        required
                        placeholder="your.name@gmail.com"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all dark:text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-300 group-focus-within:text-medical-500 transition-colors" />
                    </div>
                    <input 
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.25rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all dark:text-white"
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
            <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed italic">
                Authorized staff members only. Your identity is verified against the Sree Meditec employee registry.
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
