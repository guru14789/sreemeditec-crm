
import { ToggleSwitch } from './ToggleSwitch';
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Employee } from '../types';
import { 
  User, Mail, Phone, MapPin, Shield, Bell, Save, Camera, Edit,
  Building2, Globe, Moon, Sun, Monitor, Database, Download, 
  AlertTriangle, RefreshCw, Smartphone, X, 
  History, CheckCircle2, Laptop, Tablet, Smartphone as PhoneIcon, Lock
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

const NavItem = ({ id, icon: Icon, label, activeTab, onClick }: { id: string, icon: any, label: string, activeTab: string, onClick: (id: any) => void }) => (
    <button 
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-3 py-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-[2rem] transition-all whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink-1 ${
            activeTab === id 
            ? 'bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
    >
        <Icon size={16} className="shrink-0" />
        <span>{label}</span>
    </button>
);

const FormRow = ({ label, children, fullWidth = false }: { label: string, children?: React.ReactNode, fullWidth?: boolean }) => (
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

/**
 * Sanitizes data for JSON stringification to prevent circular references 
 * and convert Firestore objects into serializable strings.
 */
const sanitizeForExport = (obj: any): any => {
    try {
        const cache = new Set();
        const jsonString = JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                // Check visited objects to prevent circularity
                if (cache.has(value)) {
                    return "[Circular Reference]";
                }
                cache.add(value);
                
                // Convert Firestore timestamps to strings
                if (typeof value.toDate === 'function') {
                    return value.toDate().toISOString();
                }
            }
            return value;
        }, 2);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Sanitization error:", e);
        return { error: "Object too complex to sanitize" };
    }
};

export const ProfileModule: React.FC<ProfileModuleProps> = ({ userRole, setUserRole }) => {
    const { 
        currentUser: authUser, 
        updateEmployee, 
        addNotification, 
        clients, 
        products, 
        invoices, 
        stockMovements, 
        expenses, 
        employees, 
        pointHistory 
    } = useData();
    
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences' | 'organization' | 'data'>('general');
    const [isEditing, setIsEditing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Map registry employee to user profile interface
    const mapEmployeeToProfile = (emp: Employee | null): UserProfile => ({
        name: emp?.name || 'Guest User',
        role: emp?.role.replace('_', ' ') || 'Unassigned',
        email: emp?.email || '',
        phone: emp?.phone || '',
        department: emp?.department || 'General',
        location: 'Not Specified', // These aren't in the Employee registry yet
        bio: 'Team Member at Sree Meditec.',
        notifications: { email: true, sms: true, push: false }
    });

    const [profile, setProfile] = useState<UserProfile>(mapEmployeeToProfile(authUser));
    const [appPrefs, setAppPrefs] = useState({
        theme: localStorage.getItem('crm-theme') || 'light',
        language: 'English',
        timezone: '(GMT+05:30) Chennai'
    });
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', next: '', confirm: '' });

    // Sync profile state when registry data changes (e.g., after login or update)
    useEffect(() => {
        if (authUser) {
            setProfile(mapEmployeeToProfile(authUser));
        }
    }, [authUser]);

    const [sessions, setSessions] = useState<ActiveSession[]>([
        { id: '1', device: 'Workstation Terminal', browser: 'Chrome Enterprise', location: 'Office', ip: '10.0.4.12', lastActive: 'Now', isCurrent: true, type: 'desktop' },
        { id: '2', device: 'Mobile Handset', browser: 'Registry App', location: 'On Field', ip: '172.16.0.45', lastActive: '2h ago', isCurrent: false, type: 'mobile' }
    ]);

    const hasUnsavedChanges = useMemo(() => {
        if (!authUser) return false;
        return profile.name !== authUser.name ||
               profile.phone !== authUser.phone ||
               profile.email !== authUser.email;
    }, [profile, authUser]);

    useEffect(() => {
        const root = window.document.documentElement;
        const targetTheme = appPrefs.theme;
        const isDark = targetTheme === 'dark' || (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    }, [appPrefs.theme]);

    const handleSave = async () => {
        if (!authUser) return;
        
        try {
            // Persist the changes back to the Employee Registry in Firestore
            await updateEmployee(authUser.id, {
                name: profile.name,
                email: profile.email,
                phone: profile.phone
            });

            localStorage.setItem('crm-theme', appPrefs.theme);
            setIsEditing(false);
            addNotification('Profile Synced', 'Registry records updated successfully.', 'success');
        } catch (err) {
            addNotification('Update Failed', 'Could not commit changes to registry.', 'alert');
        }
    };

    const handleDiscard = () => {
        if (authUser) {
            setProfile(mapEmployeeToProfile(authUser));
        }
        setIsEditing(false);
    };

    const handleToggleMFA = () => {
        if (!isEditing) return;
        setMfaEnabled(!mfaEnabled);
    };

    const handleRevokeSession = (id: string) => {
        if (!isEditing) return;
        setSessions(prev => prev.filter(s => s.id !== id));
        addNotification('Security', 'Session terminated.', 'alert');
    };

    const handleExportData = () => {
        if (!isEditing) return;
        setIsExporting(true);
        setTimeout(() => {
            try {
                const rawData = {
                    metadata: { exportedAt: new Date().toISOString(), version: "v1.8.5" },
                    clients, products, invoices, stockMovements, expenses, employees, pointHistory
                };
                
                const sanitizedData = sanitizeForExport(rawData);
                
                const blob = new Blob([JSON.stringify(sanitizedData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Registry_Backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                addNotification('Backup Ready', 'Snapshot saved to disk.', 'success');
            } catch (err) {
                console.error("Export error:", err);
                addNotification('Backup Failed', 'Could not bundles registry data.', 'alert');
            } finally {
                setIsExporting(false);
            }
        }, 800);
    };

    const handleFactoryReset = () => {
        if (!isEditing) return;
        if (prompt('Type "RESET" to wipe all local cache:') === 'RESET') {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 m-1 md:m-3 lg:m-4 p-4 md:p-6 rounded-[28px] md:rounded-[36px] text-white shadow-[0_30px_60px_-15px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] flex flex-row items-center gap-4 relative overflow-hidden shrink-0 group">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none hidden md:block"><Building2 size={120} /></div>
                <div className="relative shrink-0">
                    <div className="w-14 h-14 md:w-24 md:h-24 rounded-[1.2rem] md:rounded-3xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-xl md:text-3xl font-playfair font-bold tracking-tight text-white shadow-2xl overflow-hidden uppercase">
                        {profile.name.charAt(0)}
                    </div>
                    <button disabled={!isEditing} className={`absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-medical-500 p-1.5 md:p-2 rounded-[2rem] shadow-xl border-2 border-emerald-950 transition-opacity ${!isEditing ? 'opacity-30' : 'hover:bg-medical-400'}`}><Camera size={12} className="md:w-3.5 md:h-3.5 w-3 h-3" /></button>
                </div>
                <div className="flex-1 text-left min-w-0">
 <h2 className="text-lg md:text-3xl font-playfair font-bold tracking-tight uppercase truncate">{profile.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                        <span className="px-1.5 md:px-2 py-0.5 bg-emerald-500/20 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">{userRole}</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-emerald-100/50 uppercase tracking-wider truncate hidden sm:inline">• {profile.department}</span>
                    </div>
                </div>
                <button 
                    onClick={() => { if (isEditing && hasUnsavedChanges) { if (confirm("Discard unsaved registry changes?")) handleDiscard(); } else setIsEditing(!isEditing); }}
                    className={`p-2.5 md:px-6 md:py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 relative z-10 ${isEditing ? 'bg-rose-500 text-white' : 'bg-white text-emerald-900 hover:bg-emerald-50 hover:shadow-lg transition-all'}`}
                >
                    {isEditing ? <X size={14} /> : <Edit size={14} />}
                    <span className="hidden md:inline">{isEditing ? 'Stop Editing' : 'Edit Account'}</span>
                </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-3 md:gap-4 overflow-hidden">
                <div className="w-full lg:w-60 flex lg:flex-col shrink-0 gap-2 md:gap-3 overflow-x-auto lg:overflow-x-visible custom-scrollbar p-0.5 md:p-1">
                    <NavItem id="general" icon={User} label="Identity" activeTab={activeTab} onClick={setActiveTab} />
                    <NavItem id="security" icon={Shield} label="Security" activeTab={activeTab} onClick={setActiveTab} />
                    <NavItem id="preferences" icon={Bell} label="Preferences" activeTab={activeTab} onClick={setActiveTab} />
                    <NavItem id="data" icon={Database} label="System Data" activeTab={activeTab} onClick={setActiveTab} />
                </div>

                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                        <div className="max-w-3xl mx-auto">
                            {activeTab === 'general' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="mb-4 md:mb-6 flex justify-between items-center">
                                        <h3 className="text-base md:text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Registry Information</h3>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase tracking-widest">ID: {authUser?.id}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 md:gap-y-4">
                                        <FormRow label="Full Legal Name"><input type="text" disabled={!isEditing} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] text-sm font-bold disabled:opacity-60 outline-none focus:border-medical-500 transition-colors" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} /></FormRow>
                                        <FormRow label="Designation"><input type="text" disabled={true} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] text-sm font-bold opacity-60 cursor-not-allowed outline-none" value={profile.role} /></FormRow>
                                        <FormRow label="Email Access"><input type="email" disabled={!isEditing} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] text-sm font-bold disabled:opacity-60 outline-none focus:border-medical-500 transition-colors" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} /></FormRow>
                                        <FormRow label="Contact Phone"><input type="tel" disabled={!isEditing} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] text-sm font-bold disabled:opacity-60 outline-none focus:border-medical-500 transition-colors" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} /></FormRow>
                                        <FormRow label="Department" fullWidth><input type="text" disabled={true} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2rem] text-sm font-bold opacity-60 cursor-not-allowed outline-none" value={profile.department} /></FormRow>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
                                    <div className="mb-6"><h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Access & Security</h3></div>
                                    <div className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${mfaEnabled ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700'} ${!isEditing ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 rounded-[2rem] bg-white dark:bg-slate-700 shadow-sm"><Smartphone size={28}/></div>
                                            <div><p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">Two-Factor Authentication</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{mfaEnabled ? 'OTP active' : 'Registry protection inactive'}</p></div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <ToggleSwitch checked={mfaEnabled} onChange={handleToggleMFA} disabled={!isEditing} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest select-none ${mfaEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>{mfaEnabled ? 'OTP Active' : 'Disabled'}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-300 dark:border-slate-800">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={14}/> Active Connections</h4>
                                            <div className="space-y-3">
                                                {sessions.map(s => (
                                                    <div key={s.id} className="p-4 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">{getDeviceIcon(s.type)}</div>
                                                            <div><p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{s.device}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{s.ip}</p></div>
                                                        </div>
                                                        {!s.isCurrent && isEditing && <button onClick={() => handleRevokeSession(s.id)} className="text-rose-500 p-1.5"><X size={16}/></button>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'preferences' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-12">
                                    <div className="mb-8"><h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">System Preferences</h3></div>
                                    <div className={!isEditing ? 'opacity-60' : ''}>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Monitor size={14}/> UI Theme</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            {['light', 'dark', 'system'].map(t => (
                                                <button key={t} onClick={() => isEditing && setAppPrefs({...appPrefs, theme: t as any})} className={`p-5 rounded-[2.5rem] border-2 flex flex-col items-center gap-3 transition-all ${appPrefs.theme === t ? 'border-medical-500 bg-medical-50 dark:bg-medical-900/10' : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'}`}>
                                                    <div className={`p-3 rounded-[2rem] ${appPrefs.theme === t ? 'bg-medical-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{t === 'light' ? <Sun size={20}/> : t === 'dark' ? <Moon size={20}/> : <Monitor size={20}/>}</div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest">{t}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={!isEditing ? 'opacity-60' : ''}>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Bell size={14}/> Notification Preferences</h4>
                                        <div className="space-y-3">
                                            {(['email', 'sms', 'push'] as const).map(ch => (
                                                <div key={ch} className="flex items-center justify-between p-4 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">{ch === 'email' ? 'Email Notifications' : ch === 'sms' ? 'SMS Alerts' : 'Push Notifications'}</span>
                                                    <ToggleSwitch checked={!!profile.notifications[ch]} onChange={() => setProfile({ ...profile, notifications: { ...profile.notifications, [ch]: !profile.notifications[ch] } })} disabled={!isEditing} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'data' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
                                    <div className="mb-6"><h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Data Management</h3></div>
                                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${!isEditing ? 'opacity-60' : ''}`}>
                                        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-[2rem]">
                                            <Download className="text-emerald-600 mb-4" size={24} />
                                            <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase">Export Snapshot</h4>
                                            <p className="text-[10px] text-emerald-700/60 dark:text-emerald-400 font-bold mt-1">Download sanitized registry backup</p>
                                            <button disabled={!isEditing || isExporting} onClick={handleExportData} className="mt-6 w-full py-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">
                                                {isExporting ? <RefreshCw className="animate-spin mx-auto" size={14}/> : 'Generate Backup'}
                                            </button>
                                        </div>
                                        <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-[2rem]">
                                            <AlertTriangle className="text-rose-600 mb-4" size={24} />
                                            <h4 className="text-sm font-black text-rose-900 dark:text-rose-100 uppercase">Wipe Cache</h4>
                                            <p className="text-[10px] text-rose-700/60 dark:text-rose-400 font-bold mt-1">Purge all local session records</p>
                                            <button disabled={!isEditing} onClick={handleFactoryReset} className="mt-6 w-full py-3 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-[2rem] text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">Purge Locally</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-300 dark:border-slate-800 flex justify-between items-center gap-3">
                            <div className="flex items-center gap-2">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${hasUnsavedChanges ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`}>
                                    {hasUnsavedChanges ? 'Registry mismatch detected' : 'In sync with registry'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleDiscard} className="px-6 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-500 rounded-[2rem] text-[10px] font-black uppercase">Discard</button>
                                <button onClick={handleSave} className="px-10 py-3 bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-emerald-950 rounded-[2rem] text-[10px] font-black uppercase shadow-xl hover:shadow-2xl transition-all font-bold">Commit to Registry</button>
                            </div>
                        </div>
                            )}
                </div>
            </div>
        </div>
    );
};
