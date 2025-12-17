import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Mail, Phone, MapPin, Shield, Bell, Save, Camera, Key, LogOut, ToggleLeft, ToggleRight, Building2, BadgeCheck, Globe, Moon, Sun, Monitor, CreditCard, Database, Download, AlertTriangle, FileText, Briefcase } from 'lucide-react';

interface ProfileModuleProps {
    userRole: 'Admin' | 'Employee';
    setUserRole: (role: 'Admin' | 'Employee') => void;
    currentUser: string;
}

export const ProfileModule: React.FC<ProfileModuleProps> = ({ userRole, setUserRole, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences' | 'company' | 'system'>('general');
    
    // Mock User Data State
    const [profile, setProfile] = useState<UserProfile>({
        name: currentUser,
        role: userRole === 'Admin' ? 'General Manager' : 'Senior Technician',
        email: userRole === 'Admin' ? 'admin@sreemeditec.com' : 'rahul.s@sreemeditec.com',
        phone: '+91 98765 43210',
        department: userRole === 'Admin' ? 'Administration' : 'Field Operations',
        location: 'Bangalore, India',
        bio: 'Dedicated medical equipment professional with 8+ years of experience in healthcare technology management and operations.',
        notifications: {
            email: true,
            sms: true,
            push: false
        }
    });

    // Mock Company Settings (Admin Only)
    const [companySettings, setCompanySettings] = useState({
        name: 'Sree Meditec',
        address: '123, Healthcare Park, Industrial Area, Bangalore - 560001',
        phone: '+91 80 1234 5678',
        email: 'contact@sreemeditec.com',
        website: 'www.sreemeditec.com',
        gstin: '29ABCDE1234F1Z5',
        bankName: 'HDFC Bank',
        accountNo: '50100987654321',
        ifsc: 'HDFC0001234',
        branch: 'Indiranagar, Bangalore'
    });

    // Mock App Preferences
    const [appPreferences, setAppPreferences] = useState({
        theme: 'light', // light, dark, system
        density: 'comfortable', // comfortable, compact
        language: 'en',
        timezone: 'Asia/Kolkata',
        currency: 'INR'
    });

    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        setIsEditing(false);
        alert("Settings saved successfully!");
    };

    const toggleNotification = (key: keyof typeof profile.notifications) => {
        setProfile({
            ...profile,
            notifications: {
                ...profile.notifications,
                [key]: !profile.notifications[key]
            }
        });
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
            
            {/* Header Card */}
            <div className="bg-gradient-to-r from-[#022c22] to-emerald-900 rounded-3xl p-8 text-white shadow-lg shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <BadgeCheck size={120} />
                </div>
                
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 relative z-10">
                    <div className="relative group">
                        <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm border-4 border-white/20 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                            {profile.name.charAt(0)}
                        </div>
                        <button className="absolute bottom-1 right-1 bg-medical-500 p-2 rounded-full shadow-lg hover:bg-medical-400 transition-colors">
                            <Camera size={16} />
                        </button>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">{profile.name}</h2>
                        <div className="flex flex-col md:flex-row items-center gap-3 mt-2 text-emerald-100/80 font-medium">
                            <span className="flex items-center gap-1.5"><Building2 size={16} /> {profile.department}</span>
                            <span className="hidden md:inline">•</span>
                            <span className="flex items-center gap-1.5"><MapPin size={16} /> {profile.location}</span>
                            <span className="hidden md:inline">•</span>
                            <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-xs border border-emerald-500/30 uppercase tracking-wide">
                                {userRole}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden min-h-[500px]">
                
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 shrink-0 h-fit flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-2">Account</p>
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'general' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <User size={18} /> Personal Info
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'security' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Shield size={18} /> Security
                    </button>
                    <button 
                        onClick={() => setActiveTab('preferences')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'preferences' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Bell size={18} /> Preferences
                    </button>

                    {userRole === 'Admin' && (
                        <>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-4">Organization</p>
                            <button 
                                onClick={() => setActiveTab('company')}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'company' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <Briefcase size={18} /> Company Settings
                            </button>
                        </>
                    )}

                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-4">System</p>
                    <button 
                        onClick={() => setActiveTab('system')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'system' ? 'bg-medical-50 text-medical-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Database size={18} /> Data & Backup
                    </button>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100">
                         <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 mb-3">
                            <p className="text-xs font-bold text-slate-600 mb-2">Demo Role Switcher</p>
                            <button 
                                onClick={() => setUserRole(userRole === 'Admin' ? 'Employee' : 'Admin')}
                                className="w-full bg-slate-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">
                                Switch to {userRole === 'Admin' ? 'Employee' : 'Admin'}
                            </button>
                        </div>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-rose-500 hover:bg-rose-50 transition-colors">
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                    
                    {activeTab === 'general' && (
                        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">General Information</h3>
                                <p className="text-sm text-slate-500">Update your photo and personal details here.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                                    <input 
                                        type="text" 
                                        disabled={!isEditing}
                                        value={profile.name}
                                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none disabled:opacity-70 disabled:bg-slate-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Job Title</label>
                                    <input 
                                        type="text" 
                                        disabled={!isEditing}
                                        value={profile.role}
                                        onChange={(e) => setProfile({...profile, role: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none disabled:opacity-70 disabled:bg-slate-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="email" 
                                            disabled={!isEditing}
                                            value={profile.email}
                                            onChange={(e) => setProfile({...profile, email: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none disabled:opacity-70 disabled:bg-slate-50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="tel" 
                                            disabled={!isEditing}
                                            value={profile.phone}
                                            onChange={(e) => setProfile({...profile, phone: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none disabled:opacity-70 disabled:bg-slate-50"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-full space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bio / Description</label>
                                    <textarea 
                                        rows={4}
                                        disabled={!isEditing}
                                        value={profile.bio}
                                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none disabled:opacity-70 disabled:bg-slate-50 resize-none"
                                    />
                                </div>
                            </div>
                            
                            {isEditing && (
                                <div className="flex justify-end pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={handleSave}
                                        className="bg-medical-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-medical-500/30 flex items-center gap-2 hover:bg-medical-700 transition-all active:scale-95">
                                        <Save size={18} /> Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'security' && (
                         <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">Security Settings</h3>
                                <p className="text-sm text-slate-500">Manage your password and account security.</p>
                            </div>

                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 flex items-start gap-4">
                                <div className="bg-orange-100 p-2 rounded-full text-orange-600 shrink-0">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-orange-900 text-sm">Two-Factor Authentication</h4>
                                    <p className="text-xs text-orange-800/80 mt-1 leading-relaxed">Your account is currently protected with email verification. We recommend enabling SMS 2FA for better security.</p>
                                    <button className="mt-3 text-xs font-bold bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                                        Enable 2FA
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5 border-t border-slate-100 pt-6">
                                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <Key size={16} /> Change Password
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Password</label>
                                        <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-medical-500 transition-colors" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Password</label>
                                            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-medical-500 transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Confirm New Password</label>
                                            <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-medical-500 transition-colors" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors">Update Password</button>
                                    </div>
                                </div>
                            </div>
                         </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">Preferences</h3>
                                <p className="text-sm text-slate-500">Customize your notification and display settings.</p>
                            </div>

                            {/* Notifications */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><Bell size={16}/> Notifications</h4>
                                
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-xl border border-slate-200 text-slate-600">
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Email Notifications</p>
                                            <p className="text-xs text-slate-500">Receive daily summaries and alerts via email.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleNotification('email')} className={`text-2xl transition-colors ${profile.notifications.email ? 'text-medical-600' : 'text-slate-300'}`}>
                                        {profile.notifications.email ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-xl border border-slate-200 text-slate-600">
                                            <Phone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">SMS Alerts</p>
                                            <p className="text-xs text-slate-500">Get critical alerts (e.g., Low Stock) on your phone.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleNotification('sms')} className={`text-2xl transition-colors ${profile.notifications.sms ? 'text-medical-600' : 'text-slate-300'}`}>
                                        {profile.notifications.sms ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                                    </button>
                                </div>
                            </div>

                            {/* Appearance */}
                             <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><Monitor size={16}/> Appearance</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <button 
                                        onClick={() => setAppPreferences({...appPreferences, theme: 'light'})}
                                        className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${appPreferences.theme === 'light' ? 'border-medical-500 bg-medical-50 text-medical-700' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
                                        <Sun size={24} />
                                        <span className="text-xs font-bold">Light</span>
                                    </button>
                                    <button 
                                        onClick={() => setAppPreferences({...appPreferences, theme: 'dark'})}
                                        className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${appPreferences.theme === 'dark' ? 'border-medical-500 bg-medical-50 text-medical-700' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
                                        <Moon size={24} />
                                        <span className="text-xs font-bold">Dark</span>
                                    </button>
                                    <button 
                                        onClick={() => setAppPreferences({...appPreferences, theme: 'system'})}
                                        className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${appPreferences.theme === 'system' ? 'border-medical-500 bg-medical-50 text-medical-700' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
                                        <Monitor size={24} />
                                        <span className="text-xs font-bold">System</span>
                                    </button>
                                </div>
                             </div>

                             {/* Localization */}
                             <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><Globe size={16}/> Localization</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Language</label>
                                        <select 
                                            className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none"
                                            value={appPreferences.language}
                                            onChange={(e) => setAppPreferences({...appPreferences, language: e.target.value})}
                                        >
                                            <option value="en">English (US)</option>
                                            <option value="en-in">English (India)</option>
                                            <option value="hi">Hindi</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Timezone</label>
                                        <select 
                                            className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none"
                                            value={appPreferences.timezone}
                                            onChange={(e) => setAppPreferences({...appPreferences, timezone: e.target.value})}
                                        >
                                            <option value="Asia/Kolkata">India (IST)</option>
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">New York (EST)</option>
                                        </select>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* COMPANY SETTINGS - ADMIN ONLY */}
                    {activeTab === 'company' && userRole === 'Admin' && (
                        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">Company Information</h3>
                                <p className="text-sm text-slate-500">Manage business details used for Invoicing and Reports.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Company Name</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-medical-500" value={companySettings.name} onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">GSTIN</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-medical-500" value={companySettings.gstin} onChange={(e) => setCompanySettings({...companySettings, gstin: e.target.value})} />
                                </div>
                                <div className="col-span-full space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registered Address</label>
                                    <textarea rows={2} className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-medical-500 resize-none" value={companySettings.address} onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})} />
                                </div>
                                 <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contact Email</label>
                                    <input type="email" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-medical-500" value={companySettings.email} onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Website</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-medical-500" value={companySettings.website} onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})} />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h4 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
                                    <CreditCard size={16} /> Banking Details (For Invoices)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bank Name</label>
                                        <input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" value={companySettings.bankName} onChange={(e) => setCompanySettings({...companySettings, bankName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Account Number</label>
                                        <input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" value={companySettings.accountNo} onChange={(e) => setCompanySettings({...companySettings, accountNo: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">IFSC Code</label>
                                        <input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" value={companySettings.ifsc} onChange={(e) => setCompanySettings({...companySettings, ifsc: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Branch</label>
                                        <input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" value={companySettings.branch} onChange={(e) => setCompanySettings({...companySettings, branch: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end">
                                <button 
                                    onClick={() => alert("Company Details Updated!")}
                                    className="bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-slate-900 transition-all active:scale-95">
                                    <Save size={18} /> Update Business Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">System & Data</h3>
                                <p className="text-sm text-slate-500">Manage your data exports and system information.</p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Database size={20}/></div>
                                    <div>
                                        <h4 className="font-bold text-slate-700 text-sm">Export Data</h4>
                                        <p className="text-xs text-slate-500">Download a full backup of Leads, Inventory, and Invoices.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold hover:bg-white hover:border-medical-500 hover:text-medical-600 transition-all flex items-center justify-center gap-2">
                                        <FileText size={14}/> CSV Format
                                    </button>
                                    <button className="flex-1 bg-slate-50 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold hover:bg-white hover:border-medical-500 hover:text-medical-600 transition-all flex items-center justify-center gap-2">
                                        <Download size={14}/> JSON Backup
                                    </button>
                                </div>
                            </div>

                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-start gap-4">
                                <div className="bg-white p-2 rounded-full text-rose-600 shrink-0 border border-rose-100">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-rose-900 text-sm">Danger Zone</h4>
                                    <p className="text-xs text-rose-800/80 mt-1 mb-3">Irreversible actions. Proceed with caution.</p>
                                    <button className="text-xs font-bold bg-white border border-rose-200 text-rose-600 px-4 py-2 rounded-lg hover:bg-rose-600 hover:text-white transition-colors">
                                        Reset Application Data
                                    </button>
                                </div>
                            </div>
                            
                            <div className="text-center pt-8 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sree Meditec CRM</p>
                                <p className="text-[10px] text-slate-300 mt-1">Version 1.2.0 (Build 2023.10.27)</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};