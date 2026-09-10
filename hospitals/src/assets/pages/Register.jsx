import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate,Link } from 'react-router-dom';

const locationData = {
  'Koshi': ['Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga', 'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Tehrathum', 'Udayapur'],
  'Madhesh': ['Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha'],
  'Bagmati': ['Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok', 'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok'],
  'Gandaki': ['Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 'Nawalpur (Nawalparasi East)', 'Parbat', 'Syangja', 'Tanahu'],
  'Lumbini': ['Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Gulmi', 'Kapilvastu', 'Parasi (Nawalparasi West)', 'Palpa', 'Pyuthan', 'Rolpa', 'Rukum East', 'Rupandehi'],
  'Karnali': ['Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan', 'Surkhet', 'Rukum West'],
  'Sudurpashchim': ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur']
};

const HospitalForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    hospital_type: '', 
    hospital_bed_capacity: '',
    province: '',    
    district: '', 
    municipality: '', 
    email: '',
    phone: '',
    emergency_contact: '', 
    password: '',
    confirm_password: ''
  });

  const [documentFile, setDocumentFile] = useState(null);
  
  // OTP Verification States
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({});

  const validate = () => {
    let newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Hospital name is required.";
    if (!formData.license_number.trim()) newErrors.license_number = "Govt registration/license number is required.";
    if (!formData.hospital_type) newErrors.hospital_type = "Please select hospital type.";
    if (!formData.province) newErrors.province = "Please select a province.";
    if (!formData.district) newErrors.district = "Please select a district.";
    if (!formData.municipality.trim()) newErrors.municipality = "Street address/Municipality is required.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Official email is required.";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    } else if (!isEmailVerified) {
      newErrors.email = "Please verify your email address via OTP.";
    }

    const phoneRegex = /^(?:\+?977)?(?:9[78]\d{8}|0\d{8,9})$/;
    
    if (!formData.phone) {
      newErrors.phone = "Phone number is required.";
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = "Enter a valid 10-digit mobile or 9-digit landline number.";
    }

    if (!formData.emergency_contact) {
      newErrors.emergency_contact = "Emergency contact is required.";
    } else if (!phoneRegex.test(formData.emergency_contact.trim())) {
      newErrors.emergency_contact = "Enter a valid 10-digit mobile or 9-digit landline number.";
    }

    if (!formData.hospital_bed_capacity || parseInt(formData.hospital_bed_capacity, 10) <= 0) {
      newErrors.hospital_bed_capacity = "Enter a valid number of beds (greater than 0).";
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Must contain 8+ characters, 1 uppercase, 1 lowercase, 1 digit, and 1 special character.";
    }

    if (formData.confirm_password !== formData.password) {
      newErrors.confirm_password = "Passwords do not match.";
    }

    if (!documentFile) {
      newErrors.document_url = "Please upload registration document (PDF/JPG/PNG).";
    } else {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(documentFile.type)) {
        newErrors.document_url = "Only PDF, JPEG, and PNG files are allowed.";
      }
      if (documentFile.size > 5 * 1024 * 1024) {
        newErrors.document_url = "File size exceeds maximum 5MB limit.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      if (name === 'province') {
        return { ...prev, province: value, district: '' };
      }
      if (name === 'email') {
        setIsEmailVerified(false);
        setIsOtpSent(false);
        return { ...prev, email: value };
      }
      return { ...prev, [name]: value };
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentFile(file);
      if (errors.document_url) {
        setErrors((prev) => ({ ...prev, document_url: null }));
      }
    }
  };

  const handleSendOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address before sending OTP." }));
      return;
    }

    setOtpLoading(true);
    try {
      const res = await axios.post('https://health-access-system-2.onrender.com/api/send-otp', { email: formData.email });
      alert(res.data?.message || "OTP sent to your email address.");
      setIsOtpSent(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      alert("Please enter the 6-digit OTP code.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await axios.post('https://health-access-system-2.onrender.com/api/verify-otp', { email: formData.email, otp });
      if (res.data?.verified || res.status === 200) {
        setIsEmailVerified(true);
        setErrors((prev) => ({ ...prev, email: null }));
        alert("Email verified successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dataPayload = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key !== 'confirm_password') {
        dataPayload.append(key, formData[key]);
      }
    });

    // CRITICAL: Matches backend Multer upload.single('document_url') expectation
    if (documentFile) {
      dataPayload.append('document_url', documentFile);
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        'https://health-access-system-2.onrender.com/api/register', 
        dataPayload, 
        { withCredentials: true }
      );

      alert(response.data?.message || "Registration successful!");
      navigate('/');
    } catch (error) {
      console.error('Registration submission error:', error);
      alert(error.response?.data?.message || 'Server error during hospital registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const listDistrict = formData.province ? locationData[formData.province] : [];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
        
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Hospital Registration</h2>
          <p className="text-sm text-slate-500 mt-1">Register your medical facility for official verification</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Hospital Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Hospital / Clinic Name
              </label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="e.g. City General Hospital" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Govt. Reg. / License No.
              </label>
              <input 
                type="text" 
                name="license_number" 
                value={formData.license_number} 
                onChange={handleChange} 
                placeholder="e.g. REG-98472-HC" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.license_number ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.license_number && <p className="text-red-500 text-xs mt-1">{errors.license_number}</p>}
            </div>
          </div>

          {/* Email + OTP Verification Section */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Official Email Address
            </label>
            <div className="flex gap-2">
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                disabled={isEmailVerified}
                placeholder="info@hospital.com" 
                className={`flex-1 px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isEmailVerified || otpLoading}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {isEmailVerified ? 'Verified ✓' : isOtpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}

            {isOtpSent && !isEmailVerified && (
              <div className="mt-2 flex gap-2 items-center">
                <input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="Enter 6-digit OTP" 
                  className="w-1/2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition shadow-sm border border-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {otpLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            )}
          </div>

          {/* Type & Bed Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Hospital Type
              </label>
              <select 
                name="hospital_type" 
                value={formData.hospital_type} 
                onChange={handleChange} 
                className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.hospital_type ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              >
                <option value="">--Select Type--</option>
                <option value="Government">Government</option>
                <option value="Private">Private</option>
                <option value="Specialized">Specialized</option>
              </select>
              {errors.hospital_type && <p className="text-red-500 text-xs mt-1">{errors.hospital_type}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Total Bed Capacity
              </label>
              <input 
                type="number" 
                name="hospital_bed_capacity" 
                value={formData.hospital_bed_capacity} 
                onChange={handleChange} 
                placeholder="e.g. 150" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.hospital_bed_capacity ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.hospital_bed_capacity && <p className="text-red-500 text-xs mt-1">{errors.hospital_bed_capacity}</p>}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Province
              </label>
              <select 
                name="province" 
                value={formData.province} 
                onChange={handleChange} 
                className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.province ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              >
                <option value="">--Select--</option>
                {Object.keys(locationData).map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
              {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                District
              </label>
              <select 
                name="district" 
                value={formData.district} 
                onChange={handleChange} 
                disabled={!formData.province} 
                className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.district ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              >
                <option value="">{formData.province ? 'Select' : 'Choose Province'}</option>
                {listDistrict.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
              {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Street / Municipality
              </label>
              <input 
                type="text" 
                name="municipality" 
                value={formData.municipality} 
                onChange={handleChange} 
                placeholder="Ward No. / Street" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.municipality ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.municipality && <p className="text-red-500 text-xs mt-1">{errors.municipality}</p>}
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Hospital Phone
              </label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="e.g. 014412345 or 9841234567" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Emergency Contact Hotline
              </label>
              <input 
                type="text" 
                name="emergency_contact" 
                value={formData.emergency_contact} 
                onChange={handleChange} 
                placeholder="e.g. 014499999 or 9801234567" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.emergency_contact ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.emergency_contact && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact}</p>}
            </div>
          </div>

          {/* Styled Document Upload Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Registration Document (PDF / JPG / PNG, Max 5MB)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-2.5 rounded-lg border border-blue-200 text-xs transition inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Choose Document</span>
                <input 
                  type="file" 
                  accept=".jpg, .jpeg, .png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-500 truncate max-w-xs">
                {documentFile ? documentFile.name : 'No file chosen'}
              </span>
            </div>
            {errors.document_url && <p className="text-red-500 text-xs mt-1">{errors.document_url}</p>}
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="••••••••" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Confirm Password
              </label>
              <input 
                type="password" 
                name="confirm_password" 
                value={formData.confirm_password} 
                onChange={handleChange} 
                placeholder="Re-type password" 
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  errors.confirm_password ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!isEmailVerified || submitting}
            className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting Application...' : 'Submit Hospital Application'}
          </button>

          <p className="text-center text-sm text-slate-500 mt-4">
                      Already have an account?{' '}
                      <Link to="/" className="text-blue-600 hover:underline font-semibold">
                        Back to Login
                      </Link>
                    </p>

        </form>
      </div>
    </div>
  );
};

export default HospitalForm;