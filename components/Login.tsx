import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, AlertCircle, RefreshCw, ShieldAlert, ExternalLink, Copy, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useData } from './DataContext';
import Shuffle from './Shuffle';
import { auth } from '../firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

export const Login: React.FC = () => {
    const { login, dbError, authError, isAuthenticating } = useData();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showIdleTip, setShowIdleTip] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowIdleTip(true), 30000);
        return () => clearTimeout(timer);
    }, []);

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
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setError(null);
        setUnauthorizedDomain(null);
        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            await login(email, password);
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
        <div className="min-h-screen flex">
            {/* Left Panel — Quote / Art */}
            <div className="hidden lg:flex w-[40%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#051410] to-slate-900">
                {/* Abstract fluid-wave background */}
                <div className="absolute inset-0 opacity-60">
                    <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full bg-gradient-to-br from-emerald-500/30 via-teal-600/20 to-transparent blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full bg-gradient-to-tl from-green-400/20 via-emerald-600/20 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute top-1/3 right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-bl from-teal-400/20 via-emerald-500/10 to-transparent blur-3xl"></div>
                    {/* Ribbon curves */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 800" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="ribbon1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                            </linearGradient>
                            <linearGradient id="ribbon2" x1="100%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#047857" stopOpacity="0.05" />
                            </linearGradient>
                        </defs>
                        <path d="M0,200 C150,150 200,350 350,300 C500,250 450,450 500,500 L500,800 L0,800 Z" fill="url(#ribbon1)" />
                        <path d="M0,400 C120,350 180,500 300,450 C420,400 400,600 500,550 L500,800 L0,800 Z" fill="url(#ribbon2)" />
                        <path d="M0,550 C100,500 150,650 280,580 C410,510 430,700 500,650 L500,800 L0,800 Z" fill="url(#ribbon1)" opacity="0.5" />
                    </svg>
                    {/* Glossy highlights */}
                    <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
                    <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                </div>

                {/* Glass card */}
                <div className="relative z-10 flex flex-col justify-between w-full m-8 p-10 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <div>
                        <span className="text-[10px] font-black text-emerald-300/60 uppercase tracking-[0.25em]">A wise quote</span>
                        <p className="mt-4 text-sm text-white/70 leading-relaxed font-light italic border-l-2 border-emerald-400/30 pl-4">
                            {[
                                "The only way to do great work is to love what you do.",
                                "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                                "Believe you can and you're halfway there.",
                                "Your time is limited, don't waste it living someone else's life.",
                                "The future belongs to those who believe in the beauty of their dreams.",
                                "In the middle of difficulty lies opportunity.",
                                "What you get by achieving your goals is not as important as what you become.",
                                "The only impossible journey is the one you never begin.",
                                "Great minds discuss ideas; average minds discuss events; small minds discuss people.",
                                "Hardships often prepare ordinary people for an extraordinary destiny.",
                                "It does not matter how slowly you go as long as you do not stop.",
                                "Quality is not an act, it is a habit.",
                                "The best time to plant a tree was 20 years ago. The second best time is now.",
                                "Everything you've ever wanted is on the other side of fear.",
                                "Success usually comes to those who are too busy to be looking for it."
                            ][new Date().getDate() % 15]}
                        </p>
                    </div>
                    <div className="mt-auto">
                        <h1 className="text-[2.8rem] leading-[1.15] font-bold text-white tracking-tight">
                            <span className="block">Get</span>
                            <span className="block">
                                <Shuffle
                                    text="Everything"
                                    tag="span"
                                    duration={0.5}
                                    shuffleDirection="right"
                                    shuffleTimes={2}
                                    animationMode="evenodd"
                                    stagger={0.04}
                                    ease="power3.out"
                                    colorFrom="#6ee7b7"
                                    colorTo="#34d399"
                                    triggerOnce={false}
                                    triggerOnHover={true}
                                    respectReducedMotion={true}
                                    onShuffleComplete={() => {}}
                                    style={{ fontSize: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit', textAlign: 'left' }}
                                />
                            </span>
                            <span className="block">You Want</span>
                        </h1>
                        <p className="mt-6 text-sm text-white/60 leading-relaxed max-w-sm font-light italic">
                            "You can get everything you want if you work hard. Trust the process, and stick to the plan."
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950 p-6">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-10">
                        <img src="/images/logo.png" alt="Sree Meditec" className="h-16 mx-auto mb-6" />
                        <h2 className="text-3xl font-playfair font-bold tracking-tight text-slate-900 dark:text-slate-100 tracking-tight">Welcome Back</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Enter your email and password to access your account</p>
                    </div>

                    {dbError && (
                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[2rem] flex items-start gap-3">
                            <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Backend connection warning. Syncing in offline mode.</p>
                        </div>
                    )}

                    {(error || authError) && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-[2rem] flex items-start gap-3">
                            <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">{error || authError}</p>
                        </div>
                    )}

                    {unauthorizedDomain && (
                        <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-[2rem]">
                            <h4 className="text-xs font-black text-blue-800 dark:text-blue-200 flex items-center gap-2"><ShieldAlert size={14} /> Whitelisting Required</h4>
                            <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-[2rem] border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                                <code className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">{unauthorizedDomain}</code>
                                <button onClick={handleCopyDomain} type="button">{copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} className="text-blue-600" />}</button>
                            </div>
                            <a href="https://console.firebase.google.com/project/sreemeditec-app/authentication/settings" target="_blank" rel="noopener noreferrer" className="mt-4 w-full bg-blue-600 text-white py-3 rounded-[2rem] text-xs font-black flex items-center justify-center gap-2"><ExternalLink size={14} /> Open Settings</a>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Email</label>
                            <div className="relative mt-1.5">
                                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                                <input type="email" required placeholder="your.name@gmail.com" className="w-full pl-11 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Password</label>
                            <div className="relative mt-1.5">
                                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                                <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" className="w-full pl-11 pr-11 py-3.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 scale-95 transition-colors">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
                                <div onClick={() => setRememberMe(!rememberMe)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${rememberMe ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {rememberMe && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Remember me</span>
                            </label>
                            <button type="button" className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 hover:underline">Forgot Password?</button>
                        </div>

                        <button type="submit" disabled={isAuthenticating} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-[2rem] transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-3 disabled:opacity-70 text-sm">
                            {isAuthenticating ? <RefreshCw className="animate-spin" size={18} /> : <><LogIn size={18} /> Sign In</>}
                        </button>

                    </form>

                    {showIdleTip && (
                        <div className="mt-6 flex items-start gap-4 animate-in slide-in-from-bottom fade-in duration-500">
                            <div className="w-14 h-14 rounded-[2rem] overflow-hidden shrink-0 shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-700/50 bg-white">
                                <img src="/images/character.png" alt="Character" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 pt-1">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Hey! Been here a while?</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">It's time to log in! Your team is waiting for you. 🙂</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
