
import React, { useState, useEffect } from 'react';
import { Clock, MapPin, User, CheckCircle, Smartphone, Navigation, Building2, Home, AlertCircle, ExternalLink, LayoutGrid, List as ListIcon, Phone, Mail, CheckSquare, Timer, PauseCircle } from 'lucide-react';
import { Task } from '../types';

interface Employee {
  id: string;
  name: string;
  role: string;
  status: 'Present' | 'On Field' | 'Remote' | 'Absent' | 'Leave';
  checkIn: string;
  location: string;
  avatarColor: string;
  phone?: string;
}

const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Rahul Sharma', role: 'Sales Manager', status: 'Present', checkIn: '09:00 AM', location: 'Office - HQ', avatarColor: 'bg-blue-100 text-blue-700', phone: '+91 98765 43210' },
  { id: '2', name: 'Mike Ross', role: 'Field Technician', status: 'On Field', checkIn: '08:30 AM', location: 'Apollo Hospital, City Center', avatarColor: 'bg-green-100 text-green-700', phone: '+91 98765 43211' },
  { id: '3', name: 'Sarah Jenkins', role: 'Service Engineer', status: 'On Field', checkIn: '09:15 AM', location: 'Westview Clinic', avatarColor: 'bg-purple-100 text-purple-700', phone: '+91 98765 43212' },
  { id: '4', name: 'Priya Patel', role: 'HR Executive', status: 'Remote', checkIn: '09:05 AM', location: 'Home Office', avatarColor: 'bg-pink-100 text-pink-700', phone: '+91 98765 43213' },
  { id: '5', name: 'David Kim', role: 'Logistics', status: 'Absent', checkIn: '--', location: '--', avatarColor: 'bg-slate-100 text-slate-700' },
  { id: '6', name: 'Arjun Singh', role: 'Sales Executive', status: 'Leave', checkIn: '--', location: 'On Leave', avatarColor: 'bg-orange-100 text-orange-700' },
];

type WorkMode = 'Office' | 'Field' | 'Remote';

interface AttendanceModuleProps {
    tasks: Task[];
    currentUser: string;
    userRole: 'Admin' | 'Employee';
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ tasks, currentUser, userRole }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // State for accumulated time calculation
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [checkInTimeStr, setCheckInTimeStr] = useState<string>('--:--');

  const [workMode, setWorkMode] = useState<WorkMode>('Office');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Constants
  const REQUIRED_OFFICE_HOURS = 7;

  // Field Staff Logic: Tasks for Today
  const myTasksToday = tasks.filter(t => t.assignedTo === currentUser);
  const pendingTasks = myTasksToday.filter(t => t.status !== 'Done');
  const completedTasks = myTasksToday.filter(t => t.status === 'Done');
  
  const taskCompletionPercentage = myTasksToday.length > 0 
    ? Math.round((completedTasks.length / myTasksToday.length) * 100) 
    : 100;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper: Calculate duration for other staff based on simple string check-in
  const calculateStaffDuration = (checkInStr: string | null) => {
      if (!checkInStr || checkInStr === '--') return '--';
      
      const timeMatch = checkInStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) return '--';

      let [_, hoursStr, minsStr, modifier] = timeMatch;
      let hours = parseInt(hoursStr);
      const minutes = parseInt(minsStr);
      modifier = modifier.toUpperCase();

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const checkInDate = new Date(currentTime);
      checkInDate.setHours(hours, minutes, 0, 0);

      // Handle edge case where check-in looks like it's in future due to clock sync/mock data issues
      if (checkInDate > currentTime) return '0h 0m';

      const diffMs = currentTime.getTime() - checkInDate.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${diffHrs}h ${diffMins}m`;
  };

  // Helper: Calculate precise duration for current user
  const getTotalWorkedMs = () => {
      let currentSessionMs = 0;
      if (isCheckedIn && sessionStartTime) {
          currentSessionMs = currentTime.getTime() - sessionStartTime.getTime();
      }
      return accumulatedMs + currentSessionMs;
  };

  const formatDuration = (ms: number) => {
      if (ms < 0) ms = 0;
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
  };

  const totalWorkedMs = getTotalWorkedMs();
  const totalWorkedHours = totalWorkedMs / (1000 * 60 * 60);
  
  // Logic rules for finishing the day
  // Office: Must work 7 hours to "Confirm". Before that, it's just "Check Out (Pause)".
  // Field: Must complete all tasks to "Confirm". Before that, it's just "Check Out (Pause)".
  const isOfficeHoursComplete = totalWorkedHours >= REQUIRED_OFFICE_HOURS;
  
  const canConfirmAttendance = workMode === 'Field' 
    ? pendingTasks.length === 0 
    : isOfficeHoursComplete;

  const handleCheckInOut = () => {
    // If currently checked in, we are either "Pausing" (Break) or "Confirming" (Done)
    if (isCheckedIn) {
        // Calculate session time to add to total
        const currentSessionMs = currentTime.getTime() - (sessionStartTime?.getTime() || currentTime.getTime());
        setAccumulatedMs(prev => prev + currentSessionMs);
        setSessionStartTime(null);
        setIsCheckedIn(false);
        setLocationCoords(null);
        setGeoError(null);

        if (canConfirmAttendance) {
             alert(`Attendance Confirmed! Total Worked: ${formatDuration(accumulatedMs + currentSessionMs)}.`);
             // Here you would typically send the final log to the backend
             // Reset for next day simulation if needed, or keep as "Done" state
        }
    } else {
      // Checking In (Starting/Resuming)
      if (workMode === 'Field') {
        setIsGettingLocation(true);
        setGeoError(null);

        if (!navigator.geolocation) {
            setGeoError("Geolocation is not supported");
            setIsGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocationCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                performCheckIn();
                setIsGettingLocation(false);
            },
            (error) => {
                setGeoError("GPS Signal Lost. Try again.");
                setIsGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        performCheckIn();
      }
    }
  };

  const performCheckIn = () => {
      setIsCheckedIn(true);
      setSessionStartTime(new Date());
      setCheckInTimeStr(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Present': return 'bg-green-100 text-green-700 border-green-200';
      case 'On Field': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Remote': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Absent': return 'bg-red-50 text-red-600 border-red-100';
      case 'Leave': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getModeIcon = (mode: WorkMode) => {
    switch (mode) {
        case 'Office': return <Building2 size={16} />;
        case 'Field': return <MapPin size={16} />;
        case 'Remote': return <Home size={16} />;
    }
  };

  const filteredEmployees = filterStatus === 'All' 
    ? MOCK_EMPLOYEES 
    : MOCK_EMPLOYEES.filter(e => e.status === filterStatus);

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Field Staff Progress Banner */}
      {workMode === 'Field' && isCheckedIn && (
         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 shrink-0 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                    <CheckSquare size={18} /> Field Task Progress
                </h4>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg border border-blue-100 text-indigo-600">
                    {completedTasks.length} / {myTasksToday.length} Completed
                </span>
            </div>
            <div className="w-full bg-white rounded-full h-2.5 mb-2 border border-blue-100">
                <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${taskCompletionPercentage}%` }}></div>
            </div>
            <p className="text-xs text-indigo-700/70">
                {pendingTasks.length > 0 
                    ? `Complete ${pendingTasks.length} more tasks to confirm attendance.` 
                    : "All tasks completed! You can now confirm your daily attendance."}
            </p>
         </div>
      )}

      {/* Office Staff Progress Banner */}
      {workMode === 'Office' && (isCheckedIn || accumulatedMs > 0) && (
         <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-5 shrink-0 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                    <Clock size={18} /> Daily Work Hours
                </h4>
                <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg border border-emerald-100 text-emerald-600">
                    {formatDuration(totalWorkedMs)} / {REQUIRED_OFFICE_HOURS}h Goal
                </span>
            </div>
            <div className="w-full bg-white rounded-full h-2.5 mb-2 border border-emerald-100 overflow-hidden">
                <div 
                    className={`h-2 rounded-full transition-all duration-500 ${isOfficeHoursComplete ? 'bg-emerald-500' : 'bg-emerald-400'}`} 
                    style={{ width: `${Math.min((totalWorkedHours / REQUIRED_OFFICE_HOURS) * 100, 100)}%` }}
                ></div>
            </div>
            <p className="text-xs text-emerald-700/70">
                {!isOfficeHoursComplete 
                    ? `Work ${formatDuration((REQUIRED_OFFICE_HOURS * 3600000) - totalWorkedMs)} more to complete your day.` 
                    : "You have completed your required hours. You can now confirm attendance."}
            </p>
         </div>
      )}
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Staff</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">24</h3>
            </div>
            <div className="bg-slate-100 p-3 rounded-2xl text-slate-600 shadow-sm">
                <User size={20} />
            </div>
        </div>
        <div className="bg-gradient-to-br from-white to-green-50 p-5 rounded-3xl border border-green-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Present</p>
                <h3 className="text-2xl font-black text-green-600 mt-1">14</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-2xl text-green-600 shadow-sm">
                <Building2 size={20} />
            </div>
        </div>
        <div className="bg-gradient-to-br from-white to-blue-50 p-5 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">On Field</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">5</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-sm">
                <Navigation size={20} />
            </div>
        </div>
        <div className="bg-gradient-to-br from-white to-purple-50 p-5 rounded-3xl border border-purple-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Remote</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">4</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-2xl text-purple-600 shadow-sm">
                <Home size={20} />
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:overflow-hidden lg:min-h-0">
        
        {/* Check-In/Out Widget */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
            <div className="bg-white rounded-3xl shadow-lg shadow-slate-200 border border-slate-100 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-full h-1.5 ${isCheckedIn ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-slate-200'}`}></div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-1">My Attendance</h3>
                <p className="text-slate-400 text-xs font-medium mb-8">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                
                <div className="mb-8 relative">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Time</p>
                    <div className="text-5xl font-black text-slate-800 tracking-tight font-mono">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-xl text-slate-400 ml-1">{currentTime.toLocaleTimeString([], { second: '2-digit' }).slice(-2)}</span>
                    </div>
                    {/* Live Worked Hours Display */}
                    <div className="mt-4 flex flex-col items-center justify-center animate-in fade-in">
                         <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-2 rounded-2xl font-black text-xl shadow-sm border border-emerald-100">
                             <Timer size={22} className="text-emerald-500" />
                             <span>{formatDuration(totalWorkedMs)}</span>
                         </div>
                         <span className="text-[10px] font-bold text-emerald-500/70 mt-1 uppercase tracking-wider">Worked Today</span>
                    </div>
                </div>

                {/* Work Mode Selector */}
                {!isCheckedIn && accumulatedMs === 0 && (
                    <div className="w-full mb-8">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block text-center tracking-widest">Select Work Mode</label>
                        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                            {(['Office', 'Field', 'Remote'] as WorkMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setWorkMode(mode)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                                        workMode === mode 
                                            ? 'bg-white text-medical-600 shadow-md shadow-slate-200 ring-1 ring-slate-100' 
                                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                >
                                    {getModeIcon(mode)} {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Box */}
                <div className={`bg-slate-50/50 rounded-2xl p-4 w-full mb-6 flex items-center justify-between border ${geoError ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
                    <div className="text-left">
                        <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${geoError ? 'text-red-500' : 'text-slate-400'}`}>
                            {geoError ? 'Error' : 'Current Status'}
                        </p>
                        
                        {geoError ? (
                            <div className="text-red-700 text-xs font-bold flex items-center gap-1">
                                <AlertCircle size={14} /> {geoError}
                            </div>
                        ) : (
                            <div className={`font-bold text-sm flex items-center gap-2 ${isCheckedIn ? 'text-green-600' : 'text-slate-500'}`}>
                                {isCheckedIn ? (
                                    <>
                                        {getModeIcon(workMode)}
                                        <span>Checked In</span>
                                    </>
                                ) : (
                                    'Not Checked In'
                                )}
                            </div>
                        )}
                    </div>
                    
                    {!geoError && isCheckedIn && (
                        <div className="text-right">
                             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Start Time</p>
                             <div className="text-[10px] font-bold text-slate-600 mt-1 font-mono">{checkInTimeStr}</div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleCheckInOut}
                    disabled={isGettingLocation || (isCheckedIn && !canConfirmAttendance && workMode === 'Field')}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 text-sm uppercase tracking-wide shadow-lg ${
                        isCheckedIn 
                            ? canConfirmAttendance
                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-green-500/30'
                                : 'bg-white text-orange-500 hover:bg-orange-50 border-2 border-orange-100 shadow-orange-100' 
                            : 'bg-gradient-to-r from-medical-600 to-teal-500 text-white hover:shadow-medical-500/30 border-2 border-transparent disabled:opacity-70 disabled:cursor-not-allowed'
                    }`}
                >
                    {isGettingLocation ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Acquiring GPS...
                        </>
                    ) : isCheckedIn ? (
                         canConfirmAttendance ? (
                            <>
                                <CheckCircle size={20} /> Confirm Attendance (End Day)
                            </>
                         ) : (
                            <>
                                <PauseCircle size={20} /> Check Out (Pause/Break)
                            </>
                         )
                    ) : (
                        <>
                            <Clock size={20} /> {accumulatedMs > 0 ? 'Resume Work' : 'Check In Now'}
                        </>
                    )}
                </button>
            </div>

            {/* Field Map / Location Info */}
            {workMode === 'Field' || workMode === 'Office' ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex-1 flex flex-col min-h-[250px]">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm">
                            <MapPin size={18} className="text-medical-600" /> 
                            {workMode === 'Field' ? 'GPS Location Tracking' : 'Office Location'}
                        </span>
                        {locationCoords && (
                            <a href={`https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 flex items-center gap-1 transition-colors">
                                Open Map <ExternalLink size={10} />
                            </a>
                        )}
                    </h4>
                    
                    <div className="flex-1 bg-slate-100/50 rounded-2xl border border-slate-200 relative flex items-center justify-center overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center mix-blend-multiply"></div>
                        
                        {workMode === 'Field' && isCheckedIn && locationCoords ? (
                            <div className="z-10 text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 relative">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                                    <Navigation size={36} className="text-blue-600 relative z-10" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">Tracking Active</p>
                                <div className="text-xs text-slate-500 mt-2 font-mono bg-white shadow-sm border border-slate-100 px-3 py-1.5 rounded-lg inline-block">
                                    {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
                                </div>
                            </div>
                        ) : (
                            <div className="z-10 text-center px-4">
                                {isGettingLocation ? (
                                     <div className="flex flex-col items-center gap-3 text-medical-600">
                                        <div className="w-10 h-10 border-4 border-medical-200 border-t-medical-600 rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold uppercase tracking-wider">Triangulating satellites...</span>
                                     </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                            <Smartphone size={32} />
                                        </div>
                                        <p className="text-xs font-medium text-slate-500">
                                            {workMode === 'Field' 
                                                ? 'Check in to enable GPS tracking.' 
                                                : 'Location fixed to Office HQ.'}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                 <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex-1 flex flex-col justify-center items-center text-center min-h-[250px]">
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                        <Home size={36} className="text-purple-500" />
                    </div>
                    <h4 className="font-bold text-slate-800">Remote Work Active</h4>
                    <p className="text-xs font-medium text-slate-500 mt-2 max-w-[200px]">You are logged in remotely. Stay available on communication channels.</p>
                 </div>
            )}
        </div>

        {/* Team List / Grid */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-slate-800">Team Status</h3>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                         <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="List View">
                            <ListIcon size={16} />
                         </button>
                         <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Grid View">
                            <LayoutGrid size={16} />
                         </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    {['All', 'On Field', 'Present', 'Remote'].map(status => (
                        <button 
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                filterStatus === status 
                                ? 'bg-medical-50 text-medical-700 border border-medical-200' 
                                : 'text-slate-500 hover:text-slate-700 bg-white border border-slate-200'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/50 custom-scrollbar">
                {viewMode === 'list' ? (
                    <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Worked Hours</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm ${emp.avatarColor}`}>
                                                {emp.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{emp.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">ID: {emp.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{emp.role}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(emp.status)}`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs bg-slate-50 px-2 py-1 rounded-lg w-fit border border-slate-100">
                                            <Timer size={14} className="text-emerald-500" />
                                            {calculateStaffDuration(emp.checkIn)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                                            <MapPin size={14} className="text-slate-400" />
                                            <span className="truncate max-w-[150px]" title={emp.location}>{emp.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-medical-600 transition-colors">
                                            <Phone size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                        {filteredEmployees.map((emp) => (
                            <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-lg hover:border-medical-100 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base border-2 border-white shadow-md ${emp.avatarColor}`}>
                                            {emp.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 leading-tight">{emp.name}</div>
                                            <div className="text-xs text-slate-500 font-medium">{emp.role}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(emp.status)}`}>
                                        {emp.status}
                                    </span>
                                </div>
                                
                                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Clock size={14} className="text-slate-400" />
                                        <span>In: <span className="font-bold text-slate-800">{emp.checkIn}</span></span>
                                        {emp.checkIn !== '--' && (
                                            <span className="text-[10px] bg-white text-emerald-700 px-1.5 py-0.5 rounded ml-auto font-bold border border-slate-200 flex items-center gap-1 shadow-sm">
                                                <Timer size={10} /> {calculateStaffDuration(emp.checkIn)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span className="truncate font-medium">{emp.location}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <a href={`tel:${emp.phone}`} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-medical-600 hover:border-medical-200 flex items-center justify-center gap-1.5 transition-colors">
                                        <Phone size={14} /> Call
                                    </a>
                                    <button className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-medical-600 hover:border-medical-200 flex items-center justify-center gap-1.5 transition-colors">
                                        <Mail size={14} /> Message
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
