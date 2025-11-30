import React, { useState, useEffect } from 'react';
import { Clock, MapPin, User, CheckCircle, XCircle, Smartphone, Navigation, Building2, Home, AlertCircle, ExternalLink, LayoutGrid, List as ListIcon, Phone, Mail, CheckSquare } from 'lucide-react';
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
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ tasks, currentUser }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode>('Office');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Check for blocking tasks
  const blockingTasks = tasks.filter(t => t.assignedTo === currentUser && t.status === 'To Do');
  const hasPendingTasks = blockingTasks.length > 0;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckInOut = () => {
    if (hasPendingTasks && !isCheckedIn) {
        // Prevent checkin
        return;
    }

    if (isCheckedIn) {
      setIsCheckedIn(false);
      setCheckInTime(null);
      setLocationCoords(null);
      setGeoError(null);
    } else {
      if (workMode === 'Field') {
        setIsGettingLocation(true);
        setGeoError(null);

        if (!navigator.geolocation) {
            setGeoError("Geolocation is not supported by your browser");
            setIsGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocationCoords({ lat: latitude, lng: longitude });
                performCheckIn();
                setIsGettingLocation(false);
            },
            (error) => {
                let msg = "Unable to retrieve location.";
                if (error.code === 1) msg = "Location permission denied. Please enable GPS.";
                else if (error.code === 2) msg = "Position unavailable. Check your GPS signal.";
                else if (error.code === 3) msg = "GPS timeout. Try again.";
                setGeoError(msg);
                setIsGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      } else {
        performCheckIn();
      }
    }
  };

  const performCheckIn = () => {
      setIsCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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
      
      {/* Pending Tasks Warning Banner */}
      {hasPendingTasks && !isCheckedIn && (
        <div className="bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-4 shrink-0 shadow-sm animate-in slide-in-from-top-2">
            <div className="bg-indigo-100 p-2.5 rounded-full text-indigo-600 shrink-0">
                <CheckSquare size={20} />
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-indigo-900">Task Review Required</h4>
                <p className="text-sm text-indigo-700/80">
                    You have <span className="font-bold">{blockingTasks.length} pending task(s)</span> assigned to you. 
                    Please mark them as 'In Progress' or 'Done' in the Task Manager to unlock daily attendance.
                </p>
            </div>
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
                <div className={`absolute top-0 left-0 w-full h-1.5 ${isCheckedIn ? 'bg-gradient-to-r from-green-400 to-emerald-500' : hasPendingTasks ? 'bg-slate-300' : 'bg-slate-200'}`}></div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-1">My Attendance</h3>
                <p className="text-slate-400 text-xs font-medium mb-8">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                
                <div className="mb-8 relative">
                    <div className="text-5xl font-black text-slate-800 tracking-tight font-mono">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-xl text-slate-400 ml-1">{currentTime.toLocaleTimeString([], { second: '2-digit' }).slice(-2)}</span>
                    </div>
                </div>

                {/* Work Mode Selector */}
                {!isCheckedIn && (
                    <div className="w-full mb-8">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block text-center tracking-widest">Select Work Mode</label>
                        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                            {(['Office', 'Field', 'Remote'] as WorkMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setWorkMode(mode)}
                                    disabled={hasPendingTasks}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                                        workMode === mode 
                                            ? 'bg-white text-medical-600 shadow-md shadow-slate-200 ring-1 ring-slate-100' 
                                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                    } ${hasPendingTasks ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            {geoError ? 'Check-in Error' : 'Current Status'}
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
                                        <span>Checked In ({workMode})</span>
                                    </>
                                ) : (
                                    'Not Checked In'
                                )}
                            </div>
                        )}
                    </div>
                    {isCheckedIn && !geoError && (
                        <div className="text-right">
                             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Time</p>
                             <p className="font-bold text-slate-800">{checkInTime}</p>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleCheckInOut}
                    disabled={isGettingLocation || (hasPendingTasks && !isCheckedIn)}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 text-sm uppercase tracking-wide shadow-lg ${
                        hasPendingTasks && !isCheckedIn
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border-2 border-slate-100'
                        : isCheckedIn 
                            ? 'bg-white text-red-500 hover:bg-red-50 border-2 border-red-100 shadow-red-100' 
                            : 'bg-gradient-to-r from-medical-600 to-teal-500 text-white hover:shadow-medical-500/30 border-2 border-transparent disabled:opacity-70 disabled:cursor-not-allowed'
                    }`}
                >
                    {isGettingLocation ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Acquiring GPS...
                        </>
                    ) : hasPendingTasks && !isCheckedIn ? (
                        <>
                            <CheckSquare size={20} /> Tasks Pending
                        </>
                    ) : isCheckedIn ? (
                        <>
                            <XCircle size={20} /> Check Out
                        </>
                    ) : (
                        <>
                            <Clock size={20} /> Check In Now
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