import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { NAV_ITEMS } from './nav.js';
import { cn } from '../../lib/utils.js';
import { useUiStore } from '../../store/useUiStore.js';
import { useAppStore } from '../../store/useAppStore.js';

export function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="gradient-brand grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-lg shadow-brand/20">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12.5l4 4 8-9" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-ink">Rotina</p>
          <p className="text-[11px] text-muted">sua central do dia</p>
        </div>
      )}
    </div>
  );
}

export function NavList({ collapsed, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              collapsed && 'justify-center px-0',
              isActive ? 'bg-brand/10 text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="gradient-brand absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" />}
              <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors', isActive ? 'text-brand' : 'group-hover:text-ink')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle }) {
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const userName = useAppStore((s) => s.settings.userName);
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px] px-3' : 'w-64 px-4',
      )}
    >
      <div className={cn('flex h-16 items-center', collapsed ? 'justify-center' : 'justify-between')}>
        <Logo collapsed={collapsed} />
      </div>
      <button
        type="button"
        onClick={() => openQuickAdd('event')}
        className={cn(
          'gradient-brand mb-4 mt-1 flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110',
        )}
        title="Adicionar rapidamente (N)"
      >
        <Plus className="h-4 w-4" />
        {!collapsed && 'Adicionar'}
      </button>
      <div className="scroll-thin -mx-1 flex-1 overflow-y-auto px-1">
        <NavList collapsed={collapsed} />
      </div>
      <div className={cn('flex items-center border-t border-line py-3', collapsed ? 'flex-col gap-2' : 'justify-between')}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand/30 to-brand-2/30 text-xs font-semibold text-ink">
            {(userName || 'E').slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && <span className="truncate text-sm text-ink-2">{userName}</span>}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
