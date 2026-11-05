/** Gera avisos inteligentes (notificações dentro do app) a partir do estado atual. */
import { addDays, dateKey, fmt, fmtRelativeDay, startOfDay, timeOf, toDate } from './dates.js';
import { findConflicts, overloadedDays } from './scheduling.js';
import { goalProgress } from './insights.js';
import { formatMinutes } from './utils.js';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

export function computeAlerts(state, occurrences, now = new Date()) {
  const alerts = [];
  const today = startOfDay(now);
  const todayStr = dateKey(today);
  const settings = state.settings;
  const upcoming = occurrences.filter((o) => o.end > now && o.start < addDays(today, 7));

  // compromissos sobrepostos
  for (const [a, b] of findConflicts(upcoming).pairs.slice(0, 10)) {
    alerts.push({
      id: `conflict:${a.id}|${b.id}`,
      kind: 'conflict',
      severity: 'critical',
      title: 'Compromissos sobrepostos',
      message: `"${a.title}" e "${b.title}" — ${fmtRelativeDay(b.start)}, ${timeOf(b.start)}`,
      to: `/agenda?date=${dateKey(b.start)}&view=timeGridDay`,
    });
  }

  // rotina excessivamente ocupada
  for (const d of overloadedDays(occurrences, settings, today, 7)) {
    alerts.push({
      id: `overload:${dateKey(d.day)}:${Math.round(d.busy / 30)}`,
      kind: 'overload',
      severity: 'warning',
      title: 'Dia muito ocupado',
      message: `${fmtRelativeDay(d.day)} tem ${formatMinutes(d.busy)} de compromissos (limite: ${formatMinutes(d.max)}). Considere mover algo ou reservar descanso.`,
      to: `/agenda?date=${dateKey(d.day)}&view=timeGridDay`,
    });
  }

  // tarefas atrasadas e próximas do prazo
  const warnUntil = dateKey(addDays(today, settings.planning?.deadlineWarningDays ?? 2));
  for (const t of state.tasks) {
    if (t.status === 'done' || !t.dueDate) continue;
    if (t.dueDate < todayStr) {
      alerts.push({
        id: `overdue:${t.id}:${t.dueDate}`,
        kind: 'overdue',
        severity: 'critical',
        title: 'Tarefa atrasada',
        message: `"${t.title}" venceu em ${fmt(`${t.dueDate}T12:00:00`, "d 'de' MMM")}.`,
        to: `/tarefas?task=${t.id}`,
      });
    } else if (t.dueDate <= warnUntil && ['high', 'urgent'].includes(t.priority)) {
      alerts.push({
        id: `deadline:${t.id}:${t.dueDate}`,
        kind: 'deadline',
        severity: 'warning',
        title: 'Prazo se aproximando',
        message: `"${t.title}" vence ${fmtRelativeDay(`${t.dueDate}T12:00:00`).toLowerCase()}.${t.eventId ? '' : ' Ainda não há horário reservado na agenda.'}`,
        to: `/tarefas?task=${t.id}`,
      });
    }
  }

  // provas e trabalhos nos próximos 7 dias
  for (const e of state.exams) {
    if (e.done || !e.date) continue;
    const d = toDate(`${e.date}T12:00:00`);
    if (d >= today && d < addDays(today, 8)) {
      alerts.push({
        id: `exam:${e.id}:${e.date}`,
        kind: 'exam',
        severity: d < addDays(today, 3) ? 'warning' : 'info',
        title: e.type === 'trabalho' ? 'Entrega de trabalho' : 'Prova chegando',
        message: `${e.title} — ${fmtRelativeDay(d).toLowerCase()}.`,
        to: '/estudos?tab=avaliacoes',
      });
    }
  }

  // metas atrasadas
  for (const g of state.goals) {
    const p = goalProgress(g, state, now);
    if (p.late) {
      alerts.push({
        id: `goal:${g.id}:${p.periodKey}`,
        kind: 'goal',
        severity: 'warning',
        title: 'Meta atrasada',
        message: `"${g.title}" está em ${p.pct}% — o esperado para hoje seria cerca de ${p.expected}%.`,
        to: '/metas',
      });
    }
  }

  // próximo compromisso em breve
  const soon = settings.notifications?.upcomingMinutes ?? 15;
  for (const o of occurrences) {
    if (o.allDay) continue;
    const diff = (o.start - now) / 60000;
    if (diff > 0 && diff <= soon) {
      alerts.push({
        id: `upcoming:${o.id}`,
        kind: 'upcoming',
        severity: 'info',
        title: 'Começa em breve',
        message: `"${o.title}" começa às ${timeOf(o.start)} (em ${Math.ceil(diff)} min).`,
        to: `/agenda?date=${dateKey(o.start)}&view=timeGridDay`,
      });
    }
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
