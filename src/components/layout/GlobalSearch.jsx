import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckSquare, CornerDownLeft, Flame, GraduationCap, Plus, Search, Target, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { useUiStore } from '../../store/useUiStore.js';
import { expandEvents, describeRecurrence } from '../../lib/recurrence.js';
import { addDays, dateKey, fmt, startOfDay } from '../../lib/dates.js';
import { cn, normalize } from '../../lib/utils.js';
import { NAV_ITEMS } from './nav.js';
import { PRIORITIES, TASK_STATUS } from '../../lib/constants.js';

export function GlobalSearch() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const openTaskEditor = useUiStore((s) => s.openTaskEditor);
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const { tasks, events, subjects, habits, goals, exams } = useAppStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);

  // atalho Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUiStore.getState().searchOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ('');
      setIndex(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const term = normalize(q.trim());
    const match = (...fields) => !term || fields.some((f) => normalize(f).includes(term));
    const close = () => setOpen(false);
    const items = [];

    if (!term) {
      items.push(
        { group: 'Ações rápidas', icon: Plus, title: 'Nova atividade na agenda', run: () => openQuickAdd('event') },
        { group: 'Ações rápidas', icon: Plus, title: 'Nova tarefa', run: () => openQuickAdd('task') },
        { group: 'Ações rápidas', icon: Plus, title: 'Registrar estudo', run: () => openQuickAdd('study') },
      );
    }

    tasks
      .filter((t) => match(t.title, t.description, ...(t.subtasks || []).map((s) => s.title)))
      .slice(0, term ? 8 : 4)
      .forEach((t) =>
        items.push({
          group: 'Tarefas',
          icon: CheckSquare,
          title: t.title,
          meta: `${TASK_STATUS[t.status]?.label} · ${PRIORITIES[t.priority]?.label}${t.dueDate ? ` · entrega ${fmt(`${t.dueDate}T12:00:00`, 'dd/MM')}` : ''}`,
          done: t.status === 'done',
          run: () => {
            navigate('/tarefas');
            openTaskEditor({ taskId: t.id });
          },
        }),
      );

    const now = new Date();
    events
      .filter((e) => match(e.title, e.description, e.location))
      .slice(0, term ? 8 : 4)
      .forEach((e) => {
        const occ = expandEvents([e], addDays(startOfDay(now), -60), addDays(now, 180));
        const next = occ.find((o) => o.end >= now) || occ[occ.length - 1];
        items.push({
          group: 'Compromissos',
          icon: CalendarDays,
          title: e.title,
          meta: e.recurrence ? describeRecurrence(e.recurrence) : next ? fmt(next.start, "EEE, d 'de' MMM · HH:mm") : '',
          run: () => {
            if (!next) return navigate('/agenda');
            navigate(`/agenda?date=${dateKey(next.start)}&view=timeGridDay`);
            openEventEditor({ occurrence: next });
          },
        });
      });

    subjects.filter((s) => match(s.name)).slice(0, 4).forEach((s) =>
      items.push({ group: 'Estudos', icon: GraduationCap, title: s.name, meta: s.type === 'disciplina' ? 'Disciplina' : 'Tecnologia', run: () => navigate(`/estudos?subject=${s.id}`) }),
    );
    exams.filter((x) => match(x.title, x.notes)).slice(0, 4).forEach((x) =>
      items.push({ group: 'Estudos', icon: FileText, title: x.title, meta: `${x.type === 'trabalho' ? 'Trabalho' : 'Prova'} · ${fmt(`${x.date}T12:00:00`, 'dd/MM')}`, run: () => navigate('/estudos?tab=avaliacoes') }),
    );
    habits.filter((h) => match(h.name)).slice(0, 4).forEach((h) => items.push({ group: 'Hábitos', icon: Flame, title: `${h.icon} ${h.name}`, run: () => navigate('/habitos') }));
    goals.filter((g) => match(g.title)).slice(0, 4).forEach((g) => items.push({ group: 'Metas', icon: Target, title: g.title, run: () => navigate('/metas') }));
    NAV_ITEMS.filter((n) => term && match(n.label)).forEach((n) => items.push({ group: 'Ir para', icon: n.icon, title: n.label, run: () => navigate(n.to) }));

    return items.map((it) => ({ ...it, run: () => { close(); it.run(); } }));
  }, [q, tasks, events, subjects, habits, goals, exams, navigate, openTaskEditor, openEventEditor, openQuickAdd, setOpen]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      results[index]?.run();
    } else if (e.key === 'Escape') setOpen(false);
  };

  let lastGroup = null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl animate-slide-up overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar tarefas, compromissos, disciplinas, hábitos..."
            className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
        </div>
        <div className="scroll-thin max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-ink">Nada encontrado para “{q}”</p>
              <p className="mt-1 text-xs text-muted">Tente outro termo ou crie um item novo pelo botão “Adicionar”.</p>
            </div>
          )}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={`${r.group}-${r.title}-${i}`}>
                {header && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">{header}</p>}
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={r.run}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === index ? 'bg-surface-2' : '')}
                >
                  <r.icon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm text-ink', r.done && 'text-muted line-through')}>{r.title}</span>
                    {r.meta && <span className="block truncate text-xs text-muted">{r.meta}</span>}
                  </span>
                  {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
