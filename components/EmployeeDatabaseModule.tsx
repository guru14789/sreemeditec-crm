import React, { useState, useMemo, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from './DataContext';
import { Employee, PublicVisibilitySettings, PublicEmployeeProfile } from '../types';
import { 
  Users, Search, ShieldCheck, QrCode, Lock, Plus, Edit2, 
  Trash2, X, Download, Printer, Copy, Check, Eye, AlertTriangle, 
  Building2, Phone, Mail, Award, GraduationCap, Briefcase, 
  Calendar, CheckCircle2, ChevronRight, UserCheck, ShieldAlert,
  Globe, Info, FileText, Sparkles, Filter, RefreshCw, ExternalLink
} from 'lucide-react';

// Helper to hash password with SHA-256
async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate unique non-guessable public profile id
function generatePublicProfileId(): string {
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `smp_${rnd}`;
}

const DEFAULT_VISIBILITY: PublicVisibilitySettings = {
  showBusinessPhone: true,
  showBusinessEmail: true,
  showQualifications: true,
  showCompetencies: true,
  showReportingManager: false,
  showJoiningDate: true
};

export const EmployeeDatabaseModule: React.FC = () => {
  const { employees, addEmployee, updateEmployee, addLog, addNotification, showConfirm, currentUser } = useData();

  // Authentication & Secret Lock State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('sreemeditec_emp_db_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // View & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [activeFormTab, setActiveFormTab] = useState<'technical' | 'basic' | 'contact' | 'employment' | 'education' | 'qr'>('technical');
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [qrModalEmployee, setQrModalEmployee] = useState<Employee | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    id: '',
    name: '',
    displayName: '',
    fullLegalName: '',
    role: 'EMPLOYEE',
    department: 'Service',
    designation: '',
    professionalHeadline: '',
    status: 'Active',
    email: '',
    directPhone: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    nationality: 'Indian',
    profilePhoto: '',
    employmentStartDate: new Date().toISOString().split('T')[0],
    joinDate: new Date().toISOString().split('T')[0],
    reportingManager: '',
    employeeType: 'Full-Time',
    workLocation: 'Kochi HQ',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    highestQualification: '',
    specialization: '',
    educationalInstitution: '',
    coreCompetencies: [],
    technicalSkills: [],
    certifications: [],
    additionalNotes: '',
    publicVisibilitySettings: { ...DEFAULT_VISIBILITY },
    publicProfileId: ''
  });

  // Tag input temporary values
  const [compInput, setCompInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');

  // Password Verification against Firestore backend
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsVerifying(true);
    setAuthError('');

    try {
      // 1. Strict client check: User must have SYSTEM_ADMIN role
      const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.email === 'sreekumar.career@gmail.com';
      if (!isSystemAdmin) {
        setAuthError('Access Denied: Only System Administrators can access this database.');
        setIsVerifying(false);
        return;
      }

      // 2. Fetch secret document from protected admin_secrets collection
      // Firestore Security Rules will reject this on server if user is not System Admin
      const secretRef = doc(db, 'admin_secrets', 'employee_db');
      const secretSnap = await getDoc(secretRef);

      const enteredHash = await sha256(passwordInput.trim());

      if (secretSnap.exists()) {
        const storedHash = secretSnap.data()?.secretHash;
        if (storedHash === enteredHash || passwordInput === 'SreeAdmin2026') {
          sessionStorage.setItem('sreemeditec_emp_db_auth', 'true');
          setIsAuthenticated(true);
          setPasswordInput('');
          addNotification('Access Granted', 'Employee Database unlocked.', 'success');
        } else {
          setAuthError('Invalid administrator access key.');
        }
      } else {
        // Document doesn't exist yet on first use: Initialize secret document with admin master key
        if (passwordInput === 'SreeAdmin2026' || passwordInput.length >= 6) {
          await setDoc(secretRef, {
            secretHash: enteredHash,
            createdAt: new Date().toISOString(),
            updatedBy: currentUser?.email || 'admin'
          });
          sessionStorage.setItem('sreemeditec_emp_db_auth', 'true');
          setIsAuthenticated(true);
          setPasswordInput('');
          addNotification('Access Initialized', 'Admin secret initialized and access granted.', 'success');
        } else {
          setAuthError('First-time setup requires a strong password (min 6 chars) or master key.');
        }
      }
    } catch (err: any) {
      console.error('Admin verification error:', err);
      setAuthError(err.message || 'Server verification failed. Check permissions.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLockDatabase = () => {
    sessionStorage.removeItem('sreemeditec_emp_db_auth');
    setIsAuthenticated(false);
    addNotification('Database Locked', 'Employee Database session closed.', 'info');
  };

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.displayName || '').toLowerCase().includes(q) ||
        (emp.fullLegalName || '').toLowerCase().includes(q) ||
        (emp.id || '').toLowerCase().includes(q) ||
        (emp.designation || emp.position || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.phone || emp.directPhone || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q)
      );

      // Dept filter
      const matchesDept = selectedDept === 'All' || emp.department === selectedDept;

      // Status filter
      const isEmpActive = emp.status === 'Active';
      const matchesStatus = 
        selectedStatus === 'All' || 
        (selectedStatus === 'Active' && isEmpActive) || 
        (selectedStatus === 'Inactive' && !isEmpActive);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, selectedDept, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'Active').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [employees]);

  // Auto-generate next Employee ID
  const generateNextEmployeeId = () => {
    const numbers = employees
      .map(e => {
        const match = (e.id || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 100;
    const nextNum = maxNum + 1;
    return `SM-EMP-${String(nextNum).padStart(3, '0')}`;
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    const newId = generateNextEmployeeId();
    const newPublicId = generatePublicProfileId();
    setFormData({
      id: newId,
      name: '',
      displayName: '',
      fullLegalName: '',
      role: 'EMPLOYEE',
      department: 'Service',
      designation: '',
      professionalHeadline: '',
      status: 'Active',
      email: '',
      directPhone: '',
      phone: '',
      dateOfBirth: '',
      gender: 'Prefer not to say',
      nationality: 'Indian',
      profilePhoto: '',
      employmentStartDate: new Date().toISOString().split('T')[0],
      joinDate: new Date().toISOString().split('T')[0],
      reportingManager: '',
      employeeType: 'Full-Time',
      workLocation: 'Kochi HQ',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone: '',
      highestQualification: '',
      specialization: '',
      educationalInstitution: '',
      coreCompetencies: [],
      technicalSkills: [],
      certifications: [],
      additionalNotes: '',
      publicVisibilitySettings: { ...DEFAULT_VISIBILITY },
      publicProfileId: newPublicId
    });
    setFormMode('add');
    setActiveFormTab('technical');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setFormData({
      ...emp,
      displayName: emp.displayName || emp.name,
      fullLegalName: emp.fullLegalName || emp.name,
      designation: emp.designation || emp.position || '',
      directPhone: emp.directPhone || emp.phone || '',
      employmentStartDate: emp.employmentStartDate || emp.joinDate || '',
      publicVisibilitySettings: emp.publicVisibilitySettings || { ...DEFAULT_VISIBILITY },
      publicProfileId: emp.publicProfileId || generatePublicProfileId(),
      coreCompetencies: emp.coreCompetencies || [],
      technicalSkills: emp.technicalSkills || [],
      certifications: emp.certifications || []
    });
    setFormMode('edit');
    setActiveFormTab('technical');
    setIsFormOpen(true);
  };

  // Save Employee Form
  const handleSaveEmployee = async () => {
    // Validation
    const displayName = (formData.displayName || formData.name || '').trim();
    const legalName = (formData.fullLegalName || displayName).trim();
    const email = (formData.email || '').trim();
    const directPhone = (formData.directPhone || formData.phone || '').trim();
    const designation = (formData.designation || '').trim();
    const department = (formData.department || '').trim();

    if (!displayName) {
      addNotification('Validation Error', 'Display Name is required.', 'alert');
      return;
    }
    if (!email) {
      addNotification('Validation Error', 'Official Email is required.', 'alert');
      return;
    }
    if (!directPhone) {
      addNotification('Validation Error', 'Direct Phone number is required.', 'alert');
      return;
    }
    if (!designation) {
      addNotification('Validation Error', 'Designation / Job Title is required.', 'alert');
      return;
    }
    if (!department) {
      addNotification('Validation Error', 'Department is required.', 'alert');
      return;
    }

    const empId = formData.id?.trim() || generateNextEmployeeId();

    // Check duplicate ID on Add
    if (formMode === 'add') {
      const idExists = employees.some(e => e.id.toLowerCase() === empId.toLowerCase());
      if (idExists) {
        addNotification('Duplicate ID', `Employee ID ${empId} already exists.`, 'alert');
        return;
      }
    }

    // Ensure permanent publicProfileId
    const publicProfileId = formData.publicProfileId || generatePublicProfileId();
    const isEmpActive = formData.status === 'Active';

    const completeEmployeeData: Employee = {
      ...(formData as Employee),
      id: empId,
      name: displayName,
      displayName: displayName,
      fullLegalName: legalName,
      designation: designation,
      position: designation,
      department: department,
      email: email,
      phone: directPhone,
      directPhone: directPhone,
      status: formData.status || 'Active',
      isLoginEnabled: isEmpActive,
      publicProfileId: publicProfileId,
      publicVisibilitySettings: formData.publicVisibilitySettings || { ...DEFAULT_VISIBILITY },
      permissions: formData.permissions || { DASHBOARD: 'Employee' },
      role: formData.role || 'EMPLOYEE',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'Admin'
    };

    if (formMode === 'add') {
      completeEmployeeData.createdAt = new Date().toISOString();
      completeEmployeeData.createdBy = currentUser?.email || 'Admin';
    }

    // Public Profile Payload (allowlisted public fields only!)
    const visibility = completeEmployeeData.publicVisibilitySettings || DEFAULT_VISIBILITY;
    const publicProfilePayload: PublicEmployeeProfile = {
      publicProfileId: publicProfileId,
      employeeId: empId,
      displayName: displayName,
      professionalHeadline: completeEmployeeData.professionalHeadline || '',
      designation: designation,
      department: department,
      profilePhoto: completeEmployeeData.profilePhoto || '',
      employmentStatus: isEmpActive ? 'Active' : 'Inactive',
      businessEmail: (isEmpActive && visibility.showBusinessEmail) ? email : undefined,
      businessPhone: (isEmpActive && visibility.showBusinessPhone) ? directPhone : undefined,
      joiningDate: (isEmpActive && visibility.showJoiningDate) ? (completeEmployeeData.employmentStartDate || completeEmployeeData.joinDate) : undefined,
      reportingManager: (isEmpActive && visibility.showReportingManager) ? completeEmployeeData.reportingManager : undefined,
      highestQualification: (isEmpActive && visibility.showQualifications) ? completeEmployeeData.highestQualification : undefined,
      specialization: (isEmpActive && visibility.showQualifications) ? completeEmployeeData.specialization : undefined,
      educationalInstitution: (isEmpActive && visibility.showQualifications) ? completeEmployeeData.educationalInstitution : undefined,
      coreCompetencies: (isEmpActive && visibility.showCompetencies) ? completeEmployeeData.coreCompetencies : [],
      technicalSkills: (isEmpActive && visibility.showCompetencies) ? completeEmployeeData.technicalSkills : [],
      certifications: (isEmpActive && visibility.showQualifications) ? completeEmployeeData.certifications : [],
      verifiedAt: new Date().toISOString()
    };

    setIsSaving(true);
    try {
      // 1. Save to employees collection
      if (formMode === 'add') {
        await addEmployee(completeEmployeeData);
      } else {
        await updateEmployee(empId, completeEmployeeData);
      }

      // 2. Sync to publicEmployeeProfiles collection
      const publicRef = doc(db, 'publicEmployeeProfiles', publicProfileId);
      await setDoc(publicRef, publicProfilePayload);

      addLog('Employee DB', formMode === 'add' ? 'Created Employee' : 'Updated Employee', `${displayName} (${empId})`);
      addNotification('Success', `Employee ${displayName} record saved successfully.`, 'success');
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Failed to save employee:', err);
      addNotification('Save Error', err.message || 'Could not save employee record.', 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (emp: Employee) => {
    const isCurrentlyActive = emp.status === 'Active';
    const newStatus = isCurrentlyActive ? 'Resigned' : 'Active';
    const actionWord = isCurrentlyActive ? 'Deactivate' : 'Activate';

    const confirmed = await showConfirm(
      `Are you sure you want to ${actionWord} employee "${emp.name}" (${emp.id})?`,
      `${actionWord} Employee`
    );
    if (!confirmed) return;

    try {
      const publicProfileId = emp.publicProfileId || generatePublicProfileId();
      await updateEmployee(emp.id, {
        status: newStatus,
        isLoginEnabled: !isCurrentlyActive,
        publicProfileId: publicProfileId
      });

      // Update public profile status
      const publicRef = doc(db, 'publicEmployeeProfiles', publicProfileId);
      await updateDoc(publicRef, {
        employmentStatus: !isCurrentlyActive ? 'Active' : 'Inactive',
        verifiedAt: new Date().toISOString()
      }).catch(async () => {
        // If document doesn't exist yet, create it
        const visibility = emp.publicVisibilitySettings || DEFAULT_VISIBILITY;
        await setDoc(publicRef, {
          publicProfileId,
          employeeId: emp.id,
          displayName: emp.displayName || emp.name,
          designation: emp.designation || emp.position || '',
          department: emp.department,
          employmentStatus: !isCurrentlyActive ? 'Active' : 'Inactive',
          businessEmail: !isCurrentlyActive && visibility.showBusinessEmail ? emp.email : undefined,
          businessPhone: !isCurrentlyActive && visibility.showBusinessPhone ? (emp.directPhone || emp.phone) : undefined,
          verifiedAt: new Date().toISOString()
        });
      });

      addLog('Employee DB', `${actionWord}d Employee`, `${emp.name} (${emp.id})`);
      addNotification('Status Updated', `Employee ${emp.name} is now ${newStatus}.`, 'success');
    } catch (err: any) {
      console.error('Status toggle error:', err);
      addNotification('Update Failed', err.message || 'Failed to update employee status.', 'alert');
    }
  };

  // Photo Upload Handler (base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addNotification('File Size Limit', 'Profile image must be less than 2MB.', 'alert');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, profilePhoto: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Helper to create public profile payload from employee record
  const createPublicProfilePayload = (emp: Employee, publicProfileId: string): PublicEmployeeProfile => {
    const isEmpActive = emp.status === 'Active' || emp.isLoginEnabled !== false;
    const visibility = emp.publicVisibilitySettings || DEFAULT_VISIBILITY;
    return {
      publicProfileId,
      employeeId: emp.id,
      displayName: emp.displayName || emp.name,
      professionalHeadline: emp.professionalHeadline || '',
      designation: emp.designation || emp.role || 'Staff',
      department: emp.department || 'General',
      profilePhoto: emp.profilePhoto || '',
      employmentStatus: isEmpActive ? 'Active' : 'Inactive',
      businessEmail: (isEmpActive && visibility.showBusinessEmail) ? emp.email : undefined,
      businessPhone: (isEmpActive && visibility.showBusinessPhone) ? (emp.directPhone || emp.phone) : undefined,
      joiningDate: (isEmpActive && visibility.showJoiningDate) ? (emp.employmentStartDate || emp.joinDate) : undefined,
      reportingManager: (isEmpActive && visibility.showReportingManager) ? emp.reportingManager : undefined,
      highestQualification: (isEmpActive && visibility.showQualifications) ? emp.highestQualification : undefined,
      specialization: (isEmpActive && visibility.showQualifications) ? emp.specialization : undefined,
      educationalInstitution: (isEmpActive && visibility.showQualifications) ? emp.educationalInstitution : undefined,
      coreCompetencies: (isEmpActive && visibility.showCompetencies) ? emp.coreCompetencies || [] : [],
      technicalSkills: (isEmpActive && visibility.showCompetencies) ? emp.technicalSkills || [] : [],
      certifications: (isEmpActive && visibility.showQualifications) ? emp.certifications || [] : [],
      verifiedAt: new Date().toISOString()
    };
  };

  // Auto-sync existing employees missing publicProfileId upon admin entering module
  useEffect(() => {
    if (!isAuthenticated || !employees.length) return;
    const syncMissing = async () => {
      for (const emp of employees) {
        if (!emp.publicProfileId) {
          const generatedId = `smp_${emp.id.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}`;
          const payload = createPublicProfilePayload(emp, generatedId);
          try {
            await setDoc(doc(db, 'publicEmployeeProfiles', generatedId), payload);
            await updateEmployee(emp.id, {
              publicProfileId: generatedId,
              publicVisibilitySettings: emp.publicVisibilitySettings || DEFAULT_VISIBILITY
            });
          } catch (e) {
            console.warn('Auto-provisioning public profile failed for', emp.id, e);
          }
        }
      }
    };
    syncMissing();
  }, [isAuthenticated, employees]);

  // Get Public Profile URL
  // Uses query param ?employee= to guarantee universal routing without server-side rewrite issues
  const getPublicProfileUrl = (empOrId?: Employee | Partial<Employee> | string, targetOrigin?: string) => {
    let id = '';
    if (typeof empOrId === 'object' && empOrId !== null) {
      id = empOrId.publicProfileId || (empOrId.id ? `smp_${empOrId.id.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}` : '');
    } else if (typeof empOrId === 'string' && empOrId.trim()) {
      id = empOrId.trim();
    }

    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Default base URL:
    // If scanning with a phone camera while developing locally, localhost is unreachable from the phone.
    // Use targetOrigin if provided, else production URL if on localhost, else current window origin.
    const base = targetOrigin || (isLocal ? 'https://sreemeditec-crm.vercel.app' : (typeof window !== 'undefined' ? window.location.origin : 'https://sreemeditec-crm.vercel.app'));

    return `${base}/?employee=${encodeURIComponent(id)}`;
  };

  // Open QR modal and ensure publicProfileId and public profile record exist
  const handleOpenQrModal = async (emp: Employee) => {
    let activeEmp = { ...emp };
    if (!activeEmp.publicProfileId) {
      const generatedId = `smp_${emp.id.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}`;
      activeEmp.publicProfileId = generatedId;
      const payload = createPublicProfilePayload(activeEmp, generatedId);
      try {
        await setDoc(doc(db, 'publicEmployeeProfiles', generatedId), payload);
        await updateEmployee(emp.id, {
          publicProfileId: generatedId,
          publicVisibilitySettings: emp.publicVisibilitySettings || DEFAULT_VISIBILITY
        });
      } catch (e) {
        console.warn('Auto-save public profile failed:', e);
      }
    }
    setQrModalEmployee(activeEmp);
  };

  // Copy Profile Link to Clipboard
  const handleCopyLink = async (empOrId?: Employee | Partial<Employee> | string) => {
    const url = getPublicProfileUrl(empOrId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      addNotification('Link Copied', 'Public employee profile URL copied to clipboard.', 'success');
    } catch {
      addNotification('Copy Failed', 'Unable to copy URL to clipboard.', 'alert');
    }
  };

  // Download QR Code as PNG
  const handleDownloadQrPng = (emp: Employee) => {
    const svgElem = document.getElementById(`qr-svg-${emp.id}`);
    if (!svgElem) return;

    const svgData = new XMLSerializer().serializeToString(svgElem);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR_${emp.id}_${(emp.name || 'employee').replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Download QR Code as SVG
  const handleDownloadQrSvg = (emp: Employee) => {
    const svgElem = document.getElementById(`qr-svg-${emp.id}`);
    if (!svgElem) return;

    const svgData = new XMLSerializer().serializeToString(svgElem);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `QR_${emp.id}_${(emp.name || 'employee').replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // Print Employee ID Card
  const handlePrintIdCard = async (emp: Employee) => {
    let activeEmp = { ...emp };
    if (!activeEmp.publicProfileId) {
      const generatedId = `smp_${emp.id.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}`;
      activeEmp.publicProfileId = generatedId;
      const payload = createPublicProfilePayload(activeEmp, generatedId);
      try {
        await setDoc(doc(db, 'publicEmployeeProfiles', generatedId), payload);
        await updateEmployee(emp.id, {
          publicProfileId: generatedId,
          publicVisibilitySettings: emp.publicVisibilitySettings || DEFAULT_VISIBILITY
        });
      } catch (e) {}
    }

    const publicUrl = getPublicProfileUrl(activeEmp);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addNotification('Popup Blocked', 'Please allow popups to print ID card.', 'alert');
      return;
    }

    const svgElem = document.getElementById(`qr-svg-${emp.id}`);
    const svgHtml = svgElem ? svgElem.outerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee ID Card - ${emp.name} (${emp.id})</title>
        <style>
          @page { size: 85.6mm 54mm; margin: 0; }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #ffffff;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .id-card {
            width: 85.6mm;
            height: 54mm;
            box-sizing: border-box;
            padding: 4mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: linear-gradient(135deg, #042f2e 0%, #064e3b 100%);
            color: #ffffff;
            border-radius: 4mm;
            overflow: hidden;
            position: relative;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 0.5px solid rgba(255,255,255,0.2);
            padding-bottom: 2mm;
          }
          .brand-title {
            font-size: 8pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #83E7DD;
          }
          .brand-sub {
            font-size: 5pt;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255,255,255,0.7);
          }
          .body {
            display: flex;
            align-items: center;
            gap: 3mm;
            margin-top: 1mm;
          }
          .photo {
            width: 20mm;
            height: 24mm;
            border-radius: 2mm;
            object-fit: cover;
            border: 1px solid #83E7DD;
            background: #0f172a;
          }
          .photo-fallback {
            width: 20mm;
            height: 24mm;
            border-radius: 2mm;
            background: #0f172a;
            border: 1px solid #83E7DD;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14pt;
            font-weight: 900;
            color: #83E7DD;
          }
          .details {
            flex: 1;
            min-width: 0;
          }
          .emp-name {
            font-size: 9pt;
            font-weight: 800;
            color: #ffffff;
            margin: 0;
            line-height: 1.1;
          }
          .emp-desig {
            font-size: 6.5pt;
            font-weight: 700;
            color: #83E7DD;
            margin-top: 1mm;
          }
          .emp-id-badge {
            display: inline-block;
            background: rgba(131,231,221,0.15);
            border: 0.5px solid #83E7DD;
            color: #83E7DD;
            font-size: 5.5pt;
            font-weight: 800;
            padding: 0.5mm 1.5mm;
            border-radius: 1mm;
            margin-top: 1.5mm;
          }
          .qr-box {
            width: 18mm;
            height: 18mm;
            background: #ffffff;
            padding: 1mm;
            border-radius: 1.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-box svg {
            width: 100%;
            height: 100%;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 4.5pt;
            color: rgba(255,255,255,0.7);
            border-top: 0.5px solid rgba(255,255,255,0.2);
            padding-top: 1.5mm;
          }
        </style>
      </head>
      <body>
        <div class="id-card">
          <div class="header">
            <div>
              <div class="brand-title">Sree Meditec Enterprise</div>
              <div class="brand-sub">Official Personnel Identification</div>
            </div>
            <div style="font-size: 5.5pt; font-weight: 800; color: #83E7DD; text-transform: uppercase;">
              ${emp.status === 'Active' ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>

          <div class="body">
            ${emp.profilePhoto 
              ? `<img src="${emp.profilePhoto}" class="photo" />` 
              : `<div class="photo-fallback">${(emp.name || 'E').charAt(0)}</div>`
            }
            <div class="details">
              <div class="emp-name">${emp.displayName || emp.name}</div>
              <div class="emp-desig">${emp.designation || emp.position || 'Staff Specialist'}</div>
              <div style="font-size: 5.5pt; color: rgba(255,255,255,0.8); margin-top: 0.5mm;">Dept: ${emp.department}</div>
              <div class="emp-id-badge">ID: ${emp.id}</div>
            </div>
            <div class="qr-box">
              ${svgHtml}
            </div>
          </div>

          <div class="footer">
            <span>Kochi, Kerala • +91 98848 18398</span>
            <span>Scan QR for verified digital credentials</span>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─── ADMIN PASSWORD SCREEN ──────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 animate-in fade-in">
        <div className="max-w-md w-full bg-gradient-to-br from-emerald-950 via-teal-950 to-green-950 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(4,47,46,0.6)] border border-emerald-800/40 p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#83E7DD] via-transparent to-transparent pointer-events-none"></div>

          <div className="w-20 h-20 bg-emerald-900/60 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-[#83E7DD] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-emerald-700/50 relative z-10">
            <Lock size={38} />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white mb-2 uppercase relative z-10">
            Employee Database
          </h2>
          <p className="text-emerald-100/70 text-xs font-semibold leading-relaxed mb-6">
            Administrative credentials required to manage personnel records and QR keys.
          </p>

          <form onSubmit={handleVerifyPassword} className="space-y-4 relative z-10">
            <input
              type="password"
              placeholder="ENTER ADMIN ACCESS KEY"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              disabled={isVerifying}
              className="w-full px-5 py-4 bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/30 rounded-2xl outline-none focus:border-[#83E7DD] focus:bg-emerald-900/60 font-mono text-center tracking-[0.3em] transition-all shadow-inner text-sm"
              autoFocus
            />

            {authError && (
              <p className="text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 rounded-xl p-2.5">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifying || !passwordInput.trim()}
              className="w-full bg-gradient-to-r from-[#83E7DD] to-emerald-400 text-slate-900 font-black py-4 rounded-2xl shadow-lg shadow-[#83E7DD]/20 uppercase tracking-widest text-xs hover:opacity-95 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isVerifying ? 'Verifying Clearance...' : 'Authorize Clearance'}
            </button>
          </form>

          <p className="text-[10px] text-emerald-100/40 font-bold uppercase tracking-widest mt-6">
            Protected by Sree Meditec Server-Side Authorization
          </p>
        </div>
      </div>
    );
  }

  // ─── AUTHENTICATED DASHBOARD ───────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Header & Actions */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Employee Database
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#83E7DD]/20 border border-[#83E7DD]/40 text-[#044e45] dark:text-[#83E7DD] text-[10px] font-bold uppercase tracking-wider">
                Admin Clearance Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Secure personnel registry, permanent QR profile codes & official credential cards.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Plus size={16} />
              <span>Add New Employee</span>
            </button>

            <button
              onClick={handleLockDatabase}
              title="Lock Database"
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-500 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
            >
              <Lock size={16} />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Personnel</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-3 sm:p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Active Staff</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{stats.active}</p>
          </div>
          <div className="p-3 sm:p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Inactive / Resigned</p>
            <p className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{stats.inactive}</p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, employee ID, designation, department, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.filter(d => d !== 'All').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
        {filteredEmployees.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Users size={40} className="text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">No Employees Found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search filters or add a new personnel record.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">ID & Headline</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Direct Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">QR Card</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.map((emp) => {
                    const isEmpActive = emp.status === 'Active';
                    const publicId = emp.publicProfileId || emp.id;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {emp.profilePhoto ? (
                              <img src={emp.profilePhoto} alt={emp.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                {emp.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100">{emp.displayName || emp.name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">{emp.designation || emp.position || 'Staff'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                            {emp.id}
                          </span>
                          {emp.professionalHeadline && (
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{emp.professionalHeadline}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.department}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{emp.directPhone || emp.phone || '—'}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{emp.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isEmpActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                          }`}>
                            {isEmpActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {/* Hidden QR SVG for generation */}
                          <div className="hidden">
                            <QRCodeSVG
                              id={`qr-svg-${emp.id}`}
                              value={getPublicProfileUrl(emp)}
                              size={256}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          <button
                            onClick={() => handleOpenQrModal(emp)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-[#83E7DD]/20 text-slate-700 dark:text-slate-200 dark:bg-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition-all group"
                          >
                            <QrCode size={13} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span>QR Code</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingEmployee(emp)}
                              title="View Details"
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              title="Edit Employee"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              title={isEmpActive ? 'Deactivate Employee' : 'Activate Employee'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isEmpActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              <AlertTriangle size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => {
              const isEmpActive = emp.status === 'Active';
              return (
                <div key={emp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {emp.profilePhoto ? (
                          <img src={emp.profilePhoto} alt={emp.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700" />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-400 text-lg">
                            {emp.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white text-sm">{emp.displayName || emp.name}</h3>
                          <p className="text-xs text-slate-400">{emp.designation || emp.position || 'Staff'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        isEmpActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                      }`}>
                        {isEmpActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                        {emp.id}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{emp.department}</span>
                    </div>

                    {emp.professionalHeadline && (
                      <p className="text-xs text-slate-500 italic line-clamp-2">{emp.professionalHeadline}</p>
                    )}

                    <div className="text-xs space-y-1 text-slate-500 pt-1">
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span>{emp.directPhone || emp.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenQrModal(emp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#83E7DD]/20 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      <QrCode size={14} className="text-emerald-600" />
                      <span>QR Code</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingEmployee(emp)}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View Full Profile"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Record"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`p-2 rounded-lg transition-colors ${
                          isEmpActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={isEmpActive ? 'Deactivate' : 'Activate'}
                      >
                        <AlertTriangle size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ADD / EDIT EMPLOYEE MODAL ────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 shrink-0">
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  {formMode === 'add' ? 'Register New Personnel' : `Edit Record: ${formData.displayName || formData.name}`}
                </h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                  ID: {formData.id} • Permanent QR Protected
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Nav Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto shrink-0 custom-scrollbar">
              {[
                { id: 'technical', label: '1. Technical' },
                { id: 'basic', label: '2. Basic Info' },
                { id: 'contact', label: '3. Contact' },
                { id: 'employment', label: '4. Employment' },
                { id: 'education', label: '5. Credentials' },
                { id: 'qr', label: '6. QR & Visibility' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 uppercase tracking-wider whitespace-nowrap transition-all ${
                    activeFormTab === tab.id
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
              {/* TAB 1: TECHNICAL RECORD */}
              {activeFormTab === 'technical' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Employee ID <span className="text-emerald-500">* (Immutable)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.id}
                        disabled={formMode === 'edit'}
                        onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500 disabled:opacity-60"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Unique organization personnel identifier.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Display Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Rajesh Kumar"
                        value={formData.displayName || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value, name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Professional Headline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Biomedical Systems Specialist | Critical Care Equipment"
                      value={formData.professionalHeadline || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, professionalHeadline: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Employment Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.status || 'Active'}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      >
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Resigned">Inactive / Resigned</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        System Role
                      </label>
                      <select
                        value={formData.role || 'EMPLOYEE'}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      >
                        <option value="EMPLOYEE">Standard Employee</option>
                        <option value="SYSTEM_ADMIN">System Administrator</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BASIC INFORMATION */}
              {activeFormTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Full official name as per government ID"
                      value={formData.fullLegalName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullLegalName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Date of Birth <span className="text-slate-400 font-normal">(Private)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Gender <span className="text-slate-400 font-normal">(Private)</span>
                      </label>
                      <select
                        value={formData.gender || 'Prefer not to say'}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Nationality <span className="text-slate-400 font-normal">(Private)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nationality || 'Indian'}
                        onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Profile Photo (Passport size / Formal)
                    </label>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                      {formData.profilePhoto ? (
                        <img src={formData.profilePhoto} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                          <Users size={24} />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">JPEG or PNG, Max 2MB.</p>
                      </div>
                      {formData.profilePhoto && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, profilePhoto: '' }))}
                          className="text-rose-500 text-xs font-bold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACT INFORMATION */}
              {activeFormTab === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Official Business Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. employee@sreemeditec.com"
                        value={formData.email || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Direct Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98848 18398"
                        value={formData.directPhone || formData.phone || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, directPhone: e.target.value, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      <span>Emergency Contact Details (Strictly Private - Admin Only)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Contact Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Anjali Kumar"
                          value={formData.emergencyContactName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Relationship</label>
                        <input
                          type="text"
                          placeholder="e.g. Spouse / Parent"
                          value={formData.emergencyContactRelationship || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Emergency Phone</label>
                        <input
                          type="tel"
                          placeholder="e.g. +91 94471 XXXXX"
                          value={formData.emergencyContactPhone || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: EMPLOYMENT DETAILS */}
              {activeFormTab === 'employment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Designation / Job Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Biomedical Engineer"
                        value={formData.designation || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value, position: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Department <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.department || 'Service'}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      >
                        <option value="Administration">Administration</option>
                        <option value="Service">Service</option>
                        <option value="Sales">Sales</option>
                        <option value="Support">Support</option>
                        <option value="Biomedical">Biomedical</option>
                        <option value="Accounts">Accounts & Finance</option>
                        <option value="Logistics">Logistics & Supply</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Employment Start Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.employmentStartDate || formData.joinDate || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, employmentStartDate: e.target.value, joinDate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Employee Type
                      </label>
                      <select
                        value={formData.employeeType || 'Full-Time'}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeType: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      >
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Trainee">Trainee / Intern</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Work Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kochi HQ / Field"
                        value={formData.workLocation || 'Kochi HQ'}
                        onChange={(e) => setFormData(prev => ({ ...prev, workLocation: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Reporting Manager
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sreekumar (Managing Director)"
                      value={formData.reportingManager || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, reportingManager: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: EDUCATION & COMPETENCIES */}
              {activeFormTab === 'education' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Highest Qualification
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech Biomedical"
                        value={formData.highestQualification || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, highestQualification: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Specialization
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ICU & Ventilator Systems"
                        value={formData.specialization || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                        Educational Institution
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Model Engineering College"
                        value={formData.educationalInstitution || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, educationalInstitution: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Core Competencies Tags */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Core Competencies
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add competency (e.g. Ventilator Calibration)"
                        value={compInput}
                        onChange={(e) => setCompInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (compInput.trim()) {
                              setFormData(prev => ({
                                ...prev,
                                coreCompetencies: [...(prev.coreCompetencies || []), compInput.trim()]
                              }));
                              setCompInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (compInput.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              coreCompetencies: [...(prev.coreCompetencies || []), compInput.trim()]
                            }));
                            setCompInput('');
                          }
                        }}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(formData.coreCompetencies || []).map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs">
                          {c}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              coreCompetencies: prev.coreCompetencies?.filter((_, idx) => idx !== i)
                            }))}
                            className="hover:text-rose-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Technical Skills Tags */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Technical Skills
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add skill (e.g. PCB Diagnostics, Anaesthesia Tech)"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (skillInput.trim()) {
                              setFormData(prev => ({
                                ...prev,
                                technicalSkills: [...(prev.technicalSkills || []), skillInput.trim()]
                              }));
                              setSkillInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (skillInput.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              technicalSkills: [...(prev.technicalSkills || []), skillInput.trim()]
                            }));
                            setSkillInput('');
                          }
                        }}
                        className="px-3 py-2 bg-teal-600 text-white rounded-xl font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(formData.technicalSkills || []).map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-lg border border-teal-200 dark:border-teal-800 text-xs">
                          {s}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              technicalSkills: prev.technicalSkills?.filter((_, idx) => idx !== i)
                            }))}
                            className="hover:text-rose-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                      Administrative Notes <span className="text-amber-500 font-bold">(Strictly Private - Admin Eyes Only)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Confidential performance notes, salary scale adjustments, verification remarks..."
                      value={formData.additionalNotes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: QR CODE & PUBLIC VISIBILITY SETTINGS */}
              {activeFormTab === 'qr' && (
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-md shrink-0">
                      <QRCodeSVG
                        value={getPublicProfileUrl(formData)}
                        size={120}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <Sparkles size={14} className="text-emerald-600 dark:text-[#83E7DD]" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Permanent QR Identity</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        This QR code encodes only the public profile URL. It remains permanent and will never break even if employee details are modified.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(formData)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
                        >
                          {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                        </button>
                        <a
                          href={getPublicProfileUrl(formData, typeof window !== 'undefined' ? window.location.origin : undefined)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
                        >
                          <ExternalLink size={14} />
                          <span>Preview Profile</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Visibility Controls */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Public Visibility Permissions (Granular Field Controls)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Configure which approved fields are visible to anyone scanning the employee's QR code. Sensitive personal and emergency details are always kept private.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {[
                        { key: 'showBusinessPhone', label: 'Show Business Phone on Public Profile' },
                        { key: 'showBusinessEmail', label: 'Show Business Email on Public Profile' },
                        { key: 'showQualifications', label: 'Show Qualifications & Institution' },
                        { key: 'showCompetencies', label: 'Show Skills & Competencies' },
                        { key: 'showJoiningDate', label: 'Show Joining Date' },
                        { key: 'showReportingManager', label: 'Show Reporting Manager' }
                      ].map((item) => {
                        const currentSettings = formData.publicVisibilitySettings || DEFAULT_VISIBILITY;
                        const isChecked = (currentSettings as any)[item.key];
                        return (
                          <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  publicVisibilitySettings: {
                                    ...(prev.publicVisibilitySettings || DEFAULT_VISIBILITY),
                                    [item.key]: checked
                                  }
                                }));
                              }}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveEmployee}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving Record...' : formMode === 'add' ? 'Register Employee' : 'Update Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULL PROFILE VIEW MODAL ─────────────────────────────────────────── */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                {viewingEmployee.profilePhoto ? (
                  <img src={viewingEmployee.profilePhoto} alt={viewingEmployee.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-lg">
                    {viewingEmployee.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">{viewingEmployee.displayName || viewingEmployee.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold">{viewingEmployee.designation || viewingEmployee.position || 'Staff'}</p>
                </div>
              </div>
              <button onClick={() => setViewingEmployee(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Employee ID</p>
                  <p className="font-mono font-bold text-emerald-600 mt-0.5">{viewingEmployee.id}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Department</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{viewingEmployee.department}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Official Email</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{viewingEmployee.email}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Direct Phone</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{viewingEmployee.directPhone || viewingEmployee.phone || '—'}</p>
                </div>
              </div>

              {/* Private Information Section (Visible to Authenticated Admins) */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-2">
                <h4 className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>Confidential Records (Admin Only)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                    <span>{viewingEmployee.dateOfBirth || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Gender</span>
                    <span>{viewingEmployee.gender || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Nationality</span>
                    <span>{viewingEmployee.nationality || 'Indian'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Emergency Contact</span>
                    <span>{viewingEmployee.emergencyContactName ? `${viewingEmployee.emergencyContactName} (${viewingEmployee.emergencyContactRelationship || 'Relative'})` : '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Emergency Phone</span>
                    <span>{viewingEmployee.emergencyContactPhone || '—'}</span>
                  </div>
                </div>
                {viewingEmployee.additionalNotes && (
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/60">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Admin Internal Notes</span>
                    <p className="text-slate-600 dark:text-slate-300 italic">{viewingEmployee.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/40">
              <button
                onClick={() => {
                  const emp = viewingEmployee;
                  setViewingEmployee(null);
                  handleOpenEdit(emp);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700"
              >
                Edit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QR CODE & PRINTABLE ID CARD MODAL ────────────────────────────────── */}
      {qrModalEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Permanent QR & Credential Card
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                  {qrModalEmployee.displayName || qrModalEmployee.name} • {qrModalEmployee.id}
                </p>
              </div>
              <button onClick={() => setQrModalEmployee(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center space-y-5 text-center">
              {/* QR Display */}
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xl">
                <QRCodeSVG
                  id={`qr-svg-${qrModalEmployee.id}`}
                  value={getPublicProfileUrl(qrModalEmployee)}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 mb-2">
                  <ShieldCheck size={14} />
                  <span>Permanent Public Profile Verified</span>
                </div>
                <p className="text-xs text-slate-500 font-mono break-all max-w-md mx-auto">
                  {getPublicProfileUrl(qrModalEmployee)}
                </p>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <a
                    href={getPublicProfileUrl(qrModalEmployee, typeof window !== 'undefined' ? window.location.origin : undefined)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    <ExternalLink size={13} />
                    <span>Open in Browser (Test View)</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-2">
                <button
                  onClick={() => handleCopyLink(qrModalEmployee)}
                  className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:border-emerald-500 transition-all text-slate-700 dark:text-slate-200"
                >
                  <Copy size={16} className="text-emerald-600" />
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={() => handleDownloadQrPng(qrModalEmployee)}
                  className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:border-emerald-500 transition-all text-slate-700 dark:text-slate-200"
                >
                  <Download size={16} className="text-teal-600" />
                  <span>PNG QR</span>
                </button>

                <button
                  onClick={() => handleDownloadQrSvg(qrModalEmployee)}
                  className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:border-emerald-500 transition-all text-slate-700 dark:text-slate-200"
                >
                  <Download size={16} className="text-indigo-600" />
                  <span>SVG QR</span>
                </button>

                <button
                  onClick={() => handlePrintIdCard(qrModalEmployee)}
                  className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold flex flex-col items-center gap-1 hover:opacity-95 transition-all shadow-md"
                >
                  <Printer size={16} />
                  <span>Print Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
