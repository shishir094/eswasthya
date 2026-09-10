import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

// 12-Hour AM/PM Helper
const formatTo12Hour = (time24) => {
  if (!time24) return '';
  if (time24.includes('AM') || time24.includes('PM')) return time24;

  const [hours, minutes] = time24.split(':');
  let h = parseInt(hours, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const formattedHours = String(h).padStart(2, '0');

  return `${formattedHours}:${minutes} ${period}`;
};

const TIME_SLOTS = [
  { label: '09:00 AM', value: '09:00' },
  { label: '09:30 AM', value: '09:30' },
  { label: '10:00 AM', value: '10:00' },
  { label: '10:30 AM', value: '10:30' },
  { label: '11:00 AM', value: '11:00' },
  { label: '11:30 AM', value: '11:30' },
  { label: '12:00 PM', value: '12:00' },
  { label: '12:30 PM', value: '12:30' },
  { label: '01:00 PM', value: '13:00' },
  { label: '01:30 PM', value: '13:30' },
  { label: '02:00 PM', value: '14:00' },
  { label: '02:30 PM', value: '14:30' },
  { label: '03:00 PM', value: '15:00' },
  { label: '03:30 PM', value: '15:30' },
  { label: '04:00 PM', value: '16:00' },
  { label: '04:30 PM', value: '16:30' },
  { label: '05:00 PM', value: '17:00' },
];

const MAX_SLOT_CAPACITY = 20;

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [userAppointments, setUserAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('hospitals');
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Modal & Selection States
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slotCounts, setSlotCounts] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');

  const [formData, setFormData] = useState({
    departmentId: '',
    doctorId: '',
    patientName: '',
    patientPhone: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });

  // Calculate available booking dates: Auto-releases today's slot after 5:00 PM (17:00)
  const getMinMaxDates = () => {
    const now = new Date();
    const currentHour = now.getHours();

    const startDate = new Date(now);
    if (currentHour >= 17) {
      startDate.setDate(now.getDate() + 1);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 2);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      minDate: formatDate(startDate),
      maxDate: formatDate(endDate),
    };
  };

  const { minDate, maxDate } = getMinMaxDates();

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchUserAppointments = async (userId) => {
    if (!userId) return;
    setLoadingAppointments(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/appointments/user/${userId}`,
        { headers: getAuthHeader() }
      );
      setUserAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch user appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchSlotCounts = useCallback(async (hospitalId, departmentId, date) => {
    if (!hospitalId || !departmentId || !date) {
      setSlotCounts({});
      return;
    }
    setLoadingSlots(true);
    try {
      const res = await axios.get('http://localhost:5000/api/appointments/slot-counts', {
        params: { hospital_id: hospitalId, department_id: departmentId, date },
        headers: getAuthHeader(),
      });
      setSlotCounts(res.data || {});
    } catch (err) {
      console.error('Failed to fetch slot counts:', err);
      setSlotCounts({});
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedHospital && formData.departmentId && formData.appointmentDate) {
      fetchSlotCounts(selectedHospital.hospital_id, formData.departmentId, formData.appointmentDate);
    }
  }, [selectedHospital, formData.departmentId, formData.appointmentDate, fetchSlotCounts]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setPaymentNotice('Payment successful! Your appointment is confirmed.');
      setBookingError('');
      setActiveTab('appointments');
      setSearchParams({});

      axios
        .get('http://localhost:5000/api/auth/me', {
          headers: getAuthHeader(),
          withCredentials: true,
        })
        .then((res) => {
          const userData = res.data.user || res.data;
          setUser(userData);
          const userId = userData?.id || userData?.user_id;
          if (userId) {
            fetchUserAppointments(userId);
          }
        });
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      setBookingError('Payment failed or was cancelled. Please try again.');
      setPaymentNotice('');
      setActiveTab('appointments');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/auth/me', {
        headers: getAuthHeader(),
        withCredentials: true,
      })
      .then((res) => {
        const userData = res.data.user || res.data;
        setUser(userData);
        const userId = userData?.id || userData?.user_id;
        if (userId) {
          fetchUserAppointments(userId);
        }
      })
      .catch((err) => console.error('Failed to fetch user profile:', err));

    fetchHospitals();
  }, []);

  const fetchHospitals = () => {
    axios
      .get('http://localhost:5000/api/list')
      .then((res) => setHospitals(res.data || []))
      .catch((err) => console.error(err));
  };

  const handleOpenModal = async (hospital) => {
    setSelectedHospital(hospital);
    setBookingError('');
    setSlotCounts({});
    setFormData({
      departmentId: '',
      doctorId: '',
      patientName: user?.name || user?.full_name || '',
      patientPhone: user?.phone || user?.phone_number || '',
      appointmentDate: minDate,
      appointmentTime: '',
      notes: '',
    });

    try {
      const res = await axios.get(
        `http://localhost:5000/api/hospitals/${hospital.hospital_id}/structure`
      );
      setDepartments(res.data.departments || []);
    } catch (err) {
      setBookingError('Failed to load hospital structure.');
    }
  };

  const handleDepartmentChange = (e) => {
    const depId = e.target.value;
    setFormData((prev) => ({ ...prev, departmentId: depId, doctorId: '', appointmentTime: '' }));
    const foundDep = departments.find((d) => d.department_id === parseInt(depId));
    setDoctors(foundDep ? foundDep.doctors || [] : []);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'appointmentDate') updated.appointmentTime = '';
      return updated;
    });
  };

  const submitEsewaForm = (url, params) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;

    Object.keys(params).forEach((key) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    const phoneRegex = /^(?:\+977)?9[78]\d{8}$/;
    if (!phoneRegex.test(formData.patientPhone.trim())) {
      setBookingError('Please enter a valid Nepali phone number (e.g., 98XXXXXXXX).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        hospital_id: selectedHospital.hospital_id,
        department_id: formData.departmentId,
        doctor_id: formData.doctorId || null,
        user_id: user?.id || user?.user_id,
        patient_name: formData.patientName,
        patient_phone: formData.patientPhone,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        notes: formData.notes,
      };

      const res = await axios.post(
        'http://localhost:5000/api/appointments',
        payload,
        { headers: getAuthHeader() }
      );

      if (res.data.esewaFormData && res.data.esewaPaymentUrl) {
        submitEsewaForm(res.data.esewaPaymentUrl, res.data.esewaFormData);
      }
    } catch (err) {
      setBookingError(
        err.response?.data?.message || 'Failed to initialize booking.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Profile Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl uppercase shadow-md shadow-indigo-100">
              {user?.name?.charAt(0) || user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900">
                  {user ? user.name || user.full_name || 'User Profile' : 'Loading Profile...'}
                </h1>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-100">
                  Patient Account
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 pt-1">
                <span>📧 <strong>Email:</strong> {user?.email || 'N/A'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Log Out
          </button>
        </div>

        {/* Banners */}
        {paymentNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs flex items-center gap-2">
            <span>✅</span> {paymentNotice}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'hospitals'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Find Hospitals & Book
          </button>
          <button
            onClick={() => {
              setActiveTab('appointments');
              const userId = user?.id || user?.user_id;
              if (userId) fetchUserAppointments(userId);
            }}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            My Appointments
            <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {userAppointments.length}
            </span>
          </button>
        </div>

        {/* TAB 1: Hospitals List with Expanded Details */}
        {activeTab === 'hospitals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hospitals.map((item) => (
              <div
                key={item.hospital_id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        📍 {item.municipality}, {item.district}, {item.province}
                      </p>
                    </div>
                    {item.hospital_type && (
                      <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                        {item.hospital_type}
                      </span>
                    )}
                  </div>

                  {/* Complete Details Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>📧 <strong>Email:</strong> {item.email || 'N/A'}</div>
                    <div>📞 <strong>Phone:</strong> {item.phone || 'N/A'}</div>
                    <div>🚨 <strong>Emergency:</strong> {item.emergency_contact || 'N/A'}</div>
                    <div>🛏️ <strong>Beds:</strong> {item.hospital_bed_capacity || 'N/A'} Capacity</div>
                  </div>

                  {/* Available Departments List */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Available Departments:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {item.departments && item.departments.length > 0 ? (
                        item.departments.map((d) => (
                          <span
                            key={d.department_id}
                            className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-indigo-100"
                          >
                            {d.department_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 font-italic">No departments listed</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenModal(item)}
                  className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer mt-2"
                >
                  Book Appointment (NPR 500)
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: User Appointments Dashboard (With AM/PM Time Formatting) */}
        {activeTab === 'appointments' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">My Paid Appointments</h2>

            {loadingAppointments ? (
              <p className="text-xs text-slate-500 py-4">Refreshing appointments...</p>
            ) : userAppointments.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  No active or upcoming appointments found.
                </p>
                <button
                  onClick={() => setActiveTab('hospitals')}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Browse hospitals & schedule a booking
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {userAppointments.map((app) => (
                  <div
                    key={app.appointment_id || app.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {app.hospital_name || 'Hospital'}
                        </span>
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          CONFIRMED & PAID
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Department:</span> {app.department_name}
                        {app.doctor_name && (
                          <span> | <span className="font-semibold">Doctor:</span> {app.doctor_name}</span>
                        )}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span>👤 Patient: <strong>{app.patient_name}</strong></span>
                        <span>📅 Date: <strong>{String(app.appointment_date).split('T')[0]}</strong></span>
                        <span>
                          ⏰ Time Slot: <strong>{app.appointment_time_formatted || formatTo12Hour(app.appointment_time)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                      <span className="text-xs text-slate-400 block">Amount Paid</span>
                      <span className="text-sm font-bold text-slate-900">NPR {app.amount || 500}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Booking Modal */}
      {selectedHospital && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Book Slot at {selectedHospital.name}
            </h3>

            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                ⚠️ {bookingError}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Department</label>
                <select
                  required
                  value={formData.departmentId}
                  onChange={handleDepartmentChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                >
                  <option value="">Choose Department</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name || d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Doctor (Optional)</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                >
                  <option value="">Any Available Doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      {doc.name} ({doc.specialization || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={formData.patientName}
                    onChange={handleInputChange}
                    name="patientName"
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.patientPhone}
                    onChange={handleInputChange}
                    name="patientPhone"
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Date</label>
                  <input
                    type="date"
                    required
                    min={minDate}
                    max={maxDate}
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                    name="appointmentDate"
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Time Slot</label>
                  <select
                    required
                    name="appointmentTime"
                    disabled={!formData.departmentId || loadingSlots}
                    value={formData.appointmentTime}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-300 font-medium disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.departmentId ? 'Select Department First' : 'Select Slot'}
                    </option>
                    {TIME_SLOTS.map((slot) => {
                      const booked = slotCounts[slot.value] || 0;
                      const remaining = MAX_SLOT_CAPACITY - booked;
                      const isFull = remaining <= 0;

                      return (
                        <option key={slot.value} value={slot.value} disabled={isFull}>
                          {slot.label} — {isFull ? 'FULL (0 left)' : `${remaining}/${MAX_SLOT_CAPACITY} left`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-semibold">Total Fee: NPR 500</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedHospital(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.appointmentTime}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Pay with eSewa'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;