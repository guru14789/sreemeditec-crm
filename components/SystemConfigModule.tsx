import React, { useState } from 'react';
import {
  Settings, Activity, Database, ShieldAlert, Calendar,
  Building2, Landmark, ChevronRight, AlertTriangle,
  ShieldCheck, Search, MapPin,
  X, Plus, Trash2, Edit2, CreditCard,
} from 'lucide-react';
import { TabView } from '../types';
import { useData } from './DataContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

interface SystemConfigModuleProps {
  financialYear: string;
  updateFinancialYear: (fy: string) => Promise<void>;
  handleFullBackup: () => Promise<void>;
  handleMigratePermissions: () => Promise<void>;
  isSuperAdmin: boolean;
  userRole: string;
  currentUser: any;
  showAlert: (msg: string, title?: string) => Promise<void>;
  showConfirm: (msg: string, title?: string) => Promise<boolean>;
  showPrompt: (msg: string, val?: string, title?: string) => Promise<string | null>;
  setActiveTab: (tab: TabView) => void;
}

export const SystemConfigModule: React.FC<SystemConfigModuleProps> = ({
  financialYear, updateFinancialYear,
  handleFullBackup, handleMigratePermissions,
  isSuperAdmin, userRole, currentUser,
  showAlert, showConfirm, showPrompt, setActiveTab,
}) => {
  const [subTab, setSubTab] = useState<'General' | 'Bank' | 'Companies'>('General');
  const isAdmin = userRole === 'Admin';

  return (
    <div className="h-full flex flex-col p-6 md:p-8 bg-[#F5F4F1] dark:bg-slate-900/30 overflow-hidden">
      <div className="bg-slate-100 p-1.5 rounded-button border border-slate-200 shadow-inner w-full sm:w-fit shrink-0 flex gap-1 mb-8 overflow-x-auto custom-scrollbar">
        {(['General', 'Bank', 'Companies'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`
              px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2
              ${subTab === tab
                ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100'
                : 'text-slate-400 hover:text-emerald-700 scale-95'
              }
            `}
          >
            {tab === 'General' && 'System Terminal'}
            {tab === 'Bank' && 'Bank Details'}
            {tab === 'Companies' && 'Company Profiles'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {subTab === 'General' && (
          <GeneralTab
            financialYear={financialYear}
            updateFinancialYear={updateFinancialYear}
            handleFullBackup={handleFullBackup}
            handleMigratePermissions={handleMigratePermissions}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
            currentUser={currentUser}
            showAlert={showAlert}
            showConfirm={showConfirm}
            showPrompt={showPrompt}
            setActiveTab={setActiveTab}
            onNavigateCompanies={() => setSubTab('Companies')}
          />
        )}
        {subTab === 'Bank' && <BankTab />}
        {subTab === 'Companies' && <CompaniesTab />}
      </div>
    </div>
  );
};

/* ============================================================
   GENERAL TAB
   ============================================================ */

interface GeneralTabProps {
  financialYear: string;
  updateFinancialYear: (fy: string) => Promise<void>;
  handleFullBackup: () => Promise<void>;
  handleMigratePermissions: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  currentUser: any;
  showAlert: (msg: string, title?: string) => Promise<void>;
  showConfirm: (msg: string, title?: string) => Promise<boolean>;
  showPrompt: (msg: string, val?: string, title?: string) => Promise<string | null>;
  setActiveTab: (tab: TabView) => void;
  onNavigateCompanies: () => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  financialYear, updateFinancialYear,
  handleFullBackup, handleMigratePermissions,
  isSuperAdmin, isAdmin, currentUser,
  showAlert, showConfirm, showPrompt,
  setActiveTab, onNavigateCompanies,
}) => {
  return (
    <div className="flex flex-col items-center py-8 animate-in fade-in duration-[250ms]">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#013D24] via-[#04542E] to-[#0A734A] flex items-center justify-center mb-6"
        style={{ boxShadow: '0 20px 40px -6px rgba(1,61,36,0.4), inset 0 2px 2px rgba(255,255,255,0.12), inset 0 -2px 2px rgba(0,0,0,0.1)' }}
      >
        <Settings size={36} className="text-white/90 animate-[spin_6s_linear_infinite]" />
      </div>
      <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">System Configuration</h3>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-2 max-w-[340px] text-center leading-relaxed">
        Core system parameters and business rules managed from this terminal.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10 w-full max-w-2xl mx-auto">
        <ConfigCard
          icon={<Activity size={16} />}
          label="Audit Mode"
          value="Standard"
          gradient="bg-gradient-to-br from-[#013D24] to-[#0A734A]"
          shadow="rgba(1,61,36,0.3)"
          onClick={() => setActiveTab(TabView.LOGS)}
        />
        <ConfigCard
          icon={<Database size={16} />}
          label="Data Vault"
          value="Full Sync"
          gradient="bg-gradient-to-br from-[#0A734A] to-[#0F9964]"
          shadow="rgba(10,115,74,0.3)"
          onClick={async () => {
            if (!isAdmin) {
              await showAlert("Administrative privileges required for System Backup.", "Access Denied");
              return;
            }
            handleFullBackup();
          }}
        />
        {isSuperAdmin && (
          <ConfigCard
            icon={<ShieldAlert size={16} />}
            label="Security Maintenance"
            value="Migrate Legacy Permissions"
            gradient="bg-gradient-to-br from-[#5A29D6] to-[#6F38E8]"
            shadow="rgba(90,41,214,0.3)"
            badge={<Badge variant="purple" dot pulse>Super Admin Only</Badge>}
            onClick={handleMigratePermissions}
            className="md:col-span-2"
          />
        )}
        <ConfigCard
          icon={<Calendar size={16} />}
          label="Fiscal Period"
          value={financialYear}
          gradient="bg-gradient-to-br from-[#C8A15A] to-[#D8B470]"
          shadow="rgba(200,161,90,0.3)"
          badge={<Badge variant="gold" dot>Active</Badge>}
          valueClass="text-[#5B3B24]"
          onClick={async () => {
            if (!isAdmin) {
              await showAlert("Access Denied: Administrative privileges required.", "Access Denied");
              return;
            }
            const pass = await showPrompt("Enter Admin Password to modify Fiscal Period:");
            if (pass !== (currentUser?.password || 'sree')) {
              await showAlert("Invalid Password.", "Error");
              return;
            }
            const nextFY = await showPrompt("Enter New Financial Year (e.g. 26-27):", financialYear);
            if (nextFY && nextFY !== financialYear) {
              const confirmed = await showConfirm(`Are you sure? This will reset the document numbering sequence for the new year ${nextFY}.`);
              if (confirmed) {
                await updateFinancialYear(nextFY);
              }
            }
          }}
        />
        <ConfigCard
          icon={<Building2 size={16} />}
          label="Company Profile"
          value="Manage Business Entities"
          gradient="bg-gradient-to-br from-[#5B3B24] to-[#6E4B31]"
          shadow="rgba(91,59,36,0.3)"
          onClick={onNavigateCompanies}
        />
        <ConfigCard
          icon={<Landmark size={16} />}
          label="Banking Configuration"
          value="Manage Bank Accounts"
          gradient="bg-gradient-to-br from-[#04542E] to-[#0F9964]"
          shadow="rgba(4,84,46,0.3)"
          onClick={() => {}}
          className="cursor-default opacity-60"
        />
      </div>
    </div>
  );
};

const ConfigCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
  shadow: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  valueClass?: string;
}> = ({ icon, label, value, gradient, shadow, badge, onClick, className = '', valueClass = '' }) => (
  <div
    onClick={onClick}
    className={`
      group relative overflow-hidden rounded-card transition-all duration-[250ms] ease-out
      ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}
      ${gradient}
      ${className}
    `}
    style={{ boxShadow: `0 16px 32px -8px ${shadow}` }}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    <div className="relative p-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white/80 shrink-0 group-hover:scale-110 transition-transform duration-[250ms]"
        style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.08)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] font-black uppercase tracking-widest text-white/60">{label}</p>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-sm font-black text-white ${valueClass}`}>{value}</p>
          {badge ? badge : onClick ? (
            <ChevronRight size={14} className="text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
          ) : null}
        </div>
      </div>
    </div>
  </div>
);

/* ============================================================
   BANK TAB
   ============================================================ */

const BankTab: React.FC = () => {
  const { bankDetailsList, addBankDetails, updateBankDetails, removeBankDetails, addNotification, isSystemAdmin, showConfirm } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const EMPTY_BANK = { id: '', bankName: '', accountNo: '', branchIfsc: '', accountType: 'Current', isDefault: false };
  const [formData, setFormData] = useState(EMPTY_BANK);

  const handleSave = async () => {
    if (!isSystemAdmin) {
      addNotification('Access Denied', 'Admin privileges required.', 'alert');
      return;
    }
    if (!formData.bankName || !formData.accountNo || !formData.branchIfsc) {
      addNotification('Validation Error', 'All mandatory fields required.', 'alert');
      return;
    }
    if (editingId) {
      await updateBankDetails(editingId, formData);
      addNotification('Success', 'Bank details updated.', 'success');
    } else {
      await addBankDetails({ ...formData, id: `BANK-${Date.now()}` });
      addNotification('Success', 'New bank account added.', 'success');
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_BANK);
  };

  const startEdit = (bank: any) => {
    setFormData(bank);
    setEditingId(bank.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Delete this bank account?');
    if (confirmed) {
      await removeBankDetails(id);
      addNotification('Deleted', 'Bank account removed.', 'warning');
    }
  };

  return (
    <div className="animate-in fade-in duration-[250ms] max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#04542E] to-[#0A734A] flex items-center justify-center"
            style={{ boxShadow: '0 12px 24px -4px rgba(4,84,46,0.4), inset 0 2px 2px rgba(255,255,255,0.15), inset 0 -2px 2px rgba(0,0,0,0.1)' }}
          >
            <Landmark size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Bank Details Management</h2>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{bankDetailsList.length} Registered Accounts</p>
          </div>
        </div>
        {!isAdding && isSystemAdmin && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setFormData(EMPTY_BANK); setIsAdding(true); }}>
            Add Account
          </Button>
        )}
      </div>

      {isAdding ? (
        <Card variant="white" padding="lg" className="luxe-animate-in">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              {editingId ? 'Edit Account' : 'New Account Entry'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-[2rem] hover:bg-slate-100 transition-all">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Bank Name *" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value.toUpperCase() })} placeholder="E.G. HDFC BANK" wrapperClassName="w-full" />
            <Input label="Account Number *" value={formData.accountNo} onChange={e => setFormData({ ...formData, accountNo: e.target.value })} placeholder="000000000000" wrapperClassName="w-full" />
            <Input label="Branch & IFSC Code *" value={formData.branchIfsc} onChange={e => setFormData({ ...formData, branchIfsc: e.target.value.toUpperCase() })} placeholder="BRANCH NAME & IFSC" wrapperClassName="w-full" />
            <Select label="Account Type" value={formData.accountType} onChange={(e: any) => setFormData({ ...formData, accountType: e.target.value })} options={[
              { value: 'Current', label: 'Current Account' },
              { value: 'Savings', label: 'Savings Account' },
              { value: 'OD', label: 'Overdraft' },
            ]} wrapperClassName="w-full" />
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>{editingId ? 'Update Account' : 'Commit Account'}</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bankDetailsList.map((bank: any, index: number) => (
            <div key={bank.id || `bank-${index}`}
              className="group rounded-card bg-gradient-to-br from-white to-[#F8F7F4] dark:from-slate-900 dark:to-slate-800 p-7
                border border-slate-200/60 dark:border-slate-700/60
                shadow-[0_12px_30px_rgba(0,0,0,0.06)]
                hover:shadow-[0_20px_45px_rgba(0,0,0,0.10)]
                hover:-translate-y-0.5 transition-all duration-[250ms] ease-out"
              style={{ boxShadow: '0 12px 30px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.6)' }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#04542E]/10 to-[#0F9964]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-[250ms]"
                  style={{ boxShadow: '0 8px 20px rgba(4,84,46,0.1), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.04)' }}
                >
                  <CreditCard size={18} className="text-[#0A734A]" />
                </div>
                {isSystemAdmin && (
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-[250ms]">
                    <button onClick={() => startEdit(bank)} className="p-2 text-slate-400 hover:text-[#0A734A] hover:bg-emerald-50 rounded-[2rem] transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(bank.id)} className="p-2 text-slate-400 hover:text-[#D05B68] hover:bg-rose-50 rounded-[2rem] transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-1">{bank.bankName}</h4>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-5">{bank.accountType} Account</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Number</p>
                  <p className="font-black text-sm text-slate-700 dark:text-slate-300 font-mono tracking-wider">{bank.accountNo}</p>
                </div>
                <div>
                  <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Branch & IFSC</p>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">{bank.branchIfsc}</p>
                </div>
              </div>
            </div>
          ))}
          {bankDetailsList.length === 0 && (
            <div className="md:col-span-2 py-16 text-center rounded-card border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.5)' }}
              >
                <Landmark size={28} className="text-slate-300" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Bank Accounts Defined</p>
              {isSystemAdmin && (
                <Button variant="primary" size="sm" className="mt-5" icon={<Plus size={13} />} onClick={() => { setFormData(EMPTY_BANK); setIsAdding(true); }}>
                  Add Your First Account
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   COMPANIES TAB
   ============================================================ */

interface CompanyProfile {
  id: string;
  companyName: string;
  name?: string;
  address: string;
  gstin?: string;
  email?: string;
  phone?: string;
  bankName: string;
  accountNo: string;
  branchIfsc: string;
  cinNo?: string;
  panNo?: string;
}

const CompaniesTab: React.FC = () => {
  const { companyProfiles, addCompanyProfile, updateCompanyProfile, removeCompanyProfile, addNotification } = useData();
  const [viewState, setViewState] = useState<'registry' | 'builder'>('registry');
  const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const DEFAULT_PROFILE: Partial<CompanyProfile> = {
    companyName: '', address: '', gstin: '', email: '', phone: '',
    bankName: '', accountNo: '', branchIfsc: '', cinNo: '', panNo: '',
  };

  const [profile, setProfile] = useState<Partial<CompanyProfile>>(DEFAULT_PROFILE);

  const filteredProfiles = companyProfiles.filter((p: CompanyProfile) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.companyName || '').toLowerCase().includes(q) ||
      (p.bankName || '').toLowerCase().includes(q) ||
      (p.gstin || '').toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (!profile.companyName || !profile.address) {
      addNotification('Validation Error', 'Company Name and Address are required.', 'alert');
      return;
    }
    const finalData: CompanyProfile = {
      ...profile as CompanyProfile,
      id: editingId || `COMP-${Date.now()}`,
    };
    if (editingId) {
      await updateCompanyProfile(editingId, finalData);
      addNotification('Registry Updated', `"${finalData.companyName}" profile modified.`, 'success');
    } else {
      await addCompanyProfile(finalData);
      addNotification('Company Indexed', `"${finalData.companyName}" added to registry.`, 'success');
    }
    setViewState('registry');
    setEditingId(null);
    setProfile(DEFAULT_PROFILE);
  };

  const performDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await removeCompanyProfile(pendingDelete.id);
      addNotification('Registry Purged', `Record for ${pendingDelete.name} removed.`, 'warning');
      setPendingDelete(null);
    } catch { /* noop */ } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'identity',
      header: 'Company Identity',
      render: (p: CompanyProfile) => (
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#04542E]/10 to-[#0F9964]/10 flex items-center justify-center font-black text-[#0A734A] uppercase text-sm"
             style={{ boxShadow: '0 8px 20px rgba(4,84,46,0.08), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.04)' }}
           >
             {(p.companyName || '?').charAt(0)}
           </div>
          <div>
            <div className="font-black text-[13px] text-slate-800 dark:text-slate-100 uppercase tracking-tight">{p.companyName}</div>
            <div className="text-[8px] font-bold text-slate-400 flex items-center gap-1 mt-0.5 max-w-[220px] truncate">
              <MapPin size={9} /> {p.address}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'banking',
      header: 'Banking Node',
      render: (p: CompanyProfile) => (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-[#0A734A] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-pill border border-emerald-100 dark:border-emerald-800/40 w-fit flex items-center gap-1.5">
            <Landmark size={9} /> {p.bankName}
          </span>
          <div className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">
            A/C: {p.accountNo} <span className="text-slate-300 mx-1">|</span> IFSC: {p.branchIfsc}
          </div>
        </div>
      ),
    },
    {
      key: 'statutory',
      header: 'Statutory IDs',
      render: (p: CompanyProfile) => (
        <div className="grid grid-cols-2 gap-x-5 gap-y-1">
          <div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">GSTIN</p>
            <p className="font-black text-[12px] text-slate-700 dark:text-slate-300">{p.gstin || '\u2014'}</p>
          </div>
          <div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PAN</p>
            <p className="font-black text-[12px] text-slate-700 dark:text-slate-300">{p.panNo || '\u2014'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Management',
      align: 'right' as const,
      render: (p: CompanyProfile) => (
        <div className="flex justify-end items-center gap-2">
          <button
            onClick={(e: any) => { e.stopPropagation(); setPendingDelete({ id: p.id, name: p.companyName }); }}
            className="p-2 text-slate-300 hover:text-[#D05B68] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-[2rem] transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
          >
            <Trash2 size={14} />
          </button>
          <div className="p-2 rounded-[2rem] bg-gradient-to-br from-[#04542E] to-[#0A734A] text-white shadow-[0_4px_12px_rgba(4,84,46,0.25)]">
            <Edit2 size={14} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col gap-5 animate-in fade-in duration-[250ms]">
      <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 p-1 rounded-button border border-slate-200/60 dark:border-slate-700/60 w-fit shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <Button
          variant={viewState === 'registry' ? 'primary' : 'ghost'}
          size="sm"
          icon={<Activity size={13} />}
          onClick={() => setViewState('registry')}
        >
          Registry
        </Button>
        <Button
          variant={viewState === 'builder' && builderMode === 'add' ? 'primary' : 'ghost'}
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => { setEditingId(null); setViewState('builder'); setBuilderMode('add'); setProfile(DEFAULT_PROFILE); }}
        >
          Add Entity
        </Button>
      </div>

      {viewState === 'registry' ? (
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#04542E]/10 to-[#0F9964]/10 flex items-center justify-center"
                style={{ boxShadow: '0 8px 20px rgba(4,84,46,0.08), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.04)' }}
              >
                <Building2 size={18} className="text-[#0A734A]" />
              </div>
              <div>
                <h3 className="font-black text-[11px] text-slate-800 dark:text-slate-100 uppercase tracking-tight">Our Companies</h3>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{companyProfiles.length} Business Entities</p>
              </div>
            </div>
            <div className="relative w-full max-w-xs min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[11px] font-bold bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-input text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:border-[#0F9964]/40 focus:shadow-[0_0_0_3px_rgba(15,153,100,0.12)] transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-card border border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto h-full custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((p: CompanyProfile) => (
                    <tr
                      key={p.id}
                      onClick={() => { setProfile(p); setEditingId(p.id); setViewState('builder'); setBuilderMode('edit'); }}
                      className="border-b border-slate-100/60 dark:border-slate-800/60 transition-all duration-[200ms] ease-out cursor-pointer hover:bg-[#F5F4F1]/80 dark:hover:bg-slate-800/40"
                    >
                      {columns.map(col => (
                        <td key={col.key} className={`px-6 py-5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                          {col.render(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-28 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-300">
                          <Building2 size={32} className="opacity-30" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">No Companies Registered</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col luxe-animate-in">
          <Card variant="white" padding="lg" className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  {builderMode === 'add' ? 'Entity Intake Form' : 'Update Company Record'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {builderMode === 'add' ? 'Registering new business node' : `Modifying ${profile.companyName}`}
                </p>
              </div>
              <button onClick={() => setViewState('registry')} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[2rem] transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pb-6">
              <section className="space-y-5">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <Building2 size={13} className="text-[#0A734A]" />1. Legal Entity Profiling
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="sm:col-span-2">
                    <Input label="Entity Name *" value={profile.companyName || ''} onChange={(e: any) => setProfile({ ...profile, companyName: e.target.value.toUpperCase() })} placeholder="FULL LEGAL NAME" wrapperClassName="w-full" />
                  </div>
                  <div className="sm:col-span-4">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Registered Address *</label>
                      <textarea
                        value={profile.address || ''}
                        onChange={(e: any) => setProfile({ ...profile, address: e.target.value })}
                        placeholder="FULL REGISTERED OFFICE ADDRESS"
                        className="w-full min-h-[90px] rounded-input bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 px-3 py-1.5 text-[13px] font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:outline-none focus:border-[#0F9964]/40 focus:shadow-[0_0_0_3px_rgba(15,153,100,0.12)] resize-none"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Email Node" type="email" value={profile.email || ''} onChange={(e: any) => setProfile({ ...profile, email: e.target.value })} placeholder="OFFICIAL@COMPANY.COM" wrapperClassName="w-full" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Support Hotline" value={profile.phone || ''} onChange={(e: any) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98848 18398" wrapperClassName="w-full" />
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <Landmark size={13} className="text-[#C8A15A]" />2. Financial & Banking
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="sm:col-span-2">
                    <Input label="Bank Name *" value={profile.bankName || ''} onChange={(e: any) => setProfile({ ...profile, bankName: e.target.value.toUpperCase() })} placeholder="BANK NAME" wrapperClassName="w-full" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Account Number *" value={profile.accountNo || ''} onChange={(e: any) => setProfile({ ...profile, accountNo: e.target.value })} placeholder="AC/NO" wrapperClassName="w-full" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="IFSC Code *" value={profile.branchIfsc || ''} onChange={(e: any) => setProfile({ ...profile, branchIfsc: e.target.value.toUpperCase() })} placeholder="IFSC" wrapperClassName="w-full" />
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <ShieldCheck size={13} className="text-[#5A29D6]" />3. Statutory Compliance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <Input label="GSTIN Identification" value={profile.gstin || ''} onChange={(e: any) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} placeholder="GST NUMBER" wrapperClassName="sm:col-span-2" />
                  <Input label="PAN Number" value={profile.panNo || ''} onChange={(e: any) => setProfile({ ...profile, panNo: e.target.value.toUpperCase() })} placeholder="PAN NUMBER" wrapperClassName="w-full" />
                  <Input label="CIN / Registration No." value={profile.cinNo || ''} onChange={(e: any) => setProfile({ ...profile, cinNo: e.target.value.toUpperCase() })} placeholder="CIN NUMBER" wrapperClassName="w-full" />
                </div>
              </section>
            </div>

            <div className="shrink-0 pt-5 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-end gap-3">
              <Button variant="secondary" size="md" onClick={() => { setViewState('registry'); setEditingId(null); }}>
                Abort
              </Button>
              <Button variant="primary" size="md" onClick={handleSave}>
                Update Registry
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} size="sm">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B24852] to-[#D05B68] flex items-center justify-center mx-auto mb-5"
            style={{ boxShadow: '0 12px 24px -4px rgba(178,72,82,0.35), inset 0 2px 2px rgba(255,255,255,0.15), inset 0 -2px 2px rgba(0,0,0,0.1)' }}
          >
            <AlertTriangle size={28} className="text-white" />
          </div>
          <h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Purge Node?</h3>
          <p className="text-[11px] font-bold text-slate-500 mt-2 leading-relaxed">
            Permanently remove <strong className="text-slate-800">{pendingDelete?.name}</strong> from global registry? This action is irreversible.
          </p>
          <div className="flex gap-3 mt-8">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="danger" size="md" className="flex-1" loading={isDeleting} onClick={performDelete}>Purge Now</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
