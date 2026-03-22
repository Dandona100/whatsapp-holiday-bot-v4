import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  FolderOpen,
  Palette,
  Calendar,
  CheckCircle,
  Send,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import useApprovalStore from '../../store/useApprovalStore';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/groups', icon: FolderOpen, label: 'Groups' },
  { to: '/templates', icon: Palette, label: 'Templates' },
  { to: '/schedules', icon: Calendar, label: 'Schedules' },
  { to: '/approvals', icon: CheckCircle, label: 'Approvals', showBadge: true },
  { to: '/send', icon: Send, label: 'Send Now' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pendingCount = useApprovalStore((s) => s.pendingCount);

  return (
    <aside
      className={clsx(
        'h-screen bg-gray-900 text-white flex flex-col transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <span className="text-lg font-bold text-whatsapp">WA Bot</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-700 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors relative',
                isActive
                  ? 'bg-whatsapp/20 text-whatsapp'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            {item.showBadge && pendingCount > 0 && (
              <span
                className={clsx(
                  'bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center',
                  collapsed
                    ? 'absolute -top-1 -right-1 w-5 h-5'
                    : 'ml-auto w-5 h-5'
                )}
              >
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
