import { create } from 'zustand';
import { getSocket } from '../hooks/useSocket';

const useWhatsAppStore = create((set) => ({
  status: 'disconnected',
  qrCode: null,

  setStatus: (status) => set({ status }),
  setQR: (qrCode) => set({ qrCode }),
}));

export function initWhatsAppSocketListeners(socket) {
  if (!socket) return;

  socket.on('whatsapp:status', (data) => {
    useWhatsAppStore.getState().setStatus(data.status);
  });

  socket.on('whatsapp:qr', (data) => {
    useWhatsAppStore.getState().setQR(data.qr);
  });

  socket.on('whatsapp:ready', () => {
    useWhatsAppStore.getState().setStatus('connected');
    useWhatsAppStore.getState().setQR(null);
  });

  socket.on('whatsapp:disconnected', () => {
    useWhatsAppStore.getState().setStatus('disconnected');
  });
}

export default useWhatsAppStore;
