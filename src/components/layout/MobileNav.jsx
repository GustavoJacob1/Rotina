import { NavLink } from 'react-router-dom';
import { CalendarDays, Flame, KanbanSquare, LayoutDashboard, MoreHorizontal, X } from 'lucide-react';
import { Logo, NavList } from './Sidebar.jsx';
import { cn } from '../../lib/utils.js';

const TABS = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/tarefas', label: 'Tarefas', icon: KanbanSquare },
  { to: '/habitos', label: 'Hábitos', icon: Flame },
];

export function MobileTabBar({ onMore }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-brand' : 'text-muted')}
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
      <button type="button" onClick={onMore} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted">
        <MoreHorizontal className="h-5 w-5" />
        Mais
      </button>
    </nav>
  );
}

export function MobileDrawer({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-72 animate-slide-in-right flex-col border-r border-line bg-surface p-4 shadow-pop">
        <div className="mb-4 flex items-center justify-between">
          <Logo />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavList onNavigate={onClose} />
      </div>
    </div>
  );
}
