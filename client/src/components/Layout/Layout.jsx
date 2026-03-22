import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '../../hooks/useSocket';
import useWhatsAppStore, { initWhatsAppSocketListeners } from '../../store/useWhatsAppStore';
import useApprovalStore from '../../store/useApprovalStore';
import api from '../../hooks/useApi';

export default function Layout() {
  const { socket } = useSocket();
  const fetchApprovals = useApprovalStore((s) => s.fetchApprovals);
  const setStatus = useWhatsAppStore((s) => s.setStatus);

  useEffect(() => {
    if (socket) {
      initWhatsAppSocketListeners(socket);
    }
  }, [socket]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Poll WhatsApp status globally
  useEffect(() => {
    const fetchWAStatus = async () => {
      try {
        const res = await api.get('/whatsapp/status');
        setStatus(res.data.status || 'disconnected');
      } catch {}
    };

    fetchWAStatus();
    const interval = setInterval(fetchWAStatus, 15000);
    return () => clearInterval(interval);
  }, [setStatus]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
