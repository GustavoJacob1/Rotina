import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu as MenuIcon, Moon, Plus, Search, Sun, Timer } from 'lucide-react';
import { IconButton } from '../ui/primitives.jsx';
import { useUiStore } from '../../store/useUiStore.js';
import { useAppStore } from '../../store/useAppStore.js';
import { useAlerts } from '../../hooks/useData.js';
import { MODE_LABEL, usePomodoroStore } from '../../store/usePomodoroStore.js';
import { NAV_ITEMS } from './nav.js';
import { cn } from '../../lib/utils.js';
import { useEffect, useState } from 'react';

function PomodoroMini() {
  const status = usePomodoroStore((s) => s.status);
  const mode = usePomodoroStore((s) => s.mode);
  const remaining = usePomodoroStore((s) => s.remaining);
  const navigate = useNavigate();
  const [, force] = useState(0);
  useEffect(() => {
    if (status !== 'running') return undefined;
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [status]);
  if (status === 'idle') return null;
  const ms = remaining();
  const mm = String(Math.floor(ms / 60000)).padStart(2, '0');
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return (
    <button
      type="button"
      onClick={() => navigate('/estudos?tab=pomodoro')}
      className={cn(
        'hidden items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold tabular-nums sm:flex',
        mode === 'focus' ? 'border-brand/30 bg-brand/10 text-brand' : 'border-good/30 bg-good/10 text-good',
      )}
      title="Abrir Pomodoro"
    >
      <Timer className={cn('h-3.5 w-3.5', status === 'running' && 'animate-pulse')} />
      {MODE_LABEL[mode]} · {mm}:{ss}
      {status === 'paused' && <span className="font-normal opacity-70">(pausado)</span>}
    </button>
  );
}

export function Topbar({ onOpenMobileNav }) {
  const { pathname } = useLocation();
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const setNotificationsOpen = useUiStore((s) => s.setNotificationsOpen);
  const theme = useAppStore((s) => s.settings.theme);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const { active } = useAlerts();
  const important = active.filter((a) => a.severity !== 'info').length;
  const current = NAV_ITEMS.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-6">
      <IconButton icon={MenuIcon} label="Abrir menu" className="lg:hidden" onClick={onOpenMobileNav} />
      <p className="truncate text-sm font-semibold text-ink lg:hidden">{current?.label}</p>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="ml-auto flex h-9 items-center gap-2 rounded-xl border border-line bg-surface-2/70 px-3 text-sm text-muted transition hover:border-brand/40 hover:text-ink lg:ml-0 lg:w-80"
      >
        <Search className="h-4 w-4" />
        <span className="hidden truncate whitespace-nowrap lg:inline">Buscar tarefas, compromissos...</span>
        <kbd className="ml-auto hidden shrink-0 whitespace-nowrap rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium lg:inline">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-1 lg:ml-auto">
        <PomodoroMini />
        <IconButton
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
        />
        <div className="relative">
          <IconButton icon={Bell} label="Notificações" onClick={() => setNotificationsOpen(true)} />
          {active.length > 0 && (
            <span
              className={cn(
                'pointer-events-none absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white',
                important ? 'bg-bad' : 'bg-brand',
              )}
            >
              {active.length > 9 ? '9+' : active.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => openQuickAdd('event')}
          className="gradient-brand ml-1 hidden h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white shadow-sm hover:brightness-110 sm:flex lg:hidden"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>
    </header>
  );
}
