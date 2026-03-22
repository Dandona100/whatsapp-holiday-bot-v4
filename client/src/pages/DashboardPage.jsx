import { useEffect, useState } from 'react';
import { Users, FolderOpen, Mail, CheckCircle, Calendar, Palette } from 'lucide-react';
import api from '../hooks/useApi';
import useWhatsAppStore from '../store/useWhatsAppStore';
import useApprovalStore from '../store/useApprovalStore';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const waStatus = useWhatsAppStore((s) => s.status);
  const pendingCount = useApprovalStore((s) => s.pendingCount);
  const isConnected = waStatus === 'connected' || waStatus === 'ready';

  const [stats, setStats] = useState({ contacts: 0, groups: 0, messagesSent: 0 });
  const [canvaStatus, setCanvaStatus] = useState(null);
  const [nextEvent, setNextEvent] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [contactsRes, groupsRes, logsRes, upcomingRes, canvaRes] = await Promise.allSettled([
          api.get('/contacts', { params: { limit: 1 } }),
          api.get('/groups'),
          api.get('/logs', { params: { limit: 10, direction: 'outgoing' } }),
          api.get('/schedules/upcoming'),
          api.get('/templates/canva/status'),
        ]);

        setStats({
          contacts: contactsRes.status === 'fulfilled' ? (contactsRes.value.data.pagination?.total || contactsRes.value.data.total || 0) : 0,
          groups: groupsRes.status === 'fulfilled' ? (groupsRes.value.data.groups?.length || groupsRes.value.data.length || 0) : 0,
          messagesSent: logsRes.status === 'fulfilled' ? (logsRes.value.data.pagination?.total || logsRes.value.data.total || logsRes.value.data.logs?.length || 0) : 0,
        });

        if (logsRes.status === 'fulfilled') {
          setRecentLogs(logsRes.value.data.logs || logsRes.value.data || []);
        }

        if (canvaRes.status === 'fulfilled') {
          setCanvaStatus(canvaRes.value.data);
        }

        if (upcomingRes.status === 'fulfilled') {
          const events = upcomingRes.value.data.events || upcomingRes.value.data || [];
          if (events.length > 0) setNextEvent(events[0]);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {/* WhatsApp Status */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${isConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className={`font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
          WhatsApp: {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Canva Status */}
      {canvaStatus && (
        <div className="rounded-xl p-4 flex items-center gap-3 bg-purple-50 border border-purple-200">
          <Palette size={16} className="text-purple-500" />
          <div className="flex gap-4 text-sm">
            {canvaStatus.providers?.map((p) => (
              <span key={p.name} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${p.available ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={p.available ? 'text-purple-700 font-medium' : 'text-gray-400'}>
                  {p.name.toUpperCase()}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Contacts" value={loading ? '...' : stats.contacts} color="bg-blue-500" />
        <StatCard icon={FolderOpen} label="Total Groups" value={loading ? '...' : stats.groups} color="bg-purple-500" />
        <StatCard icon={Mail} label="Messages Sent" value={loading ? '...' : stats.messagesSent} color="bg-whatsapp" />
        <StatCard icon={CheckCircle} label="Pending Approvals" value={pendingCount} color="bg-orange-500" />
      </div>

      {/* Next Event */}
      {nextEvent && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={20} className="text-whatsapp" />
            <h3 className="text-lg font-semibold text-gray-800">Next Event</h3>
          </div>
          <p className="text-gray-700 font-medium">{nextEvent.name || nextEvent.eventType}</p>
          <p className="text-sm text-gray-500 mt-1">
            {nextEvent.date ? format(new Date(nextEvent.date), 'PPP') : 'Date TBD'}
          </p>
        </div>
      )}

      {/* Recent Messages */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Recent Messages</h3>
        </div>
        {recentLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No recent messages</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-700">{log.contactName || log.phone || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{log.eventType || log.type || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'sent' ? 'bg-green-100 text-green-700' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
