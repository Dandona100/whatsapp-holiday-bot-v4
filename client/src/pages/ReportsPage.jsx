import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, Filter, Download, Send, CheckCheck, Eye, AlertTriangle,
  ChevronLeft, ChevronRight, Search, Calendar,
} from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';

const STATUS_COLORS = {
  sent: '#22c55e',
  delivered: '#3b82f6',
  read: '#8b5cf6',
  failed: '#ef4444',
  queued: '#f59e0b',
  other: '#9ca3af',
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#9ca3af'];

function StatCard({ icon: Icon, label, value, color, suffix }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">
          {value}{suffix || ''}
        </p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    direction: '',
    status: '',
    eventType: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  // Stats
  const [delivery, setDelivery] = useState({ total: 0, sent: 0, delivered: 0, read: 0, failed: 0, deliveryRate: 0, readRate: 0 });
  const [eventData, setEventData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);

  const limit = 50;

  const fetchAll = useCallback(async () => {
    try {
      const [deliveryRes, eventRes, dailyRes] = await Promise.all([
        api.get('/logs/delivery'),
        api.get('/logs/by-event'),
        api.get('/logs/daily'),
      ]);

      setDelivery(deliveryRes.data);

      const events = (eventRes.data.events || []).map((e) => ({
        name: (e._id || 'other').replace(/_/g, ' '),
        total: e.total,
        sent: e.sent,
        failed: e.failed,
      }));
      setEventData(events);
      setEventTypes((eventRes.data.events || []).map((e) => e._id).filter(Boolean));

      setDailyData(
        (dailyRes.data.daily || []).map((d) => ({
          date: format(new Date(d.date), 'MMM d'),
          messages: d.count,
        }))
      );
    } catch {
      // Stats fetch failed silently — logs will still load
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filters.direction) params.direction = filters.direction;
      if (filters.status) params.status = filters.status;
      if (filters.eventType) params.eventType = filters.eventType;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.search) params.search = filters.search;

      const res = await api.get('/logs', { params });
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { total: 0, pages: 1 });
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/logs/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'message-logs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Pie chart data from delivery stats
  const pieData = [
    { name: 'Sent', value: Math.max(0, (delivery.sent || 0) - (delivery.delivered || 0)) },
    { name: 'Delivered', value: Math.max(0, (delivery.delivered || 0) - (delivery.read || 0)) },
    { name: 'Read', value: delivery.read || 0 },
    { name: 'Failed', value: delivery.failed || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Send} label="Total Sent" value={delivery.total || 0} color="bg-green-500" />
        <StatCard
          icon={CheckCheck}
          label="Delivery Rate"
          value={Math.round(delivery.deliveryRate || 0)}
          suffix="%"
          color="bg-blue-500"
        />
        <StatCard
          icon={Eye}
          label="Read Rate"
          value={Math.round(delivery.readRate || 0)}
          suffix="%"
          color="bg-purple-500"
        />
        <StatCard icon={AlertTriangle} label="Failed" value={delivery.failed || 0} color="bg-red-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart — Messages by Event Type */}
        {eventData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-whatsapp" />
              Messages by Event Type
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={eventData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#25D366" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Donut/Pie Chart — Delivery Status Breakdown */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delivery Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Line Chart — Messages Over Time */}
      {dailyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-whatsapp" />
            Messages Over Time (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="#25D366"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <select
            value={filters.direction}
            onChange={(e) => updateFilter('direction', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-whatsapp outline-none"
          >
            <option value="">All Directions</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-whatsapp outline-none"
          >
            <option value="">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filters.eventType}
            onChange={(e) => updateFilter('eventType', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-whatsapp outline-none"
          >
            <option value="">All Event Types</option>
            {eventTypes.map((et) => (
              <option key={et} value={et}>
                {et.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-whatsapp outline-none"
            placeholder="From"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-whatsapp outline-none"
            placeholder="To"
          />

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search contact..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-whatsapp outline-none"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Direction</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {log.contact?.displayName || log.contact?.phone || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.direction === 'incoming'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {log.direction || 'outgoing'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 capitalize">
                      {(log.eventType || '-').replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'sent' || log.status === 'delivered'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'read'
                              ? 'bg-blue-100 text-blue-700'
                              : log.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {log.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {log.caption || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="flex items-center gap-1 px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-30"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
