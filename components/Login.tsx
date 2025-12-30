
import React, { useState } from 'react';
import { Mail, Lock, LogIn, ShieldCheck, Chrome, AlertCircle, RefreshCw, Info, Database, ShieldAlert, Plus } from 'lucide-react';
import { useData } from './DataContext';

export const Login: React.FC = () => {
  const { login, dbError, employees, seedDatabase } = useData();
  const [activeTab, setActiveTab] = useState<'email' | 'google'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("Please enter both email and password.");
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await login(email, password, false);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
      setIsSeeding(true);
      try {
          await seedDatabase();
          setError(null);
      } catch (err: any) {
          setError("Seed failed: " + err.message);
      } finally {
          setIsSeeding(false);
      }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const targetEmail = email || 'employee@demo.com';
      await login(targetEmail, undefined, true);
    } catch (err: any) {
      setError(err.message || "Google Authentication failed.");
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
                        Firestore Security Rules are blocking access. Go to Firebase Console > Firestore > Rules and set them to public read/write for testing.
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
                onClick={() => { setActiveTab('email'); setError(null); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'email' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                Email Access
            </button>
            <button 
                onClick={() => { setActiveTab('google'); setError(null); }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'google' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                Google Auth
            </button>
        </div>

        {(error || dbError) && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">{error || "Permissions error detected."}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gmail Address</label>
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
                disabled={isLoading || isSeeding}
                className="w-full bg-[#01261d] text-white py-4 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-950/20 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <RefreshCw size={20} className="animate-spin" /> : <><LogIn size={20} /> Authenticate Session</>}
            </button>
        </form>

        <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-[10px]">
            <div className="flex items-center gap-2 mb-2 font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
                <Info size={14} /> Simulation Registry
            </div>
            <div className="space-y-1 font-bold text-emerald-700 dark:text-emerald-400">
                <div className="flex justify-between border-b border-emerald-100/30 pb-1 mb-1">
                    <span>Admin Hub:</span> 
                    <span className="text-right">admin@demo.com / <span className="font-black underline">admin</span></span>
                </div>
                <div className="flex justify-between">
                    <span>Personnel:</span> 
                    <span className="text-right">employee@demo.com / <span className="font-black underline">pass</span></span>
                </div>
            </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                System Terminal 1.8.5 • &copy; Sree Meditec
            </p>
        </div>
      </div>
    </div>
  );
};
