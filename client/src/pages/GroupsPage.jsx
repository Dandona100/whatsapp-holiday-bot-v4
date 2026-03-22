import { useEffect, useState } from 'react';
import { FolderOpen, Plus, Edit2, Trash2, Users, X, Search } from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';

function GroupModal({ group, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#22c55e',
    ...group,
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
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">
            {group?.id ? 'Edit Group' : 'Add Group'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-12 h-10 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name}
            className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [groupContacts, setGroupContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/groups');
      setGroups(res.data.groups || res.data || []);
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (form) => {
    if (form.id) {
      await api.put(`/groups/${form.id}`, form);
      toast.success('Group updated');
    } else {
      await api.post('/groups', form);
      toast.success('Group created');
    }
    fetchGroups();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this group?')) return;
    try {
      await api.delete(`/groups/${id}`);
      toast.success('Group deleted');
      fetchGroups();
    } catch {
      toast.error('Delete failed');
    }
  };

  const viewContacts = async (group) => {
    if (expandedGroup === group.id) {
      setExpandedGroup(null);
      return;
    }
    try {
      const res = await api.get('/contacts', { params: { group: group.id } });
      setGroupContacts(res.data.contacts || res.data || []);
      setExpandedGroup(group.id);
    } catch {
      toast.error('Failed to load contacts');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Groups</h2>
        <button
          onClick={() => { setEditGroup(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors"
        >
          <Plus size={16} />
          Add Group
        </button>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-500">
            Showing {filteredGroups.length} of {groups.length} groups
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          {searchQuery ? 'No groups match your search' : 'No groups yet'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((g) => (
            <div key={g.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: g.color || '#22c55e' }}
                    >
                      <FolderOpen size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{g.name}</h3>
                      <p className="text-xs text-gray-500">{g.contactCount || g.contact_count || 0} contacts</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditGroup(g); setShowModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {g.description && (
                  <p className="text-sm text-gray-500 mb-3">{g.description}</p>
                )}
                <button
                  onClick={() => viewContacts(g)}
                  className="flex items-center gap-1 text-sm text-whatsapp hover:text-whatsapp-dark"
                >
                  <Users size={14} />
                  {expandedGroup === g.id ? 'Hide Contacts' : 'View Contacts'}
                </button>
              </div>

              {expandedGroup === g.id && (
                <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
                  {groupContacts.length === 0 ? (
                    <p className="text-sm text-gray-400">No contacts in this group</p>
                  ) : (
                    <ul className="space-y-1">
                      {groupContacts.map((c) => (
                        <li key={c.id} className="text-sm text-gray-600">
                          {c.displayName || c.display_name} - {c.phone}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <GroupModal
          group={editGroup}
          onClose={() => { setShowModal(false); setEditGroup(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
