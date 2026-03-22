import { LogOut, Wifi, WifiOff } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useWhatsAppStore from '../../store/useWhatsAppStore';

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const waStatus = useWhatsAppStore((s) => s.status);
  const isConnected = waStatus === 'connected' || waStatus === 'ready';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-xl font-bold text-gray-800">
        WhatsApp Holiday Bot
      </h1>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-red-500" />
          )}
          <span
            className={isConnected ? 'text-green-600' : 'text-red-500'}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {user?.username || 'Admin'}
          </span>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
