import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarPlus, CheckSquare, Settings2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button, Field, Input, Segmented, Select } from '../ui/primitives.jsx';
import { CategoryPicker, DurationPicker } from '../ui/Pickers.jsx';
import { SlotSuggestions } from '../planner/SlotSuggestions.jsx';
import { useAppStore } from '../../store/useAppStore.js';
import { toast, useUiStore } from '../../store/useUiStore.js';
import { PRIORITIES } from '../../lib/constants.js';
import { addDays, addMinutes, dateKey, fmt, timeOf } from '../../lib/dates.js';
import { formatMinutes } from '../../lib/utils.js';
import { useOccurrences } from '../../hooks/useData.js';
import { suggestSlots } from '../../lib/scheduling.js';
import { startOfDay } from 'date-fns';

/** Adição rápida: atividade, tarefa ou registro de estudo em poucos cliques. */
export function QuickAdd() {
  const open = useUiStore((s) => s.quickAddOpen);
  const tab = useUiStore((s) => s.quickAddTab);
  const close = useUiStore((s) => s.closeQuickAdd);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  // atalho de teclado "N"
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && !document.querySelector('[role=dialog]')) {
        e.preventDefault();
        openQuickAdd('event');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openQuickAdd]);

  if (!open) return null;
  return (
    <Modal open onClose={close} title="Adicionar rapidamente" description="Atalho: tecla N em qualquer tela" size="md">
      <Segmented
        className="mb-4 w-full [&>button]:flex-1 [&>button]:justify-center"
        value={tab}
        onChange={(t) => useUiStore.setState({ quickAddTab: t })}
        options={[
          { value: 'event', label: 'Atividade', icon: CalendarPlus },
          { value: 'task', label: 'Tarefa', icon: CheckSquare },
          { value: 'study', label: 'Estudo', icon: BookOpen },
        ]}
      />
      {tab === 'event' && <QuickEvent onDone={close} />}
      {tab === 'task' && <QuickTask onDone={close} />}
      {tab === 'study' && <QuickStudy onDone={close} />}
    </Modal>
  );
}

function QuickEvent({ onDone }) {
  const settings = useAppStore((s) => s.settings);
  const addEvent = useAppStore((s) => s.addEvent);
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('cat_estudos');
  const [duration, setDuration] = useState(60);
  const [slot, setSlot] = useState(null);
  const today = startOfDay(new Date());
  const occurrences = useOccurrences(today, addDays(today, 15));
  const best = useMemo(
    () => suggestSlots({ durationMin: duration, occurrences, settings, from: new Date(), days: 14, limit: 1 })[0] || null,
    [duration, occurrences, settings],
  );
  const chosen = slot || best;

  const create = () => {
    if (!chosen) return toast('Escolha um horário', { tone: 'warning' });
    addEvent({ title: title.trim() || 'Nova atividade', categoryId, start: chosen.start.toISOString(), end: addMinutes(chosen.start, duration).toISOString() });
    toast(`"${title.trim() || 'Nova atividade'}" agendada para ${fmt(chosen.start, "EEE, d 'de' MMM 'às' HH:mm")}`, { tone: 'success' });
    onDone();
  };

  return (
    <div className="space-y-4">
      <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="Ex.: Revisar SQL, Academia, Reunião..." className="h-11 text-base" />
      <Field label="Categoria">
        <CategoryPicker value={categoryId} onChange={setCategoryId} />
      </Field>
      <Field label={`Duração · ${formatMinutes(duration)}`}>
        <DurationPicker value={duration} onChange={(d) => { setDuration(d); setSlot(null); }} presets={[30, 45, 60, 90, 120, 180]} />
      </Field>
      <SlotSuggestions durationMin={duration} onPick={setSlot} selected={chosen?.start} limit={4} />
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          icon={Settings2}
          onClick={() => {
            onDone();
            const start = chosen?.start || addMinutes(new Date(), 30);
            openEventEditor({ defaults: { title, categoryId, start, end: addMinutes(start, duration) } });
          }}
        >
          Mais opções
        </Button>
        <Button variant="primary" onClick={create} disabled={!chosen}>
          {chosen ? `Agendar ${fmt(chosen.start, 'EEE')} ${timeOf(chosen.start)}` : 'Sem horário livre'}
        </Button>
      </div>
    </div>
  );
}

function QuickTask({ onDone }) {
  const addTask = useAppStore((s) => s.addTask);
  const openTaskEditor = useUiStore((s) => s.openTaskEditor);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState(dateKey(addDays(new Date(), 1)));
  const [categoryId, setCategoryId] = useState('cat_estudos');

  const create = () => {
    addTask({ title: title.trim() || 'Nova tarefa', priority, dueDate: due || null, categoryId });
    toast('Tarefa criada', { tone: 'success' });
    onDone();
  };

  return (
    <div className="space-y-4">
      <Input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="O que precisa ser feito?" className="h-11 text-base" />
      <Field label="Prioridade">
        <Segmented size="sm" value={priority} onChange={setPriority} options={Object.entries(PRIORITIES).map(([value, p]) => ({ value, label: p.label }))} />
      </Field>
      <Field label="Entrega">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            ['Hoje', 0],
            ['Amanhã', 1],
            ['Em 3 dias', 3],
            ['Em 1 semana', 7],
          ].map(([label, d]) => {
            const k = dateKey(addDays(new Date(), d));
            return (
              <button key={label} type="button" onClick={() => setDue(k)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${due === k ? 'gradient-brand text-white' : 'bg-surface-2 text-ink-2'}`}>
                {label}
              </button>
            );
          })}
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 w-auto text-xs" />
        </div>
      </Field>
      <Field label="Categoria">
        <CategoryPicker value={categoryId} onChange={setCategoryId} />
      </Field>
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          size="sm"
          icon={Settings2}
          onClick={() => {
            onDone();
            openTaskEditor({ defaults: { title, priority, dueDate: due, categoryId } });
          }}
        >
          Mais opções
        </Button>
        <Button variant="primary" onClick={create}>
          Criar tarefa
        </Button>
      </div>
    </div>
  );
}

function QuickStudy({ onDone }) {
  const subjects = useAppStore((s) => s.subjects);
  const addStudyLog = useAppStore((s) => s.addStudyLog);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [minutes, setMinutes] = useState(60);
  const [date, setDate] = useState(dateKey(new Date()));
  const [note, setNote] = useState('');

  if (!subjects.length) {
    return <p className="py-6 text-center text-sm text-muted">Cadastre uma disciplina ou tecnologia na página <b>Estudos</b> para registrar horas.</p>;
  }
  const create = () => {
    const d = new Date(`${date}T${date === dateKey(new Date()) ? timeOf(new Date()) : '12:00'}:00`);
    addStudyLog({ subjectId, minutes, date: d.toISOString(), note, source: 'manual' });
    toast(`${formatMinutes(minutes)} de estudo registrados`, { tone: 'success' });
    onDone();
  };
  return (
    <div className="space-y-4">
      <Field label="Disciplina / tecnologia">
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={`Tempo estudado · ${formatMinutes(minutes)}`}>
        <DurationPicker value={minutes} onChange={setMinutes} presets={[25, 30, 45, 60, 90, 120, 180]} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data">
          <Input type="date" value={date} max={dateKey(new Date())} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Anotação (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que você estudou?" />
        </Field>
      </div>
      <div className="flex justify-end pt-1">
        <Button variant="primary" onClick={create}>
          Registrar estudo
        </Button>
      </div>
    </div>
  );
}
