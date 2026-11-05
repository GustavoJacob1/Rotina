import { useEffect, useState } from 'react';
import { CheckCircle2, MoreHorizontal, Pencil, Plus, Target, Trash2, TrendingUp, TriangleAlert, Undo2, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { confirmAction, toast } from '../store/useUiStore.js';
import { Badge, Button, Card, DemoBadge, EmptyState, Field, Input, PageHeader, ProgressBar, Segmented, Select } from '../components/ui/primitives.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Menu } from '../components/ui/Menu.jsx';
import { GOAL_SOURCES } from '../lib/constants.js';
import { goalProgress } from '../lib/insights.js';
import { fmt } from '../lib/dates.js';
import { cn } from '../lib/utils.js';
import { useNow } from '../hooks/useData.js';
import { differenceInCalendarDays } from 'date-fns';

export default function Goals() {
  const state = useAppStore();
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, goal: null });
  const now = useNow(60000);
  const goals = state.goals.filter((g) => filter === 'all' || g.period === filter);
  const progress = state.goals.map((g) => goalProgress(g, state, now));
  const done = progress.filter((p) => p.done).length;
  const late = progress.filter((p) => p.late).length;

  return (
    <div>
      <PageHeader
        title="Metas"
        description="Objetivos semanais e mensais com progresso calculado automaticamente"
        actions={
          <>
            <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Todas' }, { value: 'weekly', label: 'Semanais' }, { value: 'monthly', label: 'Mensais' }]} />
            <Button variant="primary" icon={Plus} onClick={() => setModal({ open: true, goal: null })}>Nova meta</Button>
          </>
        }
      />
      {state.goals.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <Card className="p-4"><p className="text-xs text-muted">Metas ativas</p><p className="mt-1 text-2xl font-semibold text-ink">{state.goals.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Concluídas no período</p><p className="mt-1 text-2xl font-semibold text-good">{done}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted">Atrasadas</p><p className={cn('mt-1 text-2xl font-semibold', late ? 'text-warn' : 'text-ink')}>{late}</p></Card>
        </div>
      )}
      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title={state.goals.length ? 'Nenhuma meta neste filtro' : 'Defina sua primeira meta'}
            description="Metas podem ser automáticas (horas de estudo, tarefas concluídas, check-ins de hábito) ou de registro manual (ex.: livros lidos)."
            action={<Button variant="primary" icon={Plus} onClick={() => setModal({ open: true, goal: null })}>Nova meta</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((g) => <GoalCard key={g.id} goal={g} p={goalProgress(g, state, now)} now={now} onEdit={() => setModal({ open: true, goal: g })} />)}
        </div>
      )}
      <GoalModal open={modal.open} goal={modal.goal} onClose={() => setModal({ open: false, goal: null })} />
    </div>
  );
}

function GoalCard({ goal, p, now, onEdit }) {
  const addGoalEntry = useAppStore((s) => s.addGoalEntry);
  const undoGoalEntry = useAppStore((s) => s.undoGoalEntry);
  const deleteGoal = useAppStore((s) => s.deleteGoal);
  const habits = useAppStore((s) => s.habits);
  const daysLeft = differenceInCalendarDays(p.end, now);
  const status = p.done
    ? { label: 'Concluída', icon: CheckCircle2, className: 'bg-good/15 text-good' }
    : p.late
      ? { label: 'Atrasada', icon: TriangleAlert, className: 'bg-warn/15 text-warn' }
      : { label: 'No ritmo', icon: TrendingUp, className: 'bg-brand/15 text-brand' };
  const sourceLabel = goal.source === 'habit' ? `Hábito: ${habits.find((h) => h.id === goal.habitId)?.name || '—'}` : GOAL_SOURCES[goal.source];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge>{goal.period === 'weekly' ? 'Semanal' : 'Mensal'}</Badge>
            <span className={cn('chip', status.className)}><status.icon className="h-3 w-3" />{status.label}</span>
            {goal.demo && <DemoBadge />}
          </div>
          <h3 className="text-base font-semibold text-ink">{goal.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">{goal.source !== 'manual' && <Zap className="h-3 w-3 text-brand-2" />}{sourceLabel}</p>
        </div>
        <Menu
          trigger={<button type="button" className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></button>}
          items={[
            { label: 'Editar', icon: Pencil, onClick: onEdit },
            { label: 'Excluir', icon: Trash2, danger: true, onClick: async () => (await confirmAction({ title: 'Excluir meta?', message: `"${goal.title}" será removida.`, confirmLabel: 'Excluir' })) && deleteGoal(goal.id) },
          ]}
        />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
          {String(p.current).replace('.', ',')}
          <span className="text-base font-normal text-muted"> / {p.target} {goal.unit}</span>
        </p>
        <p className="text-sm font-semibold tabular-nums text-ink-2">{p.pct}%</p>
      </div>
      <div className="relative mt-2">
        <ProgressBar value={p.pct} tone={p.done ? 'good' : p.late ? 'warn' : undefined} />
        {!p.done && <span className="absolute -top-1 h-4 w-0.5 rounded bg-ink/50" style={{ left: `${p.expected}%` }} title={`Ritmo esperado hoje: ${p.expected}%`} />}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {fmt(p.start, "d 'de' MMM")} – {fmt(p.end, "d 'de' MMM")} · {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'}` : 'último dia'} · marcador = ritmo esperado ({p.expected}%)
      </p>

      {goal.source === 'manual' && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs text-muted">Registrar progresso:</span>
          {[0.5, 1].map((n) => (
            <Button key={n} size="xs" variant="soft" onClick={() => { addGoalEntry(goal.id, n); toast(`+${String(n).replace('.', ',')} ${goal.unit} em "${goal.title}"`, { tone: 'success' }); }}>
              +{String(n).replace('.', ',')}
            </Button>
          ))}
          {(goal.entries || []).some((e) => new Date(e.date) >= p.start && new Date(e.date) <= p.end) && (
            <Button size="xs" variant="ghost" icon={Undo2} onClick={() => undoGoalEntry(goal.id)}>Desfazer último</Button>
          )}
        </div>
      )}
    </Card>
  );
}

function GoalModal({ open, goal, onClose }) {
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const habits = useAppStore((s) => s.habits);
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (open) setForm(goal ? { ...goal } : { title: '', period: 'weekly', source: 'manual', target: 3, unit: '', habitId: habits[0]?.id || '' });
  }, [open, goal, habits]);
  if (!open || !form) return null;
  const unitFor = (source) => ({ studyHours: 'h', tasksDone: 'tarefas', habit: 'vezes' })[source] || form.unit;
  const save = () => {
    if (!form.title.trim()) return toast('Dê um título à meta', { tone: 'warning' });
    if (form.source === 'habit' && !form.habitId) return toast('Escolha um hábito', { tone: 'warning' });
    const data = { title: form.title.trim(), period: form.period, source: form.source, target: Math.max(0.5, Number(form.target) || 1), unit: form.unit || unitFor(form.source), habitId: form.source === 'habit' ? form.habitId : null };
    if (goal) updateGoal(goal.id, data);
    else addGoal(data);
    toast(goal ? 'Meta atualizada' : 'Meta criada', { tone: 'success' });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={goal ? 'Editar meta' : 'Nova meta'} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
      <div className="space-y-4">
        <Field label="Título"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Estudar 10 horas na semana" /></Field>
        <Field label="Período"><Segmented value={form.period} onChange={(period) => setForm({ ...form, period })} options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensal' }]} /></Field>
        <Field label="Como medir o progresso" hint={form.source === 'manual' ? 'Você registra o avanço manualmente com os botões da meta.' : 'Calculado automaticamente a partir dos seus registros.'}>
          <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value, unit: unitFor(e.target.value) === form.unit ? form.unit : unitFor(e.target.value) })}>
            {Object.entries(GOAL_SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        {form.source === 'habit' && (
          <Field label="Hábito">
            <Select value={form.habitId || ''} onChange={(e) => setForm({ ...form, habitId: e.target.value })}>
              {habits.length === 0 && <option value="">Cadastre um hábito primeiro</option>}
              {habits.map((h) => <option key={h.id} value={h.id}>{h.icon} {h.name}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Alvo"><Input type="number" min={0.5} step={0.5} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
          <Field label="Unidade"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="livros, km, h..." disabled={form.source !== 'manual'} /></Field>
        </div>
      </div>
    </Modal>
  );
}
