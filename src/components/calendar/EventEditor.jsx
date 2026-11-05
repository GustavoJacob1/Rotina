import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Copy, MapPin, Repeat, Sparkles, Trash2, ChevronDown, Link2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button, Field, Input, Select, Textarea, Toggle } from '../ui/primitives.jsx';
import { Menu } from '../ui/Menu.jsx';
import { CategoryPicker, WeekdayPicker } from '../ui/Pickers.jsx';
import { SlotSuggestions } from '../planner/SlotSuggestions.jsx';
import { useAppStore } from '../../store/useAppStore.js';
import { confirmAction, toast, useUiStore } from '../../store/useUiStore.js';
import { useOccurrences } from '../../hooks/useData.js';
import { addDays, addMinutes, atTime, dateKey, fromKey, startOfDay, timeOf, toDate, fmt } from '../../lib/dates.js';
import { findConflicts, suggestSlots } from '../../lib/scheduling.js';
import { describeRecurrence, expandEvents } from '../../lib/recurrence.js';
import { cn, formatMinutes } from '../../lib/utils.js';

function buildForm(occurrence, event, defaults) {
  if (occurrence && event) {
    const start = toDate(occurrence.start);
    const end = toDate(occurrence.end);
    const rec = event.recurrence;
    let repeat = 'none';
    if (rec?.freq === 'daily') repeat = 'daily';
    else if (rec?.freq === 'weekly') repeat = [...(rec.daysOfWeek || [])].sort().join(',') === '1,2,3,4,5' ? 'weekdays' : 'weekly';
    return {
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      categoryId: event.categoryId,
      subjectId: event.subjectId || '',
      allDay: Boolean(event.allDay),
      date: dateKey(start),
      endDate: event.allDay ? dateKey(addDays(end, -1)) : dateKey(start),
      startTime: event.allDay ? '09:00' : timeOf(start),
      endTime: event.allDay ? '10:00' : timeOf(end),
      repeat,
      daysOfWeek: rec?.daysOfWeek?.length ? rec.daysOfWeek : [start.getDay()],
      until: rec?.until || '',
    };
  }
  const start = defaults?.start ? toDate(defaults.start) : addMinutes(startOfDay(new Date()), Math.ceil((new Date().getHours() * 60 + new Date().getMinutes() + 1) / 30) * 30);
  const end = defaults?.end ? toDate(defaults.end) : addMinutes(start, 60);
  return {
    title: defaults?.title || '',
    description: defaults?.description || '',
    location: '',
    categoryId: defaults?.categoryId || 'cat_pessoal',
    subjectId: defaults?.subjectId || '',
    allDay: Boolean(defaults?.allDay),
    date: dateKey(start),
    endDate: defaults?.allDay ? dateKey(addDays(end, -1)) : dateKey(start),
    startTime: timeOf(start),
    endTime: timeOf(end),
    repeat: 'none',
    daysOfWeek: [start.getDay()],
    until: '',
  };
}

/** Converte o formulário em { start, end, allDay, recurrence } */
function formTimes(form) {
  if (form.allDay) {
    const start = fromKey(form.date);
    const last = form.endDate && form.endDate >= form.date ? fromKey(form.endDate) : start;
    return { start, end: addDays(last, 1) };
  }
  const start = atTime(fromKey(form.date), form.startTime);
  let end = atTime(fromKey(form.date), form.endTime);
  if (end <= start) end = addDays(end, 1); // atravessa a meia-noite
  return { start, end };
}

function formRecurrence(form) {
  if (form.repeat === 'none') return null;
  const until = form.until || null;
  if (form.repeat === 'daily') return { freq: 'daily', interval: 1, until };
  if (form.repeat === 'weekdays') return { freq: 'weekly', interval: 1, daysOfWeek: [1, 2, 3, 4, 5], until };
  return { freq: 'weekly', interval: 1, daysOfWeek: form.daysOfWeek.length ? form.daysOfWeek : [fromKey(form.date).getDay()], until };
}

export function EventEditor() {
  const payload = useUiStore((s) => s.eventEditor);
  const close = useUiStore((s) => s.closeEventEditor);
  const openTaskEditor = useUiStore((s) => s.openTaskEditor);
  const events = useAppStore((s) => s.events);
  const subjects = useAppStore((s) => s.subjects);
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const store = useAppStore.getState;

  const occurrence = payload?.occurrence || null;
  const event = occurrence ? events.find((e) => e.id === occurrence.eventId) : null;
  const isEdit = Boolean(occurrence && event);
  const [form, setForm] = useState(() => buildForm(occurrence, event, payload?.defaults));
  const [showMore, setShowMore] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    if (payload) {
      const f = buildForm(occurrence, event, payload.defaults);
      setForm(f);
      setShowMore(Boolean(f.description || f.location));
      setShowSuggest(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const { start, end } = formTimes(form);
  const duration = Math.round((end - start) / 60000);

  // conflitos ao vivo com o horário escolhido
  const dayOcc = useOccurrences(startOfDay(start), addDays(startOfDay(start), 2));
  const conflicts = useMemo(() => {
    if (form.allDay) return [];
    const self = { id: '__self', eventId: event?.id || '__new', start, end, allDay: false, title: form.title };
    const others = dayOcc.filter((o) => o.id !== occurrence?.id && !(occurrence && !occurrence.recurring && o.eventId === occurrence.eventId));
    return findConflicts([...others, self]).pairs.filter(([a, b]) => a.id === '__self' || b.id === '__self').map(([a, b]) => (a.id === '__self' ? b : a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOcc, start.getTime(), end.getTime(), form.allDay]);

  if (!payload) return null;
  const linkedTask = event?.taskId ? tasks.find((t) => t.id === event.taskId) : null;

  const save = async () => {
    const title = form.title.trim() || 'Sem título';
    const recurrence = formRecurrence(form);
    const base = {
      title,
      description: form.description,
      location: form.location,
      categoryId: form.categoryId,
      subjectId: form.subjectId || null,
      allDay: form.allDay,
    };

    if (!isEdit) {
      store().addEvent({ ...base, start: start.toISOString(), end: end.toISOString(), recurrence, taskId: payload.defaults?.taskId || null });
      toast(recurrence ? `Atividade recorrente criada (${describeRecurrence(recurrence)})` : 'Atividade criada', { tone: 'success' });
      return close();
    }

    if (occurrence.recurring) {
      const scope = await confirmAction({
        title: 'Editar atividade recorrente',
        message: 'Esta atividade faz parte de uma série. Onde aplicar as alterações?',
        tone: 'info',
        choices: [
          { value: 'one', label: 'Somente nesta ocorrência', description: fmt(occurrence.start, "EEEE, d 'de' MMMM") },
          { value: 'all', label: 'Em toda a série', description: 'Título, categoria, horário e repetição' },
        ],
      });
      if (!scope) return;
      if (scope === 'one') {
        store().detachOccurrence(occurrence, { ...base, start: start.toISOString(), end: end.toISOString() });
      } else {
        // série: mantém a data de início original e aplica o novo horário do dia
        const seriesDay = startOfDay(toDate(event.start));
        const sStart = form.allDay ? seriesDay : atTime(seriesDay, form.startTime);
        const sEnd = form.allDay ? addDays(seriesDay, 1) : addMinutes(sStart, duration);
        store().updateEvent(event.id, {
          ...base,
          start: (recurrence ? sStart : start).toISOString(),
          end: (recurrence ? sEnd : end).toISOString(),
          recurrence,
        });
      }
    } else {
      store().updateEvent(event.id, { ...base, start: start.toISOString(), end: end.toISOString(), recurrence, exdates: event.exdates || [] });
    }
    if (linkedTask && linkedTask.title !== title) store().updateTask(linkedTask.id, { title });
    toast('Alterações salvas', { tone: 'success' });
    close();
  };

  const remove = async () => {
    if (occurrence.recurring) {
      const scope = await confirmAction({
        title: 'Excluir atividade recorrente',
        message: `"${event.title}" se repete (${describeRecurrence(event.recurrence)}).`,
        choices: [
          { value: 'one', label: 'Excluir somente esta ocorrência', description: fmt(occurrence.start, "EEEE, d 'de' MMMM") },
          { value: 'future', label: 'Excluir esta e as próximas' },
          { value: 'all', label: 'Excluir toda a série', danger: true },
        ],
      });
      if (!scope) return;
      store().deleteOccurrence(occurrence, scope);
    } else {
      const ok = await confirmAction({ title: 'Excluir atividade?', message: `"${event.title}" será removida da agenda.`, confirmLabel: 'Excluir' });
      if (!ok) return;
      const snapshot = { ...event };
      store().deleteEvent(event.id);
      toast('Atividade excluída', { action: { label: 'Desfazer', onClick: () => useAppStore.setState((s) => ({ events: [...s.events, snapshot] })) } });
    }
    close();
  };

  const duplicate = (offset) => {
    const copy = store().duplicateOccurrence(occurrence, offset);
    if (copy) toast(`Atividade duplicada para ${fmt(copy.start, "EEE, d 'de' MMM 'às' HH:mm")}`, { tone: 'success' });
    close();
  };

  const reschedule = (offsetDays) => {
    const ns = addDays(toDate(occurrence.start), offsetDays);
    const ne = addDays(toDate(occurrence.end), offsetDays);
    store().moveOccurrence(occurrence, ns, ne, 'one');
    toast(`Reagendada para ${fmt(ns, "EEE, d 'de' MMM")}`, { tone: 'success' });
    close();
  };

  const rescheduleNextFree = () => {
    const from = new Date(Math.max(Date.now(), toDate(occurrence.end).getTime()));
    const occ = useAppStore.getState().events;
    const slots = suggestSlots({
      durationMin: duration,
      occurrences: dayOccAll(occ, from).filter((o) => o.eventId !== event.id),
      settings,
      from,
      days: 14,
      limit: 1,
    });
    if (!slots[0]) return toast('Nenhum horário livre encontrado nos próximos 14 dias', { tone: 'warning' });
    store().moveOccurrence(occurrence, slots[0].start, slots[0].end, 'one');
    toast(`Reagendada para ${fmt(slots[0].start, "EEE, d 'de' MMM 'às' HH:mm")}`, { tone: 'success' });
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title={isEdit ? 'Editar atividade' : 'Nova atividade'}
      description={isEdit && event.recurrence ? `Recorrente · ${describeRecurrence(event.recurrence)}` : undefined}
      footer={
        <>
          {isEdit && (
            <div className="mr-auto flex flex-wrap gap-1.5">
              <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={remove}>
                Excluir
              </Button>
              <Menu
                align="left"
                trigger={<Button variant="ghost" size="sm" icon={Copy}>Duplicar</Button>}
                items={[
                  { label: 'Mesmo horário, amanhã', onClick: () => duplicate(1) },
                  { label: 'Mesmo horário, próxima semana', onClick: () => duplicate(7) },
                  { label: 'Mesmo dia e horário (cópia)', onClick: () => duplicate(0) },
                ]}
              />
              <Menu
                align="left"
                trigger={<Button variant="ghost" size="sm" icon={CalendarClock}>Reagendar</Button>}
                items={[
                  { label: 'Próximo horário livre', icon: Sparkles, onClick: rescheduleNextFree },
                  { divider: true },
                  { label: 'Adiar 1 dia', onClick: () => reschedule(1) },
                  { label: 'Adiar 1 semana', onClick: () => reschedule(7) },
                  { label: 'Antecipar 1 dia', onClick: () => reschedule(-1) },
                ]}
              />
            </div>
          )}
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save}>
            {isEdit ? 'Salvar' : 'Criar atividade'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Input
          data-autofocus
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="O que você vai fazer? Ex.: Estudar Node.js"
          className="h-11 text-base font-medium"
        />

        <Field label="Categoria">
          <CategoryPicker value={form.categoryId} onChange={(categoryId) => set({ categoryId })} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(e) => e.target.value && set({ date: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })} />
          </Field>
          {form.allDay ? (
            <Field label="Até" className="sm:col-span-2">
              <Input type="date" value={form.endDate} min={form.date} onChange={(e) => set({ endDate: e.target.value })} />
            </Field>
          ) : (
            <>
              <Field label="Início">
                <Input
                  type="time"
                  value={form.startTime}
                  step={300}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    // mantém a duração ao mudar o início
                    const newStart = atTime(fromKey(form.date), v);
                    set({ startTime: v, endTime: timeOf(addMinutes(newStart, duration)) });
                  }}
                />
              </Field>
              <Field label={`Fim · ${formatMinutes(duration)}`}>
                <Input type="time" value={form.endTime} step={300} onChange={(e) => e.target.value && set({ endTime: e.target.value })} />
              </Field>
            </>
          )}
        </div>

        {!form.allDay && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted">Duração:</span>
            {[30, 60, 90, 120, 180].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set({ endTime: timeOf(addMinutes(start, m)) })}
                className={cn('rounded-lg px-2 py-1 text-xs font-medium transition', duration === m ? 'bg-brand/15 text-brand' : 'bg-surface-2 text-ink-2 hover:text-ink')}
              >
                {formatMinutes(m, { short: true })}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSuggest((v) => !v)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-2 hover:bg-brand-2/10"
            >
              <Sparkles className="h-3.5 w-3.5" /> {showSuggest ? 'Ocultar sugestões' : 'Sugerir horário livre'}
            </button>
          </div>
        )}

        {showSuggest && !form.allDay && (
          <SlotSuggestions
            durationMin={duration}
            excludeEventId={event?.id}
            selected={start}
            onPick={(s) => set({ date: dateKey(s.start), startTime: timeOf(s.start), endTime: timeOf(s.end) })}
          />
        )}

        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2.5 text-xs text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
            <div>
              <p className="font-semibold">Conflito de horário</p>
              <p className="text-ink-2">
                Sobrepõe {conflicts.map((c) => `"${c.title}" (${timeOf(c.start)}–${timeOf(c.end)})`).join(', ')}.{' '}
                <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setShowSuggest(true)}>
                  Ver horários livres
                </button>
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
          <Toggle checked={form.allDay} onChange={(allDay) => set({ allDay })} label="Dia inteiro" description="Prazos, provas, feriados" />
          <Field label={<span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" /> Repetir</span>}>
            <Select value={form.repeat} onChange={(e) => set({ repeat: e.target.value })}>
              <option value="none">Não se repete</option>
              <option value="daily">Todos os dias</option>
              <option value="weekdays">Segunda a sexta</option>
              <option value="weekly">Semanal (escolher dias)</option>
            </Select>
          </Field>
          {form.repeat === 'weekly' && (
            <div className="sm:col-span-2">
              <WeekdayPicker value={form.daysOfWeek} onChange={(daysOfWeek) => set({ daysOfWeek })} />
            </div>
          )}
          {form.repeat !== 'none' && (
            <Field label="Repetir até (opcional)" className="sm:col-span-2" hint={isEdit && occurrence.recurring ? 'Ao editar “toda a série”, a data de início original é mantida; o novo horário vale para todas as ocorrências.' : undefined}>
              <Input type="date" value={form.until} min={form.date} onChange={(e) => set({ until: e.target.value })} />
            </Field>
          )}
        </div>

        {subjects.length > 0 && (
          <Field label="Vincular a uma disciplina/tecnologia (conta como estudo planejado)">
            <Select value={form.subjectId} onChange={(e) => set({ subjectId: e.target.value })}>
              <option value="">Nenhuma</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {linkedTask && (
          <button
            type="button"
            onClick={() => {
              close();
              openTaskEditor({ taskId: linkedTask.id });
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2 text-left text-xs text-ink-2 hover:border-brand/40"
          >
            <Link2 className="h-3.5 w-3.5 text-brand" /> Vinculada à tarefa <span className="font-semibold text-ink">{linkedTask.title}</span>
          </button>
        )}

        <button type="button" onClick={() => setShowMore((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
          <ChevronDown className={cn('h-3.5 w-3.5 transition', showMore && 'rotate-180')} /> Descrição e local
        </button>
        {showMore && (
          <div className="grid gap-3">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Local (opcional)" className="pl-9" />
            </div>
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Anotações, links, objetivos..." />
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

// ocorrências dos próximos 15 dias a partir de `from` (usado no "próximo horário livre")
function dayOccAll(events, from) {
  return expandEvents(events, startOfDay(from), addDays(startOfDay(from), 16));
}
