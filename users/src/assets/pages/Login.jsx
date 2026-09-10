import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './Dashboard.jsx'
const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // withCredentials: true ensures the auth cookie is saved in the browser
    axios.post('http://localhost:5000/api/auth/login', credentials, { withCredentials: true })
      .then((response) => {
        alert("Login successful!");
        navigate('/dashboard');
      })
      .catch((error) => {
        alert(error.response?.data?.message || 'Invalid email or password.');
      });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-sm text-slate-500 mt-1">Please enter your details to log in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input 
              type="email" 
              name="email" 
              value={credentials.email} 
              onChange={handleChange} 
              placeholder="you@example.com" 
              required 
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <input 
              type="password" 
              name="password" 
              value={credentials.password} 
              onChange={handleChange} 
              placeholder="••••••••" 
              required 
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <button 
            type="submit" 
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-lg shadow-md hover:shadow-blue-200 transition cursor-pointer"
          >
            Log In
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

export default Login;