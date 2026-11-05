import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import {
  CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Columns3, Copy, Moon, Pencil, Plus, Repeat, Square, Trash2,
  TriangleAlert, Link2, Leaf,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { confirmAction, toast, useUiStore } from '../store/useUiStore.js';
import { useCategoryMap, useOccurrences } from '../hooks/useData.js';
import { Button, Segmented } from '../components/ui/primitives.jsx';
import { QuickCreatePopover } from '../components/calendar/QuickCreatePopover.jsx';
import { TemplatesModal } from '../components/calendar/TemplatesModal.jsx';
import { CategoryFilter, ConflictList, SmartPlanner, WeekLoad } from '../components/calendar/AgendaSidebar.jsx';
import { addDays, addMinutes, atTime, dateKey, eachDay, fmt, fromKey, startOfDay, weekRange } from '../lib/dates.js';
import { findConflicts, freeSlotsForDay, restIntervals, sleepIntervals, freeMinutes } from '../lib/scheduling.js';
import { describeRecurrence } from '../lib/recurrence.js';
import { cn, formatMinutes, readableText } from '../lib/utils.js';
import { createPortal } from 'react-dom';

const VIEWS = [
  { value: 'timeGridDay', label: 'Dia', icon: Square },
  { value: 'timeGridWeek', label: 'Semana', icon: Columns3 },
  { value: 'dayGridMonth', label: 'Mês', icon: CalendarDays },
];

const loadHidden = () => {
  try {
    return JSON.parse(localStorage.getItem('rotina:hidden-categories') || '[]');
  } catch {
    return [];
  }
};

export default function Agenda() {
  const [params, setParams] = useSearchParams();
  const calRef = useRef(null);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const catMap = useCategoryMap();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const initialView = params.get('view') || (isMobile ? 'timeGridDay' : 'timeGridWeek');
  const initialDate = params.get('date') || dateKey(new Date());
  const [view, setView] = useState(initialView);
  const [range, setRange] = useState(() => {
    const w = weekRange(fromKey(initialDate), 1);
    return { start: addDays(w.start, -7), end: addDays(w.end, 8), title: '', currentStart: w.start };
  });
  const [selection, setSelection] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [hidden, setHidden] = useState(loadHidden);

  const api = () => calRef.current?.getApi();

  // navegação vinda da busca/notificações (?date=...&view=...)
  useEffect(() => {
    const date = params.get('date');
    const v = params.get('view');
    const a = api();
    if (!a) return;
    if (v && v !== a.view.type) a.changeView(v);
    if (date) a.gotoDate(fromKey(date));
  }, [params]);

  const occurrences = useOccurrences(range.start, range.end);
  const visibleOcc = useMemo(() => occurrences.filter((o) => !hidden.includes(o.categoryId)), [occurrences, hidden]);
  const conflictIds = useMemo(() => findConflicts(visibleOcc).ids, [visibleOcc]);
  const isTimeGrid = view !== 'dayGridMonth';

  const freeByDay = useMemo(() => {
    const map = {};
    for (const d of eachDay(range.start, addDays(range.end, -1))) map[dateKey(d)] = freeMinutes(d, occurrences, settings);
    return map;
  }, [occurrences, range.start, range.end, settings]);

  const fcEvents = useMemo(() => {
    const list = visibleOcc.map((o) => {
      const cat = catMap[o.categoryId];
      const color = cat?.color || '#64748b';
      return {
        id: o.id,
        title: o.title,
        start: o.start,
        end: o.end,
        allDay: o.allDay,
        backgroundColor: color,
        borderColor: color,
        textColor: readableText(color),
        classNames: conflictIds.has(o.id) ? ['ev-conflict'] : [],
        extendedProps: { occ: o, categoryName: cat?.name },
      };
    });
    if (isTimeGrid) {
      for (const d of eachDay(range.start, addDays(range.end, -1))) {
        if (settings.calendar?.showSleep) {
          sleepIntervals(d, settings).forEach((s, i) =>
            list.push({ id: `sleep-${dateKey(d)}-${i}`, start: s.start, end: s.end, display: 'background', title: 'Sono', classNames: ['ev-sleep'] }),
          );
          restIntervals(d, settings).forEach((s, i) =>
            list.push({ id: `rest-${dateKey(d)}-${i}`, start: s.start, end: s.end, display: 'background', title: s.label, classNames: ['ev-sleep'] }),
          );
        }
        if (settings.calendar?.showFree) {
          freeSlotsForDay(d, occurrences, settings, { bufferMin: 0, minMinutes: 30 }).forEach((s, i) =>
            list.push({ id: `free-${dateKey(d)}-${i}`, start: s.start, end: s.end, display: 'background', title: `Livre · ${formatMinutes(s.minutes, { short: true })}`, classNames: ['ev-free'] }),
          );
        }
      }
    }
    return list;
  }, [visibleOcc, occurrences, catMap, conflictIds, isTimeGrid, range.start, range.end, settings]);

  // ---------- interações ----------
  const handleChange = useCallback(async (info) => {
    const occ = info.event.extendedProps.occ;
    const store = useAppStore.getState();
    const prevEvents = store.events;
    const start = info.event.start;
    const end = info.event.end || (info.event.allDay ? addDays(start, 1) : addMinutes(start, (occ.end - occ.start) / 60000));
    const allDayChanged = info.event.allDay !== occ.allDay;
    const undo = { label: 'Desfazer', onClick: () => useAppStore.setState({ events: prevEvents }) };

    if (occ.recurring) {
      if (allDayChanged) {
        info.revert();
        return toast('Para transformar uma série em "dia inteiro", use o editor da atividade.', { tone: 'warning' });
      }
      const scope = await confirmAction({
        title: 'Mover atividade recorrente',
        message: `"${occ.title}" se repete (${describeRecurrence(store.events.find((e) => e.id === occ.eventId)?.recurrence)}).`,
        tone: 'info',
        choices: [
          { value: 'one', label: 'Somente esta ocorrência', description: `Para ${fmt(start, "EEE, d 'de' MMM 'às' HH:mm")}` },
          { value: 'all', label: 'Toda a série', description: 'Aplica o mesmo deslocamento a todas as ocorrências' },
        ],
      });
      if (!scope) return info.revert();
      store.moveOccurrence(occ, start, end, scope);
    } else if (allDayChanged) {
      store.updateEvent(occ.eventId, { start: start.toISOString(), end: end.toISOString(), allDay: info.event.allDay });
    } else {
      store.moveOccurrence(occ, start, end, 'one');
    }
    const durationChanged = Math.round((end - start) / 60000) !== Math.round((occ.end - occ.start) / 60000);
    toast(
      durationChanged ? `Duração ajustada para ${formatMinutes((end - start) / 60000)}` : `Movida para ${fmt(start, info.event.allDay ? "EEE, d 'de' MMM" : "EEE, d 'de' MMM 'às' HH:mm")}`,
      { tone: 'success', action: undo },
    );
  }, []);

  const handleSelect = useCallback((info) => {
    let { start, end, allDay } = info;
    const days = Math.round((end - start) / 86400000);
    if (info.view.type === 'dayGridMonth' && days <= 1) {
      // no mês, um clique em um dia sugere um horário (09:00–10:00)
      start = atTime(start, '09:00');
      end = atTime(start, '10:00');
      allDay = false;
    }
    setSelection({ start, end, allDay, x: info.jsEvent?.clientX, y: info.jsEvent?.clientY });
  }, []);

  const closeSelection = useCallback(() => {
    setSelection(null);
    api()?.unselect();
  }, []);

  const toggleHidden = (id) => {
    const next = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
    setHidden(next);
    try {
      localStorage.setItem('rotina:hidden-categories', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const changeView = (v) => {
    api()?.changeView(v);
    setView(v);
    params.set('view', v);
    setParams(params, { replace: true });
  };

  const renderEvent = (arg) => {
    if (arg.event.display === 'background') return <div className="fc-event-title">{arg.event.title}</div>;
    const occ = arg.event.extendedProps.occ;
    if (!occ) {
      // "espelho" da seleção/arraste
      return <div className="px-1 text-[11px] font-semibold">{arg.timeText || 'Nova atividade'}</div>;
    }
    const conflict = conflictIds.has(occ.id);
    const mins = (arg.event.end - arg.event.start) / 60000;
    if (arg.view.type === 'dayGridMonth' && !arg.event.allDay) {
      return (
        <div className="flex min-w-0 items-center gap-1 overflow-hidden px-0.5 text-[11px]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: arg.event.backgroundColor }} />
          <span className="shrink-0 tabular-nums text-muted">{arg.timeText}</span>
          <span className="truncate text-ink">{arg.event.title}</span>
          {conflict && <TriangleAlert className="h-3 w-3 shrink-0 text-bad" />}
        </div>
      );
    }
    return (
      <div className="flex h-full min-w-0 flex-col overflow-hidden leading-tight">
        <div className="flex items-center gap-1">
          {conflict && <TriangleAlert className="h-3 w-3 shrink-0" />}
          <span className="truncate font-semibold">{arg.event.title}</span>
          {occ.recurring && <Repeat className="h-2.5 w-2.5 shrink-0 opacity-70" />}
          {occ.taskId && <Link2 className="h-2.5 w-2.5 shrink-0 opacity-70" />}
        </div>
        {!arg.event.allDay && mins >= 45 && <span className="truncate text-[10px] opacity-80">{arg.timeText}{occ.location ? ` · ${occ.location}` : ''}</span>}
      </div>
    );
  };

  const weekStart = weekRange(range.currentStart || new Date(), 1).start;

  return (
    <div className="space-y-4">
      {/* Barra de ferramentas */}
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="mr-2 hidden whitespace-nowrap text-xl font-semibold tracking-tight text-ink sm:block">Minha Agenda</h1>
          <div className="flex items-center rounded-xl border border-line bg-surface">
            <button type="button" className="rounded-l-xl p-2 text-ink-2 hover:bg-surface-2" onClick={() => api()?.prev()} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className="border-x border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2" onClick={() => api()?.today()}>
              Hoje
            </button>
            <button type="button" className="rounded-r-xl p-2 text-ink-2 hover:bg-surface-2" onClick={() => api()?.next()} aria-label="Próximo">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="truncate text-sm font-semibold cap-first text-ink sm:text-base">{range.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={view} onChange={changeView} options={VIEWS} />
          <button
            type="button"
            onClick={() => updateSettings({ calendar: { showFree: !settings.calendar?.showFree } })}
            className={cn('flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition', settings.calendar?.showFree ? 'border-good/40 bg-good/10 text-good' : 'border-line text-muted hover:text-ink')}
            title="Destacar horários livres"
          >
            <Leaf className="h-3.5 w-3.5" /> Livres
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ calendar: { showSleep: !settings.calendar?.showSleep } })}
            className={cn('flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition', settings.calendar?.showSleep ? 'border-brand-2/40 bg-brand-2/10 text-brand-2' : 'border-line text-muted hover:text-ink')}
            title="Mostrar sono e descansos"
          >
            <Moon className="h-3.5 w-3.5" /> Sono/descanso
          </button>
          <Button icon={CalendarRange} onClick={() => setTemplatesOpen(true)}>
            <span className="hidden sm:inline">Rotina semanal</span>
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => openEventEditor({ defaults: {} })}>
            <span className="hidden sm:inline">Nova atividade</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr_340px]">
        <div className="card p-2 sm:p-3">
          <FullCalendar
            ref={calRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            locale={ptBrLocale}
            initialView={initialView}
            initialDate={initialDate}
            headerToolbar={false}
            firstDay={settings.weekStartsOn ?? 1}
            height={isTimeGrid ? 'max(560px, calc(100vh - 210px))' : 'auto'}
            slotMinTime={settings.calendar?.slotMinTime || '06:00'}
            slotMaxTime={settings.calendar?.slotMaxTime === '24:00' ? '24:00:00' : settings.calendar?.slotMaxTime || '24:00:00'}
            scrollTime={`${String(Math.max(0, new Date().getHours() - 1)).padStart(2, '0')}:00:00`}
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            allDayText="dia todo"
            nowIndicator
            editable
            selectable
            selectMirror
            dayMaxEvents={3}
            longPressDelay={350}
            eventMinHeight={22}
            events={fcEvents}
            eventContent={renderEvent}
            eventClick={(info) => {
              if (info.event.display === 'background' || !info.event.extendedProps.occ) return;
              info.jsEvent.preventDefault();
              openEventEditor({ occurrence: info.event.extendedProps.occ });
            }}
            eventDidMount={(info) => {
              if (info.event.display === 'background' || info.isMirror) return;
              const occ = info.event.extendedProps.occ;
              if (!occ) return;
              info.el.title = `${info.event.title}${info.event.extendedProps.categoryName ? ` · ${info.event.extendedProps.categoryName}` : ''}`;
              info.el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                setCtx({ x: e.clientX, y: e.clientY, occ });
              });
            }}
            eventDrop={handleChange}
            eventResize={handleChange}
            select={handleSelect}
            datesSet={(info) => {
              setView(info.view.type);
              setRange({ start: info.start, end: info.end, title: info.view.title, currentStart: info.view.currentStart });
            }}
            dayHeaderContent={(arg) => {
              if (arg.view.type === 'dayGridMonth') return <span>{fmt(arg.date, 'EEE')}</span>;
              const free = freeByDay[dateKey(arg.date)];
              return (
                <div className="flex flex-col items-center leading-tight">
                  <span className={cn('text-[11px] uppercase', arg.isToday ? 'text-brand' : 'text-muted')}>{fmt(arg.date, 'EEE')}</span>
                  <span className={cn('mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-semibold', arg.isToday ? 'gradient-brand text-white' : 'text-ink')}>
                    {fmt(arg.date, 'd')}
                  </span>
                  {free != null && <span className="mt-0.5 text-[10px] font-medium text-good">{formatMinutes(free, { short: true })} livres</span>}
                </div>
              );
            }}
          />
          <p className="px-2 pt-2 text-[11px] text-muted">
            Dica: selecione um intervalo para criar · arraste para reagendar · puxe a borda inferior para ajustar a duração · clique com o botão direito para duplicar.
          </p>
        </div>

        <div className="grid content-start gap-5 md:grid-cols-2 2xl:grid-cols-1">
          <SmartPlanner />
          <WeekLoad
            occurrences={occurrences}
            from={view === 'timeGridDay' ? range.start : weekStart}
            onPickDay={(d) => {
              api()?.changeView('timeGridDay', d);
            }}
          />
          <ConflictList occurrences={visibleOcc} onOpen={(occ) => openEventEditor({ occurrence: occ })} />
          <CategoryFilter hidden={hidden} onToggle={toggleHidden} />
        </div>
      </div>

      {selection && <QuickCreatePopover selection={selection} onClose={closeSelection} />}
      {ctx && <EventContextMenu ctx={ctx} onClose={() => setCtx(null)} />}
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} weekStart={weekStart} />
    </div>
  );
}

function EventContextMenu({ ctx, onClose }) {
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && onClose();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);
  const { occ } = ctx;
  const store = useAppStore.getState();
  const dup = (offset) => {
    const copy = store.duplicateOccurrence(occ, offset);
    if (copy) toast(`Duplicada para ${fmt(copy.start, "EEE, d 'de' MMM 'às' HH:mm")}`, { tone: 'success', action: { label: 'Desfazer', onClick: () => store.deleteEvent(copy.id) } });
    onClose();
  };
  const remove = async () => {
    onClose();
    if (occ.recurring) {
      const scope = await confirmAction({
        title: 'Excluir atividade recorrente',
        choices: [
          { value: 'one', label: 'Somente esta ocorrência' },
          { value: 'future', label: 'Esta e as próximas' },
          { value: 'all', label: 'Toda a série', danger: true },
        ],
      });
      if (scope) store.deleteOccurrence(occ, scope);
    } else if (await confirmAction({ title: 'Excluir atividade?', message: `"${occ.title}" será removida.`, confirmLabel: 'Excluir' })) {
      store.deleteEvent(occ.eventId);
    }
  };
  const items = [
    { label: 'Editar', icon: Pencil, onClick: () => { onClose(); openEventEditor({ occurrence: occ }); } },
    { label: 'Duplicar para amanhã', icon: Copy, onClick: () => dup(1) },
    { label: 'Duplicar na próxima semana', icon: Copy, onClick: () => dup(7) },
    { label: 'Adiar 1 dia', icon: ChevronRight, onClick: () => { store.moveOccurrence(occ, addDays(occ.start, 1), addDays(occ.end, 1), 'one'); onClose(); } },
    { label: 'Excluir', icon: Trash2, onClick: remove, danger: true },
  ];
  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 min-w-[220px] animate-slide-up rounded-xl border border-line bg-surface p-1 shadow-pop"
      style={{ left: Math.min(ctx.x, window.innerWidth - 240), top: Math.min(ctx.y, window.innerHeight - 240) }}
    >
      <p className="truncate px-2.5 pb-1 pt-1.5 text-xs font-semibold text-muted">{occ.title}</p>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.onClick}
          className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm', it.danger ? 'text-bad hover:bg-bad/10' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}
        >
          <it.icon className="h-4 w-4" /> {it.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
