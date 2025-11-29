
import React, { useState, useEffect } from 'react';
import { Clock, MapPin, User, CheckCircle, XCircle, Smartphone, Navigation, Building2, Home, AlertCircle, ExternalLink, LayoutGrid, List as ListIcon, Phone, Mail } from 'lucide-react';

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

export const AttendanceModule: React.FC = () => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [workMode, setWorkMode] = useState<WorkMode>('Office');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  // GPS State
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckInOut = () => {
    if (isCheckedIn) {
      // Check Out Logic
      setIsCheckedIn(false);
      setCheckInTime(null);
      setLocationCoords(null);
      setGeoError(null);
    } else {
      // Check In Logic
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
                console.error("GPS Error: ", error);
                let msg = "Unable to retrieve location.";
                if (error.code === 1) msg = "Location permission denied. Please enable GPS.";
                else if (error.code === 2) msg = "Position unavailable. Check your GPS signal.";
                else if (error.code === 3) msg = "GPS timeout. Try again.";
                
                setGeoError(msg);
                setIsGettingLocation(false);
                // We prevent check-in if GPS is mandatory for Field work
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      } else {
        // Office or Remote check-in (GPS optional)
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
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-1">
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Total Staff</p>
                <h3 className="text-2xl font-bold text-slate-800">24</h3>
            </div>
            <div className="bg-slate-100 p-3 rounded-full text-slate-600">
                <User size={20} />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Present (Office)</p>
                <h3 className="text-2xl font-bold text-green-600">14</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full text-green-600">
                <Building2 size={20} />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">On Field Site</p>
                <h3 className="text-2xl font-bold text-blue-600">5</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <Navigation size={20} />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Remote / WFH</p>
                <h3 className="text-2xl font-bold text-purple-600">4</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                <Home size={20} />
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:overflow-hidden lg:min-h-0">
        
        {/* Check-In/Out Widget */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${isCheckedIn ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                
                <h3 className="text-lg font-semibold text-slate-800 mb-1">My Attendance</h3>
                <p className="text-slate-500 text-sm mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                
                <div className="mb-6">
                    <div className="text-4xl font-mono font-bold text-slate-800 tracking-wider">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>

                {/* Work Mode Selector */}
                {!isCheckedIn && (
                    <div className="w-full mb-6">
                        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block text-left">Select Work Mode</label>
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            {(['Office', 'Field', 'Remote'] as WorkMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setWorkMode(mode)}
                                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${
                                        workMode === mode 
                                            ? 'bg-white text-medical-600 shadow-sm ring-1 ring-slate-200' 
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }`}
                                >
                                    {getModeIcon(mode)} {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Box */}
                <div className={`bg-slate-50 rounded-lg p-4 w-full mb-4 flex items-center justify-between border ${geoError ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
                    <div className="text-left w-full">
                        <p className={`text-xs uppercase font-semibold mb-1 ${geoError ? 'text-red-600' : 'text-slate-500'}`}>
                            {geoError ? 'Check-in Error' : 'Status'}
                        </p>
                        
                        {geoError ? (
                            <div className="text-red-700 text-sm font-medium flex items-start gap-2">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                {geoError}
                            </div>
                        ) : (
                            <div className={`font-medium flex items-center gap-1.5 ${isCheckedIn ? 'text-green-600' : 'text-slate-500'}`}>
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
                        <div className="text-right shrink-0 ml-4">
                             <p className="text-xs text-slate-500 uppercase font-semibold">Time</p>
                             <p className="font-medium text-slate-800">{checkInTime}</p>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleCheckInOut}
                    disabled={isGettingLocation}
                    className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
                        isCheckedIn 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                        : 'bg-medical-600 text-white hover:bg-medical-700 shadow-lg shadow-medical-500/30'
                    }`}
                >
                    {isGettingLocation ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Acquiring GPS...
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex-1 flex flex-col min-h-[250px]">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <MapPin size={18} className="text-medical-600" /> 
                            {workMode === 'Field' ? 'GPS Location Tracking' : 'Office Location'}
                        </span>
                        {locationCoords && (
                            <a href={`https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                Open Map <ExternalLink size={12} />
                            </a>
                        )}
                    </h4>
                    
                    <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 relative flex items-center justify-center overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center"></div>
                        
                        {workMode === 'Field' && isCheckedIn && locationCoords ? (
                            <div className="z-10 text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                                    <Navigation size={32} className="text-blue-600" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">Tracking Active</p>
                                <div className="text-xs text-slate-500 mt-1 font-mono bg-white/80 px-2 py-1 rounded">
                                    {locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Updates every 5 mins</p>
                            </div>
                        ) : (
                            <div className="z-10 text-center px-4">
                                {isGettingLocation ? (
                                     <div className="flex flex-col items-center gap-2 text-medical-600">
                                        <div className="w-8 h-8 border-4 border-medical-200 border-t-medical-600 rounded-full animate-spin"></div>
                                        <span className="text-sm font-medium">Triangulating satellites...</span>
                                     </div>
                                ) : (
                                    <>
                                        <Smartphone size={32} className="mx-auto text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-500">
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
                 <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex-1 flex flex-col justify-center items-center text-center min-h-[250px]">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <Home size={32} className="text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-slate-800">Remote Work Active</h4>
                    <p className="text-sm text-slate-500 mt-2 max-w-[200px]">You are currently logged in for remote work. Ensure you are available on Teams/Slack.</p>
                 </div>
            )}
        </div>

        {/* Team List / Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col lg:overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">Team Status</h3>
                    <div className="flex bg-slate-100 rounded-lg p-1 ml-2">
                         <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="List View">
                            <ListIcon size={16} />
                         </button>
                         <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
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
                            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                                filterStatus === status 
                                ? 'bg-medical-50 text-medical-600 border border-medical-100' 
                                : 'text-slate-500 hover:text-slate-700 bg-slate-50 border border-transparent'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50">
                {viewMode === 'list' ? (
                    <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-slate-700">Employee</th>
                                <th className="px-6 py-3 font-semibold text-slate-700">Role</th>
                                <th className="px-6 py-3 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-3 font-semibold text-slate-700">Location</th>
                                <th className="px-6 py-3 font-semibold text-slate-700 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${emp.avatarColor}`}>
                                                {emp.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{emp.name}</div>
                                                <div className="text-xs text-slate-400">ID: {emp.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{emp.role}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(emp.status)}`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <MapPin size={14} className="text-slate-400" />
                                            <span className="truncate max-w-[150px]" title={emp.location}>{emp.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-medical-600 transition-colors">
                                            <Phone size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                        {filteredEmployees.map((emp) => (
                            <div key={emp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${emp.avatarColor}`}>
                                            {emp.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900 leading-tight">{emp.name}</div>
                                            <div className="text-xs text-slate-500">{emp.role}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(emp.status)}`}>
                                        {emp.status}
                                    </span>
                                </div>
                                
                                <div className="bg-slate-50 rounded-lg p-2 text-xs space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Clock size={14} className="text-slate-400" />
                                        <span>In: <span className="font-medium text-slate-800">{emp.checkIn}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <MapPin size={14} className="text-slate-400" />
                                        <span className="truncate">{emp.location}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <a href={`tel:${emp.phone}`} className="flex-1 bg-white border border-slate-200 text-slate-600 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 hover:text-medical-600 flex items-center justify-center gap-1 transition-colors">
                                        <Phone size={14} /> Call
                                    </a>
                                    <button className="flex-1 bg-white border border-slate-200 text-slate-600 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 hover:text-medical-600 flex items-center justify-center gap-1 transition-colors">
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