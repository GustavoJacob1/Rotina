/**
 * Indicadores derivados: hábitos, metas, produtividade e estatísticas de estudo.
 * Funções puras que recebem o estado e devolvem números prontos para exibição.
 */
import { differenceInCalendarDays, startOfWeek } from 'date-fns';
import { addDays, dateKey, eachDay, monthRange, startOfDay, toDate, weekRange } from './dates.js';
import { clamp, sumBy } from './utils.js';

const inRange = (value, start, end) => {
  const d = toDate(value);
  return d >= start && d <= end;
};

// ---------- Hábitos ----------
export function isHabitDueOn(habit, day) {
  const f = habit.frequency || { type: 'daily' };
  if (f.type === 'days') return (f.days || []).includes(toDate(day).getDay());
  return true;
}

export const habitDone = (habit, day) => Boolean(habit.log?.[dateKey(day)]);

export function habitFrequencyLabel(habit) {
  const f = habit.frequency || { type: 'daily' };
  if (f.type === 'daily') return 'Todos os dias';
  if (f.type === 'weekly') return `${f.timesPerWeek || 1}x por semana`;
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return [...(f.days || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => names[d]).join(', ');
}

function weekCount(habit, weekStart) {
  return eachDay(weekStart, addDays(weekStart, 6)).filter((d) => habitDone(habit, d)).length;
}

/** Sequência atual: dias (ou semanas, para hábitos "x por semana") cumpridos sem interrupção. */
export function habitStreak(habit, today = new Date()) {
  const f = habit.frequency || { type: 'daily' };
  if (f.type === 'weekly') {
    const target = f.timesPerWeek || 1;
    let week = startOfWeek(today, { weekStartsOn: 1 });
    let streak = 0;
    if (weekCount(habit, week) >= target) streak += 1;
    week = addDays(week, -7);
    for (let i = 0; i < 104 && weekCount(habit, week) >= target; i += 1) {
      streak += 1;
      week = addDays(week, -7);
    }
    return { value: streak, unit: streak === 1 ? 'semana' : 'semanas' };
  }
  let day = startOfDay(today);
  let streak = 0;
  if (isHabitDueOn(habit, day) && habitDone(habit, day)) streak += 1;
  day = addDays(day, -1);
  const created = startOfDay(toDate(habit.createdAt || addDays(today, -400)));
  for (let i = 0; i < 400 && day >= addDays(created, -1); i += 1) {
    if (isHabitDueOn(habit, day)) {
      if (!habitDone(habit, day)) break;
      streak += 1;
    }
    day = addDays(day, -1);
  }
  return { value: streak, unit: streak === 1 ? 'dia' : 'dias' };
}

/** % de conclusão nos últimos `days` dias (respeitando a data de criação). */
export function habitCompletion(habit, days = 30, today = new Date()) {
  const f = habit.frequency || { type: 'daily' };
  const end = startOfDay(today);
  let start = addDays(end, -(days - 1));
  const created = habit.createdAt ? startOfDay(toDate(habit.createdAt)) : start;
  if (created > start) start = created;
  if (f.type === 'weekly') {
    const target = f.timesPerWeek || 1;
    const weeks = Math.max(1, Math.ceil((differenceInCalendarDays(end, start) + 1) / 7));
    let done = 0;
    for (let i = 0; i < weeks; i += 1) done += Math.min(target, weekCount(habit, startOfWeek(addDays(end, -7 * i), { weekStartsOn: 1 })));
    return clamp(Math.round((done / (weeks * target)) * 100), 0, 100);
  }
  let due = 0;
  let done = 0;
  for (const d of eachDay(start, end)) {
    if (!isHabitDueOn(habit, d)) continue;
    const isToday = d.getTime() === end.getTime();
    if (habitDone(habit, d)) {
      done += 1;
      due += 1;
    } else if (!isToday) due += 1; // hoje ainda pode ser cumprido
  }
  return due ? Math.round((done / due) * 100) : 0;
}

// ---------- Metas ----------
export function goalPeriod(goal, now = new Date()) {
  return goal.period === 'monthly' ? monthRange(now) : weekRange(now, 1);
}

export function goalProgress(goal, state, now = new Date()) {
  const { start, end } = goalPeriod(goal, now);
  let current = 0;
  if (goal.source === 'studyHours') {
    current = sumBy(state.studyLogs.filter((l) => inRange(l.date, start, end)), (l) => l.minutes) / 60;
  } else if (goal.source === 'tasksDone') {
    current = state.tasks.filter((t) => t.status === 'done' && t.completedAt && inRange(t.completedAt, start, end)).length;
  } else if (goal.source === 'habit') {
    const habit = state.habits.find((h) => h.id === goal.habitId);
    current = habit ? Object.keys(habit.log || {}).filter((k) => inRange(`${k}T12:00:00`, start, end)).length : 0;
  } else {
    current = sumBy((goal.entries || []).filter((e) => inRange(e.date, start, end)), (e) => Number(e.amount) || 0);
  }
  const target = Number(goal.target) || 1;
  const pctValue = clamp(Math.round((current / target) * 100), 0, 100);
  const elapsed = clamp((now - start) / (end - start), 0, 1);
  const expected = Math.round(elapsed * 100);
  const late = pctValue < 100 && elapsed > 0.3 && pctValue + 20 < expected;
  return {
    current: Math.round(current * 10) / 10,
    target,
    pct: pctValue,
    expected,
    late,
    done: pctValue >= 100,
    periodKey: dateKey(start),
    start,
    end,
  };
}

// ---------- Estudos ----------
export const isStudyOccurrence = (occ, categoriesById) =>
  Boolean(occ.subjectId) || categoriesById[occ.categoryId]?.kind === 'study';

export function studyMinutes(logs, start, end, subjectId = null) {
  return sumBy(
    logs.filter((l) => inRange(l.date, start, end) && (!subjectId || l.subjectId === subjectId)),
    (l) => l.minutes,
  );
}

export function plannedStudyMinutes(occurrences, start, end, subjectId = null) {
  return sumBy(
    occurrences.filter((o) => o.subjectId && o.start >= start && o.start <= end && (!subjectId || o.subjectId === subjectId)),
    (o) => (o.end - o.start) / 60000,
  );
}

// ---------- Produtividade do dia ----------
/**
 * Índice de produtividade (0–100): média dos componentes disponíveis no dia —
 * tarefas (concluídas vs. previstas), estudo (realizado vs. planejado) e hábitos (cumpridos vs. previstos).
 */
export function productivityToday(state, todayOccurrences, now = new Date()) {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const todayStr = dateKey(today);
  const doneToday = state.tasks.filter((t) => t.status === 'done' && t.completedAt && toDate(t.completedAt) >= today && toDate(t.completedAt) < tomorrow).length;
  const pendingDue = state.tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate <= todayStr).length;
  const parts = [];
  if (doneToday + pendingDue > 0) parts.push({ key: 'tasks', label: 'Tarefas', value: doneToday / (doneToday + pendingDue) });

  const planned = plannedStudyMinutes(todayOccurrences, today, tomorrow);
  const studied = studyMinutes(state.studyLogs, today, tomorrow);
  if (planned > 0) parts.push({ key: 'study', label: 'Estudo', value: Math.min(1, studied / planned) });
  else if (studied > 0) parts.push({ key: 'study', label: 'Estudo', value: 1 });

  const dueHabits = state.habits.filter((h) => isHabitDueOn(h, today) && (h.frequency?.type !== 'weekly'));
  if (dueHabits.length) parts.push({ key: 'habits', label: 'Hábitos', value: dueHabits.filter((h) => habitDone(h, today)).length / dueHabits.length });

  const score = parts.length ? Math.round((sumBy(parts, (p) => p.value) / parts.length) * 100) : null;
  return { score, parts: parts.map((p) => ({ ...p, pct: Math.round(p.value * 100) })) };
}

export function productivityLabel(score) {
  if (score == null) return { text: 'Sem dados ainda', tone: 'muted' };
  if (score >= 80) return { text: 'Excelente ritmo', tone: 'good' };
  if (score >= 55) return { text: 'Bom progresso', tone: 'brand' };
  if (score >= 30) return { text: 'Dá para recuperar', tone: 'warn' };
  return { text: 'Dia começando', tone: 'warn' };
}
