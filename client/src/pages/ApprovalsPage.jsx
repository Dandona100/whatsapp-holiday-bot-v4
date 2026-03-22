import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import useApprovalStore from '../store/useApprovalStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const TABS = [
  { key: '', label: 'Pending', icon: Clock },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'expired', label: 'Expired', icon: AlertTriangle },
];

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const { approvals, fetchApprovals, approve, reject } = useApprovalStore();

  useEffect(() => {
    fetchApprovals(activeTab || 'pending');
  }, [activeTab, fetchApprovals]);

  const filtered = approvals.filter((a) => {
    if (activeTab === '') return a.status === 'pending';
    return a.status === activeTab;
  });

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      await approve(id);
    }
    setSelectedIds([]);
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) {
      await reject(id);
    }
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Approvals</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedIds([]); }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && activeTab === '' && (
        <div className="flex gap-3">
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <CheckCircle size={16} />
            Approve ({selectedIds.length})
          </button>
          <button
            onClick={handleBulkReject}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <XCircle size={16} />
            Reject ({selectedIds.length})
          </button>
        </div>
      )}

      {/* Approval Cards */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No {activeTab || 'pending'} approvals
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {activeTab === '' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={() => toggleSelect(a.id)}
                    />
                  )}
                  <h4 className="font-semibold text-gray-800">
                    {a.contactName || a.contact?.displayName || 'Unknown Contact'}
                  </h4>
                </div>
                <span className="text-xs text-gray-400">
                  {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}
                </span>
              </div>

              {/* Incoming message */}
              {a.incomingMessage && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Incoming Message</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    {a.incomingMessage}
                  </div>
                </div>
              )}

              {/* Prepared response */}
              {a.preparedResponse && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Prepared Response</p>
                  <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-700 border border-green-100">
                    {a.preparedResponse}
                  </div>
                </div>
              )}

              {/* Expiry */}
              {a.expiresAt && a.status === 'pending' && (
                <div className="flex items-center gap-1 text-xs text-orange-500 mb-3">
                  <Clock size={12} />
                  Expires {formatDistanceToNow(new Date(a.expiresAt), { addSuffix: true })}
                </div>
              )}

              {/* Actions */}
              {a.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => approve(a.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => reject(a.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              )}

              {a.status !== 'pending' && (
                <div className={clsx(
                  'text-xs font-medium px-2 py-1 rounded-full w-fit',
                  a.status === 'approved' ? 'bg-green-100 text-green-700' :
                  a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
