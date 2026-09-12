import { Routes, Route } from 'react-router-dom';
import Register from './assets/pages/Register.jsx'
import Login from './assets/pages/Login.jsx'
import Dashboard from './assets/pages/Dashboard.jsx'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;