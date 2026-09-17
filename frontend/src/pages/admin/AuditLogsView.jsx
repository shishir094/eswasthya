import React, { useEffect, useState } from 'react';

export default function AuditLogsView() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('https://health-access-system-2.onrender.com/api/admin/audit-logs', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                setLogs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching audit logs:', err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-6 text-gray-500">Loading audit trail...</div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-2 text-gray-800">System Audit Trail</h2>
            <p className="text-sm text-gray-500 mb-6">
                Chronological record of administrative evaluations, approvals, rejections, and feedback messages across users and hospitals.
            </p>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Timestamp</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Admin Officer</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Target Type</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Target Identifier</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-600">Comments / Reason</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                                    No audit logs recorded yet.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                                        {log.officer}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                            log.target_type === 'USER' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {log.target_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                        {log.target_identifier}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                            log.action.includes('APPROVE') 
                                                ? 'bg-green-100 text-green-800' 
                                                : log.action.includes('REJECT') 
                                                ? 'bg-red-100 text-red-800' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                        {log.comments || '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}