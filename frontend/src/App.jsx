import {Routes,Route } from 'react-router-dom'
import UserRegister from './pages/users/UserRegister.jsx'
import UserLogin from './pages/users/UserLogin.jsx'
import UserDashboard from './pages/users/UserDashboard.jsx'
import HospitalRegister from './pages/hospitals/HospitalRegister.jsx'
import HospitalLogin from './pages/hospitals/HospitalLogin.jsx'
import HospitalDashboard from './pages/hospitals/HospitalDashboard.jsx'
import AuditLogsView from './pages/admin/AuditLogsView.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import HomePage from './pages/portal/HomePage.jsx'

const App=()=>{
    return(
        <Routes>
            <Route path="/" element={<HomePage/>} />
            <Route path="/user/login" element={<UserLogin/>} />
            <Route path="/user/register" element={<UserRegister/>} />
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/hospital/login" element={<HospitalLogin/>} />
            <Route path="/hospital/register" element={<HospitalRegister/>} />
            <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
            <Route path="/admin/login" element={<AdminLogin/>} />
            <Route path="/admin/auditlogs" element={<AuditLogsView/>} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
    )
}
export default App
