import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarPlus, GripVertical, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button, Checkbox, Field, Input, Segmented, Textarea, ProgressBar } from '../ui/primitives.jsx';
import { CategoryPicker, DurationPicker } from '../ui/Pickers.jsx';
import { SlotSuggestions } from '../planner/SlotSuggestions.jsx';
import { useAppStore } from '../../store/useAppStore.js';
import { confirmAction, toast, useUiStore } from '../../store/useUiStore.js';
import { PRIORITIES, TASK_STATUS } from '../../lib/constants.js';
import { addDays, dateKey, fmt, fromKey, timeOf } from '../../lib/dates.js';
import { uid, pct, formatMinutes } from '../../lib/utils.js';
import { expandEvents } from '../../lib/recurrence.js';

const emptyForm = (defaults = {}) => ({
  title: '',
  description: '',
  categoryId: 'cat_estudos',
  priority: 'medium',
  dueDate: '',
  estimatedMin: 60,
  status: 'todo',
  subtasks: [],
  ...defaults,
});

export function TaskEditor() {
  const payload = useUiStore((s) => s.taskEditor);
  const close = useUiStore((s) => s.closeTaskEditor);
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const tasks = useAppStore((s) => s.tasks);
  const events = useAppStore((s) => s.events);
  const navigate = useNavigate();
  const store = useAppStore.getState;

  const task = payload?.taskId ? tasks.find((t) => t.id === payload.taskId) : null;
  const [form, setForm] = useState(emptyForm());
  const [newSub, setNewSub] = useState('');
  const [planning, setPlanning] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);

  useEffect(() => {
    if (!payload) return;
    setForm(task ? { ...emptyForm(), ...task, dueDate: task.dueDate || '', subtasks: task.subtasks || [] } : emptyForm(payload.defaults));
    setNewSub('');
    setPlanning(Boolean(payload.plan));
    setPendingSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  if (!payload) return null;
  if (payload.taskId && !task) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const linkedEvent = task?.eventId ? events.find((e) => e.id === task.eventId) : null;

  const addSub = () => {
    const title = newSub.trim();
    if (!title) return;
    set({ subtasks: [...form.subtasks, { id: uid('st'), title, done: false }] });
    setNewSub('');
  };

  const save = () => {
    const data = {
      title: form.title.trim() || 'Tarefa sem título',
      description: form.description,
      categoryId: form.categoryId,
      priority: form.priority,
      dueDate: form.dueDate || null,
      estimatedMin: Number(form.estimatedMin) || 0,
      status: form.status,
      subtasks: form.subtasks.filter((s) => s.title.trim()),
    };
    let id = task?.id;
    if (task) store().updateTask(task.id, data);
    else id = store().addTask(data).id;
    if (pendingSlot) {
      store().scheduleTask(id, pendingSlot.start, pendingSlot.end);
      toast(`Tarefa agendada para ${fmt(pendingSlot.start, "EEE, d 'de' MMM 'às' HH:mm")}`, { tone: 'success' });
    } else toast(task ? 'Tarefa atualizada' : 'Tarefa criada', { tone: 'success' });
    close();
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: 'Excluir tarefa?',
      message: `"${task.title}" e suas subtarefas serão removidas.${linkedEvent ? ' O horário reservado na agenda será mantido.' : ''}`,
      confirmLabel: 'Excluir tarefa',
    });
    if (!ok) return;
    const snapshot = { ...task };
    store().deleteTask(task.id);
    toast('Tarefa excluída', { action: { label: 'Desfazer', onClick: () => useAppStore.setState((s) => ({ tasks: [snapshot, ...s.tasks] })) } });
    close();
  };

  const unschedule = async () => {
    const ok = await confirmAction({ title: 'Remover horário da agenda?', message: 'O bloco reservado para esta tarefa será excluído do calendário.', confirmLabel: 'Remover' });
    if (!ok) return;
    store().deleteEvent(linkedEvent.id);
  };

  const done = form.subtasks.filter((s) => s.done).length;
  const deadline = form.dueDate ? addDays(fromKey(form.dueDate), 1) : null;

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title={task ? 'Editar tarefa' : 'Nova tarefa'}
      footer={
        <>
          {task && (
            <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={remove} className="mr-auto">
              Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save}>
            {task ? 'Salvar' : 'Criar tarefa'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          data-autofocus
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Título da tarefa"
          className="h-11 text-base font-medium"
        />
        <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Descrição (opcional)" rows={2} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prioridade">
            <Segmented
              size="sm"
              value={form.priority}
              onChange={(priority) => set({ priority })}
              options={Object.entries(PRIORITIES).map(([value, p]) => ({ value, label: p.label }))}
            />
          </Field>
          <Field label="Status">
            <Segmented
              size="sm"
              value={form.status}
              onChange={(status) => set({ status })}
              options={Object.entries(TASK_STATUS).map(([value, s]) => ({ value, label: s.label }))}
            />
          </Field>
        </div>

        <Field label="Categoria">
          <CategoryPicker value={form.categoryId} onChange={(categoryId) => set({ categoryId })} allowEmpty />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr]">
          <Field label="Data de entrega">
            <Input type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            <div className="mt-1.5 flex gap-1">
              {[
                ['Hoje', 0],
                ['Amanhã', 1],
                ['+1 sem.', 7],
              ].map(([label, d]) => (
                <button key={label} type="button" onClick={() => set({ dueDate: dateKey(addDays(new Date(), d)) })} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2 hover:text-ink">
                  {label}
                </button>
              ))}
              {form.dueDate && (
                <button type="button" onClick={() => set({ dueDate: '' })} className="rounded-md px-2 py-0.5 text-[11px] text-muted hover:text-bad">
                  Limpar
                </button>
              )}
            </div>
          </Field>
          <Field label={`Tempo estimado · ${formatMinutes(form.estimatedMin)}`}>
            <DurationPicker value={form.estimatedMin} onChange={(estimatedMin) => set({ estimatedMin })} />
          </Field>
        </div>

        <Field label={`Subtarefas e checklist${form.subtasks.length ? ` · ${done}/${form.subtasks.length}` : ''}`}>
          {form.subtasks.length > 0 && <ProgressBar value={pct(done, form.subtasks.length)} size="sm" className="mb-2" />}
          <div className="space-y-1">
            {form.subtasks.map((st, i) => (
              <div key={st.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2">
                <GripVertical className="h-3.5 w-3.5 text-muted/50" />
                <Checkbox
                  size="sm"
                  checked={st.done}
                  onChange={(v) => set({ subtasks: form.subtasks.map((x, j) => (j === i ? { ...x, done: v } : x)) })}
                />
                <input
                  value={st.title}
                  onChange={(e) => set({ subtasks: form.subtasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  className={`flex-1 bg-transparent text-sm outline-none ${st.done ? 'text-muted line-through' : 'text-ink'}`}
                />
                <button type="button" onClick={() => set({ subtasks: form.subtasks.filter((_, j) => j !== i) })} className="rounded p-0.5 text-muted opacity-0 hover:text-bad group-hover:opacity-100" aria-label="Remover subtarefa">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <Input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSub();
                }
              }}
              placeholder="Adicionar item e pressionar Enter"
              className="h-8 text-xs"
            />
            <Button size="sm" icon={Plus} onClick={addSub}>
              Item
            </Button>
          </div>
        </Field>

        <div className="rounded-xl border border-line p-3">
          {linkedEvent ? (
            <LinkedEventRow
              event={linkedEvent}
              onOpen={(occ) => {
                close();
                navigate(`/agenda?date=${dateKey(occ.start)}&view=timeGridDay`);
                openEventEditor({ occurrence: occ });
              }}
              onReplan={() => setPlanning((v) => !v)}
              onRemove={unschedule}
            />
          ) : pendingSlot ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-ink">
                <CalendarCheck className="h-4 w-4 text-good" />
                Será agendada: <b className="cap-first inline-block">{fmt(pendingSlot.start, "EEE, d 'de' MMM")}</b> {timeOf(pendingSlot.start)}–{timeOf(pendingSlot.end)}
              </span>
              <Button size="xs" variant="ghost" onClick={() => setPendingSlot(null)}>
                Desfazer
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">Reservar um horário na agenda</p>
                <p className="text-xs text-muted">Encontramos blocos livres que comportam o tempo estimado{form.dueDate ? ', antes da entrega' : ''}.</p>
              </div>
              <Button size="sm" variant="soft" icon={planning ? X : Sparkles} onClick={() => setPlanning((v) => !v)}>
                {planning ? 'Fechar' : 'Sugerir horários'}
              </Button>
            </div>
          )}
          {planning && (
            <div className="mt-3">
              <SlotSuggestions
                durationMin={Number(form.estimatedMin) || 60}
                deadline={deadline}
                excludeEventId={linkedEvent?.id}
                selected={pendingSlot?.start}
                onPick={(slot) => {
                  if (task && linkedEvent) {
                    store().scheduleTask(task.id, slot.start, slot.end);
                    toast(`Horário atualizado para ${fmt(slot.start, "EEE, d 'de' MMM 'às' HH:mm")}`, { tone: 'success' });
                  } else setPendingSlot(slot);
                  setPlanning(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function LinkedEventRow({ event, onOpen, onReplan, onRemove }) {
  const [occ] = expandEvents([event], new Date(event.start), new Date(new Date(event.end).getTime() + 1));
  if (!occ) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => onOpen(occ)} className="flex items-center gap-2 text-left text-sm text-ink hover:text-brand">
        <CalendarCheck className="h-4 w-4 text-good" />
        <span>
          Agendada: <b className="cap-first inline-block">{fmt(occ.start, "EEE, d 'de' MMM")}</b> · {timeOf(occ.start)}–{timeOf(occ.end)}
        </span>
      </button>
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" icon={CalendarPlus} onClick={onReplan}>
          Reagendar
        </Button>
        <Button size="xs" variant="danger-ghost" onClick={onRemove}>
          Remover horário
        </Button>
      </div>
    </div>
  );
}
