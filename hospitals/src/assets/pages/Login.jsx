import { useState } from 'react';
import { useNavigate,Link } from 'react-router-dom';
import axios from 'axios';

const HospitalLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  // Handle typing in input fields
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('http://localhost:5000/api/login', form, {
        withCredentials: true,
      });

      alert('Login successful');
      setForm({ email: '', password: '' });
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      alert(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 text-slate-800 rounded-xl mb-2 font-bold text-xl">
            🏥
          </div>
          <h2 className="text-xl font-bold text-slate-900">Hospital Admin Portal</h2>
          <p className="text-xs text-slate-500">Sign in to manage departments, doctors, and bookings</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="admin@hospital.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-slate-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-semibold">
              Register here
            </Link>
          </p>
        </form>

      </div>
    </div>
  );
};

export default HospitalLogin;