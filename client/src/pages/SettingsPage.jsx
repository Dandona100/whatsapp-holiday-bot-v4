import { useEffect, useState } from 'react';
import {
  Save, MessageCircle, Zap, Bell, Cloud, Users, Database,
  ExternalLink, Check, X, Loader2, Send,
} from 'lucide-react';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';

function Section({ icon: Icon, title, children, onSave, saving }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Icon size={18} className="text-whatsapp" />
          {title}
        </h3>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-whatsapp' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, min, helpText }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value, 10) || 0 : e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp outline-none text-sm"
        placeholder={placeholder}
        min={min}
      />
      {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-whatsapp focus:ring-whatsapp"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [canvaConnected, setCanvaConnected] = useState(false);
  const [canvaProviders, setCanvaProviders] = useState([]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get('/settings');
        const s = res.data.settings || res.data || {};
        setSettings({
          whatsapp: {
            rateLimit: 30,
            delayMin: 3000,
            delayMax: 8000,
            maxRetries: 3,
            ...s.whatsapp,
          },
          autoReply: {
            enabled: false,
            adminPhone: '',
            cooldownHours: 24,
            approvalTimeout: 240,
            autoAddContacts: true,
            notifyVia: ['whatsapp', 'websocket'],
            ...s.autoReply,
            activeWindow: { start: '07:00', end: '22:00', ...s.autoReply?.activeWindow },
          },
          telegram: {
            botToken: '',
            chatId: '',
            ...s.telegram,
          },
          google: s.google || null,
          canva: s.canva || null,
        });
        if (s.google && s.google.connectedAt) {
          setGoogleStatus('connected');
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();

    // Fetch Canva status
    api.get('/templates/canva/status').then((res) => {
      const providers = res.data.providers || [];
      setCanvaProviders(providers);
      setCanvaConnected(providers.some((p) => p.name === 'api' && p.available));
    }).catch(() => {});

    // Check URL params for Canva OAuth result
    const params = new URLSearchParams(window.location.search);
    if (params.get('canva') === 'success') {
      toast.success('Canva connected successfully!');
      window.history.replaceState({}, '', '/settings');
    } else if (params.get('canva') === 'error' || params.get('canva') === 'token_error') {
      toast.error('Canva connection failed');
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const handleDisconnectCanva = async () => {
    try {
      await api.post('/templates/canva/disconnect');
      setCanvaConnected(false);
      toast.success('Canva disconnected');
    } catch (err) {
      toast.error('Failed to disconnect Canva');
    }
  };

  const handleConnectCanva = async () => {
    try {
      const res = await api.get('/templates/canva/auth');
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      toast.error('Failed to start Canva connection: ' + (err.response?.data?.error || err.message));
    }
  };

  const saveSection = async (section) => {
    setSavingSection(section);
    try {
      await api.put('/settings', { [section]: settings[section] });
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingSection('');
    }
  };

  const update = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const updateNested = (section, parent, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: { ...prev[section][parent], [key]: value },
      },
    }));
  };

  const toggleNotifyChannel = (channel) => {
    setSettings((prev) => {
      const current = prev.autoReply.notifyVia || [];
      const next = current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel];
      return {
        ...prev,
        autoReply: { ...prev.autoReply, notifyVia: next },
      };
    });
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await api.get('/contacts/import/google/auth');
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Google OAuth not configured';
      toast.error(msg);
    }
  };

  const handleTelegramTest = async () => {
    setTestingTelegram(true);
    try {
      await api.post('/settings/telegram/test');
      toast.success('Test message sent to Telegram');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Telegram test failed');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      await api.post('/settings/backup');
      toast.success('Backup initiated');
    } catch {
      toast.error('Backup failed');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await api.get('/settings/backup/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'backup.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Backup download not available');
    }
  };

  if (loading || !settings) {
    return <div className="text-center text-gray-400 py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>

      {/* WhatsApp Settings */}
      <Section
        icon={MessageCircle}
        title="WhatsApp"
        onSave={() => saveSection('whatsapp')}
        saving={savingSection === 'whatsapp'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Rate Limit (messages/min)"
            type="number"
            value={settings.whatsapp.rateLimit}
            onChange={(v) => update('whatsapp', 'rateLimit', v)}
            min={1}
          />
          <Input
            label="Min Delay (ms)"
            type="number"
            value={settings.whatsapp.delayMin}
            onChange={(v) => update('whatsapp', 'delayMin', v)}
            min={0}
            helpText="Minimum pause between messages"
          />
          <Input
            label="Max Delay (ms)"
            type="number"
            value={settings.whatsapp.delayMax}
            onChange={(v) => update('whatsapp', 'delayMax', v)}
            min={0}
            helpText="Maximum pause between messages"
          />
          <Input
            label="Max Retries"
            type="number"
            value={settings.whatsapp.maxRetries}
            onChange={(v) => update('whatsapp', 'maxRetries', v)}
            min={0}
          />
        </div>
      </Section>

      {/* Auto-Reply Settings */}
      <Section
        icon={Zap}
        title="Auto-Reply"
        onSave={() => saveSection('autoReply')}
        saving={savingSection === 'autoReply'}
      >
        <div className="space-y-4">
          <Toggle
            value={settings.autoReply.enabled}
            onChange={(v) => update('autoReply', 'enabled', v)}
            label="Enable Auto-Reply"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Admin Phone Number"
              value={settings.autoReply.adminPhone}
              onChange={(v) => update('autoReply', 'adminPhone', v)}
              placeholder="+972..."
            />
            <Input
              label="Cooldown (hours)"
              type="number"
              value={settings.autoReply.cooldownHours}
              onChange={(v) => update('autoReply', 'cooldownHours', v)}
              min={0}
            />
            <Input
              label="Approval Timeout (minutes)"
              type="number"
              value={settings.autoReply.approvalTimeout}
              onChange={(v) => update('autoReply', 'approvalTimeout', v)}
              min={1}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Active Window Start"
              type="time"
              value={settings.autoReply.activeWindow.start}
              onChange={(v) => updateNested('autoReply', 'activeWindow', 'start', v)}
            />
            <Input
              label="Active Window End"
              type="time"
              value={settings.autoReply.activeWindow.end}
              onChange={(v) => updateNested('autoReply', 'activeWindow', 'end', v)}
            />
          </div>

          <Toggle
            value={settings.autoReply.autoAddContacts}
            onChange={(v) => update('autoReply', 'autoAddContacts', v)}
            label="Auto-add new contacts from incoming messages"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notification Channels</label>
            <div className="flex gap-4">
              <Checkbox
                label="WhatsApp"
                checked={(settings.autoReply.notifyVia || []).includes('whatsapp')}
                onChange={() => toggleNotifyChannel('whatsapp')}
              />
              <Checkbox
                label="WebSocket"
                checked={(settings.autoReply.notifyVia || []).includes('websocket')}
                onChange={() => toggleNotifyChannel('websocket')}
              />
              <Checkbox
                label="Telegram"
                checked={(settings.autoReply.notifyVia || []).includes('telegram')}
                onChange={() => toggleNotifyChannel('telegram')}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Canva Integration */}
      <Section icon={Cloud} title="Canva Integration">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">API Status:</span>
              {canvaConnected ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Check size={14} /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <X size={14} /> Not connected
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {canvaConnected && (
                <button
                  onClick={handleDisconnectCanva}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={handleConnectCanva}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
              >
                {canvaConnected ? 'Reconnect' : 'Connect Canva'}
              </button>
            </div>
          </div>
          {canvaProviders.length > 0 && (
            <div className="flex gap-3">
              {canvaProviders.map((p) => (
                <span key={p.name} className="flex items-center gap-1 text-sm">
                  <span className={`w-2 h-2 rounded-full ${p.available ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={p.available ? 'text-gray-700' : 'text-gray-400'}>{p.name.toUpperCase()}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Google Contacts */}
      <Section icon={Users} title="Google Contacts">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Status:</span>
            {googleStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check size={14} /> Connected
                {settings.google?.connectedAt && (
                  <span className="text-xs text-gray-400 ml-1">
                    (since {new Date(settings.google.connectedAt).toLocaleDateString()})
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <X size={14} /> Not connected
              </span>
            )}
          </div>
          <button
            onClick={handleGoogleConnect}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <ExternalLink size={14} />
            {googleStatus === 'connected' ? 'Re-import Contacts' : 'Connect Google Contacts'}
          </button>
          <p className="text-xs text-gray-400">
            Connects to your Google account and imports contacts with phone numbers.
          </p>
        </div>
      </Section>

      {/* Telegram Settings */}
      <Section
        icon={Bell}
        title="Telegram Notifications"
        onSave={() => saveSection('telegram')}
        saving={savingSection === 'telegram'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bot Token"
              value={settings.telegram.botToken}
              onChange={(v) => update('telegram', 'botToken', v)}
              placeholder="123456:ABC-DEF..."
            />
            <Input
              label="Chat ID"
              value={settings.telegram.chatId}
              onChange={(v) => update('telegram', 'chatId', v)}
              placeholder="-1001234567890"
            />
          </div>
          <button
            onClick={handleTelegramTest}
            disabled={testingTelegram}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
          >
            {testingTelegram ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Send Test Message
          </button>
        </div>
      </Section>

      {/* Backup */}
      <Section icon={Database} title="Backup">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreateBackup}
            disabled={creatingBackup}
            className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors text-sm disabled:opacity-50"
          >
            {creatingBackup ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            Create Backup
          </button>
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Save size={14} />
            Download Backup
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Creates a snapshot of all contacts, groups, templates, and settings.
        </p>
      </Section>

      {/* Version Footer */}
      <div className="text-center text-xs text-gray-400 pt-4 pb-2 border-t border-gray-100">
        WhatsApp Holiday Bot v1.3.0 | Built with{' '}
        <a
          href="https://claude.ai/code"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-700 underline"
        >
          Claude Code
        </a>
        {' '}|{' '}
        <a
          href="https://github.com/Dandona100/whatsapp-holiday-bot-v4"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-700 underline"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
