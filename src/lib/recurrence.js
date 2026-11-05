/**
 * Expansão de eventos (inclusive recorrentes) em ocorrências concretas.
 *
 * Modelo de evento:
 * { id, title, description, categoryId, start: ISO, end: ISO, allDay,
 *   recurrence: null | { freq: 'daily' | 'weekly', interval: 1, daysOfWeek: [0..6], until: 'YYYY-MM-DD' | null },
 *   exdates: ['YYYY-MM-DD'], taskId?, subjectId?, location? }
 */
import { differenceInCalendarDays, startOfWeek } from 'date-fns';
import { addDays, addMinutes, dateKey, startOfDay, toDate, WEEKDAYS_SHORT } from './dates.js';

export function isRecurring(event) {
  return Boolean(event?.recurrence && event.recurrence.freq);
}

function matchesRule(rule, seriesStart, day) {
  const interval = Math.max(1, rule.interval || 1);
  if (rule.freq === 'daily') {
    return differenceInCalendarDays(day, seriesStart) % interval === 0;
  }
  if (rule.freq === 'weekly') {
    const days = rule.daysOfWeek?.length ? rule.daysOfWeek : [seriesStart.getDay()];
    if (!days.includes(day.getDay())) return false;
    if (interval === 1) return true;
    const weeks = Math.round(
      differenceInCalendarDays(startOfWeek(day, { weekStartsOn: 1 }), startOfWeek(seriesStart, { weekStartsOn: 1 })) / 7,
    );
    return weeks % interval === 0;
  }
  return false;
}

function makeOccurrence(event, start, end, recurring) {
  const key = dateKey(start);
  return {
    id: recurring ? `${event.id}@${key}` : event.id,
    eventId: event.id,
    occurrenceDate: key,
    recurring,
    title: event.title,
    description: event.description || '',
    categoryId: event.categoryId,
    location: event.location || '',
    allDay: Boolean(event.allDay),
    taskId: event.taskId || null,
    subjectId: event.subjectId || null,
    start,
    end,
  };
}

/** Retorna as ocorrências de todos os eventos que intersectam [rangeStart, rangeEnd). */
export function expandEvents(events, rangeStart, rangeEnd) {
  const from = toDate(rangeStart);
  const to = toDate(rangeEnd);
  const out = [];

  for (const event of events) {
    const start = toDate(event.start);
    const end = toDate(event.end);
    const duration = Math.max(1, (end - start) / 60000);

    if (!isRecurring(event)) {
      if (start < to && end > from) out.push(makeOccurrence(event, start, end, false));
      continue;
    }

    const rule = event.recurrence;
    const exdates = new Set(event.exdates || []);
    const seriesDay = startOfDay(start);
    const until = rule.until ? addDays(startOfDay(toDate(`${rule.until}T00:00:00`)), 1) : null;
    const minutesOfDay = start.getHours() * 60 + start.getMinutes();
    // começa um pouco antes para capturar ocorrências que atravessam a meia-noite
    let day = startOfDay(addMinutes(from, -duration));
    if (day < seriesDay) day = seriesDay;

    let guard = 0;
    while (day < to && guard < 1200) {
      guard += 1;
      if (until && day >= until) break;
      if (matchesRule(rule, seriesDay, day) && !exdates.has(dateKey(day))) {
        const occStart = addMinutes(day, minutesOfDay);
        const occEnd = addMinutes(occStart, duration);
        if (occStart < to && occEnd > from) out.push(makeOccurrence(event, occStart, occEnd, true));
      }
      day = addDays(day, 1);
    }
  }

  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Texto amigável para a regra de recorrência. */
export function describeRecurrence(rule) {
  if (!rule || !rule.freq) return 'Não se repete';
  const interval = Math.max(1, rule.interval || 1);
  let text;
  if (rule.freq === 'daily') {
    text = interval === 1 ? 'Todos os dias' : `A cada ${interval} dias`;
  } else {
    const days = [...(rule.daysOfWeek || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const key = days.join(',');
    if (key === '1,2,3,4,5') text = 'Segunda a sexta';
    else if (key === '1,2,3,4,5,6,0') text = 'Todos os dias';
    else if (key === '6,0') text = 'Fins de semana';
    else text = `Toda ${days.map((d) => WEEKDAYS_SHORT[d]).join(', ')}`;
    if (interval > 1) text = `${text} (a cada ${interval} semanas)`;
  }
  if (rule.until) {
    const [y, m, d] = rule.until.split('-');
    text += ` até ${d}/${m}/${y}`;
  }
  return text;
}
