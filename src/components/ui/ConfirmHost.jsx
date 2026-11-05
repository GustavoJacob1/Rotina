import { AlertTriangle } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore.js';
import { Modal } from './Modal.jsx';
import { Button } from './primitives.jsx';
import { cn } from '../../lib/utils.js';

/**
 * Diálogo de confirmação global. Suporta escolhas múltiplas (ex.: "só esta ocorrência" / "toda a série")
 * via `choices: [{ value, label, description }]`.
 */
export function ConfirmHost() {
  const c = useUiStore((s) => s.confirmState);
  const resolve = useUiStore((s) => s.resolveConfirm);
  if (!c) return null;
  const danger = c.tone === 'danger';

  return (
    <Modal open onClose={() => resolve(false)} size="sm" initialFocus={false}>
      <div className="flex gap-3">
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', danger ? 'bg-bad/10 text-bad' : 'bg-brand/10 text-brand')}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink">{c.title}</h2>
          {c.message && <p className="mt-1 text-sm leading-relaxed text-muted">{c.message}</p>}
        </div>
      </div>
      {c.choices ? (
        <div className="mt-4 space-y-2">
          {c.choices.map((ch) => (
            <button
              key={ch.value}
              type="button"
              onClick={() => resolve(ch.value)}
              className={cn(
                'w-full rounded-xl border border-line px-4 py-2.5 text-left transition-colors hover:border-brand/50 hover:bg-surface-2',
                ch.danger && 'hover:border-bad/50',
              )}
            >
              <span className={cn('block text-sm font-medium', ch.danger ? 'text-bad' : 'text-ink')}>{ch.label}</span>
              {ch.description && <span className="block text-xs text-muted">{ch.description}</span>}
            </button>
          ))}
          <Button variant="ghost" className="w-full" onClick={() => resolve(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => resolve(false)}>
            Cancelar
          </Button>
          <Button data-autofocus variant={danger ? 'danger' : 'primary'} onClick={() => resolve(true)}>
            {c.confirmLabel}
          </Button>
        </div>
      )}
    </Modal>
  );
}
