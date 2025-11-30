
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Mail, Phone, MapPin, Shield, Bell, Save, Camera, Key, LogOut, ToggleLeft, ToggleRight, Building2, BadgeCheck } from 'lucide-react';

interface ProfileModuleProps {
    userRole: 'Admin' | 'Employee';
    setUserRole: (role: 'Admin' | 'Employee') => void;
    currentUser: string;
}

export const ProfileModule: React.FC<ProfileModuleProps> = ({ userRole, setUserRole, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences'>('general');
    
    // Mock User Data State
    const [profile, setProfile] = useState<UserProfile>({
        name: currentUser,
        role: userRole === 'Admin' ? 'General Manager' : 'Senior Technician',
        email: userRole === 'Admin' ? 'admin@medequip.com' : 'rahul.s@medequip.com',
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

    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        setIsEditing(false);
        // In a real app, this would make an API call
        alert("Profile updated successfully!");
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
                <div className="w-full lg:w-64 bg-white rounded-3xl shadow-sm border border-slate-100 p-4 shrink-0 h-fit">
                    <nav className="space-y-1">
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
                    </nav>
                    
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Account Management</p>
                         <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 mb-3">
                            <p className="text-xs font-bold text-slate-600 mb-2">Demo Mode Control</p>
                            <p className="text-[10px] text-slate-400 mb-3">Switch between Admin and Employee views to test permissions.</p>
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

                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 text-sm mb-4">Notifications</h4>
                                
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
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};