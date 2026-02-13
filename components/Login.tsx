
import React, { useState } from 'react';
import { Mail, Lock, LogIn, ShieldCheck, Chrome, AlertCircle, RefreshCw, ShieldAlert, ExternalLink, Copy, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useData } from './DataContext';

export const Login: React.FC = () => {
    const { login, loginWithGoogle, dbError, authError, isAuthenticating } = useData();
    const [activeTab, setActiveTab] = useState<'email' | 'google'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Robustly extract string from error to prevent circular structure serialization errors
    const handleAuthError = (err: any) => {
        let errorMessage = "An unexpected authentication error occurred.";
        if (typeof err === 'string') errorMessage = err;
        else if (err?.message) errorMessage = String(err.message);
        else if (err?.code) errorMessage = `Error Code: ${err.code}`;

        const errorCode = err?.code || "";
        if (errorCode === 'auth/unauthorized-domain') {
            setUnauthorizedDomain(window.location.hostname);
            setError("Security Restriction: This domain is not whitelisted in the Cloud Auth console.");
        } else {
            setError(errorMessage);
        }
        console.warn("Authentication Exception:", errorMessage);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (activeTab === 'email' && (!email || !password)) {
            setError("Please enter both Gmail address and security key.");
            return;
        }
        setError(null);
        setUnauthorizedDomain(null);
        try {
            if (activeTab === 'email') await login(email, password);
            else await loginWithGoogle();
        } catch (err: any) {
            handleAuthError(err);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setUnauthorizedDomain(null);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            handleAuthError(err);
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
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20 dark:opacity-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-6 md:mb-10">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm ring-4 ring-emerald-500/5 transition-transform hover:scale-105">
                        <ShieldCheck size={40} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase leading-none">SREE MEDITEC</h1>
                    <p className="text-[10px] md:text-xs font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-[0.3em] md:tracking-[0.4em] mt-2 md:mt-3">Enterprise OS</p>
                </div>

                {dbError && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                        <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                            <p className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase">Database Restricted</p>
                            <p className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase">Backend connection warning. Syncing in offline mode.</p>
                        </div>
                    </div>
                )}

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6">
                    <button onClick={() => { setActiveTab('email'); setError(null); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'email' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md' : 'text-slate-400'}`}>Email Access</button>
                    <button onClick={() => { setActiveTab('google'); setError(null); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'google' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md' : 'text-slate-400'}`}>Google Auth</button>
                </div>

                {(error || authError) && (
                    <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 mt-0.5" />
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">{error || authError}</p>
                    </div>
                )}

                {unauthorizedDomain && (
                    <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl">
                        <h4 className="text-[10px] font-black text-blue-800 dark:text-blue-200 uppercase flex items-center gap-2"><ShieldAlert size={14} /> Whitelisting Required</h4>
                        <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 flex items-center justify-between">
                            <code className="text-[11px] font-mono font-bold text-blue-600">{unauthorizedDomain}</code>
                            <button onClick={handleCopyDomain}>{copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}</button>
                        </div>
                        <a href="https://console.firebase.google.com/project/sreemeditec-app/authentication/settings" target="_blank" rel="noopener noreferrer" className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><ExternalLink size={14} /> Open Settings</a>
                    </div>
                )}

                {activeTab === 'email' ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Work Email</label>
                            <div className="relative group">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500" />
                                <input type="email" required placeholder="your.name@gmail.com" className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl text-sm font-bold focus:border-emerald-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Security Key</label>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500" />
                                <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl text-sm font-bold focus:border-emerald-500 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                            </div>
                        </div>
                        <button type="submit" disabled={isAuthenticating} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70">
                            {isAuthenticating ? <RefreshCw className="animate-spin" size={20} /> : <><LogIn size={20} /> Sign In</>}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6 pt-4">
                        <button onClick={handleGoogleLogin} disabled={isAuthenticating} className="w-full flex items-center justify-center gap-4 bg-white dark:bg-slate-800 border-2 border-slate-100 py-4 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 disabled:opacity-50">
                            {isAuthenticating ? <RefreshCw size={20} className="animate-spin text-emerald-600" /> : <Chrome size={20} className="text-emerald-600" />}
                            <span>{isAuthenticating ? 'Verifying...' : 'Login by Google Auth'}</span>
                        </button>
                        <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed italic px-4">
                            Staff identity verified against the Sree Meditec employee registry. Use your registered work Gmail account.
                        </p>
                    </div>
                )}

                <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800/50 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Sree Meditec • Enterprise OS v1.8.5</p>
                </div>
            </div>
        </div>
    );
};
