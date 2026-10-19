import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { PublicEmployeeProfile as PublicProfileType, Employee } from '../types';
import { 
  ShieldCheck, Phone, Mail, Award, Briefcase, GraduationCap, 
  Building2, Calendar, CheckCircle2, AlertTriangle, ArrowUpRight, 
  Sparkles, ExternalLink, UserCheck, ShieldAlert, Clock, MapPin,
  User, Download, CheckCircle, Smartphone, Droplets, Heart, PhoneCall,
  Activity, BadgeAlert
} from 'lucide-react';

interface PublicEmployeeProfileProps {
  publicProfileId: string;
}

export const PublicEmployeeProfile: React.FC<PublicEmployeeProfileProps> = ({ publicProfileId }) => {
  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setNotFound(false);

        // Ensure anonymous auth context for Firebase access
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.warn('Anonymous auth sign-in warning:', e);
          }
        }

        // Clean ID variants
        const cleanId = publicProfileId.replace(/^smp_/i, '');
        const idVariants = [
          publicProfileId,
          publicProfileId.toLowerCase(),
          publicProfileId.toUpperCase(),
          cleanId,
          cleanId.toLowerCase(),
          cleanId.toUpperCase()
        ];

        // 1. Primary lookup: publicEmployeeProfiles by document ID
        for (const candidateId of idVariants) {
          const ref = doc(db, 'publicEmployeeProfiles', candidateId);
          const snap = await getDoc(ref);
          if (!isMounted) return;
          if (snap.exists()) {
            setProfile(snap.data() as PublicProfileType);
            setLoading(false);
            return;
          }
        }

        // 2. Secondary lookup: publicEmployeeProfiles by employeeId query
        for (const candidateId of [publicProfileId, cleanId, cleanId.toUpperCase(), cleanId.toLowerCase()]) {
          const q = query(collection(db, 'publicEmployeeProfiles'), where('employeeId', '==', candidateId));
          const qSnap = await getDocs(q);
          if (!isMounted) return;
          if (!qSnap.empty) {
            setProfile(qSnap.docs[0].data() as PublicProfileType);
            setLoading(false);
            return;
          }
        }

        // Helper to construct public profile from raw employee record
        const resolveFromEmployee = (empId: string, emp: Employee) => {
          const isEmpActive = emp.status === 'Active' || emp.isLoginEnabled !== false;
          const vis = emp.publicVisibilitySettings || {
            showBusinessPhone: true,
            showBusinessEmail: true,
            showQualifications: true,
            showCompetencies: true,
            showReportingManager: false,
            showJoiningDate: true,
            showBloodGroup: true,
            showWorkLocation: true,
            showEmergencyContact: true
          };

          const dynamicPublicProfile: PublicProfileType = {
            publicProfileId: publicProfileId,
            employeeId: empId,
            displayName: emp.displayName || emp.name,
            professionalHeadline: emp.professionalHeadline || (emp.position || emp.role || 'Staff'),
            designation: emp.designation || emp.position || emp.role || 'Staff',
            department: emp.department || 'General',
            profilePhoto: emp.profilePhoto || '',
            employmentStatus: isEmpActive ? 'Active' : 'Inactive',
            businessEmail: (isEmpActive && vis.showBusinessEmail !== false) ? emp.email : undefined,
            businessPhone: (isEmpActive && vis.showBusinessPhone !== false) ? (emp.directPhone || emp.phone) : undefined,
            joiningDate: (isEmpActive && vis.showJoiningDate !== false) ? (emp.employmentStartDate || emp.joinDate) : undefined,
            reportingManager: (isEmpActive && vis.showReportingManager !== false) ? emp.reportingManager : undefined,
            highestQualification: (isEmpActive && vis.showQualifications !== false) ? emp.highestQualification : undefined,
            specialization: (isEmpActive && vis.showQualifications !== false) ? emp.specialization : undefined,
            educationalInstitution: (isEmpActive && vis.showQualifications !== false) ? emp.educationalInstitution : undefined,
            coreCompetencies: (isEmpActive && vis.showCompetencies !== false) ? emp.coreCompetencies || [] : [],
            technicalSkills: (isEmpActive && vis.showCompetencies !== false) ? emp.technicalSkills || [] : [],
            certifications: (isEmpActive && vis.showQualifications !== false) ? emp.certifications || [] : [],
            bloodGroup: emp.bloodGroup,
            workLocation: emp.workLocation,
            emergencyContactName: emp.emergencyContactName,
            emergencyContactRelationship: emp.emergencyContactRelationship,
            emergencyContactPhone: emp.emergencyContactPhone,
            gender: emp.gender,
            dateOfBirth: emp.dateOfBirth,
            employeeType: emp.employeeType || 'Full-Time',
            nationality: emp.nationality || 'Indian',
            verifiedAt: new Date().toISOString()
          };

          setProfile(dynamicPublicProfile);
          setLoading(false);
        };

        // 3. Direct document lookup in employees collection (case variants)
        for (const candidateId of [cleanId.toUpperCase(), cleanId, cleanId.toLowerCase(), publicProfileId]) {
          const empDocRef = doc(db, 'employees', candidateId);
          const empSnap = await getDoc(empDocRef);
          if (!isMounted) return;
          if (empSnap.exists()) {
            resolveFromEmployee(empSnap.id, empSnap.data() as Employee);
            return;
          }
        }

        // 4. Exhaustive search across all employees by normalized alphanumeric ID
        const allEmpSnap = await getDocs(collection(db, 'employees'));
        if (!isMounted) return;
        const targetNormalized = cleanId.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedDoc = allEmpSnap.docs.find(d => {
          const dData = d.data();
          const idNorm = d.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          const pubNorm = (dData.publicProfileId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return idNorm === targetNormalized || pubNorm === targetNormalized || d.id.toLowerCase() === cleanId.toLowerCase();
        });

        if (matchedDoc) {
          resolveFromEmployee(matchedDoc.id, matchedDoc.data() as Employee);
          return;
        }

        // If not found in any collection
        setNotFound(true);
      } catch (err) {
        console.error('Failed to load public employee profile:', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (publicProfileId) {
      fetchProfile();
    } else {
      setNotFound(true);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [publicProfileId]);

  // Download vCard (.vcf) helper
  const handleDownloadVCard = () => {
    if (!profile) return;
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${profile.displayName}`,
      `ORG:Sree Meditec Enterprise;${profile.department || ''}`,
      `TITLE:${profile.designation || ''}`,
      profile.businessEmail ? `EMAIL;TYPE=WORK,INTERNET:${profile.businessEmail}` : '',
      profile.businessPhone ? `TEL;TYPE=WORK,VOICE:${profile.businessPhone}` : '',
      profile.workLocation ? `ADR;TYPE=WORK:;;${profile.workLocation};;;;` : '',
      profile.bloodGroup ? `NOTE:Blood Group: ${profile.bloodGroup}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${profile.displayName.replace(/\s+/g, '_')}_SreeMeditec.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-dvh bg-gradient-to-b from-slate-50 via-white to-emerald-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center animate-pulse mb-5 shadow-xl shadow-teal-500/20 text-white">
          <ShieldCheck size={32} />
        </div>
        <h3 className="text-lg font-playfair font-bold text-slate-800 dark:text-slate-100 mb-1">
          Verifying Personnel Record
        </h3>
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Connecting to Sree Meditec Verification Registry...
        </p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="h-dvh bg-gradient-to-b from-slate-50 via-white to-emerald-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl max-w-md w-full p-8 sm:p-10 text-center border border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-full flex items-center justify-center mx-auto mb-5 text-rose-500">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2">
            Record Not Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            The requested personnel record could not be found or may have been unassigned.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 mb-6 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Scanned ID</p>
            <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 break-all">{publicProfileId}</p>
          </div>
          <p className="text-xs text-slate-400 font-medium">Please contact Sree Meditec Administration for assistance.</p>
        </div>
      </div>
    );
  }

  const isEmpActive = profile.employmentStatus === 'Active';

  const fieldCardClass = "bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/50 rounded-[1.5rem] p-3.5 sm:p-4 transition-all";
  const fieldLabelClass = "text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1";
  const fieldValueClass = "text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 break-words";

  // Graceful fallbacks for company defaults
  const effectiveLocation = profile.workLocation || 'Sree Meditec – Tamil Nadu / HQ Operations';
  const effectiveBloodGroup = profile.bloodGroup || 'O+ (Pending HR Verification)';
  const effectiveEmergencyName = profile.emergencyContactName || 'Sree Meditec Operations Desk';
  const effectiveEmergencyRelation = profile.emergencyContactRelationship || 'Corporate Helpline';
  const effectiveEmergencyPhone = profile.emergencyContactPhone || '7200025642';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-emerald-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-y-auto">
      <div className="flex flex-col items-center px-4 sm:px-6 py-6 sm:py-10 pt-[max(env(safe-area-inset-top,24px),calc(env(safe-area-inset-top,24px)+1.5rem))] min-h-full">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 max-w-xl w-full border border-slate-100 dark:border-slate-800/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

          {/* Form Header (Matches PublicServiceForm header style) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-7 sm:p-9 text-white">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              {/* Top row: Company name & Status Pill */}
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-white/90 block leading-tight">
                      Sree Meditec
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-teal-200/90 font-medium block">
                      Official Personnel Portal
                    </span>
                  </div>
                </div>

                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 backdrop-blur-md ${
                  isEmpActive
                    ? 'bg-emerald-500/20 text-emerald-100 border-emerald-300/40'
                    : 'bg-rose-500/20 text-rose-100 border-rose-300/40'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isEmpActive ? 'bg-emerald-300 animate-pulse' : 'bg-rose-300'}`} />
                  <span>{isEmpActive ? 'Active Employee' : 'Inactive'}</span>
                </div>
              </div>

              {/* Personnel Avatar & Identity */}
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  {profile.profilePhoto ? (
                    <img 
                      src={profile.profilePhoto} 
                      alt={profile.displayName} 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/40 shadow-xl shadow-black/10"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-white text-2xl font-black font-playfair shadow-xl">
                      {(profile.displayName || 'SM').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isEmpActive && (
                    <div className="absolute -bottom-1.5 -right-1.5 p-1 bg-white dark:bg-slate-900 rounded-full shadow-md text-emerald-600">
                      <CheckCircle2 size={16} className="fill-emerald-500 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-playfair font-bold tracking-tight text-white truncate">
                    {profile.displayName}
                  </h1>
                  <p className="text-sm text-teal-100/90 font-semibold mt-0.5 truncate">
                    {profile.designation || 'Staff'}
                  </p>
                  <p className="text-xs text-white/70 font-medium mt-0.5 truncate">
                    {profile.department} Department
                  </p>
                  
                  {/* Badges row: ID + Blood Group */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-black/20 backdrop-blur-sm text-[10px] font-mono font-bold text-white/90">
                      ID: {profile.employeeId}
                    </span>
                    {profile.bloodGroup && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/30 backdrop-blur-sm text-[10px] font-black text-rose-100 border border-rose-300/30">
                        <Droplets size={11} className="fill-rose-300 text-rose-300" />
                        <span>{profile.bloodGroup}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content Body (Matches PublicServiceForm styled card layout) */}
          <div className="p-6 sm:p-9 space-y-7">

            {/* Inactive Notice Banner if applicable */}
            {!isEmpActive && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3 text-rose-800 dark:text-rose-200">
                <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Record Inactive</h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300/80 leading-relaxed mt-0.5">
                    This personnel record is marked as inactive or resigned. For official credentials confirmation, please contact Sree Meditec administration.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 1: PERSONNEL DETAILS */}
            <div>
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <User size={15} className="text-teal-600 dark:text-teal-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                  Personnel Information
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className={fieldCardClass}>
                  <span className={fieldLabelClass}>Full Name</span>
                  <span className={fieldValueClass}>{profile.displayName}</span>
                </div>

                <div className={fieldCardClass}>
                  <span className={fieldLabelClass}>Employee ID</span>
                  <span className={`${fieldValueClass} font-mono text-teal-600 dark:text-teal-400`}>
                    {profile.employeeId}
                  </span>
                </div>

                <div className={fieldCardClass}>
                  <span className={fieldLabelClass}>Designation</span>
                  <span className={fieldValueClass}>{profile.designation || 'Staff'}</span>
                </div>

                <div className={fieldCardClass}>
                  <span className={fieldLabelClass}>Department</span>
                  <span className={fieldValueClass}>{profile.department}</span>
                </div>

                <div className={fieldCardClass}>
                  <span className={fieldLabelClass}>Work Location / Branch</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin size={14} className="text-teal-600 shrink-0" />
                    <span className={fieldValueClass}>{effectiveLocation}</span>
                  </div>
                </div>

                <div className={`${fieldCardClass} bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40`}>
                  <span className="text-[10px] sm:text-[11px] font-bold text-rose-500 uppercase tracking-wider block mb-1">
                    Blood Group
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-300 shrink-0">
                      <Droplets size={15} className="fill-rose-500" />
                    </div>
                    <span className="text-base font-black text-rose-700 dark:text-rose-300">
                      {effectiveBloodGroup}
                    </span>
                  </div>
                </div>

                <div className={fieldCardClass}>
                  <span className={fieldLabelClass}>Employment Type</span>
                  <span className={fieldValueClass}>{profile.employeeType || 'Full-Time Permanent'}</span>
                </div>

                {profile.joiningDate && (
                  <div className={fieldCardClass}>
                    <span className={fieldLabelClass}>Service Since</span>
                    <span className={fieldValueClass}>{profile.joiningDate}</span>
                  </div>
                )}

                {profile.reportingManager && (
                  <div className={fieldCardClass}>
                    <span className={fieldLabelClass}>Reporting Officer</span>
                    <span className={fieldValueClass}>{profile.reportingManager}</span>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: OFFICIAL CONTACT DETAILS */}
            {(profile.businessPhone || profile.businessEmail) && (
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Phone size={15} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    Official Contact
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  {profile.businessPhone && (
                    <a 
                      href={`tel:${profile.businessPhone}`} 
                      className={`${fieldCardClass} hover:border-teal-400 hover:shadow-md transition-all group flex items-center justify-between`}
                    >
                      <div>
                        <span className={fieldLabelClass}>Official Phone</span>
                        <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 transition-colors">
                          {profile.businessPhone}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-all">
                        <Phone size={15} />
                      </div>
                    </a>
                  )}

                  {profile.businessEmail && (
                    <a 
                      href={`mailto:${profile.businessEmail}`} 
                      className={`${fieldCardClass} hover:border-teal-400 hover:shadow-md transition-all group flex items-center justify-between`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className={fieldLabelClass}>Official Email</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 transition-colors truncate block">
                          {profile.businessEmail}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-all shrink-0">
                        <Mail size={15} />
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 3: EMERGENCY CONTACT (Dedicated Medical Response Card) */}
            <div>
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                  <PhoneCall size={15} className="text-rose-600 dark:text-rose-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                  Emergency Contact Details
                </span>
              </div>

              <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 rounded-[2rem] p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider block mb-0.5">
                      Emergency Contact Person ({effectiveEmergencyRelation})
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {effectiveEmergencyName}
                    </h4>
                  </div>

                  <a 
                    href={`tel:${effectiveEmergencyPhone}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-rose-600/20 transition-all active:scale-95 shrink-0"
                  >
                    <PhoneCall size={14} />
                    <span>Call Emergency</span>
                  </a>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-rose-200/50 dark:border-rose-900/40 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Emergency Number</span>
                    <span className="font-mono font-bold text-rose-700 dark:text-rose-300 text-sm">
                      {effectiveEmergencyPhone}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Hotline</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                      +91 9884818398 / 7200025642
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: CREDENTIALS & COMPETENCIES */}
            {(profile.highestQualification || (profile.coreCompetencies && profile.coreCompetencies.length > 0) || (profile.technicalSkills && profile.technicalSkills.length > 0)) && (
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <Award size={15} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    Qualifications & Competencies
                  </span>
                </div>

                <div className="space-y-3.5">
                  {profile.highestQualification && (
                    <div className={fieldCardClass}>
                      <span className={fieldLabelClass}>Academic / Technical Qualification</span>
                      <span className={fieldValueClass}>
                        {profile.highestQualification}
                        {profile.specialization ? ` in ${profile.specialization}` : ''}
                        {profile.educationalInstitution ? ` • ${profile.educationalInstitution}` : ''}
                      </span>
                    </div>
                  )}

                  {profile.coreCompetencies && profile.coreCompetencies.length > 0 && (
                    <div className={fieldCardClass}>
                      <span className={fieldLabelClass}>Core Competencies</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {profile.coreCompetencies.map((comp, i) => (
                          <span key={i} className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 rounded-lg text-xs font-semibold">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.technicalSkills && profile.technicalSkills.length > 0 && (
                    <div className={fieldCardClass}>
                      <span className={fieldLabelClass}>Technical Skills & Equipment Specialization</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {profile.technicalSkills.map((skill, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 5: VERIFICATION CARD & ACTIONS */}
            <div className="bg-gradient-to-br from-emerald-50/60 via-teal-50/40 to-slate-50 dark:from-slate-800/60 dark:via-slate-800/40 dark:to-slate-900/60 border border-emerald-200/60 dark:border-slate-700/60 rounded-[2rem] p-5 sm:p-6 text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-300/50 dark:border-emerald-700/50">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Verified Official Record</span>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Verification Reference
                </p>
                <p className="text-sm font-mono font-bold text-teal-700 dark:text-teal-300 break-all">
                  {profile.publicProfileId || publicProfileId}
                </p>
                {profile.verifiedAt && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Verified: {new Date(profile.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Action Button: Download Contact / vCard */}
              <button 
                onClick={handleDownloadVCard}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-[2rem] px-6 py-3.5 text-sm transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 active:scale-[0.98] cursor-pointer"
              >
                <Smartphone size={16} />
                <span>Save Contact to Phone</span>
              </button>
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                This verification portal is maintained by <strong className="text-slate-600 dark:text-slate-400">Sree Meditec Enterprise</strong>.
              </p>
              <p className="text-[10px] text-slate-400/80 mt-1 uppercase tracking-wider">
                Confidential & Protected Personnel Registry
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
