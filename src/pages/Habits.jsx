import { useEffect, useState } from 'react';
import { Flame, MoreHorizontal, Pencil, Plus, Trash2, Trophy, CheckCircle2, Percent } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { confirmAction, toast } from '../store/useUiStore.js';
import { Button, Card, DemoBadge, EmptyState, Field, Input, PageHeader, Ring, Segmented } from '../components/ui/primitives.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Menu } from '../components/ui/Menu.jsx';
import { ColorPicker, WeekdayPicker } from '../components/ui/Pickers.jsx';
import { CATEGORY_COLORS, HABIT_ICONS } from '../lib/constants.js';
import { addDays, dateKey, fmt, startOfDay, WEEKDAYS_SHORT } from '../lib/dates.js';
import { habitCompletion, habitDone, habitFrequencyLabel, habitStreak, isHabitDueOn } from '../lib/insights.js';
import { cn } from '../lib/utils.js';
import { useNow } from '../hooks/useData.js';

export default function Habits() {
  const habits = useAppStore((s) => s.habits);
  const [modal, setModal] = useState({ open: false, habit: null });
  const now = useNow(60000);
  const today = startOfDay(now);
  const due = habits.filter((h) => isHabitDueOn(h, today));
  const doneToday = due.filter((h) => habitDone(h, today)).length;
  const best = habits.reduce((acc, h) => {
    const s = habitStreak(h, now);
    return s.value > acc.value ? { ...s, name: h.name } : acc;
  }, { value: 0, unit: 'dias', name: '' });
  const avg = habits.length ? Math.round(habits.reduce((a, h) => a + habitCompletion(h, 30, now), 0) / habits.length) : 0;

  return (
    <div>
      <PageHeader
        title="Hábitos"
        description="Registre diariamente e acompanhe sequências e consistência"
        actions={<Button variant="primary" icon={Plus} onClick={() => setModal({ open: true, habit: null })}>Novo hábito</Button>}
      />

      {habits.length === 0 ? (
        <Card>
          <EmptyState
            icon={Flame}
            title="Comece um hábito"
            description="Exemplos: estudar programação, praticar exercícios, dormir no horário, ler, desenvolver projetos, revisar a agenda."
            action={<Button variant="primary" icon={Plus} onClick={() => setModal({ open: true, habit: null })}>Criar primeiro hábito</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-good/10 text-good"><CheckCircle2 className="h-5 w-5" /></span>
              <div><p className="text-xs text-muted">Cumpridos hoje</p><p className="text-xl font-semibold tabular-nums text-ink">{doneToday}/{due.length}</p></div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-warn/10 text-warn"><Trophy className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="text-xs text-muted">Maior sequência atual</p><p className="truncate text-xl font-semibold text-ink">{best.value} {best.unit} <span className="text-xs font-normal text-muted">{best.name}</span></p></div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Percent className="h-5 w-5" /></span>
              <div><p className="text-xs text-muted">Consistência média (30 dias)</p><p className="text-xl font-semibold tabular-nums text-ink">{avg}%</p></div>
            </Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {habits.map((h) => (
              <HabitCard key={h.id} habit={h} now={now} onEdit={() => setModal({ open: true, habit: h })} />
            ))}
          </div>
        </>
      )}
      <HabitModal open={modal.open} habit={modal.habit} onClose={() => setModal({ open: false, habit: null })} />
    </div>
  );
}

function HabitCard({ habit, now, onEdit }) {
  const toggleHabit = useAppStore((s) => s.toggleHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const today = startOfDay(now);
  const streak = habitStreak(habit, now);
  const completion = habitCompletion(habit, 30, now);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  // mapa de calor: 5 semanas, de segunda a domingo
  const heatStart = addDays(today, -((today.getDay() + 6) % 7) - 28);
  const heat = Array.from({ length: 35 }, (_, i) => addDays(heatStart, i));
  const created = startOfDay(new Date(habit.createdAt || 0));

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <Ring value={completion} size={64} stroke={6} color={habit.color}>
          <span className="text-2xl">{habit.icon}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-ink">{habit.name}</h3>
              <p className="text-xs text-muted">{habitFrequencyLabel(habit)} {habit.demo && <DemoBadge className="ml-1" />}</p>
            </div>
            <Menu
              trigger={<button type="button" className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></button>}
              items={[
                { label: 'Editar', icon: Pencil, onClick: onEdit },
                {
                  label: 'Excluir',
                  icon: Trash2,
                  danger: true,
                  onClick: async () => {
                    if (await confirmAction({ title: 'Excluir hábito?', message: `"${habit.name}" e todo o histórico de registros serão apagados.`, confirmLabel: 'Excluir' })) deleteHabit(habit.id);
                  },
                },
              ]}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="text-ink"><span className="mr-1">🔥</span><b className="tabular-nums">{streak.value}</b> <span className="text-muted">{streak.unit} seguidos</span></span>
            <span className="text-ink"><b className="tabular-nums">{completion}%</b> <span className="text-muted">em 30 dias</span></span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {last7.map((d) => {
          const done = habitDone(habit, d);
          const dueDay = isHabitDueOn(habit, d);
          const isToday = d.getTime() === today.getTime();
          return (
            <button
              key={d.getTime()}
              type="button"
              onClick={() => toggleHabit(habit.id, dateKey(d))}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] transition',
                done ? 'border-transparent text-white' : dueDay ? 'border-line text-muted hover:border-brand/40' : 'border-dashed border-line/60 text-muted/60',
                isToday && !done && 'border-brand/60',
              )}
              style={done ? { background: habit.color } : undefined}
              title={`${fmt(d, "EEEE, d 'de' MMM")}${dueDay ? '' : ' (não previsto)'}`}
            >
              <span className="font-medium">{isToday ? 'Hoje' : WEEKDAYS_SHORT[d.getDay()]}</span>
              <span className="text-sm font-semibold tabular-nums">{done ? '✓' : d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-muted">
          <span>Últimas 5 semanas</span>
          <span>{fmt(heat[0], 'dd/MM')} – hoje</span>
        </div>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(35, minmax(0, 1fr))' }}>
          {heat.map((d, i) => {
            const future = d > today;
            const done = habitDone(habit, d);
            const inactive = future || d < created;
            return (
              <div
                key={d.getTime()}
                title={`${fmt(d, "EEE, dd/MM")}${done ? ' · cumprido' : ''}`}
                className={cn('h-4 rounded-[3px]', inactive ? 'bg-surface-2/50' : !done && 'bg-surface-3', i % 7 === 0 && i > 0 && 'ml-1')}
                style={done ? { background: habit.color } : undefined}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function HabitModal({ open, habit, onClose }) {
  const addHabit = useAppStore((s) => s.addHabit);
  const updateHabit = useAppStore((s) => s.updateHabit);
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (open) setForm(habit ? { ...habit, frequency: { ...habit.frequency } } : { name: '', icon: '💻', color: CATEGORY_COLORS[0], frequency: { type: 'daily', days: [1, 2, 3, 4, 5], timesPerWeek: 3 } });
  }, [open, habit]);
  if (!open || !form) return null;
  const f = form.frequency;
  const save = () => {
    if (!form.name.trim()) return toast('Dê um nome ao hábito', { tone: 'warning' });
    const frequency = f.type === 'daily' ? { type: 'daily' } : f.type === 'days' ? { type: 'days', days: f.days?.length ? f.days : [1] } : { type: 'weekly', timesPerWeek: Math.max(1, Math.min(7, Number(f.timesPerWeek) || 1)) };
    const data = { name: form.name.trim(), icon: form.icon, color: form.color, frequency };
    if (habit) updateHabit(habit.id, data);
    else addHabit(data);
    toast(habit ? 'Hábito atualizado' : 'Hábito criado', { tone: 'success' });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={habit ? 'Editar hábito' : 'Novo hábito'} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="space-y-4">
        <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Ler 20 minutos" /></Field>
        <Field label="Ícone">
          <div className="flex flex-wrap gap-1.5">
            {HABIT_ICONS.map((i) => (
              <button key={i} type="button" onClick={() => setForm({ ...form, icon: i })} className={cn('grid h-9 w-9 place-items-center rounded-lg text-lg transition', form.icon === i ? 'bg-brand/15 ring-2 ring-brand/50' : 'bg-surface-2 hover:bg-surface-3')}>{i}</button>
            ))}
          </div>
        </Field>
        <Field label="Cor"><ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} colors={CATEGORY_COLORS} /></Field>
        <Field label="Frequência">
          <Segmented value={f.type} onChange={(type) => setForm({ ...form, frequency: { ...f, type } })} options={[{ value: 'daily', label: 'Diário' }, { value: 'days', label: 'Dias específicos' }, { value: 'weekly', label: 'X por semana' }]} />
        </Field>
        {f.type === 'days' && <WeekdayPicker value={f.days || []} onChange={(days) => setForm({ ...form, frequency: { ...f, days } })} />}
        {f.type === 'weekly' && (
          <Field label="Vezes por semana"><Input type="number" min={1} max={7} value={f.timesPerWeek || 3} onChange={(e) => setForm({ ...form, frequency: { ...f, timesPerWeek: e.target.value } })} /></Field>
        )}
      </div>
    </Modal>
  );
}
