import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, BedDouble, BookOpen, CalendarDays, CheckCircle2, Coffee, Flame, Info, PieChart as PieIcon, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { useCategoryMap, useOccurrences } from '../hooks/useData.js';
import { Card, CardHeader, EmptyState, PageHeader, ProgressBar, Segmented } from '../components/ui/primitives.jsx';
import { ChartTooltip, Legend, axisProps, hourTicks, useChartTheme } from '../components/charts/chartTheme.jsx';
import { addDays, eachDay, fmt, monthRange, startOfDay, timeToMinutes, weekRange, WEEKDAYS_SHORT, WEEKDAY_ORDER } from '../lib/dates.js';
import { habitDone, isHabitDueOn, plannedStudyMinutes, studyMinutes } from '../lib/insights.js';
import { mergeIntervals } from '../lib/scheduling.js';
import { cn, formatMinutes, pct } from '../lib/utils.js';

const PERIODS = [
  { value: 'week', label: 'Esta semana' },
  { value: '4weeks', label: 'Últimas 4 semanas' },
  { value: 'month', label: 'Este mês' },
];

function periodRange(period, now = new Date()) {
  if (period === 'month') return monthRange(now);
  const w = weekRange(now, 1);
  if (period === '4weeks') return { start: addDays(w.start, -21), end: w.end };
  return w;
}

const minutesOf = (o) => (o.end - o.start) / 60000;

export default function Stats() {
  const state = useAppStore();
  const { tasks, studyLogs, habits, settings, hasDemoData, categories } = state;
  const catMap = useCategoryMap();
  const chart = useChartTheme();
  const [period, setPeriod] = useState('week');
  const { start, end } = periodRange(period);
  const occAll = useOccurrences(start, addDays(end, 1));
  const occ = useMemo(() => occAll.filter((o) => !o.allDay && o.start >= start && o.start <= end), [occAll, start.getTime(), end.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = eachDay(start, end);
  const today = startOfDay(new Date());

  // ---- horas por categoria ----
  const byCategory = useMemo(() => {
    const map = {};
    occ.forEach((o) => (map[o.categoryId] = (map[o.categoryId] || 0) + minutesOf(o)));
    return categories
      .map((c) => ({ id: c.id, name: c.name, color: c.color, kind: c.kind, minutes: Math.round(map[c.id] || 0) }))
      .filter((c) => c.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [occ, categories]);
  const totalScheduled = byCategory.reduce((a, c) => a + c.minutes, 0);
  const restMinutes = byCategory.filter((c) => c.kind === 'rest').reduce((a, c) => a + c.minutes, 0);

  // ---- distribuição por dia da semana (empilhado por categoria) ----
  const byWeekday = useMemo(
    () =>
      WEEKDAY_ORDER.map((wd) => {
        const row = { day: WEEKDAYS_SHORT[wd] };
        occ.filter((o) => o.start.getDay() === wd).forEach((o) => (row[o.categoryId] = (row[o.categoryId] || 0) + minutesOf(o)));
        const nDays = days.filter((d) => d.getDay() === wd).length || 1;
        Object.keys(row).forEach((k) => k !== 'day' && (row[k] = Math.round(row[k] / nDays)));
        row.total = byCategory.reduce((a, c) => a + (row[c.id] || 0), 0);
        return row;
      }),
    [occ, byCategory, period], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const busiest = [...byWeekday].sort((a, b) => b.total - a.total);

  // ---- tarefas concluídas ----
  const doneInRange = tasks.filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) <= end);
  const buckets = period === 'week' ? days.map((d) => ({ s: d, e: addDays(d, 1), label: WEEKDAYS_SHORT[d.getDay()] })) : weeksOf(start, end);
  const tasksChart = buckets.map((b) => ({ label: b.label, concluidas: doneInRange.filter((t) => new Date(t.completedAt) >= b.s && new Date(t.completedAt) < b.e).length }));

  // ---- estudo planejado × realizado ----
  const studyChart = buckets.map((b) => ({
    label: b.label,
    planejado: Math.round(plannedStudyMinutes(occAll, b.s, new Date(b.e - 1))),
    realizado: Math.round(studyMinutes(studyLogs, b.s, new Date(b.e - 1))),
  }));
  const studyPlannedTotal = studyChart.reduce((a, r) => a + r.planejado, 0);
  const studyDoneTotal = studyChart.reduce((a, r) => a + r.realizado, 0);
  const studyTicks = hourTicks(Math.max(...studyChart.map((r) => Math.max(r.planejado, r.realizado))));

  // ---- hábitos ----
  const habitsChart = days
    .filter((d) => d <= today)
    .map((d) => {
      const due = habits.filter((h) => isHabitDueOn(h, d) && h.frequency?.type !== 'weekly' && new Date(h.createdAt || 0) <= addDays(d, 1));
      return { label: period === 'week' ? WEEKDAYS_SHORT[d.getDay()] : fmt(d, 'dd/MM'), pct: due.length ? Math.round((due.filter((h) => habitDone(h, d)).length / due.length) * 100) : null };
    });
  const habitAvg = (() => {
    const vals = habitsChart.filter((h) => h.pct != null);
    return vals.length ? Math.round(vals.reduce((a, h) => a + h.pct, 0) / vals.length) : 0;
  })();

  // ---- mapa de calor (dia × hora) ----
  const heat = useMemo(() => {
    const grid = WEEKDAY_ORDER.map(() => Array(24).fill(0));
    occ.forEach((o) => {
      let t = new Date(o.start);
      while (t < o.end) {
        const next = new Date(Math.min(o.end, new Date(t).setMinutes(60, 0, 0)));
        const row = WEEKDAY_ORDER.indexOf(t.getDay());
        grid[row][t.getHours()] += (next - t) / 60000;
        t = next;
      }
    });
    return grid;
  }, [occ]);
  const heatMax = Math.max(1, ...heat.flat());
  const hourMin = Math.floor(timeToMinutes(settings.calendar?.slotMinTime || '06:00') / 60);

  // tempo livre médio por dia (acordado - ocupado)
  const awake = (() => {
    const w = timeToMinutes(settings.sleep.wake);
    const b = timeToMinutes(settings.sleep.bedtime);
    return b > w ? b - w : 1440 - w + b;
  })();
  const avgBusy = Math.round(
    days.reduce((acc, d) => acc + mergeIntervals(occ.filter((o) => startOfDay(o.start).getTime() === d.getTime())).reduce((a, i) => a + (i.end - i.start) / 60000, 0), 0) / days.length,
  );

  const empty = occ.length === 0 && doneInRange.length === 0 && studyDoneTotal === 0;

  return (
    <div>
      <PageHeader title="Estatísticas" description={`${fmt(start, "d 'de' MMM")} – ${fmt(end, "d 'de' MMM 'de' yyyy")}`} actions={<Segmented value={period} onChange={setPeriod} options={PERIODS} />} />

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-line bg-surface-2/50 px-4 py-2.5 text-xs text-ink-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          {hasDemoData ? (
            <><b className="text-ink">Os números abaixo incluem dados de demonstração</b> (exemplos fictícios, não são dados reais). Remova-os em Configurações → Dados para ver apenas o que você cadastrar. </>
          ) : (
            <>Calculado somente a partir do que você cadastrou. </>
          )}
          Horas por categoria consideram os blocos <b>agendados</b> na agenda; horas de estudo realizadas vêm dos registros e do Pomodoro.
        </p>
      </div>

      {empty ? (
        <Card>
          <EmptyState icon={BarChart3} title="Ainda não há dados neste período" description="Adicione atividades à agenda, conclua tarefas e registre estudos para ver suas estatísticas." />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi icon={CalendarDays} label="Horas agendadas" value={formatMinutes(totalScheduled, { short: true })} sub={`${occ.length} atividades`} />
            <Kpi icon={CheckCircle2} label="Tarefas concluídas" value={doneInRange.length} sub={`${tasks.filter((t) => t.status !== 'done').length} pendentes agora`} />
            <Kpi icon={BookOpen} label="Estudo realizado" value={formatMinutes(studyDoneTotal, { short: true })} sub={`${pct(studyDoneTotal, studyPlannedTotal)}% do planejado (${formatMinutes(studyPlannedTotal, { short: true })})`} />
            <Kpi icon={Flame} label="Hábitos cumpridos" value={`${habitAvg}%`} sub="média diária no período" />
            <Kpi icon={Coffee} label="Descanso e lazer" value={formatMinutes(restMinutes, { short: true })} sub={`${pct(restMinutes, totalScheduled)}% do tempo agendado`} />
          </div>

          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="xl:col-span-2">
              <CardHeader icon={PieIcon} title="Horas por categoria" subtitle="Tempo agendado no período" />
              <div className="grid items-center gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="minutes" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke={chart.surface} strokeWidth={2}>
                        {byCategory.map((c) => <Cell key={c.id} fill={c.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(v) => `${formatMinutes(v)} (${pct(v, totalScheduled)}%)`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-xl font-semibold tabular-nums text-ink">{formatMinutes(totalScheduled, { short: true })}</p>
                      <p className="text-[11px] text-muted">agendadas</p>
                    </div>
                  </div>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {byCategory.map((c) => (
                      <tr key={c.id} className="border-b border-line/60 last:border-0">
                        <td className="py-1.5"><span className="flex items-center gap-2 text-ink-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />{c.name}</span></td>
                        <td className="py-1.5 text-right tabular-nums text-ink">{formatMinutes(c.minutes, { short: true })}</td>
                        <td className="w-12 py-1.5 text-right tabular-nums text-muted">{pct(c.minutes, totalScheduled)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader icon={BarChart3} title="Distribuição do tempo na semana" subtitle={period === 'week' ? 'Horas agendadas por dia' : 'Média de horas agendadas por dia da semana'} />
              <div className="h-72 px-2 pb-2 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byWeekday} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chart.grid} />
                    <XAxis dataKey="day" {...axisProps(chart)} />
                    <YAxis {...axisProps(chart)} ticks={hourTicks(Math.max(...byWeekday.map((d) => d.total)), 5)} domain={[0, 'dataMax']} tickFormatter={(v) => `${v / 60}h`} />
                    <Tooltip cursor={{ fill: chart.cursor }} content={<ChartTooltip formatter={(v) => formatMinutes(v)} />} />
                    {byCategory.map((c, i) => (
                      <Bar key={c.id} dataKey={c.id} name={c.name} stackId="a" fill={c.color} stroke={chart.surface} strokeWidth={1} maxBarSize={36} radius={i === byCategory.length - 1 ? [4, 4, 0, 0] : 0} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="px-5 pb-4">
                <Legend items={byCategory.map((c) => ({ label: c.name, color: c.color }))} />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader icon={BookOpen} title="Estudo: planejado × realizado" subtitle={`Aderência de ${pct(studyDoneTotal, studyPlannedTotal)}%`} action={<Legend items={[{ label: 'Planejado', color: chart.planned }, { label: 'Realizado', color: chart.accent }]} />} />
              <div className="h-64 px-2 pb-4 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studyChart} barGap={2} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chart.grid} />
                    <XAxis dataKey="label" {...axisProps(chart)} />
                    <YAxis {...axisProps(chart)} ticks={studyTicks} domain={[0, studyTicks[studyTicks.length - 1]]} tickFormatter={(v) => `${v / 60}h`} />
                    <Tooltip cursor={{ fill: chart.cursor }} content={<ChartTooltip formatter={(v) => formatMinutes(v)} />} />
                    <Bar dataKey="planejado" name="Planejado" fill={chart.planned} radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="realizado" name="Realizado" fill={chart.accent} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader icon={CheckCircle2} title="Tarefas concluídas" subtitle={`${doneInRange.length} no período`} />
              <div className="h-64 px-2 pb-4 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksChart} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={chart.grid} />
                    <XAxis dataKey="label" {...axisProps(chart)} />
                    <YAxis {...axisProps(chart)} allowDecimals={false} />
                    <Tooltip cursor={{ fill: chart.cursor }} content={<ChartTooltip />} />
                    <Bar dataKey="concluidas" name="Concluídas" fill={chart.good} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader icon={Flame} title="Evolução dos hábitos" subtitle="% dos hábitos previstos cumpridos por dia" />
              <div className="h-64 px-2 pb-4 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={habitsChart} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="habitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chart.accent2} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={chart.accent2} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={chart.grid} />
                    <XAxis dataKey="label" {...axisProps(chart)} minTickGap={16} />
                    <YAxis {...axisProps(chart)} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip cursor={{ stroke: chart.grid }} content={<ChartTooltip formatter={(v) => (v == null ? '—' : `${v}%`)} />} />
                    <Area type="monotone" dataKey="pct" name="Cumpridos" stroke={chart.accent2} strokeWidth={2} fill="url(#habitFill)" connectNulls dot={period === 'week' ? { r: 4, strokeWidth: 2, stroke: chart.surface, fill: chart.accent2 } : false} activeDot={{ r: 5, strokeWidth: 2, stroke: chart.surface }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader icon={Clock} title="Concentração de atividades" subtitle="Dia da semana × hora (mais escuro = mais ocupado)" />
              <div className="overflow-x-auto px-4 pb-4 pt-3">
                <div className="min-w-[420px]">
                  {WEEKDAY_ORDER.map((wd, r) => (
                    <div key={wd} className="mb-[3px] flex items-center gap-[3px]">
                      <span className="w-8 shrink-0 text-[10px] text-muted">{WEEKDAYS_SHORT[wd]}</span>
                      {heat[r].slice(hourMin).map((v, h) => (
                        <div
                          key={h}
                          title={`${WEEKDAYS_SHORT[wd]}, ${h + hourMin}h: ${formatMinutes(v)}`}
                          className="h-5 flex-1 rounded-[3px]"
                          style={{ background: v ? `rgb(var(--brand) / ${0.12 + (v / heatMax) * 0.88})` : 'rgb(var(--surface-3))' }}
                        />
                      ))}
                    </div>
                  ))}
                  <div className="mt-1 flex gap-[3px] pl-[35px]">
                    {Array.from({ length: 24 - hourMin }, (_, i) => (
                      <span key={i} className="flex-1 text-center text-[9px] text-muted">{(i + hourMin) % 3 === 0 ? `${i + hourMin}h` : ''}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {busiest.slice(0, 3).map((d, i) => (
                    <div key={d.day} className="rounded-xl bg-surface-2 px-3 py-2">
                      <p className="text-[11px] text-muted">{i + 1}º mais ocupado</p>
                      <p className="text-sm font-semibold text-ink">{d.day} · {formatMinutes(d.total, { short: true })}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3 md:w-72">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-good/10 text-good"><BedDouble className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">Equilíbrio do dia</p>
                  <p className="text-xs text-muted">Sono planejado: {formatMinutes(1440 - awake)} por noite</p>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full bg-brand-2/60" style={{ width: `${((1440 - awake) / 1440) * 100}%` }} title="Sono" />
                  <div className="h-full border-l-2 border-surface gradient-brand" style={{ width: `${(avgBusy / 1440) * 100}%` }} title="Ocupado" />
                  <div className="h-full border-l-2 border-surface bg-good/50" style={{ width: `${(Math.max(0, awake - avgBusy) / 1440) * 100}%` }} title="Livre" />
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-2">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-2/60" />Sono {formatMinutes(1440 - awake, { short: true })}</span>
                  <span className="flex items-center gap-1.5"><span className="gradient-brand h-2.5 w-2.5 rounded-sm" />Ocupado (média) {formatMinutes(avgBusy, { short: true })}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-good/50" />Livre (média) {formatMinutes(Math.max(0, awake - avgBusy), { short: true })}</span>
                </div>
              </div>
              <div className="md:w-56">
                <p className="text-xs text-muted">Descanso e lazer agendado</p>
                <ProgressBar value={pct(restMinutes, totalScheduled)} tone="good" size="sm" className="mt-1.5" />
                <p className={cn('mt-1 text-[11px]', pct(restMinutes, totalScheduled) < 10 ? 'text-warn' : 'text-muted')}>
                  {pct(restMinutes, totalScheduled) < 10 ? 'Pouco tempo reservado para descanso — considere agendar pausas.' : `${pct(restMinutes, totalScheduled)}% do tempo agendado`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function weeksOf(start, end) {
  const out = [];
  let s = weekRange(start, 1).start;
  while (s <= end) {
    out.push({ s, e: addDays(s, 7), label: fmt(s, 'dd/MM') });
    s = addDays(s, 7);
  }
  return out;
}

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted">{sub}</p>
    </Card>
  );
}
