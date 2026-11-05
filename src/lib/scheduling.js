/**
 * Planejamento inteligente: conflitos, horários livres, carga do dia e sugestões de horário.
 * Todas as funções são puras — recebem ocorrências já expandidas (ver recurrence.js) e as configurações.
 */
import { addDays, addMinutes, atTime, dateKey, startOfDay, timeToMinutes, toDate } from './dates.js';

export const PERIODS = {
  manha: { label: 'Manhã', start: 6 * 60, end: 12 * 60 },
  tarde: { label: 'Tarde', start: 12 * 60, end: 18 * 60 },
  noite: { label: 'Noite', start: 18 * 60, end: 24 * 60 },
};

/** Une intervalos sobrepostos. Recebe [{start: Date, end: Date}] */
export function mergeIntervals(intervals) {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .map((i) => ({ start: toDate(i.start), end: toDate(i.end) }))
    .sort((a, b) => a.start - b.start);
  const out = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (last && cur.start <= last.end) {
      if (cur.end > last.end) last.end = cur.end;
    } else out.push({ ...cur });
  }
  return out;
}

/** Subtrai os intervalos ocupados de uma janela. */
export function subtractIntervals(window, busy) {
  const free = [];
  let cursor = window.start;
  for (const b of mergeIntervals(busy)) {
    if (b.end <= cursor) continue;
    if (b.start >= window.end) break;
    if (b.start > cursor) free.push({ start: cursor, end: b.start < window.end ? b.start : window.end });
    if (b.end > cursor) cursor = b.end;
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

const minutesBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 60000);

/** Detecta compromissos sobrepostos (ignora eventos de dia inteiro). */
export function findConflicts(occurrences) {
  const timed = occurrences.filter((o) => !o.allDay).sort((a, b) => a.start - b.start);
  const ids = new Set();
  const pairs = [];
  const active = [];
  for (const occ of timed) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].end <= occ.start) active.splice(i, 1);
    }
    for (const other of active) {
      if (other.eventId === occ.eventId) continue;
      ids.add(other.id);
      ids.add(occ.id);
      pairs.push([other, occ]);
    }
    active.push(occ);
  }
  return { ids, pairs };
}

/** Janela "acordado" de um dia, conforme horários de sono. */
export function dayWindow(day, settings) {
  const wake = settings?.sleep?.wake || '07:00';
  const bed = settings?.sleep?.bedtime || '23:00';
  const start = atTime(day, wake);
  let end = atTime(day, bed);
  if (timeToMinutes(bed) <= timeToMinutes(wake)) end = addDays(end, 1);
  return { start, end };
}

/** Blocos de descanso protegidos (ex.: almoço) de um dia. */
export function restIntervals(day, settings) {
  const d = startOfDay(toDate(day));
  return (settings?.restBlocks || [])
    .filter((b) => b.enabled !== false && (!b.days?.length || b.days.includes(d.getDay())))
    .map((b) => ({ start: atTime(d, b.start), end: atTime(d, b.end), label: b.label }));
}

/** Intervalos de sono que tocam o dia (para exibir no calendário). */
export function sleepIntervals(day, settings) {
  const d = startOfDay(toDate(day));
  const prevWindow = dayWindow(addDays(d, -1), settings);
  const window = dayWindow(d, settings);
  return mergeIntervals([
    { start: prevWindow.end, end: window.start },
    { start: window.end, end: dayWindow(addDays(d, 1), settings).start },
  ]).map((i) => ({ ...i, start: i.start < d ? d : i.start, end: i.end > addDays(d, 1) ? addDays(d, 1) : i.end }))
    .filter((i) => i.end > i.start);
}

const occurrencesOnWindow = (occurrences, window) =>
  occurrences.filter((o) => !o.allDay && o.start < window.end && o.end > window.start);

/** Minutos ocupados no período acordado do dia (sobreposições contadas uma vez). */
export function busyMinutes(day, occurrences, settings) {
  const window = dayWindow(day, settings);
  return mergeIntervals(
    occurrencesOnWindow(occurrences, window).map((o) => ({
      start: o.start < window.start ? window.start : o.start,
      end: o.end > window.end ? window.end : o.end,
    })),
  ).reduce((acc, i) => acc + minutesBetween(i.start, i.end), 0);
}

/**
 * Horários livres do dia.
 * options: { from: Date (ignora antes disso), bufferMin, minMinutes, respectRest }
 */
export function freeSlotsForDay(day, occurrences, settings, options = {}) {
  const { from = null, bufferMin = settings?.planning?.bufferMin ?? 0, minMinutes = 15, respectRest = true } = options;
  const window = dayWindow(day, settings);
  if (from && from > window.start) window.start = roundUp(from, 5);
  if (window.start >= window.end) return [];
  const busy = occurrencesOnWindow(occurrences, window).map((o) => ({
    start: addMinutes(o.start, -bufferMin),
    end: addMinutes(o.end, bufferMin),
  }));
  if (respectRest) busy.push(...restIntervals(day, settings));
  return subtractIntervals(window, busy)
    .map((s) => ({ ...s, minutes: minutesBetween(s.start, s.end) }))
    .filter((s) => s.minutes >= minMinutes);
}

export function freeMinutes(day, occurrences, settings, options) {
  return freeSlotsForDay(day, occurrences, settings, { bufferMin: 0, minMinutes: 1, ...options }).reduce(
    (acc, s) => acc + s.minutes,
    0,
  );
}

export function roundUp(date, step = 15) {
  const d = new Date(toDate(date));
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  const r = Math.ceil(m / step) * step;
  d.setMinutes(r);
  return d;
}

function periodOf(date) {
  const m = date.getHours() * 60 + date.getMinutes();
  return Object.entries(PERIODS).find(([, p]) => m >= p.start && m < p.end)?.[0] || 'noite';
}

/**
 * Sugere horários para uma atividade de `durationMin` minutos.
 * Respeita compromissos, sono, descansos protegidos, intervalo mínimo e limite diário de ocupação.
 */
export function suggestSlots({
  durationMin,
  occurrences,
  settings,
  from = new Date(),
  days = 14,
  preferredPeriod = settings?.planning?.preferredPeriod || 'any',
  limit = 5,
  deadline = null,
}) {
  const maxBusy = (settings?.planning?.maxBusyHours ?? 10) * 60;
  const bufferMin = settings?.planning?.bufferMin ?? 10;
  const candidates = [];
  const start = startOfDay(toDate(from));

  for (let i = 0; i < days; i += 1) {
    const day = addDays(start, i);
    if (deadline && day > toDate(deadline)) break;
    const load = busyMinutes(day, occurrences, settings);
    const slots = freeSlotsForDay(day, occurrences, settings, { from, bufferMin, minMinutes: durationMin });

    for (const slot of slots) {
      // posições candidatas dentro do bloco livre: início, e início do período preferido (se couber)
      const positions = [roundUp(slot.start, 15)];
      if (preferredPeriod !== 'any' && PERIODS[preferredPeriod]) {
        const pStart = atTime(day, '00:00');
        pStart.setMinutes(PERIODS[preferredPeriod].start);
        if (pStart > slot.start && addMinutes(pStart, durationMin) <= slot.end) positions.push(pStart);
      }
      for (const pos of positions) {
        const end = addMinutes(pos, durationMin);
        if (end > slot.end) continue;
        const reasons = [];
        let score = i * 10; // mais cedo é melhor
        const newLoad = load + durationMin;
        const period = periodOf(pos);
        if (preferredPeriod !== 'any') {
          if (period === preferredPeriod) {
            score -= 12;
            reasons.push(`no seu período preferido (${PERIODS[period].label.toLowerCase()})`);
          } else score += 4;
        }
        if (newLoad > maxBusy) {
          score += 60;
          reasons.unshift('deixa o dia acima do limite de ocupação');
        } else if (load < maxBusy * 0.5) {
          score -= 6;
          reasons.push('dia mais leve');
        }
        if (slot.minutes >= durationMin + 60) reasons.push('com folga antes e depois');
        candidates.push({ start: pos, end, score, reasons, dayLoad: load, overload: newLoad > maxBusy });
      }
    }
  }

  const unique = new Map();
  for (const c of candidates.sort((a, b) => a.score - b.score || a.start - b.start)) {
    const k = c.start.getTime();
    if (!unique.has(k)) unique.set(k, c);
  }
  // evita sugerir vários horários no mesmo dia logo no topo
  const perDay = {};
  const result = [];
  for (const c of unique.values()) {
    const k = dateKey(c.start);
    perDay[k] = (perDay[k] || 0) + 1;
    if (perDay[k] > 2) continue;
    result.push(c);
    if (result.length >= limit) break;
  }
  return result.sort((a, b) => a.start - b.start);
}

/** Dias com ocupação acima do limite configurado. */
export function overloadedDays(occurrences, settings, from = new Date(), days = 7) {
  const maxBusy = (settings?.planning?.maxBusyHours ?? 10) * 60;
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDays(startOfDay(toDate(from)), i);
    const busy = busyMinutes(day, occurrences, settings);
    if (busy > maxBusy) out.push({ day, busy, max: maxBusy });
  }
  return out;
}
