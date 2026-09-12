import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const locationData = {
  'Koshi': ['Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga', 'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Tehrathum', 'Udayapur'],
  'Madhesh': ['Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha'],
  'Bagmati': ['Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok', 'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok'],
  'Gandaki': ['Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 'Nawalpur (Nawalparasi East)', 'Parbat', 'Syangja', 'Tanahu'],
  'Lumbini': ['Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Gulmi', 'Kapilvastu', 'Parasi (Nawalparasi West)', 'Palpa', 'Pyuthan', 'Rolpa', 'Rukum East', 'Rupandehi'],
  'Karnali': ['Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan', 'Surkhet', 'Rukum West'],
  'Sudurpashchim': ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur']
};

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    province: '',
    district: '',
    email: '',
    citizenship: '',
    password: '',
    confirmPassword: ''
  });

  const [imageFile, setImageFile] = useState(null);

  // OTP Verification States
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validation Rules
  const validateName = (name) => {
    const nameRegex = /^[a-zA-Za-zA-Z\s]+$/;
    return nameRegex.test(name);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
    return passwordRegex.test(password);
  };

  const handleChange = (e) => {
    if (e.target.name === 'province') {
      setFormData({ ...formData, province: e.target.value, district: '' });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  // 1. Send OTP Request
  const handleSendOtp = async () => {
    if (!formData.email) {
      alert('Please enter your email address first.');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post('https://health-access-system-2.onrender.com/api/auth/send-otp', { email: formData.email });
      setOtpToken(res.data.token);
      setIsOtpSent(true);
      alert('Verification code sent to your email.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP Request
  const handleVerifyOtp = async () => {
    if (!otp) {
      alert('Please enter the verification code.');
      return;
    }
    try {
      setLoading(true);
      await axios.post('https://health-access-system-2.onrender.com/api/auth/verify-otp', { email: formData.email, otp  });
      setIsEmailVerified(true);
      alert('Email verified successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!validateName(formData.name)) {
      alert('Full Name must contain only letters and spaces. Numbers are not allowed.');
      return;
    }

    if (!validatePassword(formData.password)) {
      alert('Password must contain at least 1 uppercase letter, 1 number, and 1 special character (@$!%*?&#).');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (!isEmailVerified) {
      alert('Please verify your email address via OTP before submitting.');
      return;
    }

    if (!imageFile) {
      alert('Please upload a citizenship document image.');
      return;
    }

    // Build Multipart FormData
    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('province', formData.province);
    payload.append('district', formData.district);
    payload.append('email', formData.email);
    payload.append('citizenship', formData.citizenship);
    payload.append('password', formData.password);
    payload.append('isVerified', 'true');
    payload.append('image', imageFile);

    try {
      setLoading(true);
      const response = await axios.post('https://health-access-system-2.onrender.com/api/auth/register', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(response.data?.message || 'Registration successful!');
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const listDistrict = formData.province ? locationData[formData.province] : [];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
          <p className="text-sm text-slate-500 mt-1">Please fill in your details to register</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Full Name
            </label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Enter your name" 
              required 
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Email + OTP Verification Button */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <div className="flex gap-2">
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                disabled={isEmailVerified}
                placeholder="you@example.com" 
                required 
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !formData.email}
                  className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isOtpSent ? 'Resend' : 'Send Code'}
                </button>
              )}
            </div>
            {isEmailVerified && (
              <span className="text-xs text-green-600 font-semibold mt-1 inline-block">
                ✓ Email Verified
              </span>
            )}
          </div>

          {/* OTP Code Input */}
          {isOtpSent && !isEmailVerified && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Enter 6-Digit OTP Code
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="123456" 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          {/* Location Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Province
              </label>
              <select 
                name="province" 
                value={formData.province} 
                onChange={handleChange} 
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                <option value="">--Select--</option>
                {Object.keys(locationData).map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
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
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{formData.province ? 'Select' : 'Choose Province'}</option>
                {listDistrict.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Passwords */}
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
              required 
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition mb-2"
            />
            <input 
              type="password" 
              name="confirmPassword" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              placeholder="Re-type password" 
              required 
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Citizenship Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Citizenship Number
            </label>
            <input 
              type="text" 
              name="citizenship" 
              value={formData.citizenship} 
              onChange={handleChange} 
              placeholder="e.g. 12-01-78-12345" 
              required 
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Citizenship Document Image Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Citizenship Document Image
            </label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange} 
              required 
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={!isEmailVerified || loading}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-lg shadow-md transition duration-150 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Submit'}
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

export default Register;