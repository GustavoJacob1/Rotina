import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlarmClock, ArrowRight, BookOpen, CalendarClock, CalendarDays, CheckCircle2, Clock, Coffee, Flame, Gauge,
  ListTodo, MapPin, Plus, Target, TriangleAlert, Hourglass,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { useUiStore } from '../store/useUiStore.js';
import { useAlerts, useCategoryMap, useNow, useOccurrences } from '../hooks/useData.js';
import { Badge, Button, Card, CardHeader, Checkbox, DemoBadge, EmptyState, ProgressBar, Ring } from '../components/ui/primitives.jsx';
import { AlertItem } from '../components/layout/NotificationsPanel.jsx';
import { ChartTooltip, Legend, axisProps, hourTicks, useChartTheme } from '../components/charts/chartTheme.jsx';
import { WEEKDAYS_SHORT, addDays, dateKey, eachDay, fmt, fmtLong, fmtRelativeDay, greeting, startOfDay, timeOf, weekRange } from '../lib/dates.js';
import { dayWindow, findConflicts, freeMinutes, freeSlotsForDay } from '../lib/scheduling.js';
import { goalProgress, habitDone, habitStreak, isHabitDueOn, plannedStudyMinutes, productivityLabel, productivityToday, studyMinutes } from '../lib/insights.js';
import { PRIORITIES } from '../lib/constants.js';
import { cn, formatMinutes, pct } from '../lib/utils.js';

function StatTile({ icon: Icon, label, value, sub, children, tone = 'brand', to }) {
  const tones = { brand: 'bg-brand/10 text-brand', violet: 'bg-brand-2/10 text-brand-2', good: 'bg-good/10 text-good', warn: 'bg-warn/10 text-warn' };
  const body = (
    <Card className="h-full p-4 transition hover:border-brand/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-ink">{value}</p>
          {sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}
        </div>
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </Card>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

export default function Dashboard() {
  const now = useNow(30000);
  const state = useAppStore();
  const { settings, tasks, habits, goals, studyLogs } = state;
  const toggleTaskDone = useAppStore((s) => s.toggleTaskDone);
  const toggleHabit = useAppStore((s) => s.toggleHabit);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const openTaskEditor = useUiStore((s) => s.openTaskEditor);
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const navigate = useNavigate();
  const catMap = useCategoryMap();
  const chart = useChartTheme();
  const { active: alerts } = useAlerts();

  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const todayStr = dateKey(today);
  const week = weekRange(now, 1);
  const weekOcc = useOccurrences(week.start, addDays(week.end, 8));
  const todayOcc = useMemo(() => weekOcc.filter((o) => o.start < tomorrow && o.end > today), [weekOcc, today.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const conflictIds = useMemo(() => findConflicts(todayOcc).ids, [todayOcc]);

  // ---- indicadores ----
  const pending = tasks.filter((t) => t.status !== 'done');
  const overdue = pending.filter((t) => t.dueDate && t.dueDate < todayStr);
  const doneToday = tasks.filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= today).length;
  const dueToday = pending.filter((t) => t.dueDate && t.dueDate <= todayStr).length;
  const doneWeek = tasks.filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= week.start).length;

  const studyPlanned = plannedStudyMinutes(todayOcc, today, tomorrow);
  const studyDone = studyMinutes(studyLogs, today, tomorrow);
  const weekPlanned = plannedStudyMinutes(weekOcc, week.start, week.end);
  const weekDone = studyMinutes(studyLogs, week.start, week.end);

  const freeLeft = freeMinutes(today, weekOcc, settings, { from: now, respectRest: true });
  const freeTotal = freeMinutes(today, weekOcc, settings, { respectRest: true });
  const awake = (dayWindow(today, settings).end - dayWindow(today, settings).start) / 60000;

  const productivity = productivityToday(state, todayOcc, now);
  const prodLabel = productivityLabel(productivity.score);

  const current = todayOcc.find((o) => !o.allDay && o.start <= now && o.end > now);
  const upcoming = weekOcc.find((o) => !o.allDay && o.start > now);

  const weeklyGoals = goals.filter((g) => g.period === 'weekly').map((g) => ({ goal: g, p: goalProgress(g, state, now) }));
  const dueHabits = habits.filter((h) => isHabitDueOn(h, today));
  const habitsDone = dueHabits.filter((h) => habitDone(h, today)).length;

  const priorityTasks = [...pending]
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || PRIORITIES[b.priority].order - PRIORITIES[a.priority].order)
    .slice(0, 5);

  // timeline de hoje com períodos livres
  const timeline = useMemo(() => {
    const items = todayOcc.filter((o) => !o.allDay).map((o) => ({ type: 'event', occ: o, start: o.start, end: o.end }));
    for (const s of freeSlotsForDay(today, todayOcc, settings, { bufferMin: 0, minMinutes: 45, respectRest: false })) {
      items.push({ type: 'free', start: s.start, end: s.end, minutes: s.minutes });
    }
    return items.sort((a, b) => a.start - b.start);
  }, [todayOcc, settings, today.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const allDayToday = todayOcc.filter((o) => o.allDay);

  const studyChart = eachDay(week.start, week.end).map((d) => {
    const e = addDays(d, 1);
    return {
      day: WEEKDAYS_SHORT[d.getDay()],
      planejado: Math.round(plannedStudyMinutes(weekOcc, d, e)),
      realizado: Math.round(studyMinutes(studyLogs, d, e)),
    };
  });

  const studyTicks = hourTicks(Math.max(...studyChart.map((d) => Math.max(d.planejado, d.realizado))));
  const nextTarget = current || upcoming;
  const minsTo = nextTarget ? Math.round((nextTarget.start - now) / 60000) : 0;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm cap-first text-muted">{fmtLong(now)}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {greeting(now)}, <span className="text-gradient">{settings.userName}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Hoje você tem <b className="text-ink">{todayOcc.length} {todayOcc.length === 1 ? 'compromisso' : 'compromissos'}</b>,{' '}
            <b className="text-ink">{dueToday} {dueToday === 1 ? 'tarefa' : 'tarefas'}</b> para entregar e{' '}
            <b className="text-ink">{formatMinutes(freeLeft)}</b> livres pela frente.
            {state.hasDemoData && <DemoBadge className="ml-2 align-middle" />}
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={ListTodo} onClick={() => openQuickAdd('task')}>Tarefa</Button>
          <Button variant="primary" icon={Plus} onClick={() => openQuickAdd('event')}>Atividade</Button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile icon={CheckCircle2} label="Tarefas de hoje" value={`${doneToday}/${doneToday + dueToday}`} sub={`${pending.length} pendentes · ${doneWeek} concluídas na semana`} tone="good" to="/tarefas">
          <ProgressBar value={pct(doneToday, doneToday + dueToday)} tone="good" size="sm" />
        </StatTile>
        <StatTile icon={BookOpen} label="Estudo hoje" value={formatMinutes(studyDone, { short: true })} sub={`de ${formatMinutes(studyPlanned, { short: true })} planejadas · semana ${formatMinutes(weekDone, { short: true })}/${formatMinutes(weekPlanned, { short: true })}`} tone="violet" to="/estudos">
          <ProgressBar value={pct(studyDone, studyPlanned || (studyDone ? studyDone : 1))} size="sm" />
        </StatTile>
        <StatTile icon={Hourglass} label="Tempo livre restante" value={formatMinutes(freeLeft, { short: true })} sub={`${formatMinutes(freeTotal, { short: true })} livres no dia · ${Math.round(awake / 60)}h acordado`} tone="brand" to="/agenda">
          <ProgressBar value={pct(freeLeft, awake)} color="rgb(var(--brand))" size="sm" />
        </StatTile>
        <Card className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
          <Ring value={productivity.score ?? 0} size={64} stroke={7}>
            <span className="text-lg font-semibold tabular-nums text-ink">{productivity.score ?? '—'}</span>
          </Ring>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted"><Gauge className="h-3.5 w-3.5" /> Produtividade</p>
            <p className={cn('mt-0.5 text-sm font-semibold', { good: 'text-good', brand: 'text-brand', warn: 'text-warn', muted: 'text-muted' }[prodLabel.tone])}>{prodLabel.text}</p>
            <div className="mt-1 space-y-0.5">
              {productivity.parts.map((p) => (
                <p key={p.key} className="text-[11px] text-muted">{p.label}: <span className="tabular-nums text-ink-2">{p.pct}%</span></p>
              ))}
              {!productivity.parts.length && <p className="text-[11px] text-muted">Conclua tarefas, estudos e hábitos para calcular.</p>}
            </div>
          </div>
        </Card>
      </div>

      {/* Avisos de atraso */}
      {overdue.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/tarefas?filter=overdue')}
          className="flex w-full items-center gap-3 rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-left transition hover:bg-bad/15"
        >
          <TriangleAlert className="h-5 w-5 shrink-0 text-bad" />
          <p className="flex-1 text-sm text-ink">
            <b>{overdue.length} {overdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}:</b>{' '}
            <span className="text-ink-2">{overdue.slice(0, 3).map((t) => t.title).join(' · ')}{overdue.length > 3 ? '…' : ''}</span>
          </p>
          <ArrowRight className="h-4 w-4 text-muted" />
        </button>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Próximo compromisso + timeline */}
        <div className="space-y-5 xl:col-span-2">
          <Card className="overflow-hidden">
            {nextTarget ? (
              <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: catMap[nextTarget.categoryId]?.color }} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    <CalendarClock className="h-3.5 w-3.5" /> {current ? 'Acontecendo agora' : 'Próximo compromisso'}
                  </p>
                  <h2 className="mt-1.5 truncate text-lg font-semibold text-ink">{nextTarget.title}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span className="cap-first">{fmtRelativeDay(nextTarget.start)}, {timeOf(nextTarget.start)}–{timeOf(nextTarget.end)}</span>
                    {catMap[nextTarget.categoryId] && <Badge color={catMap[nextTarget.categoryId].color}>{catMap[nextTarget.categoryId].name}</Badge>}
                    {nextTarget.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{nextTarget.location}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-surface-2 px-4 py-2 text-center">
                    <p className="text-[11px] text-muted">{current ? 'termina em' : 'começa em'}</p>
                    <p className="text-lg font-semibold tabular-nums text-ink">
                      {formatMinutes(current ? Math.round((current.end - now) / 60000) : minsTo, { short: true })}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openEventEditor({ occurrence: nextTarget })}>Abrir</Button>
                </div>
              </div>
            ) : (
              <EmptyState compact icon={CalendarDays} title="Nenhum compromisso nos próximos dias" description="Adicione atividades à agenda para ver o próximo compromisso aqui." action={<Button size="sm" variant="primary" icon={Plus} onClick={() => openQuickAdd('event')}>Nova atividade</Button>} />
            )}
          </Card>

          <Card>
            <CardHeader
              icon={Clock}
              title="Linha do tempo de hoje"
              subtitle={`${todayOcc.length} atividades · ${formatMinutes(freeTotal)} livres`}
              action={<Link to="/agenda?view=timeGridDay" className="text-xs font-semibold text-brand hover:underline">Ver agenda</Link>}
            />
            <div className="px-5 pb-5 pt-3">
              {allDayToday.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {allDayToday.map((o) => (
                    <button key={o.id} type="button" onClick={() => openEventEditor({ occurrence: o })}>
                      <Badge color={catMap[o.categoryId]?.color}>Dia inteiro · {o.title}</Badge>
                    </button>
                  ))}
                </div>
              )}
              {timeline.length === 0 ? (
                <EmptyState compact icon={Coffee} title="Dia livre!" description="Nada agendado para hoje. Que tal planejar uma sessão de estudo ou um descanso?" />
              ) : (
                <ol className="relative space-y-1.5 border-l border-line pl-4">
                  {timeline.map((item) => {
                    const isNow = item.start <= now && item.end > now;
                    const past = item.end <= now;
                    if (item.type === 'free') {
                      return (
                        <li key={`free-${item.start.getTime()}`} className={cn('relative', past && 'opacity-40')}>
                          <span className="absolute -left-[21px] top-2.5 h-2 w-2 rounded-full border border-good bg-surface" />
                          <button
                            type="button"
                            onClick={() => openEventEditor({ defaults: { start: item.start < now ? now : item.start, end: new Date(Math.min(item.end, (item.start < now ? now : item.start).getTime() + 60 * 60000)) } })}
                            className="flex w-full items-center gap-3 rounded-lg border border-dashed border-good/30 px-3 py-1.5 text-left text-xs text-good transition hover:bg-good/5"
                          >
                            <span className="tabular-nums">{timeOf(item.start)}–{timeOf(item.end)}</span>
                            <span className="font-medium">Livre · {formatMinutes(item.minutes)}</span>
                            <span className="ml-auto hidden text-[11px] text-muted sm:inline">clique para agendar</span>
                          </button>
                        </li>
                      );
                    }
                    const o = item.occ;
                    const cat = catMap[o.categoryId];
                    return (
                      <li key={o.id} className={cn('relative', past && 'opacity-50')}>
                        <span className={cn('absolute -left-[21px] top-3 h-2 w-2 rounded-full', isNow && 'ring-4 ring-brand/25')} style={{ background: cat?.color || 'rgb(var(--muted))' }} />
                        <button
                          type="button"
                          onClick={() => openEventEditor({ occurrence: o })}
                          className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-surface-2', isNow && 'bg-brand/10')}
                        >
                          <span className="w-[88px] shrink-0 text-xs tabular-nums text-muted">{timeOf(o.start)}–{timeOf(o.end)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{o.title}</span>
                            <span className="block truncate text-[11px] text-muted">{cat?.name}{o.location ? ` · ${o.location}` : ''}</span>
                          </span>
                          {conflictIds.has(o.id) && <span className="chip bg-bad/15 text-bad"><TriangleAlert className="h-3 w-3" />Conflito</span>}
                          {isNow && <span className="chip bg-brand/15 text-brand">Agora</span>}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={BookOpen} title="Estudo da semana" subtitle={`Planejado ${formatMinutes(weekPlanned)} · realizado ${formatMinutes(weekDone)}`} action={<Legend items={[{ label: 'Planejado', color: chart.planned }, { label: 'Realizado', color: chart.accent }]} />} />
            <div className="h-56 px-2 pb-3 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyChart} barGap={2} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={chart.grid} />
                  <XAxis dataKey="day" {...axisProps(chart)} />
                  <YAxis {...axisProps(chart)} ticks={studyTicks} domain={[0, studyTicks[studyTicks.length - 1]]} tickFormatter={(v) => `${v / 60}h`} />
                  <Tooltip cursor={{ fill: chart.cursor }} content={<ChartTooltip formatter={(v) => formatMinutes(v)} />} />
                  <Bar dataKey="planejado" name="Planejado" fill={chart.planned} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="realizado" name="Realizado" fill={chart.accent} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          <Card>
            <CardHeader icon={Target} title="Metas da semana" action={<Link to="/metas" className="text-xs font-semibold text-brand hover:underline">Todas</Link>} />
            <div className="space-y-4 px-5 pb-5 pt-4">
              {weeklyGoals.length === 0 ? (
                <EmptyState compact title="Sem metas semanais" description="Defina metas como “Estudar 10h” e acompanhe o progresso automaticamente." action={<Button size="sm" onClick={() => navigate('/metas')}>Criar meta</Button>} />
              ) : (
                weeklyGoals.map(({ goal, p }) => (
                  <div key={goal.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-ink">{goal.title}</span>
                      <span className={cn('shrink-0 text-xs tabular-nums', p.done ? 'text-good' : p.late ? 'text-warn' : 'text-muted')}>
                        {String(p.current).replace('.', ',')}/{p.target} {goal.unit}
                      </span>
                    </div>
                    <ProgressBar value={p.pct} tone={p.done ? 'good' : p.late ? 'warn' : undefined} size="sm" />
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={Flame} title="Hábitos de hoje" subtitle={`${habitsDone} de ${dueHabits.length} cumpridos`} action={<Link to="/habitos" className="text-xs font-semibold text-brand hover:underline">Ver</Link>} />
            <div className="space-y-1 px-3 pb-4 pt-3">
              {dueHabits.length === 0 ? (
                <EmptyState compact title="Nenhum hábito para hoje" description="Cadastre hábitos como estudar, ler ou treinar." />
              ) : (
                dueHabits.map((h) => {
                  const done = habitDone(h, today);
                  const streak = habitStreak(h, now);
                  return (
                    <button key={h.id} type="button" onClick={() => toggleHabit(h.id, todayStr)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2">
                      <span className="text-lg">{h.icon}</span>
                      <span className={cn('min-w-0 flex-1 truncate text-sm', done ? 'text-muted line-through' : 'text-ink')}>{h.name}</span>
                      {streak.value > 0 && <span className="text-[11px] tabular-nums text-warn">🔥 {streak.value}</span>}
                      <Checkbox checked={done} onChange={() => toggleHabit(h.id, todayStr)} color={h.color} label={h.name} />
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={ListTodo} title="Próximas tarefas" action={<Link to="/tarefas" className="text-xs font-semibold text-brand hover:underline">Kanban</Link>} />
            <div className="space-y-1 px-3 pb-4 pt-3">
              {priorityTasks.length === 0 ? (
                <EmptyState compact icon={CheckCircle2} title="Nenhuma tarefa pendente" description="Tudo concluído! Adicione novas tarefas quando precisar." />
              ) : (
                priorityTasks.map((t) => {
                  const late = t.dueDate && t.dueDate < todayStr;
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                      <Checkbox checked={t.status === 'done'} onChange={() => toggleTaskDone(t.id)} label={`Concluir ${t.title}`} />
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openTaskEditor({ taskId: t.id })}>
                        <span className="block truncate text-sm text-ink">{t.title}</span>
                        <span className={cn('flex items-center gap-1 text-[11px]', late ? 'text-bad' : 'text-muted')}>
                          <AlarmClock className="h-3 w-3" />
                          {t.dueDate ? (late ? `Atrasada · ${fmt(`${t.dueDate}T12:00`, 'dd/MM')}` : fmtRelativeDay(`${t.dueDate}T12:00`)) : 'Sem prazo'}
                        </span>
                      </button>
                      <span className={cn('chip', PRIORITIES[t.priority].className)}>{PRIORITIES[t.priority].label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={TriangleAlert} title="Avisos" subtitle="Conflitos, prazos e metas" />
            <div className="space-y-2 px-4 pb-4 pt-3">
              {alerts.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted">Nenhum aviso. Sua rotina está em ordem ✨</p>
              ) : (
                alerts.slice(0, 4).map((a) => <AlertItem key={a.id} alert={a} compact onOpen={() => navigate(a.to)} />)
              )}
              {alerts.length > 4 && (
                <button type="button" onClick={() => useUiStore.getState().setNotificationsOpen(true)} className="w-full pt-1 text-center text-xs font-semibold text-brand hover:underline">
                  Ver todos ({alerts.length})
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
