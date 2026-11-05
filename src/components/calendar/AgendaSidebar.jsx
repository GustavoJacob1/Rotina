import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Eye, EyeOff, Layers, Sparkles, TriangleAlert } from 'lucide-react';
import { Card, CardHeader, Input, Field } from '../ui/primitives.jsx';
import { CategoryPicker, DurationPicker } from '../ui/Pickers.jsx';
import { SlotSuggestions } from '../planner/SlotSuggestions.jsx';
import { useAppStore } from '../../store/useAppStore.js';
import { toast } from '../../store/useUiStore.js';
import { addDays, fmt, timeOf, startOfDay } from '../../lib/dates.js';
import { busyMinutes, findConflicts, freeMinutes } from '../../lib/scheduling.js';
import { cn, formatMinutes } from '../../lib/utils.js';

export function SmartPlanner() {
  const addEvent = useAppStore((s) => s.addEvent);
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(120);
  const [categoryId, setCategoryId] = useState('cat_estudos');
  const [deadline, setDeadline] = useState('');

  return (
    <Card>
      <CardHeader icon={Sparkles} title="Planejamento inteligente" subtitle="Diga quanto tempo precisa — sugerimos onde encaixar" />
      <div className="space-y-3 px-5 pb-5 pt-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Trabalho de Banco de Dados" />
        <Field label={`Duração necessária · ${formatMinutes(duration)}`}>
          <DurationPicker value={duration} onChange={setDuration} presets={[30, 60, 90, 120, 180, 240]} />
        </Field>
        <Field label="Categoria">
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </Field>
        <Field label="Precisa estar pronto até (opcional)">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <SlotSuggestions
          durationMin={duration}
          deadline={deadline ? addDays(new Date(`${deadline}T00:00:00`), 1) : null}
          limit={4}
          onPick={(slot) => {
            const ev = addEvent({ title: title.trim() || 'Bloco planejado', categoryId, start: slot.start.toISOString(), end: slot.end.toISOString() });
            toast(`Agendado: ${fmt(slot.start, "EEE, d 'de' MMM")} ${timeOf(slot.start)}–${timeOf(slot.end)}`, {
              tone: 'success',
              action: { label: 'Desfazer', onClick: () => deleteEvent(ev.id) },
            });
            setTitle('');
          }}
        />
      </div>
    </Card>
  );
}

export function WeekLoad({ occurrences, from, onPickDay }) {
  const settings = useAppStore((s) => s.settings);
  const max = (settings.planning?.maxBusyHours ?? 10) * 60;
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(startOfDay(from), i);
        return { d, busy: busyMinutes(d, occurrences, settings), free: freeMinutes(d, occurrences, settings) };
      }),
    [occurrences, from, settings],
  );
  const scale = Math.max(max, ...days.map((x) => x.busy + x.free)) || 1;
  return (
    <Card>
      <CardHeader icon={BarChart2} title="Ocupação dos dias" subtitle={`Limite configurado: ${formatMinutes(max)} por dia`} />
      <div className="space-y-2 px-5 pb-5 pt-3">
        {days.map(({ d, busy, free }) => {
          const over = busy > max;
          return (
            <button key={d.getTime()} type="button" onClick={() => onPickDay(d)} className="group block w-full text-left">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="cap-first text-ink-2 group-hover:text-ink">{fmt(d, "EEE, dd/MM")}</span>
                <span className={cn('tabular-nums', over ? 'font-semibold text-warn' : 'text-muted')}>
                  {formatMinutes(busy, { short: true })} ocupado · {formatMinutes(free, { short: true })} livre
                </span>
              </div>
              <div className="relative flex h-2 overflow-hidden rounded-full bg-surface-3">
                <div className={cn('h-full', over ? 'bg-warn' : 'gradient-brand')} style={{ width: `${(busy / scale) * 100}%` }} />
                <div className="h-full border-l-2 border-surface bg-good/40" style={{ width: `${(free / scale) * 100}%` }} />
                <div className="absolute inset-y-0 w-px bg-ink/40" style={{ left: `${(max / scale) * 100}%` }} title="Limite diário" />
              </div>
            </button>
          );
        })}
        <div className="flex gap-4 pt-1 text-[11px] text-muted">
          <span className="flex items-center gap-1"><span className="gradient-brand h-2 w-2 rounded-sm" />Ocupado</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-good/40" />Livre</span>
          <span className="flex items-center gap-1"><span className="h-2 w-px bg-ink/40" />Limite</span>
        </div>
      </div>
    </Card>
  );
}

export function ConflictList({ occurrences, onOpen }) {
  const pairs = useMemo(() => findConflicts(occurrences).pairs, [occurrences]);
  return (
    <Card>
      <CardHeader icon={TriangleAlert} title="Conflitos no período" subtitle={pairs.length ? `${pairs.length} sobreposição(ões)` : 'Nenhuma sobreposição'} />
      <div className="space-y-2 px-4 pb-4 pt-3">
        {pairs.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted">Sem conflitos de horário no período visível ✅</p>
        ) : (
          pairs.slice(0, 6).map(([a, b]) => (
            <button key={`${a.id}|${b.id}`} type="button" onClick={() => onOpen(b)} className="w-full rounded-xl border border-bad/25 bg-bad/5 px-3 py-2 text-left text-xs transition hover:bg-bad/10">
              <p className="font-semibold cap-first text-ink">{fmt(b.start, "EEE, d 'de' MMM")}</p>
              <p className="text-ink-2">
                {a.title} ({timeOf(a.start)}–{timeOf(a.end)}) × {b.title} ({timeOf(b.start)}–{timeOf(b.end)})
              </p>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

export function CategoryFilter({ hidden, onToggle }) {
  const categories = useAppStore((s) => s.categories);
  return (
    <Card>
      <CardHeader icon={Layers} title="Categorias" subtitle="Clique para mostrar/ocultar" action={<Link to="/configuracoes?tab=categorias" className="text-xs font-semibold text-brand hover:underline">Editar</Link>} />
      <div className="grid gap-1 px-3 pb-4 pt-3">
        {categories.map((c) => {
          const off = hidden.includes(c.id);
          return (
            <button key={c.id} type="button" onClick={() => onToggle(c.id)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
              <span className="h-3 w-3 rounded" style={{ background: off ? 'transparent' : c.color, border: `2px solid ${c.color}` }} />
              <span className={cn('flex-1 truncate', off ? 'text-muted line-through' : 'text-ink-2')}>{c.name}</span>
              {off ? <EyeOff className="h-3.5 w-3.5 text-muted" /> : <Eye className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
