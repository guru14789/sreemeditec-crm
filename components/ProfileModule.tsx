import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  User, Mail, Phone, MapPin, Shield, Bell, Save, Camera, Edit,
  Key, LogOut, ToggleLeft, ToggleRight, Building2, BadgeCheck, 
  Globe, Moon, Sun, Monitor, CreditCard, Database, Download, 
  AlertTriangle, RefreshCw, Smartphone, ChevronRight, X, Zap, 
  History, ShieldCheck, CheckCircle2, Server, Activity, HardDrive, Trash2,
  Laptop, Tablet, Smartphone as PhoneIcon, ShieldAlert, Lock
} from 'lucide-react';
import { useData } from './DataContext';

interface ProfileModuleProps {
    userRole: 'Admin' | 'Employee';
    setUserRole: (role: 'Admin' | 'Employee') => void;
    currentUser: string;
}

interface ActiveSession {
    id: string;
    device: string;
    browser: string;
    location: string;
    ip: string;
    lastActive: string;
    isCurrent: boolean;
    type: 'desktop' | 'mobile' | 'tablet';
}

export const ProfileModule: React.FC<ProfileModuleProps> = ({ userRole, setUserRole, currentUser }) => {
    const { 
        addNotification, clients, products, invoices, 
        stockMovements, expenses, employees, pointHistory 
    } = useData();
    
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences' | 'organization' | 'data'>('general');
    const [isEditing, setIsEditing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [integrityStatus, setIntegrityStatus] = useState<'idle' | 'checking' | 'verified'>('idle');
    
    // Security Specific State
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', next: '', confirm: '' });
    const [sessions, setSessions] = useState<ActiveSession[]>([
        { id: '1', device: 'MacBook Pro M3', browser: 'Chrome 121.0', location: 'Chennai, India', ip: '103.22.41.88', lastActive: 'Online Now', isCurrent: true, type: 'desktop' },
        { id: '2', device: 'iPhone 15 Pro', browser: 'Safari Mobile', location: 'Bangalore, India', ip: '42.106.191.12', lastActive: '2 hours ago', isCurrent: false, type: 'mobile' },
        { id: '3', device: 'iPad Air', browser: 'Brave Browser', location: 'Chennai, India', ip: '103.22.41.90', lastActive: 'Yesterday', isCurrent: false, type: 'tablet' }
    ]);

    // Initial Profile state helper
    const getInitialProfile = (): UserProfile => ({
        name: currentUser,
        role: userRole === 'Admin' ? 'General Manager' : 'Senior Technician',
        email: userRole === 'Admin' ? 'admin@sreemeditec.com' : 'rahul.s@sreemeditec.com',
        phone: '+91 98765 43210',
        department: userRole === 'Admin' ? 'Administration' : 'Field Operations',
        location: 'Chennai, India',
        bio: 'Specialist in high-precision medical imaging equipment maintenance.',
        notifications: { email: true, sms: true, push: false }
    });

    // Profile State
    const [profile, setProfile] = useState<UserProfile>(getInitialProfile());

    const [appPrefs, setAppPrefs] = useState({
        theme: localStorage.getItem('crm-theme') || 'light',
        language: 'English',
        timezone: '(GMT+05:30) Chennai'
    });

    // Theme Switcher Logic
    useEffect(() => {
        const root = window.document.documentElement;
        const isDark = appPrefs.theme === 'dark' || 
            (appPrefs.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        if (isDark) {
            root.classList.add('dark');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.remove('dark');
            root.style.colorScheme = 'light';
        }
        localStorage.setItem('crm-theme', appPrefs.theme);
    }, [appPrefs.theme]);

    const handleSave = () => {
        setIsEditing(false);
        addNotification('Preferences Synced', 'Your theme and alert settings have been successfully updated across all devices.', 'success');
    };

    const handleDiscard = () => {
        setProfile(getInitialProfile());
        setIsEditing(false);
        addNotification('Changes Discarded', 'Profile edits have been reverted to original values.', 'info');
    };

    const toggleChannel = (key: keyof typeof profile.notifications) => {
        if (!isEditing) setIsEditing(true);
        setProfile(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [key]: !prev.notifications[key]
            }
        }));
    };

    // --- SECURITY LOGIC ---

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordData.current || !passwordData.next) {
            alert("Please provide both current and new passwords.");
            return;
        }
        if (passwordData.next !== passwordData.confirm) {
            alert("New passwords do not match.");
            return;
        }
        
        // Mock API call
        addNotification('Security Update', 'Your account password has been rotated successfully.', 'success');
        setPasswordData({ current: '', next: '', confirm: '' });
    };

    const handleToggleMFA = () => {
        const nextState = !mfaEnabled;
        setMfaEnabled(nextState);
        addNotification(
            nextState ? 'MFA Enabled' : 'MFA Disabled',
            nextState ? 'Secondary authentication is now required for logins.' : 'Account protection has been lowered.',
            nextState ? 'success' : 'warning'
        );
    };

    const handleRevokeSession = (id: string) => {
        const session = sessions.find(s => s.id === id);
        if (session?.isCurrent) return; // Prevent self-revocation
        
        if (confirm(`Terminate access for ${session?.device}?`)) {
            setSessions(prev => prev.filter(s => s.id !== id));
            addNotification('Security Event', `Session on ${session?.device} has been terminated.`, 'alert');
        }
    };

    // --- SYSTEM DATA LOGIC ---
    const handleExportData = () => {
        setIsExporting(true);
        setTimeout(() => {
            const fullData = {
                metadata: { exportedAt: new Date().toISOString(), exportedBy: currentUser, version: "v1.8.5-Stable" },
                clients, products, invoices, stockMovements, expenses, employees, pointHistory
            };
            const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SreeMeditec_Snapshot_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsExporting(false);
            addNotification('Export Complete', 'Full database snapshot has been saved to your local device.', 'success');
        }, 1500);
    };

    const handleIntegrityCheck = () => {
        setIntegrityStatus('checking');
        setTimeout(() => {
            setIntegrityStatus('verified');
            addNotification('System Integrity Verified', 'All indices and relational mapped data are healthy.', 'success');
        }, 2000);
    };

    const handleFactoryReset = () => {
        const confirmPhrase = "RESET";
        const userInput = prompt(`WARNING: This will permanently purge all data. To proceed, type "${confirmPhrase}":`);
        if (userInput === confirmPhrase) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink-1 ${
                activeTab === id 
                ? 'bg-[#01261d] text-white shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
        >
            <Icon size={16} className="shrink-0" />
            <span>{label}</span>
        </button>
    );

    const FormRow = ({ label, children, fullWidth = false }: { label: string, children: React.ReactNode, fullWidth?: boolean }) => (
        <div className={`space-y-1.5 ${fullWidth ? 'col-span-full' : 'col-span-1'}`}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            {children}
        </div>
    );

    const getDeviceIcon = (type: ActiveSession['type']) => {
        switch(type) {
            case 'mobile': return <PhoneIcon size={20} />;
            case 'tablet': return <Tablet size={20} />;
            default: return <Laptop size={20} />;
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden">
            
            {/* Header Card */}
            <div className="bg-[#01261d] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Building2 size={120} /></div>
                <div className="relative group shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-3xl font-black text-white shadow-2xl overflow-hidden uppercase">
                        {profile.name.charAt(0)}
                    </div>
                    <button className="absolute -bottom-2 -right-2 bg-medical-500 p-2 rounded-xl shadow-xl hover:bg-medical-400 transition-all border-2 border-[#01261d]"><Camera size={14} /></button>
                </div>
                <div className="flex-1 text-center md:text-left min-w-0">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase truncate">{profile.name}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">{userRole} Access</span>
                        <span className="text-[10px] font-bold text-emerald-100/50 uppercase tracking-wider">• {profile.department}</span>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            isEditing ? 'bg-rose-500 text-white' : 'bg-white text-[#01261d] hover:bg-emerald-50'
                        }`}
                    >
                        {isEditing ? <X size={14} /> : <Edit size={14} />}
                        <span>{isEditing ? 'Cancel' : 'Edit Account'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
                <div className="w-full lg:w-60 flex lg:flex-col shrink-0 gap-3 overflow-x-auto lg:overflow-x-visible custom-scrollbar p-1">
                    <NavItem id="general" icon={User} label="Identity" />
                    <NavItem id="security" icon={Shield} label="Security" />
                    <NavItem id="preferences" icon={Bell} label="Preferences" />
                    {userRole === 'Admin' && <NavItem id="organization" icon={Building2} label="Organization" />}
                    <NavItem id="data" icon={Database} label="System Data" />
                </div>

                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                        <div className="max-w-3xl mx-auto">
                            
                            {activeTab === 'general' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Personal Information</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage professional identity and contacts</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        <FormRow label="Full Name"><input type="text" disabled={!isEditing} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-60" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} /></FormRow>
                                        <FormRow label="Official Designation"><input type="text" disabled={!isEditing} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-60" value={profile.role} onChange={e => setProfile({...profile, role: e.target.value})} /></FormRow>
                                        <FormRow label="Email Address"><input type="email" disabled={!isEditing} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-60" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} /></FormRow>
                                        <FormRow label="Primary Phone"><input type="tel" disabled={!isEditing} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-60" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} /></FormRow>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Access & Security</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Credentials, MFA and active sessions</p>
                                    </div>

                                    {/* MFA Widget */}
                                    <div className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${mfaEnabled ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className={`p-4 rounded-2xl shadow-sm border ${mfaEnabled ? 'bg-white text-emerald-600 border-emerald-100' : 'bg-white text-slate-400 border-slate-200'}`}>
                                                <Smartphone size={28}/>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 uppercase">Two-Factor Authentication</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{mfaEnabled ? 'Verified identity via OTP active' : 'Add an extra layer of registry security'}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleToggleMFA}
                                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                                                mfaEnabled ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-800 text-white shadow-slate-900/20'
                                            }`}>
                                            {mfaEnabled ? 'Deactivate' : 'Activate MFA'}
                                        </button>
                                    </div>

                                    {/* Password Management */}
                                    <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={14}/> Change Password</h4>
                                            <div className="space-y-3">
                                                <input type="password" placeholder="Current Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-medical-500" value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} />
                                                <input type="password" placeholder="New Strong Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-medical-500" value={passwordData.next} onChange={e => setPasswordData({...passwordData, next: e.target.value})} />
                                                <input type="password" placeholder="Confirm New Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-medical-500" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} />
                                            </div>
                                            <button type="submit" className="w-full py-3 bg-medical-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-medical-500/20">Commit Credential Update</button>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Device Log</h4>
                                            <div className="space-y-3">
                                                {sessions.map(s => (
                                                    <div key={s.id} className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${s.isCurrent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                                                {getDeviceIcon(s.type)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-slate-800">{s.device} {s.isCurrent && <span className="text-[9px] text-emerald-600 ml-1">(This)</span>}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{s.location} • {s.ip}</p>
                                                            </div>
                                                        </div>
                                                        {!s.isCurrent && (
                                                            <button 
                                                                onClick={() => handleRevokeSession(s.id)}
                                                                className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'preferences' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-12">
                                    <div className="mb-8">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">System Preferences</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Appearance and notification behavior</p>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><Monitor size={14} className="text-medical-600" /> Global UI Theme</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {[{id: 'light', icon: Sun, label: 'Day Mode'}, {id: 'dark', icon: Moon, label: 'Night Mode'}, {id: 'system', icon: Monitor, label: 'OS Adaptive'}].map(t => (
                                                <button key={t.id} onClick={() => setAppPrefs({...appPrefs, theme: t.id})} className={`p-5 rounded-[2.5rem] border-2 flex flex-col items-center gap-3 transition-all ${appPrefs.theme === t.id ? 'border-medical-500 bg-medical-50 text-medical-800 shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-white'}`}>
                                                    <div className={`p-3 rounded-2xl ${appPrefs.theme === t.id ? 'bg-medical-500 text-white' : 'bg-slate-100 text-slate-400'}`}><t.icon size={24}/></div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest">{t.label}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'data' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">System & Data Control</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage snapshots, backups and session integrity</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="p-6 bg-[#f0fdf4] border border-emerald-100 rounded-[2rem] flex flex-col justify-between group hover:shadow-xl transition-all h-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20 group-hover:scale-110 transition-transform"><Download size={24} /></div>
                                                {isExporting && <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase animate-pulse"><RefreshCw size={12} className="animate-spin" /> Bundling...</div>}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-emerald-900 uppercase tracking-tight">Backup Archive</h4>
                                                <p className="text-[10px] text-emerald-700/60 font-bold uppercase tracking-wider mt-1">Export full database as JSON map</p>
                                                <button onClick={handleExportData} disabled={isExporting} className="mt-6 w-full py-3 bg-white text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 disabled:opacity-50">Download Snapshot</button>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-[#fff1f2] border border-rose-100 rounded-[2rem] flex flex-col justify-between group hover:shadow-xl transition-all h-full">
                                            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-900/20 group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
                                            <div>
                                                <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Wipe Registry</h4>
                                                <p className="text-[10px] text-rose-700/60 font-bold uppercase tracking-wider mt-1">Purge all local cache and end current session</p>
                                                <button onClick={handleFactoryReset} className="mt-6 w-full py-3 bg-white text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95">Factory Reset</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {isEditing && (
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 sticky bottom-0 z-30 animate-in slide-in-from-bottom-full duration-300">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Unsaved profile changes detected</p>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={handleDiscard} className="flex-1 sm:flex-none px-6 py-3 bg-white border border-slate-300 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Discard</button>
                                <button onClick={handleSave} className="flex-1 sm:flex-none px-10 py-3 bg-medical-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-500/30 hover:bg-medical-700 transition-all active:scale-95 flex items-center justify-center gap-2"><Save size={14} /> Commit Sync</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
