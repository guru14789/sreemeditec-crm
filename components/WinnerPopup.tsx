import React, { useEffect, useState } from 'react';
import { useData } from './DataContext';
import { Crown, Trophy, X, PartyPopper, Award, Star, TrendingUp, Medal, Sparkles, CheckCircle2 } from 'lucide-react';
import Confetti from 'react-confetti';

export const WinnerPopup: React.FC = () => {
    const { showWinnerPopup, setShowWinnerPopup, latestWinner, acknowledgeWinner } = useData();
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!showWinnerPopup || !latestWinner) return null;

    const handleClose = async () => {
        setIsClosing(true);
        setTimeout(async () => {
            await acknowledgeWinner(latestWinner.id);
            setIsClosing(false);
            setShowWinnerPopup(false);
        }, 500);
    };

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-emerald-950/80 backdrop-blur-xl transition-all duration-500 ${isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}>
            <Confetti
                width={dimensions.width}
                height={dimensions.height}
                recycle={true}
                numberOfPieces={150}
                gravity={0.08}
                colors={['#10b981', '#34d399', '#059669', '#ecfdf5', '#ffffff']}
            />
            
            <div className={`relative max-w-lg w-full flex flex-col items-center transition-all duration-700 ${isClosing ? 'scale-90 opacity-0 translate-y-12' : 'scale-100 opacity-100 translate-y-0 animate-in zoom-in-95'}`}>
                
                {/* Main Award Card */}
                <div className="relative w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-1 shadow-[0_64px_128px_-20px_rgba(0,0,0,0.4)] overflow-hidden border-8 border-emerald-500/10">
                    
                    {/* Top Decorative Arc */}
                    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-600 to-teal-500">
                         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                         <div className="absolute -bottom-12 inset-x-0 h-24 bg-white dark:bg-slate-900 rounded-[100%] scale-x-110"></div>
                    </div>
                    
                    {/* Content Container */}
                    <div className="relative z-10 flex flex-col items-center px-8 pt-12 pb-10">
                        
                        {/* Header Titles */}
                        <div className="text-center mb-8">
                            <p className="text-emerald-50 font-black text-[9px] uppercase tracking-[0.4em] mb-3">Sree Meditec Registry</p>
                            <h2 className="text-white font-black text-2xl uppercase tracking-tighter mb-0.5">Best Employee</h2>
                            <h1 className="text-white font-serif text-4xl italic tracking-tight">Of The Month</h1>
                        </div>

                        {/* Wreath & Avatar Area */}
                        <div className="relative mb-12 flex items-center justify-center">
                            {/* SVG Wreath Simulation (using Lucide icons in circle) */}
                            <div className="absolute inset-0 -m-10 flex items-center justify-center pointer-events-none">
                                <div className="w-52 h-52 rounded-full border-4 border-emerald-500/10 border-dashed animate-[spin_30s_linear_infinite]"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                     <div className="w-60 h-60 text-emerald-500/20 rotate-12"><Sparkles size={240} strokeWidth={0.5} /></div>
                                </div>
                            </div>
                            
                            {/* Floating Trophy */}
                            <div className="absolute -top-6 left-1/2 -track-x-1/2 text-white drop-shadow-lg animate-bounce">
                                <Trophy size={40} fill="currentColor" strokeWidth={1} />
                            </div>

                            {/* Circular Frame */}
                            <div className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 p-1.5 shadow-[0_20px_50px_rgba(16,185,129,0.3)]">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-5xl border-4 border-white dark:border-slate-900">
                                    {latestWinner.userName.charAt(0)}
                                </div>
                            </div>

                            {/* Winner Name Banner (Overlapping) */}
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-[130%]">
                                <div className="relative">
                                    <div className="h-12 bg-emerald-600 rounded-xl shadow-xl flex items-center justify-center px-8 border-2 border-white/20">
                                        <h3 className="text-white font-black text-sm uppercase tracking-[0.15em] text-center truncate">
                                            {latestWinner.userId === 'NONE' ? 'Honorable Mention' : latestWinner.userName}
                                        </h3>
                                    </div>
                                    <div className="absolute -left-2 top-1.5 w-4 h-9 bg-emerald-800 -z-10 rounded-l-md -rotate-12"></div>
                                    <div className="absolute -right-2 top-1.5 w-4 h-9 bg-emerald-800 -z-10 rounded-r-md rotate-12"></div>
                                </div>
                            </div>
                        </div>

                        {/* Motivational Text */}
                        <div className="text-center max-w-xs space-y-4 pt-2">
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed px-4">
                                "Your exceptional hard work, dedication, and clinical excellence have set a new benchmark for the team."
                            </p>
                            
                            <div className="flex items-center justify-center gap-4 py-4">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                    <p className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-0.5">Month</p>
                                    <p className="text-slate-800 dark:text-white font-black text-[10px] uppercase">{new Date(latestWinner.monthId + "-01").toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                    <p className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-0.5">Points</p>
                                    <p className="text-slate-800 dark:text-white font-black text-[10px] uppercase">{latestWinner.points} XP</p>
                                </div>
                            </div>
                        </div>

                        {/* Action AREA */}
                        <div className="mt-8 w-full">
                            <button
                                onClick={handleClose}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] group"
                            >
                                Continue Excellence
                                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Celebration Badges */}
                <div className="mt-8 flex gap-3 opacity-60">
                    {[Sparkles, Trophy, Star].map((Icon, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10">
                            <Icon size={18} />
                        </div>
                    ))}
                </div>
            </div>

            <button 
               onClick={handleClose}
               className="absolute top-6 right-6 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
                <X size={20} />
            </button>
        </div>
    );
};
