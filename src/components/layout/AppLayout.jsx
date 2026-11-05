import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Plus, Sparkles, X } from 'lucide-react';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { MobileDrawer, MobileTabBar } from './MobileNav.jsx';
import { GlobalSearch } from './GlobalSearch.jsx';
import { NotificationsPanel } from './NotificationsPanel.jsx';
import { QuickAdd } from './QuickAdd.jsx';
import { PomodoroEngine } from './PomodoroEngine.jsx';
import { EventEditor } from '../calendar/EventEditor.jsx';
import { TaskEditor } from '../tasks/TaskEditor.jsx';
import { Toaster } from '../ui/Toaster.jsx';
import { ConfirmHost } from '../ui/ConfirmHost.jsx';
import { useUiStore, confirmAction, toast } from '../../store/useUiStore.js';
import { useAppStore } from '../../store/useAppStore.js';

function DemoBanner() {
  const hasDemo = useAppStore((s) => s.hasDemoData);
  const clearDemo = useAppStore((s) => s.clearDemoData);
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('rotina:demo-banner') === 'hidden');
  if (!hasDemo || hidden) return null;
  return (
    <div className="mx-4 mt-4 flex flex-col gap-2 rounded-2xl border border-brand-2/30 bg-gradient-to-r from-brand/10 to-brand-2/10 px-4 py-3 sm:mx-6 sm:flex-row sm:items-center">
      <Sparkles className="hidden h-5 w-5 shrink-0 text-brand-2 sm:block" />
      <p className="flex-1 text-xs leading-relaxed text-ink-2 sm:text-sm">
        <b className="text-ink">Você está vendo dados de demonstração.</b> Eles servem apenas para mostrar os recursos — nenhum número representa dados reais.
        Explore à vontade e, quando quiser começar, remova-os.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-surface-2"
          onClick={async () => {
            const ok = await confirmAction({
              title: 'Remover dados de demonstração?',
              message: 'Todos os itens de exemplo (agenda, tarefas, estudos, hábitos e metas) serão apagados. O que você cadastrou será mantido.',
              confirmLabel: 'Remover exemplos',
            });
            if (ok) {
              clearDemo();
              toast('Dados de demonstração removidos. Agora é com você!', { tone: 'success' });
            }
          }}
        >
          Começar do zero
        </button>
        <button
          type="button"
          className="rounded-lg p-1.5 text-muted hover:bg-surface/60"
          aria-label="Ocultar aviso"
          onClick={() => {
            sessionStorage.setItem('rotina:demo-banner', 'hidden');
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('rotina:sidebar') === 'collapsed');
  const [drawer, setDrawer] = useState(false);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const theme = useAppStore((s) => s.settings.theme);
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme !== 'light');
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'light' ? '#f5f6fa' : '#0a0c13');
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawer(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => {
          localStorage.setItem('rotina:sidebar', collapsed ? 'expanded' : 'collapsed');
          setCollapsed(!collapsed);
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <Topbar onOpenMobileNav={() => setDrawer(true)} />
        <DemoBanner />
        <main key={pathname} className="page-enter mx-auto w-full max-w-[1600px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        onClick={() => openQuickAdd('event')}
        className="gradient-brand fixed bottom-20 right-4 z-30 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-xl shadow-brand/30 transition hover:scale-105 hover:brightness-110 lg:bottom-6 lg:right-6"
        aria-label="Adicionar rapidamente"
        title="Adicionar rapidamente (N)"
      >
        <Plus className="h-6 w-6" />
      </button>

      <MobileTabBar onMore={() => setDrawer(true)} />
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
      <GlobalSearch />
      <NotificationsPanel />
      <QuickAdd />
      <EventEditor />
      <TaskEditor />
      <ConfirmHost />
      <Toaster />
      <PomodoroEngine />
    </div>
  );
}
