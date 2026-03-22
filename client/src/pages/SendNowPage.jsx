import { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 100;

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

  const fetchContacts = useCallback(async (page = 1, append = false) => {
    try {
      if (page > 1) setLoadingMore(true);
      const res = await api.get('/contacts', {
        params: { limit: PAGE_SIZE, page },
      });
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

  const handleLoadMore = () => {
    fetchContacts(contactPage + 1, true);
  };

  // Filtered lists
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.displayName || c.display_name || '').toLowerCase().includes(q) ||
        (c.nameOnDesign || c.name_on_design || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
    );
  }, [contacts, contactSearch]);

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
    let count = selectedContacts.length;
    for (const gId of selectedGroups) {
      const g = groups.find((gr) => gr.id === gId);
      count += g?.contactCount || 0;
    }
    return count;
  }, [selectedContacts, selectedGroups, groups]);

  // Send handler
  const handleSend = async () => {
    if (!message.trim() && !globalTemplate) {
      toast.error('Please enter a message or select a template');
      return;
    }
    if (selectedContacts.length === 0 && selectedGroups.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSending(true);
    setProgress({ sent: 0, total: totalRecipients, failed: 0 });

    try {
      // Collect all contact IDs: selected + contacts from selected groups
      let allContactIds = [...selectedContacts];

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

      if (allContactIds.length === 0) {
        toast.error('No contacts found for selected recipients');
        setSending(false);
        return;
      }

      setProgress({ sent: 0, total: allContactIds.length, failed: 0 });

      const res = await api.post('/whatsapp/send-bulk', {
        contactIds: allContactIds.map(String),
        message: message || 'שבת שלום',
      });

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

          {/* Contacts Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users size={14} />
                Contacts
              </h4>
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

            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none"
              />
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

            {hasMoreContacts && (
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
              {selectedContacts.length === 0 && selectedGroups.length === 0 && (
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
    </div>
  );
}
