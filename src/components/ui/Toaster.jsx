import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore.js';
import { cn } from '../../lib/utils.js';

const ICONS = { success: CheckCircle2, default: Info, warning: AlertTriangle, error: AlertTriangle };
const TONES = { success: 'text-good', default: 'text-brand', warning: 'text-warn', error: 'text-bad' };

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 lg:bottom-6" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone] || Info;
        return (
          <div key={t.id} className="pointer-events-auto flex animate-slide-in-right items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-pop">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONES[t.tone])} />
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            {t.action && (
              <button
                type="button"
                className="text-xs font-semibold text-brand hover:underline"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Fechar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
