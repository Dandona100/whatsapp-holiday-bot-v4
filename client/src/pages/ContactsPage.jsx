import { useEffect, useState, useCallback } from 'react';
import {
  Search, Plus, Upload, Trash2, Edit2, X, Check,
} from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function ContactModal({ contact, groups, onClose, onSave }) {
  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    nameOnDesign: '',
    groups: [],
    tags: [],
    language: 'he',
    ...contact,
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // error handled in parent
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">
            {contact?.id ? 'Edit Contact' : 'Add Contact'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp focus:border-whatsapp outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp focus:border-whatsapp outline-none"
              placeholder="+972..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name on Design</label>
            <input
              type="text"
              value={form.nameOnDesign}
              onChange={(e) => setForm({ ...form, nameOnDesign: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp focus:border-whatsapp outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groups</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    const gId = g.id;
                    const current = form.groups || [];
                    setForm({
                      ...form,
                      groups: current.includes(gId)
                        ? current.filter((id) => id !== gId)
                        : [...current, gId],
                    });
                  }}
                  className={clsx(
                    'px-3 py-1 rounded-full text-sm border transition-colors',
                    (form.groups || []).includes(g.id)
                      ? 'bg-whatsapp text-white border-whatsapp'
                      : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-whatsapp'
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  {tag}
                  <button onClick={() => setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
                placeholder="Add tag"
              />
              <button onClick={addTag} type="button" className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
            >
              <option value="he">Hebrew</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Contacts imported');
      onImported();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Import Contacts</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Upload a CSV or vCard file</p>
        <input
          type="file"
          accept=".csv,.vcf,.vcard"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark disabled:opacity-50"
          >
            {uploading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [editingNameId, setEditingNameId] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const limit = 500;

  const fetchContacts = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const currentOffset = append ? offset : 0;
      const res = await api.get('/contacts', {
        params: { search, offset: currentOffset, limit },
      });
      const newContacts = res.data.contacts || res.data || [];
      if (append) {
        setContacts((prev) => [...prev, ...newContacts]);
      } else {
        setContacts(newContacts);
      }
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data.groups || res.data || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchContacts(false);
  }, [search]);

  useEffect(() => {
    if (offset > 0) {
      fetchContacts(true);
    }
  }, [offset]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleSave = async (form) => {
    if (form.id) {
      await api.put(`/contacts/${form.id}`, form);
      toast.success('Contact updated');
    } else {
      await api.post('/contacts', form);
      toast.success('Contact created');
    }
    setOffset(0);
    fetchContacts(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Contact deleted');
      setOffset(0);
      fetchContacts(false);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} contacts?`)) return;
    try {
      await api.post('/contacts/bulk-delete', { ids: selectedIds });
      toast.success('Contacts deleted');
      setSelectedIds([]);
      setOffset(0);
      fetchContacts(false);
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleInlineNameSave = async (id) => {
    try {
      await api.put(`/contacts/${id}`, { nameOnDesign: editingNameValue });
      toast.success('Name updated');
      setEditingNameId(null);
      setOffset(0);
      fetchContacts(false);
    } catch {
      toast.error('Update failed');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLoadMore = () => {
    setOffset(contacts.length);
  };

  const remaining = total - contacts.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Contacts</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={() => { setEditContact(null); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors"
          >
            <Plus size={16} />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp focus:border-whatsapp outline-none"
          />
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <Trash2 size={16} />
            Delete ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading && contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No contacts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === contacts.length && contacts.length > 0}
                      onChange={() =>
                        setSelectedIds(
                          selectedIds.length === contacts.length ? [] : contacts.map((c) => c.id)
                        )
                      }
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name on Design</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Groups</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tags</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.displayName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {editingNameId === c.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleInlineNameSave(c.id); }
                              if (e.key === 'Escape') setEditingNameId(null);
                            }}
                            className="px-2 py-1 border rounded text-sm w-32"
                            autoFocus
                          />
                          <button onClick={() => handleInlineNameSave(c.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingNameId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-whatsapp"
                          onClick={() => { setEditingNameId(c.id); setEditingNameValue(c.nameOnDesign || ''); }}
                        >
                          {c.nameOnDesign || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.groups || []).map((g, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {typeof g === 'string' ? g : g.name || g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        c.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {c.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditContact(c); setShowAdd(true); }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

        {/* Load More */}
        {remaining > 0 && (
          <div className="flex items-center justify-center px-6 py-3 border-t border-gray-100">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : `Load More (${remaining} remaining)`}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <ContactModal
          contact={editContact}
          groups={groups}
          onClose={() => { setShowAdd(false); setEditContact(null); }}
          onSave={handleSave}
        />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={() => { setOffset(0); fetchContacts(false); }} />
      )}
    </div>
  );
}
