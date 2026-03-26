import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Send,
  Users,
  FolderOpen,
  MessageCircle,
  Search,
  ChevronDown,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Phone,
  X,
} from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 100;

function QuickAddContactModal({ onClose, onAdded }) {
  const [phone, setPhone] = useState('+972');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/contacts', { phone: phone.trim(), displayName: name.trim() || phone.trim() });
      toast.success('Contact added');
      onAdded(res.data.contact || res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Add Contact</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+972..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SendNowPage() {
  // Data
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [contactPage, setContactPage] = useState(1);
  const [hasMoreContacts, setHasMoreContacts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search
  const [contactSearch, setContactSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef(null);

  // Manual phone input
  const [manualPhone, setManualPhone] = useState('');
  const [manualRecipients, setManualRecipients] = useState([]); // { id, phone, displayName }

  // Quick add modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Selection
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Templates
  const [globalTemplate, setGlobalTemplate] = useState('');
  const [groupTemplates, setGroupTemplates] = useState({});

  // Message
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Send
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);

  const fetchContacts = useCallback(async (page = 1, append = false, search = '') => {
    try {
      if (page > 1) setLoadingMore(true);
      const params = { limit: PAGE_SIZE, page };
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/contacts', { params });
      const data = res.data.contacts || res.data || [];
      const pagination = res.data.pagination;

      if (append) {
        setContacts((prev) => [...prev, ...data]);
      } else {
        setContacts(data);
      }

      if (pagination) {
        setHasMoreContacts(page < pagination.totalPages);
      } else {
        setHasMoreContacts(data.length === PAGE_SIZE);
      }
      setContactPage(page);
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoadingMore(false);
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [, gRes, tRes] = await Promise.allSettled([
          fetchContacts(1),
          api.get('/groups'),
          api.get('/templates'),
        ]);
        if (gRes.status === 'fulfilled')
          setGroups(gRes.value.data.groups || gRes.value.data || []);
        if (tRes.status === 'fulfilled')
          setTemplates(tRes.value.data.templates || tRes.value.data || []);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [fetchContacts]);

  // Debounced server search for contacts
  const handleContactSearchChange = (value) => {
    setContactSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchLoading(true);
      fetchContacts(1, false, value);
    }, 500);
  };

  const handleLoadMore = () => {
    fetchContacts(contactPage + 1, true, contactSearch);
  };

  // Add manual phone number to recipients
  const handleAddManualPhone = () => {
    const phone = manualPhone.trim();
    if (!phone) return;
    if (manualRecipients.some((r) => r.phone === phone)) {
      toast.error('Phone number already added');
      return;
    }
    const tempId = `manual_${phone}`;
    setManualRecipients((prev) => [...prev, { id: tempId, phone, displayName: phone }]);
    setManualPhone('');
  };

  const removeManualRecipient = (id) => {
    setManualRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  // Filtered lists (contacts come from server now, no client filter needed)
  const filteredContacts = contacts;

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase();
    return groups.filter((g) => (g.name || '').toLowerCase().includes(q));
  }, [groups, groupSearch]);

  // Template selection
  const handleGlobalTemplateSelect = (id) => {
    setGlobalTemplate(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl?.messageText) setMessage(tpl.messageText);
  };

  const handleGroupTemplateSelect = (groupId, templateId) => {
    setGroupTemplates((prev) => ({
      ...prev,
      [groupId]: templateId,
    }));
  };

  // Toggle helpers
  const toggleContact = (id) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleGroup = (id) => {
    setSelectedGroups((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      // Clean up group template assignment when deselected
      if (!next.includes(id)) {
        setGroupTemplates((gt) => {
          const copy = { ...gt };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  };

  const selectAllFilteredContacts = () => {
    const ids = filteredContacts.map((c) => c.id);
    setSelectedContacts((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      return [...new Set([...prev, ...ids])];
    });
  };

  const selectAllFilteredGroups = () => {
    const ids = filteredGroups.map((g) => g.id);
    setSelectedGroups((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      return [...new Set([...prev, ...ids])];
    });
  };

  // Resolve template for display
  const getTemplateName = (id) => {
    if (!id) return 'Global Template';
    const tpl = templates.find((t) => t.id === id);
    return tpl ? tpl.name : 'Unknown';
  };

  // Compute total recipients estimate
  const totalRecipients = useMemo(() => {
    let count = selectedContacts.length + manualRecipients.length;
    for (const gId of selectedGroups) {
      const g = groups.find((gr) => gr.id === gId);
      count += g?.contactCount || 0;
    }
    return count;
  }, [selectedContacts, selectedGroups, groups, manualRecipients]);

  // Handle quick add callback
  const handleQuickAddContact = (contact) => {
    setContacts((prev) => [contact, ...prev]);
  };

  // Send handler
  const handleSend = async () => {
    if (!message.trim() && !globalTemplate) {
      toast.error('Please enter a message or select a template');
      return;
    }
    if (selectedContacts.length === 0 && selectedGroups.length === 0 && manualRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSending(true);
    setProgress({ sent: 0, total: totalRecipients, failed: 0 });

    try {
      // Collect all contact IDs: selected + contacts from selected groups
      let allContactIds = [...selectedContacts];

      // Collect manual phone numbers
      const manualPhones = manualRecipients.map((r) => r.phone);

      if (selectedGroups.length > 0) {
        for (const gId of selectedGroups) {
          try {
            const gRes = await api.get('/contacts', { params: { group: gId, limit: 10000 } });
            const gContacts = gRes.data.contacts || [];
            for (const c of gContacts) {
              if (!allContactIds.includes(c.id)) allContactIds.push(c.id);
            }
          } catch {}
        }
      }

      if (allContactIds.length === 0 && manualPhones.length === 0) {
        toast.error('No contacts found for selected recipients');
        setSending(false);
        return;
      }

      setProgress({ sent: 0, total: allContactIds.length + manualPhones.length, failed: 0 });

      const payload = {
        contactIds: allContactIds.map(String),
        message: message || 'שבת שלום',
      };
      if (globalTemplate) {
        payload.templateId = Number(globalTemplate);
      }
      if (manualPhones.length > 0) {
        payload.phones = manualPhones;
      }

      const res = await api.post('/whatsapp/send-bulk', payload);

      const sent = res.data.sent || 0;
      const failed = res.data.failed || 0;
      setProgress({ sent, total: sent + failed, failed });

      if (failed > 0) {
        toast.success(`Sent to ${sent} recipients (${failed} failed)`);
      } else {
        toast.success(`Successfully sent to ${sent} recipients`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-whatsapp" />
        <span className="ml-2 text-gray-500">Loading data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Send Now</h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Column 1: Recipients */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recipients
          </h3>

          {/* Manual Phone Input */}
          <div className="mb-5 border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <Phone size={14} />
              Send to phone number
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManualPhone(); } }}
                placeholder="+972..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
              />
              <button
                onClick={handleAddManualPhone}
                className="px-3 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark text-sm flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {manualRecipients.length > 0 && (
              <div className="mt-2 space-y-1">
                {manualRecipients.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded text-sm">
                    <span className="text-gray-700">{r.phone}</span>
                    <button
                      onClick={() => removeManualRecipient(r.id)}
                      className="p-0.5 text-gray-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  {manualRecipients.length} manual number(s)
                </p>
              </div>
            )}
          </div>

          {/* Contacts Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users size={14} />
                Contacts
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="text-xs text-whatsapp hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> Add
                </button>
                <button
                  onClick={selectAllFilteredContacts}
                  className="text-xs text-whatsapp hover:underline"
                >
                  {filteredContacts.length > 0 &&
                  filteredContacts.every((c) => selectedContacts.includes(c.id))
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => handleContactSearchChange(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
              />
              {searchLoading && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
                />
              )}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-gray-400 py-2 text-center">
                  No contacts found
                </p>
              ) : (
                filteredContacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="accent-whatsapp"
                    />
                    <span className="text-sm text-gray-700 truncate">
                      {c.displayName}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto shrink-0">
                      {c.phone}
                    </span>
                  </label>
                ))
              )}
            </div>

            {hasMoreContacts && !contactSearch.trim() && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full mt-2 py-1.5 text-xs text-whatsapp hover:bg-green-50 rounded-lg border border-green-200 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} /> Load More
                  </>
                )}
              </button>
            )}

            <p className="text-xs text-gray-400 mt-1">
              {selectedContacts.length} contacts selected
            </p>
          </div>

          {/* Groups Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <FolderOpen size={14} />
                Groups
              </h4>
              <button
                onClick={selectAllFilteredGroups}
                className="text-xs text-whatsapp hover:underline"
              >
                {filteredGroups.length > 0 &&
                filteredGroups.every((g) => selectedGroups.includes(g.id))
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search groups..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-gray-400 py-2 text-center">
                  No groups found
                </p>
              ) : (
                filteredGroups.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="accent-whatsapp"
                    />
                    <span className="text-sm text-gray-700 truncate">
                      {g.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto shrink-0">
                      {g.contactCount || 0} contacts
                    </span>
                  </label>
                ))
              )}
            </div>

            <p className="text-xs text-gray-400 mt-1">
              {selectedGroups.length} groups selected
            </p>
          </div>
        </div>

        {/* Column 2: Template Assignment */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Template Assignment
          </h3>

          {/* Global Template */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Global Template
            </label>
            <select
              value={globalTemplate}
              onChange={(e) => handleGlobalTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
            >
              <option value="">Custom message (no template)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({(t.eventType || 'custom').replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Used for individual contacts and groups without a specific
              template.
            </p>
          </div>

          {/* Per-Group Template Table */}
          {selectedGroups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per-Group Override
              </label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-medium text-gray-600">
                        Group
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">
                        Template
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroups.map((gId) => {
                      const group = groups.find((g) => g.id === gId);
                      if (!group) return null;
                      return (
                        <tr
                          key={gId}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="px-3 py-2 text-gray-700">
                            {group.name}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={groupTemplates[gId] || ''}
                              onChange={(e) =>
                                handleGroupTemplateSelect(gId, e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-whatsapp outline-none"
                            >
                              <option value="">Use global</option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedGroups.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-6 border-2 border-dashed border-gray-200 rounded-lg">
              Select groups above to assign per-group templates
            </div>
          )}

          {/* Summary */}
          <div className="mt-5 bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 mb-1">
              Assignment Summary
            </p>
            <ul className="text-xs text-gray-500 space-y-0.5">
              {manualRecipients.length > 0 && (
                <li>
                  {manualRecipients.length} manual phone number(s) --{' '}
                  {globalTemplate
                    ? getTemplateName(globalTemplate)
                    : 'Custom message'}
                </li>
              )}
              {selectedContacts.length > 0 && (
                <li>
                  {selectedContacts.length} individual contact(s) --{' '}
                  {globalTemplate
                    ? getTemplateName(globalTemplate)
                    : 'Custom message'}
                </li>
              )}
              {selectedGroups.map((gId) => {
                const group = groups.find((g) => g.id === gId);
                const tplId = groupTemplates[gId] || globalTemplate;
                return (
                  <li key={gId}>
                    {group?.name || 'Unknown'} ({group?.contactCount || 0}) --{' '}
                    {tplId ? getTemplateName(tplId) : 'Custom message'}
                  </li>
                );
              })}
              {selectedContacts.length === 0 && selectedGroups.length === 0 && manualRecipients.length === 0 && (
                <li className="text-gray-400">No recipients selected</li>
              )}
            </ul>
          </div>
        </div>

        {/* Column 3: Message & Send */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Message</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Text
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
              rows={6}
              placeholder="Type your message... Use {name} for personalization"
            />
          </div>

          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreview((p) => !p)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-whatsapp mb-3"
          >
            <Eye size={14} />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          {showPreview && message && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Message Preview (sample: "David")
              </p>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <MessageCircle
                  size={14}
                  className="inline mr-1.5 text-whatsapp"
                />
                <span className="text-sm text-gray-700 whitespace-pre-wrap">
                  {message.replace(/\{name\}/g, 'David')}
                </span>
              </div>
              {globalTemplate && (
                <p className="text-xs text-gray-400 mt-2">
                  Template: {getTemplateName(globalTemplate)}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto space-y-3">
            {/* Recipient summary */}
            <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <span>Total recipients (est.)</span>
              <span className="font-semibold">{totalRecipients}</span>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors disabled:opacity-50 font-semibold"
            >
              {sending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </button>

            {/* Progress Bar */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    {sending ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : progress.failed > 0 ? (
                      <XCircle size={10} className="text-red-500" />
                    ) : (
                      <CheckCircle2 size={10} className="text-green-500" />
                    )}
                    {sending ? 'Sending...' : 'Complete'}
                  </span>
                  <span>
                    {progress.sent} / {progress.total}
                    {progress.failed > 0 && (
                      <span className="text-red-500 ml-1">
                        ({progress.failed} failed)
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={clsx(
                      'h-2.5 rounded-full transition-all duration-500',
                      progress.failed > 0 ? 'bg-yellow-500' : 'bg-whatsapp'
                    )}
                    style={{
                      width: `${
                        progress.total
                          ? (progress.sent / progress.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Contact Modal */}
      {showQuickAdd && (
        <QuickAddContactModal
          onClose={() => setShowQuickAdd(false)}
          onAdded={handleQuickAddContact}
        />
      )}
    </div>
  );
}
