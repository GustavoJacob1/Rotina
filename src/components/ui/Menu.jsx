import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils.js';

/** Menu suspenso simples. items: [{ label, icon, onClick, danger, divider }] */
export function Menu({ trigger, items, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-[200px] animate-slide-up overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.filter(Boolean).map((item, i) =>
            item.divider ? (
              <div key={`d${i}`} className="my-1 h-px bg-line" />
            ) : item.heading ? (
              <div key={`h${i}`} className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {item.heading}
              </div>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick?.();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                  item.danger ? 'text-bad hover:bg-bad/10' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )}
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
