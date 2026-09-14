import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://health-access-system-2.onrender.com/api';

const Dashboard = () => {
  const navigate = useNavigate();

  // Primary State
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'hospitals'
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State for Image Preview
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null); // { id, type: 'user' | 'hospital', name }
  const [rejectMessage, setRejectMessage] = useState('');

  // Audit Logs Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, hospitalsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/users`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/list`, { withCredentials: true }),
      ]);

      setUsers(usersRes.data.data || usersRes.data || []);
      setHospitals(hospitalsRes.data.data || hospitalsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch Audit Logs when modal opens
  const fetchAuditLogs = async () => {
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/audit-logs`, { withCredentials: true });
      setAuditLogs(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch audit logs.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/admin/logout`, {}, { withCredentials: true });
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Error logging out. Please try again.');
    }
  };

  const checkIsApproved = (item) => {
    if (!item) return false;
    const val = item.is_approved !== undefined ? item.is_approved : item.isApproved;
    if (val === true || val === 1 || val === '1') return true;
    if (typeof item.status === 'string') {
      return item.status.trim().toLowerCase() === 'approved';
    }
    return false;
  };

  const getItemId = (item, type = 'user') => {
    if (!item) return null;
    if (type === 'hospital') {
      return item.hospital_id || item.hospitalId || item._id || item.id;
    }
    return item.user_id || item.userId || item._id || item.id;
  };

  const formatImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed === '') return '';

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }

    if (!trimmed.startsWith('/') && !trimmed.includes('://')) {
      if (trimmed.length > 100 && !trimmed.includes(' ')) {
        return `data:image/jpeg;base64,${trimmed}`;
      }
    }

    const backendOrigin = API_BASE_URL.replace('/api', '');
    return `${backendOrigin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  };

  const activeDataset = activeTab === 'users' ? users : hospitals;

  const availableProvinces = useMemo(() => {
    const provinces = activeDataset
      .map((item) => item.province)
      .filter((p) => p && typeof p === 'string' && p.trim() !== '');
    return ['All', ...Array.from(new Set(provinces))];
  }, [activeDataset]);

  const availableDistricts = useMemo(() => {
    const filteredByProv = activeDataset.filter((item) =>
      selectedProvince === 'All' ? true : item.province === selectedProvince
    );
    const districts = filteredByProv
      .map((item) => item.district)
      .filter((d) => d && typeof d === 'string' && d.trim() !== '');
    return ['All', ...Array.from(new Set(districts))];
  }, [activeDataset, selectedProvince]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedProvince('All');
    setSelectedDistrict('All');
    setStatusFilter('all');
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isApproved = checkIsApproved(u);
      if (statusFilter === 'pending' && isApproved) return false;
      if (statusFilter === 'approved' && !isApproved) return false;
      if (selectedProvince !== 'All' && u.province !== selectedProvince) return false;
      if (selectedDistrict !== 'All' && u.district !== selectedDistrict) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          String(getItemId(u, 'user') || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, searchQuery, selectedProvince, selectedDistrict, statusFilter]);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const isApproved = checkIsApproved(h);
      if (statusFilter === 'pending' && isApproved) return false;
      if (statusFilter === 'approved' && !isApproved) return false;
      if (selectedProvince !== 'All' && h.province !== selectedProvince) return false;
      if (selectedDistrict !== 'All' && h.district !== selectedDistrict) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          (h.name || '').toLowerCase().includes(q) ||
          (h.email || '').toLowerCase().includes(q) ||
          String(getItemId(h, 'hospital') || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [hospitals, searchQuery, selectedProvince, selectedDistrict, statusFilter]);

  const handleApproveUser = async (userId) => {
    if (!userId) return alert('Invalid User ID');
    setActionLoading(`user-${userId}`);
    try {
      await axios.patch(`${API_BASE_URL}/admin/users/${userId}/approve`, {}, { withCredentials: true });
      setUsers((prev) =>
        prev.map((u) => (getItemId(u, 'user') === userId ? { ...u, is_approved: 1, isApproved: true, status: 'approved' } : u))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveHospital = async (hospitalId) => {
    if (!hospitalId) return alert('Invalid Hospital ID');
    setActionLoading(`hosp-${hospitalId}`);
    try {
      await axios.patch(`${API_BASE_URL}/admin/hospitals/${hospitalId}/approve`, {}, { withCredentials: true });
      setHospitals((prev) =>
        prev.map((h) => (getItemId(h, 'hospital') === hospitalId ? { ...h, is_approved: 1, isApproved: true, status: 'approved' } : h))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve hospital.');
    } finally {
      setActionLoading(null);
    }
  };

  // Open Rejection Modal
  const openRejectModal = (item, type) => {
    const id = getItemId(item, type);
    setRejectTarget({ id, type, name: item.name });
    setRejectMessage('');
    setRejectModalOpen(true);
  };

  // Submit Rejection and Delete Record
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    const { id, type } = rejectTarget;
    setActionLoading(`reject-${type}-${id}`);

    try {
      const endpoint =
        type === 'user'
          ? `${API_BASE_URL}/admin/users/${id}/reject`
          : `${API_BASE_URL}/admin/hospitals/${id}/reject`;

      await axios.delete(endpoint, {
        data: { message: rejectMessage || 'Your registration request was rejected by the admin.' },
        withCredentials: true,
      });

      if (type === 'user') {
        setUsers((prev) => prev.filter((u) => getItemId(u, 'user') !== id));
      } else {
        setHospitals((prev) => prev.filter((h) => getItemId(h, 'hospital') !== id));
      }

      setRejectModalOpen(false);
      setRejectTarget(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject and delete record.');
    } finally {
      setActionLoading(null);
    }
  };

  const verifiedUsers = users.filter(checkIsApproved).length;
  const pendingUsers = users.length - verifiedUsers;
  const verifiedHospitals = hospitals.filter(checkIsApproved).length;
  const pendingHospitals = hospitals.length - verifiedHospitals;

  if (loading) {
    return (
      <div className="p-6 bg-slate-900 min-h-screen text-slate-300 flex items-center justify-center">
        <p className="animate-pulse font-medium text-sm">Loading admin panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-900 min-h-screen text-rose-400 flex flex-col items-center justify-center space-y-4">
        <p className="text-sm">{error}</p>
        <button onClick={fetchAllData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold">Admin Portal</h1>
            <p className="text-xs text-slate-400">Manage user and hospital verification requests</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={fetchAuditLogs} 
              className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-lg text-xs font-semibold transition"
            >
              View Audit Logs
            </button>
            <button 
              onClick={handleLogout} 
              className="cursor-pointer px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Pending Users</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingUsers}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Verified Users</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{verifiedUsers}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Pending Hospitals</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingHospitals}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Verified Hospitals</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{verifiedHospitals}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 space-x-4">
          <button onClick={() => handleTabChange('users')} className={`pb-3 text-xs font-semibold cursor-pointer border-b-2 transition ${activeTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            Users Directory ({users.length})
          </button>
          <button onClick={() => handleTabChange('hospitals')} className={`pb-3 text-xs font-semibold cursor-pointer border-b-2 transition ${activeTab === 'hospitals' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            Hospitals Directory ({hospitals.length})
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex flex-col space-y-1">
            <label className="text-slate-400 font-medium">Search</label>
            <input type="text" placeholder="Search name, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-slate-400 font-medium">Province</label>
            <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setSelectedDistrict('All'); }} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500">
              {availableProvinces.map((prov) => (<option key={prov} value={prov}>{prov}</option>))}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-slate-400 font-medium">District</label>
            <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500">
              {availableDistricts.map((dist) => (<option key={dist} value={dist}>{dist}</option>))}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-slate-400 font-medium">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500">
              <option value="all">All Records</option>
              <option value="pending">Pending Only</option>
              <option value="approved">Approved Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-4">ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Document</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-400">No matching users found.</td></tr>
                ) : (
                  filteredUsers.map((user, index) => {
                    const userId = getItemId(user, 'user');
                    const isApproved = checkIsApproved(user);
                    const isUpdating = actionLoading === `user-${userId}`;
                    const citizenshipUrl = formatImageUrl(user.image_url);

                    return (
                      <tr key={userId || index} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono text-slate-400">#{userId || 'N/A'}</td>
                        <td className="p-4 font-medium text-white">{user.name || 'N/A'}</td>
                        <td className="p-4 text-slate-300">{user.email || 'N/A'}</td>
                        <td className="p-4 text-slate-400">{user.district || 'N/A'}, {user.province || 'N/A'}</td>
                        <td className="p-4">
                          {citizenshipUrl ? (
                            <button onClick={() => { setPreviewImage(citizenshipUrl); setPreviewTitle(`Citizenship Document - ${user.name}`); }} className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer">
                              View Document
                            </button>
                          ) : (<span className="text-slate-500 italic">Not Provided</span>)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] ${isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {!isApproved && (
                            <>
                              <button onClick={() => handleApproveUser(userId)} disabled={isUpdating} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition cursor-pointer">
                                Approve
                              </button>
                              <button onClick={() => openRejectModal(user, 'user')} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition cursor-pointer">
                                Reject
                              </button>
                            </>
                          )}
                          {isApproved && <span className="text-slate-500 italic text-[11px]">Verified</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Hospitals Table */}
        {activeTab === 'hospitals' && (
          <div className="overflow-x-auto bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-4">ID</th>
                  <th className="p-4">Hospital Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Certificate</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredHospitals.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-400">No matching hospitals found.</td></tr>
                ) : (
                  filteredHospitals.map((hospital, index) => {
                    const hospId = getItemId(hospital, 'hospital');
                    const isApproved = checkIsApproved(hospital);
                    const isUpdating = actionLoading === `hosp-${hospId}`;
                    const certUrl = formatImageUrl(hospital.document_url);

                    return (
                      <tr key={hospId || index} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono text-slate-400">#{hospId || 'N/A'}</td>
                        <td className="p-4 font-medium text-white">{hospital.name || 'N/A'}</td>
                        <td className="p-4 text-slate-300">{hospital.hospital_type || 'General'}</td>
                        <td className="p-4 text-slate-400">{hospital.district || 'N/A'}, {hospital.province || 'N/A'}</td>
                        <td className="p-4">
                          {certUrl ? (
                            <button onClick={() => { setPreviewImage(certUrl); setPreviewTitle(`Certificate - ${hospital.name}`); }} className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer">
                              View Certificate
                            </button>
                          ) : (<span className="text-slate-500 italic">Not Provided</span>)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] ${isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {!isApproved && (
                            <>
                              <button onClick={() => handleApproveHospital(hospId)} disabled={isUpdating} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition cursor-pointer">
                                Approve
                              </button>
                              <button onClick={() => openRejectModal(hospital, 'hospital')} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition cursor-pointer">
                                Reject
                              </button>
                            </>
                          )}
                          {isApproved && <span className="text-slate-500 italic text-[11px]">Verified</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Logs Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div>
                <h3 className="text-sm font-bold text-slate-100">System Audit Trail</h3>
                <p className="text-[11px] text-slate-400">Chronological history of admin actions, approvals, and rejections</p>
              </div>
              <button onClick={() => setAuditModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-grow">
              {auditLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs animate-pulse">Loading audit logs...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No audit logs recorded yet.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Officer</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Target</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Comments / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-3 text-slate-400 whitespace-nowrap text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 font-medium text-slate-200 whitespace-nowrap">
                            {log.officer}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.target_type === 'USER' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {log.target_type}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 whitespace-nowrap">
                            {log.target_identifier}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-[10px] font-semibold ${
                              log.action?.includes('APPROVE') 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : log.action?.includes('REJECT') 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 max-w-xs truncate">
                            {log.comments || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Message Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-rose-400">
              Reject Registration: {rejectTarget?.name}
            </h3>
            <p className="text-xs text-slate-400">
              Provide a reason for rejection. This message will be emailed to the applicant, and their data will be permanently deleted from the database.
            </p>
            <textarea
              rows={4}
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              placeholder="Type rejection reason here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Send & Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800 bg-slate-900/90">
              <h3 className="text-sm font-semibold text-slate-200">{previewTitle}</h3>
              <button onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-auto flex items-center justify-center bg-slate-950/60 flex-grow">
              <img src={previewImage} alt="Document Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-800 shadow-md" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;