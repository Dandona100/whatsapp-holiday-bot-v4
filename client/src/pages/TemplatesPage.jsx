import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Image,
  Search,
  Filter,
  Eye,
  Upload,
  Loader2,
  Type,
  Palette,
  ExternalLink,
  ChevronDown,
  Download,
} from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';

const EVENT_TYPES = [
  'shabbat',
  'rosh_hashana',
  'yom_kippur',
  'sukkot',
  'chanukah',
  'purim',
  'pesach',
  'shavuot',
  'independence_day',
  'custom',
];

const CANVA_EVENT_TYPES = [
  'shabbat',
  'rosh_hashana',
  'yom_kippur',
  'sukkot',
  'simchat_torah',
  'chanukah',
  'purim',
  'pesach',
  'yom_haatzmaut',
  'shavuot',
];

const eventColors = {
  shabbat: 'bg-blue-100 text-blue-700',
  rosh_hashana: 'bg-yellow-100 text-yellow-700',
  yom_kippur: 'bg-gray-100 text-gray-700',
  sukkot: 'bg-green-100 text-green-700',
  chanukah: 'bg-indigo-100 text-indigo-700',
  purim: 'bg-pink-100 text-pink-700',
  pesach: 'bg-orange-100 text-orange-700',
  shavuot: 'bg-teal-100 text-teal-700',
  independence_day: 'bg-blue-100 text-blue-700',
  custom: 'bg-purple-100 text-purple-700',
  simchat_torah: 'bg-emerald-100 text-emerald-700',
  yom_haatzmaut: 'bg-sky-100 text-sky-700',
};

const formatEventType = (t) =>
  (t || 'custom').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function TemplateModal({ template, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    eventType: 'custom',
    messageText: '',
    status: 'active',
    fontFamily: 'Arial',
    fontSize: 24,
    fontColor: '#FFFFFF',
    nameX: 50,
    nameY: 50,
    localFallbackPath: '',
    ...template,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(
    template?.localFallbackPath || template?.imageUrl || ''
  );

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    setImagePreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const res = await api.post('/templates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const path = res.data.path || res.data.url || '';
      setForm((prev) => ({ ...prev, localFallbackPath: path }));
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // Error handled in parent
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">
            {template?.id ? 'Edit Template' : 'Add Template'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
                placeholder="Template name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={form.eventType}
                onChange={(e) => updateField('eventType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatEventType(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Text
            </label>
            <textarea
              value={form.messageText}
              onChange={(e) => updateField('messageText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
              rows={3}
              placeholder="Use {name} for personalization"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Image
            </label>
            <div className="flex items-start gap-4">
              <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600 w-fit">
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Upload Image
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {form.localFallbackPath && (
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                    {form.localFallbackPath}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Font Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Type size={14} />
              Font Settings (Local Fallback)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Font Family
                </label>
                <input
                  type="text"
                  value={form.fontFamily}
                  onChange={(e) => updateField('fontFamily', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-whatsapp outline-none"
                  placeholder="Arial"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Font Size
                </label>
                <input
                  type="number"
                  value={form.fontSize}
                  onChange={(e) =>
                    updateField('fontSize', parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-whatsapp outline-none"
                  min={8}
                  max={200}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Font Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.fontColor}
                    onChange={(e) => updateField('fontColor', e.target.value)}
                    className="w-8 h-8 border-0 cursor-pointer rounded"
                  />
                  <input
                    type="text"
                    value={form.fontColor}
                    onChange={(e) => updateField('fontColor', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-whatsapp outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Name X Position
                </label>
                <input
                  type="number"
                  value={form.nameX}
                  onChange={(e) =>
                    updateField('nameX', parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-whatsapp outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Name Y Position
                </label>
                <input
                  type="number"
                  value={form.nameY}
                  onChange={(e) =>
                    updateField('nameY', parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-whatsapp outline-none"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ template, onClose }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPreviewUrl(`/api/templates/${template.id}/preview-image?name=${encodeURIComponent('דוד כהן')}&t=${Date.now()}`);
    setLoading(false);
  }, [template.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Preview: {template.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-[200px] flex items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              Generating preview...
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Template preview"
              className="max-w-full max-h-[400px] rounded-lg shadow-sm"
            />
          ) : (
            <div className="text-center text-gray-400">
              <Image size={48} className="mx-auto mb-2" />
              <p className="text-sm">No preview image returned</p>
              {template.messageText && (
                <div className="mt-4 bg-green-50 rounded-lg p-3 text-left text-sm text-gray-700">
                  {template.messageText.replace(/\{name\}/g, 'David Cohen')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CanvaDesignConfig({ design, onClose, onSave }) {
  const [form, setForm] = useState({
    name: design.title || design.name || '',
    eventType: 'shabbat',
    placeholderField: '{NAME}',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/templates/canva/designs/${design.id}/use`, {
        name: form.name,
        eventType: form.eventType,
        placeholderField: form.placeholderField,
      });
      toast.success('Canva design saved as template');
      onSave();
    } catch {
      toast.error('Failed to save Canva design as template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-10 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-800">
            Use as Template
          </h4>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Thumbnail preview */}
        {design.thumbnail && (
          <div className="mb-4 rounded-lg overflow-hidden border border-gray-100">
            <img
              src={typeof design.thumbnail === 'string' ? design.thumbnail : design.thumbnail?.url}
              alt={design.title}
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Event Type
            </label>
            <select
              value={form.eventType}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, eventType: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
            >
              {CANVA_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatEventType(t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Placeholder Field
            </label>
            <input
              type="text"
              value={form.placeholderField}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  placeholderField: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
              placeholder="{NAME}"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-3 py-1.5 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark disabled:opacity-50 text-sm font-medium"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Saving...
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CanvaBrowserModal({ onClose, onDesignSaved }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [continuation, setContinuation] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [configDesign, setConfigDesign] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImportUrl = async () => {
    const url = importUrl.trim();
    if (!url) return;
    const designMatch = url.match(/design\/([A-Za-z0-9_-]+)/);
    const brandMatch = url.match(/brand-templates\/([A-Za-z0-9_-]+)/);
    const match = designMatch || brandMatch;
    if (!match) {
      toast.error('Invalid Canva URL');
      return;
    }
    const isBrandTemplate = !!brandMatch;
    setImporting(true);
    try {
      const res = await api.post(`/templates/canva/designs/${match[1]}/use`, {
        eventType: 'shabbat',
        placeholderField: '{NAME}',
        brandTemplateId: isBrandTemplate ? match[1] : undefined,
      });
      toast.success(`Template "${res.data.template?.name || 'Imported'}" created!`);
      setImportUrl('');
      onDesignSaved();
      onClose();
    } catch (err) {
      toast.error('Import failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setImporting(false);
    }
  };

  const searchDesigns = async (query, continueToken = null) => {
    if (!continueToken) {
      setLoading(true);
      setDesigns([]);
      setError('');
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (continueToken) params.set('continuation', continueToken);

      const res = await api.get(
        `/templates/canva/designs${params.toString() ? `?${params}` : ''}`
      );
      const newDesigns = res.data.designs || [];
      const newContinuation = res.data.continuation || null;

      if (continueToken) {
        setDesigns((prev) => [...prev, ...newDesigns]);
      } else {
        setDesigns(newDesigns);
      }
      setContinuation(newContinuation);
    } catch {
      setError('Failed to fetch Canva designs');
      toast.error('Failed to fetch Canva designs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchDesigns(searchQuery);
  };

  const handleLoadMore = () => {
    if (continuation) {
      searchDesigns(searchQuery, continuation);
    }
  };

  const handleDesignSaved = () => {
    setConfigDesign(null);
    onDesignSaved();
    onClose();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Load initial designs on mount
  useEffect(() => {
    searchDesigns('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40" style={{ left: '256px' }}>
      <div className="bg-gray-50 w-full h-full flex flex-col relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Palette size={20} className="text-purple-600" />
            <h3 className="text-lg font-bold text-gray-800">
              Browse Canva Designs
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-3 max-w-3xl">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your Canva designs..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Search
            </button>
            <a
              href={`https://www.canva.com/search/templates?q=${encodeURIComponent(searchQuery || 'שבת שלום ברכה')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <ExternalLink size={14} />
              Search Canva Templates
            </a>
          </form>
          <div className="flex gap-3 max-w-3xl items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste Canva design URL to import..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none text-sm"
              />
            </div>
            <button
              onClick={handleImportUrl}
              disabled={!importUrl.trim() || importing}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Import
            </button>
          </div>
          <p className="text-xs text-gray-400 max-w-3xl">
            Search shows your designs. To import a new template: open <a href={`https://www.canva.com/search/templates?q=${encodeURIComponent(searchQuery || 'שבת שלום')}`} target="_blank" rel="noopener noreferrer" className="text-teal-500 underline">Canva Templates</a>, find one you like, click "Customize", then paste the URL here.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-purple-500 mb-3" />
              <p className="text-gray-500 text-sm">Loading Canva designs...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-500 text-sm mb-3">{error}</p>
              <button
                onClick={() => searchDesigns(searchQuery)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                Retry
              </button>
            </div>
          ) : designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Palette size={48} className="mb-3" />
              <p className="text-sm">
                No designs found. Try a different search term.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {designs.map((design) => (
                  <div
                    key={design.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {/* Thumbnail — click to open in Canva */}
                    <a
                      href={design.editUrl || design.viewUrl || `https://www.canva.com/design/${design.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative cursor-pointer"
                    >
                      {design.thumbnail ? (
                        <img
                          src={typeof design.thumbnail === 'string' ? design.thumbnail : design.thumbnail?.url}
                          alt={design.title || 'Canva design'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Palette size={32} className="text-gray-300" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ExternalLink size={24} className="text-white" />
                      </div>
                    </a>

                    {/* Info */}
                    <div className="p-3">
                      <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">
                        {design.title || 'Untitled'}
                      </h4>
                      {(design.updatedAt || design.updated_at) && (
                        <p className="text-[10px] text-gray-400 mb-2">
                          {formatDate(design.updatedAt || design.updated_at)}
                        </p>
                      )}
                      <button
                        onClick={() => setConfigDesign(design)}
                        className="w-full px-2 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                      >
                        Use as Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {continuation && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium shadow-sm transition-colors"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        Load More
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Config overlay */}
          {configDesign && (
            <CanvaDesignConfig
              design={configDesign}
              onClose={() => setConfigDesign(null)}
              onSave={handleDesignSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showCanvaBrowser, setShowCanvaBrowser] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      setTemplates(res.data.templates || res.data || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (eventFilter) {
      list = list.filter((t) => t.eventType === eventFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => (t.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [templates, search, eventFilter]);

  const handleSave = async (form) => {
    if (form.id) {
      await api.put(`/templates/${form.id}`, form);
      toast.success('Template updated');
    } else {
      await api.post('/templates', form);
      toast.success('Template created');
    }
    fetchTemplates();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleImportUrl = async () => {
    const url = importUrl.trim();
    if (!url) return;

    const designMatch = url.match(/design\/([A-Za-z0-9_-]+)/);
    const brandMatch = url.match(/brand-templates\/([A-Za-z0-9_-]+)/);
    const match = designMatch || brandMatch;
    if (!match) {
      toast.error('Invalid Canva URL');
      return;
    }

    const designId = match[1];
    setImporting(true);
    try {
      const res = await api.post(`/templates/canva/designs/${designId}/use`, {
        eventType: 'shabbat',
        placeholderField: '{NAME}',
      });
      toast.success(`Template "${res.data.template?.name || 'Imported'}" created!`);
      setImportUrl('');
      fetchTemplates();
    } catch (err) {
      toast.error('Import failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setImporting(false);
    }
  };

  const handleToggleStatus = async (template) => {
    const newStatus = template.status === 'active' ? 'draft' : 'active';
    try {
      await api.put(`/templates/${template.id}`, {
        ...template,
        status: newStatus,
      });
      toast.success(
        `Template ${newStatus === 'active' ? 'activated' : 'deactivated'}`
      );
      fetchTemplates();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Templates</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCanvaBrowser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Palette size={16} />
            Browse Canva
          </button>
          <button
            onClick={() => {
              setEditTemplate(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
          />
        </div>
        <div className="relative">
          <Filter
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm appearance-none bg-white"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEventType(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-whatsapp" />
          <span className="ml-2 text-gray-500">Loading templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16">
          <Image size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">
            {templates.length === 0
              ? 'No templates yet. Create your first one.'
              : 'No templates match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="h-36 bg-gray-50 flex items-center justify-center relative group">
                {(t.localFallbackPath || t.local_fallback_path || t.svgTemplatePath || t.svg_template_path) ? (
                  <img
                    src={`/api/templates/${t.id}/preview-image?name=${encodeURIComponent('ישראל')}`}
                    alt={t.name}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : t.canvaDesignId || t.canva_design_id ? (
                  <div className="text-center p-2">
                    <Palette size={28} className="text-purple-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Canva design</p>
                  </div>
                ) : (
                  <Image size={36} className="text-gray-200" />
                )}
                {/* Preview overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => setPreviewTemplate(t)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">
                      {t.name}
                    </h3>
                    {t.canvaDesignId && (
                      <a
                        href={`https://www.canva.com/design/${t.canvaDesignId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-semibold hover:bg-purple-100 transition-colors"
                        title="Edit in Canva"
                      >
                        <Palette size={9} />
                        Canva
                        <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0 ml-2">
                    <button
                      onClick={() => {
                        setEditTemplate(t);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Event badge */}
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    eventColors[t.eventType] || eventColors.custom
                  }`}
                >
                  {formatEventType(t.eventType)}
                </span>

                {/* Message preview */}
                {t.messageText && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {t.messageText}
                  </p>
                )}

                {/* Font summary */}
                {(t.fontFamily || t.fontSize) && (
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Type size={10} />
                    {t.fontFamily || 'Default'}
                    {t.fontSize ? ` / ${t.fontSize}px` : ''}
                  </p>
                )}

                {/* Status toggle */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      t.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : t.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {t.status || 'active'}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      t.status === 'active' ? 'bg-whatsapp' : 'bg-gray-300'
                    }`}
                    title={
                      t.status === 'active' ? 'Deactivate' : 'Activate'
                    }
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        t.status === 'active'
                          ? 'translate-x-4.5 left-0'
                          : 'translate-x-0.5 left-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <TemplateModal
          template={editTemplate}
          onClose={() => {
            setShowModal(false);
            setEditTemplate(null);
          }}
          onSave={handleSave}
        />
      )}

      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {showCanvaBrowser && (
        <CanvaBrowserModal
          onClose={() => setShowCanvaBrowser(false)}
          onDesignSaved={fetchTemplates}
        />
      )}
    </div>
  );
}
