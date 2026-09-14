import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Centralized Axios Instance
const api = axios.create({
  baseURL: 'https://health-access-system-2.onrender.com/api',
  withCredentials: true,
});

const PREDEFINED_DEPARTMENTS = [
  { name: 'Cardiology', description: 'Heart and cardiovascular system care' },
  { name: 'Neurology', description: 'Brain, spinal cord, and nervous system treatment' },
  { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents' },
  { name: 'Orthopedics', description: 'Bone, joint, and musculoskeletal system care' },
  { name: 'General Medicine', description: 'Primary healthcare and general adult illness treatment' },
  { name: 'Dermatology', description: 'Skin, hair, and nail conditions treatment' },
  { name: 'Gynaecology & Obstetrics', description: 'Women health, pregnancy, and childbirth care' },
  { name: 'ENT (Ear, Nose, Throat)', description: 'Otolaryngology and neck conditions' },
  { name: 'Ophthalmology', description: 'Eye and vision care' },
  { name: 'Gastroenterology', description: 'Digestive system and stomach health' },
  { name: 'Psychiatry', description: 'Mental health and behavioral health services' },
  { name: 'Urology', description: 'Urinary tract and male reproductive system care' },
  { name: 'Custom Department', description: '' },
];

// Helper to format 24h time ("14:30") or date strings into 12h AM/PM format
const formatAppointmentTime = (timeStr) => {
  if (!timeStr) return 'N/A';

  const parts = String(timeStr).split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes.padStart(2, '0')} ${ampm}`;
    }
  }

  const dateObj = new Date(timeStr);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return timeStr;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);

  // UI Loading & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorDeptFilter, setDoctorDeptFilter] = useState('ALL');

  // Form States
  const [selectedPredefinedDept, setSelectedPredefinedDept] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [docName, setDocName] = useState('');
  const [docSpec, setDocSpec] = useState('');
  const [docDeptId, setDocDeptId] = useState('');

  const fetchStructure = useCallback(async (hospitalId) => {
    try {
      const res = await api.get(`/hospitals/${hospitalId}/structure`);
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch hospital structure', err);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get('/hospital/appointments');
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    }
  }, []);

  // Poll profile state so approval updates instantly without hard refreshing or logging out
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/me');
      const userHospital = res.data.user || res.data;
      setHospital(userHospital);
      if (userHospital?.hospital_id) {
        fetchStructure(userHospital.hospital_id);
        fetchAppointments();
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  }, [fetchStructure, fetchAppointments]);

  useEffect(() => {
    api.get('/me')
      .then((res) => {
        const userHospital = res.data.user || res.data;
        setHospital(userHospital);
        if (userHospital?.hospital_id) {
          fetchStructure(userHospital.hospital_id);
          fetchAppointments();
        }
      })
      .catch(() => navigate('/'));

    // Poll every 5 seconds to sync approval status instantly when admin clicks approve
    const interval = setInterval(fetchProfile, 5000);
    return () => clearInterval(interval);
  }, [navigate, fetchStructure, fetchAppointments, fetchProfile]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handlePredefinedDeptChange = (e) => {
    const value = e.target.value;
    setSelectedPredefinedDept(value);

    if (value === 'Custom Department' || value === '') {
      setDeptName('');
      setDeptDesc('');
    } else {
      const match = PREDEFINED_DEPARTMENTS.find((d) => d.name === value);
      if (match) {
        setDeptName(match.name);
        setDeptDesc(match.description);
      }
    }
  };

  // Bulletproof approval evaluation handling booleans, numbers, and strings
  const isApproved = useMemo(() => {
    if (!hospital) return false;
    const val = hospital.is_approved;
    return (
      val === true ||
      val === 1 ||
      val === '1' ||
      val === 'true' ||
      val === 't' ||
      hospital.status === 'approved'
    );
  }, [hospital]);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!isApproved) {
      setFeedback({ type: 'error', message: 'Account pending approval. You cannot add departments yet.' });
      return;
    }
    if (!deptName.trim()) return;
    setIsSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.post('/departments', { name: deptName, description: deptDesc });
      setDeptName('');
      setDeptDesc('');
      setSelectedPredefinedDept('');
      await fetchStructure(hospital.hospital_id);
      setFeedback({ type: 'success', message: 'Department added successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to add department.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!isApproved) {
      setFeedback({ type: 'error', message: 'Account pending approval. You cannot register doctors yet.' });
      return;
    }
    if (!docDeptId || !docName.trim()) return;
    setIsSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.post('/doctors', {
        department_id: docDeptId,
        name: docName,
        specialization: docSpec,
      });
      setDocName('');
      setDocSpec('');
      setDocDeptId('');
      await fetchStructure(hospital.hospital_id);
      setFeedback({ type: 'success', message: 'Doctor registered successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to add doctor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived Doctor List
  const allDoctors = useMemo(() => {
    return departments.flatMap((dept) =>
      Array.isArray(dept.doctors)
        ? dept.doctors.map((doc) => ({
            ...doc,
            department_name: dept.name,
            department_id: dept.department_id,
          }))
        : []
    );
  }, [departments]);

  // Analytics Metrics
  const totalAppointments = appointments.length;
  const paidAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        const status = a.payment_status?.toLowerCase();
        return status === 'paid' || status === 'completed';
      }),
    [appointments]
  );

  const totalRevenue = useMemo(
    () => paidAppointments.reduce((sum, a) => sum + Number(a.amount || a.fee || 0), 0),
    [paidAppointments]
  );

  const getPatientCountForDept = (deptNameToCheck) => {
    if (!deptNameToCheck) return 0;
    return appointments.filter((app) => {
      const appDept = app.department_name || app.department || app.name;
      return appDept?.toLowerCase() === deptNameToCheck.toLowerCase();
    }).length;
  };

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return appointments.filter((app) => {
      const deptField = app.department_name || app.department || app.name;
      const matchesSearch =
        !query ||
        app.patient_name?.toLowerCase().includes(query) ||
        app.patient_phone?.toLowerCase().includes(query) ||
        deptField?.toLowerCase().includes(query);

      const status = app.payment_status?.toLowerCase() || 'pending';
      const isPaid = status === 'paid' || status === 'completed';
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && isPaid) ||
        (statusFilter === 'PENDING' && !isPaid);

      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  const filteredDoctors = useMemo(() => {
    const query = doctorSearch.toLowerCase().trim();
    return allDoctors.filter((doc) => {
      const matchesSearch =
        !query ||
        doc.name?.toLowerCase().includes(query) ||
        doc.specialization?.toLowerCase().includes(query);

      const matchesDept =
        doctorDeptFilter === 'ALL' ||
        String(doc.department_id) === String(doctorDeptFilter);

      return matchesSearch && matchesDept;
    });
  }, [allDoctors, doctorSearch, doctorDeptFilter]);

  if (!hospital) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 bg-slate-800 px-6 py-4 rounded-2xl shadow-2xl border border-slate-700">
          <div className="w-4 h-4 bg-emerald-400 rounded-full animate-ping"></div>
          <span className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase">
            Loading Hospital Portal...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Feedback Alert Bar */}
        {feedback.message && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold border flex justify-between items-center ${
              feedback.type === 'error'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback({ type: '', message: '' })} className="cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* NOTIFICATION BANNER IF NOT APPROVED */}
        {!isApproved && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-300 font-semibold">
            <span>⚠️ Your hospital account is currently pending administrative verification and approval. Adding departments and doctors is restricted until approved.</span>
            <span className="px-2.5 py-1 bg-amber-500/20 rounded-lg uppercase tracking-wider font-extrabold text-[10px]">Pending Review</span>
          </div>
        )}

        {/* HEADER BAR */}
        <header className="bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-900/30">
              {hospital.name ? hospital.name.charAt(0).toUpperCase() : 'H'}
            </div>
            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {hospital.name}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HOSPITAL ADMIN
                </span>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  isApproved 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isApproved ? 'APPROVED' : 'PENDING APPROVAL'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span>📍 Location: <strong>{hospital.district || hospital.address || 'Nepal'}</strong></span>
                <span>•</span>
                <span>ID: <strong className="font-mono text-emerald-400">{hospital.hospital_id}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'appointments'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Appointments
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'departments'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Depts ({departments.length})
              </button>
              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'doctors'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Doctors ({allDoctors.length})
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-slate-700/60 hover:bg-rose-600/80 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* STATS SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Appointments
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {totalAppointments}
            </span>
          </div>

          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Confirmed Paid
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {paidAppointments.length}
            </span>
          </div>

          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Departments
            </span>
            <span className="text-2xl font-black text-teal-300 mt-1 block">
              {departments.length}
            </span>
          </div>

          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Estimated Revenue
            </span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              NPR {totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* MAIN CONTENT PANELS */}
        <main>
          {/* TAB 1: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="bg-slate-800/90 p-6 rounded-3xl border border-slate-700/80 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Reception Desk & Desk Inquiries
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Filter and check incoming patient tickets instantly.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-36 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PAID">Paid / Confirmed</option>
                    <option value="PENDING">Pending</option>
                  </select>

                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search patient, phone, dept..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Patient Details</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">Doctor</th>
                      <th className="p-3.5">Booked Date & Time Slot</th>
                      <th className="p-3.5 text-right">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 text-slate-300">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">
                          {searchQuery || statusFilter !== 'ALL'
                            ? 'No appointments matching current filters.'
                            : 'No registered appointments yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((app) => {
                        const status = app.payment_status?.toLowerCase();
                        const isPaid = status === 'paid' || status === 'completed';

                        return (
                          <tr key={app.appointment_id || app.id} className="hover:bg-slate-700/40 transition">
                            <td className="p-3.5 font-bold text-white">
                              {app.patient_name}
                              <br />
                              <span className="text-[10px] text-emerald-400 font-mono font-normal">
                                📞 {app.patient_phone}
                              </span>
                            </td>
                            <td className="p-3.5 font-medium">{app.department_name || app.department || app.name || 'N/A'}</td>
                            <td className="p-3.5 font-medium">
                              {app.doctor_name || <span className="text-slate-500 italic">General Duty</span>}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-semibold text-white">
                                {app.appointment_date || 'N/A'}
                              </span>
                              <span className="text-slate-400 text-[11px] ml-1.5 font-medium">
                                @ {formatAppointmentTime(app.appointment_time)}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                  isPaid
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {isPaid ? `PAID (NPR ${app.amount || app.fee || 500})` : 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="bg-slate-800/90 p-6 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Add New Department
                </h2>

                {!isApproved ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    Account approval is required before adding departments.
                  </div>
                ) : (
                  <form onSubmit={handleAddDepartment} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Quick Select Standard Department
                      </label>
                      <select
                        value={selectedPredefinedDept}
                        onChange={handlePredefinedDeptChange}
                        className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose standard department or custom --</option>
                        {PREDEFINED_DEPARTMENTS.map((dept, idx) => (
                          <option key={idx} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          Department Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Cardiology"
                          required
                          value={deptName}
                          onChange={(e) => setDeptName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          Overview / Specialization Notes
                        </label>
                        <input
                          type="text"
                          placeholder="Short overview"
                          value={deptDesc}
                          onChange={(e) => setDeptDesc(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Department'}
                    </button>
                  </form>
                )}
              </div>

              {/* Active Departments Display */}
              <div className="bg-slate-800/90 p-6 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Configured Departments
                  </h2>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                    {departments.length} Active
                  </span>
                </div>

                {departments.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-xs font-medium">
                    No departments added yet. Use the quick selector above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((dept) => {
                      const count = getPatientCountForDept(dept.name);
                      return (
                        <div
                          key={dept.department_id}
                          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/80 space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-white text-sm">{dept.name}</h3>
                              <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-md border border-slate-700">
                                ID: {dept.department_id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {dept.description || 'General specialized department.'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-semibold">Scheduled Patients:</span>
                            <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {count} {count === 1 ? 'Patient' : 'Patients'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DOCTORS */}
          {activeTab === 'doctors' && (
            <div className="space-y-6">
              <div className="bg-slate-800/90 p-6 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Register Doctor to Department
                </h2>

                {!isApproved ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    Account approval is required before registering doctors.
                  </div>
                ) : (
                  <form onSubmit={handleAddDoctor} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <select
                      required
                      value={docDeptId}
                      onChange={(e) => setDocDeptId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.department_id} value={d.department_id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Doctor Full Name"
                      required
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Specialization (e.g. Senior Surgeon)"
                      value={docSpec}
                      onChange={(e) => setDocSpec(e.target.value)}
                      className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 text-slate-950 font-extrabold px-4 py-3 rounded-xl shadow-lg shadow-teal-500/20 active:scale-95 transition cursor-pointer"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Doctor'}
                    </button>
                  </form>
                )}
              </div>

              {/* Roster & Doctors List */}
              <div className="bg-slate-800/90 p-6 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Medical Roster & Doctors
                  </h2>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <select
                      value={doctorDeptFilter}
                      onChange={(e) => setDoctorDeptFilter(e.target.value)}
                      className="w-full sm:w-44 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.department_id} value={d.department_id}>
                          {d.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Search doctor or spec..."
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      className="w-full sm:w-56 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {filteredDoctors.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-xs font-medium">
                    No doctors match the specified criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    {filteredDoctors.map((doc, idx) => (
                      <div
                        key={doc.doctor_id || idx}
                        className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/80 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-white text-sm">{doc.name}</h3>
                          <span className="text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500/30">
                            {doc.department_name}
                          </span>
                        </div>
                        <p className="text-slate-400">
                          <strong>Specialization:</strong> {doc.specialization || 'General Specialist'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;