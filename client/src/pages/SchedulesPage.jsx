import { useEffect, useState } from 'react';
import { Calendar, Plus, Edit2, Trash2, Play, X, Clock } from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function ScheduleModal({ schedule, groups, onClose, onSave }) {
  const [form, setForm] = useState({
    eventType: 'shabbat',
    sendTime: '',
    targetGroups: [],
    enabled: true,
    ...schedule,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // handled in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">
            {schedule?.id ? 'Edit Schedule' : 'Add Schedule'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <input
              type="text"
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send Time</label>
            <input
              type="time"
              value={form.sendTime}
              onChange={(e) => setForm({ ...form, sendTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Groups</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    const current = form.targetGroups || [];
                    setForm({
                      ...form,
                      targetGroups: current.includes(g.id)
                        ? current.filter((id) => id !== g.id)
                        : [...current, g.id],
                    });
                  }}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    (form.targetGroups || []).includes(g.id)
                      ? 'bg-whatsapp text-white border-whatsapp'
                      : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-whatsapp'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedulesRes, groupsRes, upcomingRes] = await Promise.allSettled([
        api.get('/schedules'),
        api.get('/groups'),
        api.get('/schedules/upcoming'),
      ]);
      if (schedulesRes.status === 'fulfilled') {
        setSchedules(schedulesRes.value.data.schedules || schedulesRes.value.data || []);
      }
      if (groupsRes.status === 'fulfilled') {
        setGroups(groupsRes.value.data.groups || groupsRes.value.data || []);
      }
      if (upcomingRes.status === 'fulfilled') {
        setUpcoming(upcomingRes.value.data.events || upcomingRes.value.data || []);
      }
    } catch {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (form) => {
    if (form.id) {
      await api.put(`/schedules/${form.id}`, form);
      toast.success('Schedule updated');
    } else {
      await api.post('/schedules', form);
      toast.success('Schedule created');
    }
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      toast.success('Schedule deleted');
      fetchData();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggle = async (schedule) => {
    try {
      await api.put(`/schedules/${schedule.id}`, { enabled: !schedule.enabled });
      toast.success(schedule.enabled ? 'Schedule disabled' : 'Schedule enabled');
      fetchData();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleRunNow = async (id) => {
    try {
      await api.post(`/schedules/${id}/run`);
      toast.success('Schedule triggered');
    } catch {
      toast.error('Failed to run schedule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Schedules</h2>
        <button
          onClick={() => { setEditSchedule(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors"
        >
          <Plus size={16} />
          Add Schedule
        </button>
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock size={18} className="text-whatsapp" />
            Upcoming Events
          </h3>
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((evt, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-700">{evt.name || evt.eventType}</span>
                <span className="text-gray-500">
                  {evt.date ? format(new Date(evt.date), 'PPP') : 'TBD'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedules Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No schedules configured</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Event Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Send Time</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Groups</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Enabled</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Run</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Next Run</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-800 capitalize">
                      {(s.eventType || '').replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{s.sendTime || '-'}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.targetGroups || []).map((g, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {typeof g === 'string' ? groups.find((gr) => gr.id === g)?.name || g : g.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleToggle(s)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          s.enabled ? 'bg-whatsapp' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            s.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {s.lastRun ? format(new Date(s.lastRun), 'MMM d, HH:mm') : 'Never'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {s.nextRun ? format(new Date(s.nextRun), 'MMM d, HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRunNow(s.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Run Now"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => { setEditSchedule(s); setShowModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ScheduleModal
          schedule={editSchedule}
          groups={groups}
          onClose={() => { setShowModal(false); setEditSchedule(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
