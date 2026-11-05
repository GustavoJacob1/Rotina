import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings2 } from 'lucide-react';
import { Button } from '../ui/primitives.jsx';
import { useAppStore } from '../../store/useAppStore.js';
import { toast, useUiStore } from '../../store/useUiStore.js';
import { fmt, timeOf } from '../../lib/dates.js';
import { cn } from '../../lib/utils.js';

/** Criação instantânea ao selecionar um horário no calendário: só título + categoria. */
export function QuickCreatePopover({ selection, onClose }) {
  const categories = useAppStore((s) => s.categories);
  const addEvent = useAppStore((s) => s.addEvent);
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(selection.categoryId || 'cat_estudos');
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => !ref.current?.contains(e.target) && onClose();
    const onKey = (e) => e.key === 'Escape' && onClose();
    setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const create = () => {
    addEvent({ title: title.trim() || 'Nova atividade', categoryId, start: selection.start.toISOString(), end: selection.end.toISOString(), allDay: selection.allDay });
    toast('Atividade criada', { tone: 'success' });
    onClose();
  };

  const w = 320;
  const x = Math.min(Math.max(12, (selection.x ?? window.innerWidth / 2) - w / 2), window.innerWidth - w - 12);
  const y = Math.min(Math.max(12, (selection.y ?? window.innerHeight / 3) + 12), window.innerHeight - 260);

  return createPortal(
    <div ref={ref} className="fixed z-50 animate-slide-up rounded-2xl border border-line bg-surface p-3 shadow-pop" style={{ left: x, top: y, width: w }}>
      <p className="mb-2 text-xs cap-first text-muted">
        {fmt(selection.start, "EEEE, d 'de' MMM")}
        {!selection.allDay && ` · ${timeOf(selection.start)}–${timeOf(selection.end)}`}
      </p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && create()}
        placeholder="Título da atividade"
        className="field h-10 font-medium"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            title={c.name}
            className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]', categoryId === c.id ? 'text-ink' : 'border-transparent text-muted hover:text-ink')}
            style={categoryId === c.id ? { borderColor: c.color, background: `${c.color}22` } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.name.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          icon={Settings2}
          onClick={() => {
            onClose();
            openEventEditor({ defaults: { title, categoryId, start: selection.start, end: selection.end, allDay: selection.allDay } });
          }}
        >
          Mais opções
        </Button>
        <Button size="sm" variant="primary" onClick={create}>
          Criar
        </Button>
      </div>
    </div>,
    document.body,
  );
}
