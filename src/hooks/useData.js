/** Hooks derivados do estado global (memorizados). */
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { expandEvents } from '../lib/recurrence.js';
import { addDays, startOfDay } from '../lib/dates.js';
import { computeAlerts } from '../lib/alerts.js';

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useCategoryMap() {
  const categories = useAppStore((s) => s.categories);
  return useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
}

export function useSubjectMap() {
  const subjects = useAppStore((s) => s.subjects);
  return useMemo(() => Object.fromEntries(subjects.map((c) => [c.id, c])), [subjects]);
}

/** Ocorrências (eventos expandidos) entre start e end. */
export function useOccurrences(start, end) {
  const events = useAppStore((s) => s.events);
  const s = start?.getTime();
  const e = end?.getTime();
  return useMemo(() => expandEvents(events, new Date(s), new Date(e)), [events, s, e]);
}

/** Avisos ativos (não dispensados), recalculados a cada minuto. */
export function useAlerts() {
  const now = useNow(60000);
  const state = useAppStore();
  const dayKey = startOfDay(now).getTime();
  const occurrences = useOccurrences(addDays(new Date(dayKey), -1), addDays(new Date(dayKey), 8));
  const all = useMemo(
    () => computeAlerts(state, occurrences, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, state.goals, state.exams, state.habits, state.studyLogs, state.settings, occurrences, now],
  );
  const dismissed = useMemo(() => new Set(state.dismissedAlerts), [state.dismissedAlerts]);
  return { all, active: all.filter((a) => !dismissed.has(a.id)), dismissed };
}
