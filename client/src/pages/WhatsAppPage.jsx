import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Power, PowerOff, QrCode, Loader2, Users, Download, FolderSync, MessageCircle } from 'lucide-react';
import api from '../hooks/useApi';
import useWhatsAppStore from '../store/useWhatsAppStore';
import toast from 'react-hot-toast';

export default function WhatsAppPage() {
  const status = useWhatsAppStore((s) => s.status);
  const qrCode = useWhatsAppStore((s) => s.qrCode);
  const setQR = useWhatsAppStore((s) => s.setQR);
  const setStatus = useWhatsAppStore((s) => s.setStatus);
  const isConnected = status === 'connected' || status === 'ready';

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(null); // null | 'contacts' | 'groups'
  const [syncResult, setSyncResult] = useState(null);
  const [chats, setChats] = useState([]);
  const [info, setInfo] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setStatus(res.data.status || 'disconnected');
      if (res.data.qrCode) setQR(res.data.qrCode);
      if (res.data.info) setInfo(res.data.info);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
      return null;
    }
  };

  // Fetch status on mount and poll slowly
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => {
      clearInterval(interval);
      stopPolling();
    };
  }, []);

  // Show toast when status changes to connected
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (isConnected && prevStatusRef.current !== 'connected' && prevStatusRef.current !== 'ready') {
        toast.success('WhatsApp connected!');
        stopPolling();
        setLoading(false);
        setQR(null);
        fetchStatus();
        handleLoadChats();
      }
      prevStatusRef.current = status;
    }
  }, [status]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/connect');
      toast.success('Connecting... QR code will appear shortly');
      // Fast poll for QR
      stopPolling();
      pollRef.current = setInterval(async () => {
        const data = await fetchStatus();
        if (data && (data.status === 'connected' || data.status === 'ready')) {
          stopPolling();
          setLoading(false);
        }
      }, 3000);
      setTimeout(() => { stopPolling(); setLoading(false); }, 120000);
    } catch (err) {
      toast.error('Failed to connect: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/whatsapp/disconnect');
      setStatus('disconnected');
      setQR(null);
      setInfo(null);
      toast.success('Disconnected');
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  const handleSyncContacts = async () => {
    setSyncing('contacts');
    setSyncResult(null);
    try {
      const res = await api.post('/whatsapp/sync-contacts');
      setSyncResult({ type: 'contacts', ...res.data });
      toast.success(`Contacts: ${res.data.imported} new, ${res.data.updated} updated, ${res.data.skipped} skipped`);
    } catch (err) {
      toast.error('Failed to sync contacts: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncGroups = async () => {
    setSyncing('groups');
    setSyncResult(null);
    try {
      const res = await api.post('/whatsapp/sync-groups');
      setSyncResult({ type: 'groups', ...res.data });
      toast.success(`Groups: ${res.data.imported} imported, ${res.data.skipped} skipped`);
    } catch (err) {
      toast.error('Failed to sync groups: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(null);
    }
  };

  const handleLoadChats = async () => {
    try {
      const res = await api.get('/whatsapp/chats');
      setChats(res.data.chats || []);
    } catch (err) {
      toast.error('Failed to load chats');
    }
  };

  const handleSyncAll = async () => {
    setSyncing('all');
    setSyncResult(null);
    try {
      const [contactsRes, groupsRes] = await Promise.all([
        api.post('/whatsapp/sync-contacts'),
        api.post('/whatsapp/sync-groups'),
      ]);
      setSyncResult({
        type: 'all',
        contacts: contactsRes.data,
        groups: groupsRes.data,
      });
      toast.success(`Synced! Contacts: ${contactsRes.data.imported} new. Groups: ${groupsRes.data.imported} new.`);
      await handleLoadChats();
    } catch (err) {
      toast.error('Sync failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(null);
    }
  };

  const handleReconnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      await new Promise((r) => setTimeout(r, 1000));
      await api.post('/whatsapp/connect');
      toast.success('Reconnecting...');
      pollRef.current = setInterval(async () => {
        const data = await fetchStatus();
        if (data && (data.status === 'connected' || data.status === 'ready')) {
          stopPolling();
          setLoading(false);
        }
      }, 3000);
      setTimeout(() => { stopPolling(); setLoading(false); }, 120000);
    } catch (err) {
      toast.error('Failed to reconnect');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">WhatsApp Connection</h2>

      {/* Status Card */}
      <div className={`rounded-xl p-6 ${isConnected ? 'bg-green-50 border border-green-200' : status === 'connecting' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          {isConnected ? (
            <Wifi size={28} className="text-green-500" />
          ) : status === 'connecting' ? (
            <Loader2 size={28} className="text-yellow-500 animate-spin" />
          ) : (
            <WifiOff size={28} className="text-red-500" />
          )}
          <div>
            <h3 className={`text-xl font-bold ${isConnected ? 'text-green-700' : status === 'connecting' ? 'text-yellow-700' : 'text-red-700'}`}>
              {isConnected ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </h3>
            <p className="text-sm text-gray-500 capitalize">Status: {status}</p>
          </div>
        </div>

        {isConnected && info && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {info.phone && (
              <div>
                <span className="text-gray-500">Phone:</span>{' '}
                <span className="font-medium text-gray-700">{info.phone}</span>
              </div>
            )}
            {info.name && (
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                <span className="font-medium text-gray-700">{info.name}</span>
              </div>
            )}
            {info.platform && (
              <div>
                <span className="text-gray-500">Platform:</span>{' '}
                <span className="font-medium text-gray-700">{info.platform}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {isConnected ? (
          <>
            <button
              onClick={handleReconnect}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Reconnect
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <PowerOff size={16} />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {loading ? 'Connecting...' : 'Connect / Get QR'}
          </button>
        )}
      </div>

      {/* Sync Section */}
      {isConnected && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Sync from WhatsApp</h3>
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-whatsapp-dark transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <FolderSync size={16} />}
              {syncing ? 'Syncing...' : 'Sync All'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleSyncContacts}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-left"
            >
              <Users size={18} className="text-blue-500" />
              <div>
                <div className="font-medium text-sm">{syncing === 'contacts' ? 'Syncing...' : 'Sync Contacts'}</div>
                <div className="text-xs text-gray-400">Import personal contacts</div>
              </div>
            </button>
            <button
              onClick={handleSyncGroups}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-left"
            >
              <Download size={18} className="text-purple-500" />
              <div>
                <div className="font-medium text-sm">{syncing === 'groups' ? 'Syncing...' : 'Sync Groups'}</div>
                <div className="text-xs text-gray-400">Import WhatsApp groups</div>
              </div>
            </button>
            <button
              onClick={handleLoadChats}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-left"
            >
              <MessageCircle size={18} className="text-green-500" />
              <div>
                <div className="font-medium text-sm">Load Chats</div>
                <div className="text-xs text-gray-400">View recent conversations</div>
              </div>
            </button>
          </div>

          {syncResult && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              {(syncResult.type === 'contacts' || syncResult.type === 'all') && (
                <div className="flex gap-4">
                  <span className="font-medium">Contacts:</span>
                  <span className="text-green-600">{(syncResult.contacts || syncResult).imported} imported</span>
                  <span className="text-blue-600">{(syncResult.contacts || syncResult).updated} updated</span>
                  <span className="text-gray-500">{(syncResult.contacts || syncResult).skipped} skipped</span>
                </div>
              )}
              {(syncResult.type === 'groups' || syncResult.type === 'all') && (
                <div className="flex gap-4">
                  <span className="font-medium">Groups:</span>
                  <span className="text-green-600">{(syncResult.groups || syncResult).imported} imported</span>
                  <span className="text-gray-500">{(syncResult.groups || syncResult).skipped} skipped</span>
                </div>
              )}
            </div>
          )}

          {chats.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Recent Chats ({chats.length})</h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {chats.slice(0, 50).map((chat) => (
                  <div key={chat.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      {chat.isGroup ? <Users size={14} className="text-purple-400" /> : <MessageCircle size={14} className="text-green-400" />}
                      <span className="font-medium">{chat.name}</span>
                      {chat.isGroup && chat.participantCount && (
                        <span className="text-xs text-gray-400">({chat.participantCount})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {chat.unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{chat.unreadCount}</span>
                      )}
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-400 max-w-[200px] truncate">{chat.lastMessage.body}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Code */}
      {!isConnected && qrCode && (
        <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <QrCode size={20} className="text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Scan QR Code</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Open WhatsApp on your phone, go to Settings &gt; Linked Devices &gt; Link a Device
          </p>
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <img
              src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
              alt="WhatsApp QR Code"
              className="w-64 h-64"
            />
          </div>
        </div>
      )}

      {/* Loading / Waiting for QR */}
      {!isConnected && loading && !qrCode && (
        <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center">
          <Loader2 size={40} className="text-whatsapp animate-spin mb-4" />
          <p className="text-gray-600">Initializing WhatsApp client...</p>
          <p className="text-sm text-gray-400 mt-1">This may take 10-30 seconds</p>
        </div>
      )}
    </div>
  );
}
