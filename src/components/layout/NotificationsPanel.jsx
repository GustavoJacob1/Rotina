import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, AlertOctagon, BellOff, CalendarClock, CheckCheck, Flame, GraduationCap, Target, X, Layers } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore.js';
import { useAppStore } from '../../store/useAppStore.js';
import { useAlerts } from '../../hooks/useData.js';
import { Button, EmptyState } from '../ui/primitives.jsx';
import { cn } from '../../lib/utils.js';

const KIND_ICON = { conflict: Layers, overload: Flame, overdue: AlertOctagon, deadline: AlarmClock, exam: GraduationCap, goal: Target, upcoming: CalendarClock };
const SEVERITY = {
  critical: { label: 'Importante', className: 'bg-bad/10 text-bad' },
  warning: { label: 'Atenção', className: 'bg-warn/10 text-warn' },
  info: { label: 'Info', className: 'bg-brand/10 text-brand' },
};

export function AlertItem({ alert, onOpen, onDismiss, compact }) {
  const Icon = KIND_ICON[alert.kind] || AlarmClock;
  const sev = SEVERITY[alert.severity];
  return (
    <div className={cn('group flex gap-3 rounded-xl border border-line bg-surface-2/40 p-3 transition hover:bg-surface-2', compact && 'p-2.5')}>
      <div className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', sev.className)}>
        <Icon className="h-4 w-4" />
      </div>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <p className="text-sm font-medium text-ink">{alert.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{alert.message}</p>
      </button>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="self-start rounded-md p-1 text-muted opacity-60 hover:bg-surface-3 hover:text-ink group-hover:opacity-100" aria-label="Dispensar aviso" title="Dispensar">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function NotificationsPanel() {
  const open = useUiStore((s) => s.notificationsOpen);
  const setOpen = useUiStore((s) => s.setNotificationsOpen);
  const dismissAlert = useAppStore((s) => s.dismissAlert);
  const dismissAlerts = useAppStore((s) => s.dismissAlerts);
  const { active } = useAlerts();
  const navigate = useNavigate();
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col border-l border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Notificações</h2>
            <p className="text-xs text-muted">Avisos gerados a partir da sua agenda, tarefas e metas</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-4">
          {active.length === 0 ? (
            <EmptyState icon={BellOff} title="Tudo em dia!" description="Nenhum aviso no momento. Conflitos de horário, prazos próximos e metas atrasadas aparecerão aqui." />
          ) : (
            active.map((a) => (
              <AlertItem
                key={a.id}
                alert={a}
                onOpen={() => {
                  setOpen(false);
                  navigate(a.to);
                }}
                onDismiss={() => dismissAlert(a.id)}
              />
            ))
          )}
        </div>
        {active.length > 0 && (
          <div className="border-t border-line p-4">
            <Button variant="secondary" className="w-full" icon={CheckCheck} onClick={() => dismissAlerts(active.map((a) => a.id))}>
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
