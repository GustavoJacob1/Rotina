/**
 * Estado global da aplicação (Zustand) com persistência.
 * Cada "fatia" (eventos, tarefas, estudos, hábitos, metas...) expõe ações puras e previsíveis,
 * o que facilita trocar a persistência local por uma API REST no futuro.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { differenceInCalendarDays } from 'date-fns';
import { buildDemoData, buildEmptyData } from '../data/seed.js';
import { DEFAULT_SETTINGS } from '../lib/constants.js';
import { addDays, atTime, dateKey, fromKey, toDate } from '../lib/dates.js';
import { uid } from '../lib/utils.js';
import { localStorageAdapter, STORAGE_KEY } from '../services/persistence.js';

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Mescla configurações em até dois níveis (ex.: { sleep: { wake } }). */
export function mergeSettings(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    out[k] = isPlainObject(v) && isPlainObject(base?.[k]) ? { ...base[k], ...v } : v;
  }
  return out;
}

const now = () => new Date().toISOString();
const updateIn = (list, id, patch) =>
  list.map((item) => (item.id === id ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } : item));

const shiftWeekdays = (days, delta) => [...new Set(days.map((d) => (((d + delta) % 7) + 7) % 7))];

export const useAppStore = create(
  persist(
    (set, get) => ({
      ...buildDemoData(),

      // ---------- Configurações ----------
      updateSettings: (patch) => set((s) => ({ settings: mergeSettings(s.settings, patch) })),

      // ---------- Categorias ----------
      addCategory: (data) => {
        const category = { id: uid('cat'), kind: 'other', ...data };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },
      updateCategory: (id, patch) => set((s) => ({ categories: updateIn(s.categories, id, patch) })),
      deleteCategory: (id, reassignTo = null) =>
        set((s) => {
          const fallback = reassignTo || s.categories.find((c) => c.id !== id)?.id || null;
          const swap = (item) => (item.categoryId === id ? { ...item, categoryId: fallback } : item);
          return {
            categories: s.categories.filter((c) => c.id !== id),
            events: s.events.map(swap),
            tasks: s.tasks.map(swap),
            templates: s.templates.map((t) => ({ ...t, blocks: t.blocks.map(swap) })),
          };
        }),

      // ---------- Eventos / agenda ----------
      addEvent: (data) => {
        const event = { id: uid('ev'), title: 'Nova atividade', description: '', recurrence: null, exdates: [], allDay: false, ...data };
        set((s) => ({ events: [...s.events, event] }));
        if (event.taskId) get().updateTask(event.taskId, { eventId: event.id });
        return event;
      },
      updateEvent: (id, patch) => set((s) => ({ events: updateIn(s.events, id, patch) })),
      deleteEvent: (id) =>
        set((s) => ({
          events: s.events.filter((e) => e.id !== id),
          tasks: s.tasks.map((t) => (t.eventId === id ? { ...t, eventId: null } : t)),
        })),

      /** Remove uma ocorrência: 'one' (só esta), 'future' (esta e as próximas) ou 'all' (série inteira). */
      deleteOccurrence: (occ, scope = 'one') => {
        const event = get().events.find((e) => e.id === occ.eventId);
        if (!event) return;
        if (!occ.recurring || scope === 'all') return get().deleteEvent(event.id);
        if (scope === 'future') {
          const until = dateKey(addDays(fromKey(occ.occurrenceDate), -1));
          if (fromKey(occ.occurrenceDate) <= new Date(new Date(event.start).setHours(0, 0, 0, 0))) return get().deleteEvent(event.id);
          return get().updateEvent(event.id, { recurrence: { ...event.recurrence, until } });
        }
        get().updateEvent(event.id, { exdates: [...new Set([...(event.exdates || []), occ.occurrenceDate])] });
      },

      /** Separa uma ocorrência de uma série recorrente em um evento avulso e devolve o novo evento. */
      detachOccurrence: (occ, patch = {}) => {
        const series = get().events.find((e) => e.id === occ.eventId);
        if (!series) return null;
        get().updateEvent(series.id, { exdates: [...new Set([...(series.exdates || []), occ.occurrenceDate])] });
        const { id: _id, recurrence: _r, exdates: _x, ...rest } = series;
        return get().addEvent({
          ...rest,
          start: toDate(occ.start).toISOString(),
          end: toDate(occ.end).toISOString(),
          seriesId: series.id,
          demo: false,
          ...patch,
        });
      },

      /** Move/redimensiona uma ocorrência. scope: 'one' (só esta) ou 'all' (toda a série). */
      moveOccurrence: (occ, start, end, scope = 'one') => {
        const s0 = toDate(start);
        const e0 = toDate(end);
        const event = get().events.find((e) => e.id === occ.eventId);
        if (!event) return;
        if (!occ.recurring) return get().updateEvent(event.id, { start: s0.toISOString(), end: e0.toISOString() });
        if (scope === 'one') return get().detachOccurrence(occ, { start: s0.toISOString(), end: e0.toISOString() });

        const deltaMs = s0 - toDate(occ.start);
        const dayDelta = differenceInCalendarDays(s0, toDate(occ.start));
        const newStart = new Date(toDate(event.start).getTime() + deltaMs);
        const newEnd = new Date(newStart.getTime() + (e0 - s0));
        const recurrence = { ...event.recurrence };
        if (recurrence.freq === 'weekly' && dayDelta) recurrence.daysOfWeek = shiftWeekdays(recurrence.daysOfWeek || [], dayDelta);
        get().updateEvent(event.id, {
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          recurrence,
          exdates: (event.exdates || []).map((k) => dateKey(addDays(fromKey(k), dayDelta))),
        });
      },

      /** Duplica um evento (ou ocorrência) deslocando em dias. Retorna o novo evento. */
      duplicateOccurrence: (occ, offsetDays = 1) => {
        const event = get().events.find((e) => e.id === occ.eventId);
        if (!event) return null;
        const { id: _id, recurrence: _r, exdates: _x, taskId: _t, ...rest } = event;
        return get().addEvent({
          ...rest,
          title: offsetDays === 0 ? `${event.title} (cópia)` : event.title,
          start: addDays(toDate(occ.start), offsetDays).toISOString(),
          end: addDays(toDate(occ.end), offsetDays).toISOString(),
          demo: false,
        });
      },

      // ---------- Tarefas ----------
      addTask: (data) => {
        const task = {
          id: uid('tk'), title: '', description: '', categoryId: null, priority: 'medium', dueDate: null,
          estimatedMin: 60, status: 'todo', subtasks: [], eventId: null, createdAt: now(), completedAt: null, ...data,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
      },
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: updateIn(s.tasks, id, (t) => {
            const p = typeof patch === 'function' ? patch(t) : patch;
            const next = { ...p };
            if (p.status && p.status !== t.status) next.completedAt = p.status === 'done' ? now() : null;
            return next;
          }),
        })),
      setTaskStatus: (id, status) => get().updateTask(id, { status }),
      toggleTaskDone: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (task) get().updateTask(id, { status: task.status === 'done' ? 'todo' : 'done' });
      },
      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          events: s.events.map((e) => (e.taskId === id ? { ...e, taskId: null } : e)),
        })),
      toggleSubtask: (taskId, subId) =>
        get().updateTask(taskId, (t) => ({
          subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, done: !st.done } : st)),
        })),
      /** Agenda (ou reagenda) uma tarefa no calendário. */
      scheduleTask: (taskId, start, end) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return null;
        const linked = task.eventId && get().events.find((e) => e.id === task.eventId);
        if (linked) {
          get().updateEvent(linked.id, { start: toDate(start).toISOString(), end: toDate(end).toISOString(), title: task.title });
          return linked;
        }
        return get().addEvent({
          title: task.title, categoryId: task.categoryId, taskId: task.id,
          start: toDate(start).toISOString(), end: toDate(end).toISOString(),
        });
      },

      // ---------- Estudos ----------
      addSubject: (data) => {
        const subject = { id: uid('sub'), name: '', type: 'tecnologia', color: '#3987e5', weeklyGoalMin: 120, ...data };
        set((s) => ({ subjects: [...s.subjects, subject] }));
        return subject;
      },
      updateSubject: (id, patch) => set((s) => ({ subjects: updateIn(s.subjects, id, patch) })),
      deleteSubject: (id) =>
        set((s) => ({
          subjects: s.subjects.filter((x) => x.id !== id),
          studyLogs: s.studyLogs.filter((l) => l.subjectId !== id),
          contents: s.contents.filter((c) => c.subjectId !== id),
          exams: s.exams.map((e) => (e.subjectId === id ? { ...e, subjectId: null } : e)),
          events: s.events.map((e) => (e.subjectId === id ? { ...e, subjectId: null } : e)),
        })),
      addStudyLog: (data) => {
        const log = { id: uid('sl'), date: now(), minutes: 25, source: 'manual', note: '', ...data };
        set((s) => ({ studyLogs: [log, ...s.studyLogs] }));
        return log;
      },
      deleteStudyLog: (id) => set((s) => ({ studyLogs: s.studyLogs.filter((l) => l.id !== id) })),
      addContent: (data) => set((s) => ({ contents: [...s.contents, { id: uid('ct'), done: false, ...data }] })),
      toggleContent: (id) => set((s) => ({ contents: updateIn(s.contents, id, (c) => ({ done: !c.done })) })),
      deleteContent: (id) => set((s) => ({ contents: s.contents.filter((c) => c.id !== id) })),
      addExam: (data) => set((s) => ({ exams: [...s.exams, { id: uid('ex'), type: 'prova', done: false, notes: '', ...data }] })),
      updateExam: (id, patch) => set((s) => ({ exams: updateIn(s.exams, id, patch) })),
      deleteExam: (id) => set((s) => ({ exams: s.exams.filter((e) => e.id !== id) })),

      // ---------- Hábitos ----------
      addHabit: (data) => {
        const habit = { id: uid('hb'), icon: '🎯', color: '#3987e5', frequency: { type: 'daily' }, log: {}, createdAt: now(), ...data };
        set((s) => ({ habits: [...s.habits, habit] }));
        return habit;
      },
      updateHabit: (id, patch) => set((s) => ({ habits: updateIn(s.habits, id, patch) })),
      deleteHabit: (id) =>
        set((s) => ({
          habits: s.habits.filter((h) => h.id !== id),
          goals: s.goals.map((g) => (g.habitId === id ? { ...g, source: 'manual', habitId: null } : g)),
        })),
      toggleHabit: (id, key = dateKey(new Date())) =>
        set((s) => ({
          habits: updateIn(s.habits, id, (h) => {
            const log = { ...h.log };
            if (log[key]) delete log[key];
            else log[key] = true;
            return { log };
          }),
        })),

      // ---------- Metas ----------
      addGoal: (data) => {
        const goal = { id: uid('gl'), period: 'weekly', source: 'manual', target: 1, unit: '', entries: [], createdAt: now(), ...data };
        set((s) => ({ goals: [...s.goals, goal] }));
        return goal;
      },
      updateGoal: (id, patch) => set((s) => ({ goals: updateIn(s.goals, id, patch) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      addGoalEntry: (id, amount, date = now()) =>
        set((s) => ({ goals: updateIn(s.goals, id, (g) => ({ entries: [...(g.entries || []), { id: uid('ge'), date, amount }] })) })),
      undoGoalEntry: (id) => set((s) => ({ goals: updateIn(s.goals, id, (g) => ({ entries: (g.entries || []).slice(0, -1) })) })),

      // ---------- Rotina semanal reutilizável ----------
      saveTemplate: (name, occurrences) => {
        const blocks = occurrences
          .filter((o) => !o.allDay)
          .map((o) => ({
            title: o.title,
            categoryId: o.categoryId,
            subjectId: o.subjectId || null,
            dayOfWeek: toDate(o.start).getDay(),
            start: `${String(toDate(o.start).getHours()).padStart(2, '0')}:${String(toDate(o.start).getMinutes()).padStart(2, '0')}`,
            end: `${String(toDate(o.end).getHours()).padStart(2, '0')}:${String(toDate(o.end).getMinutes()).padStart(2, '0')}`,
          }));
        const template = { id: uid('tpl'), name, blocks, createdAt: now() };
        set((s) => ({ templates: [...s.templates, template] }));
        return template;
      },
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      /** Aplica um modelo na semana iniciada em `weekStart` (segunda). Ignora blocos já existentes. Retorna nº criado. */
      applyTemplate: (id, weekStart, existingOccurrences = []) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template) return 0;
        const existing = new Set(existingOccurrences.map((o) => `${o.title}|${toDate(o.start).getTime()}`));
        let created = 0;
        for (const b of template.blocks) {
          const offset = (b.dayOfWeek + 6) % 7; // segunda = 0
          const day = addDays(weekStart, offset);
          const start = atTime(day, b.start);
          let end = atTime(day, b.end);
          if (end <= start) end = addDays(end, 1);
          if (existing.has(`${b.title}|${start.getTime()}`)) continue;
          get().addEvent({ title: b.title, categoryId: b.categoryId, subjectId: b.subjectId || null, start: start.toISOString(), end: end.toISOString() });
          created += 1;
        }
        return created;
      },

      // ---------- Notificações ----------
      dismissAlert: (id) => set((s) => ({ dismissedAlerts: [...new Set([...s.dismissedAlerts, id])].slice(-300) })),
      dismissAlerts: (ids) => set((s) => ({ dismissedAlerts: [...new Set([...s.dismissedAlerts, ...ids])].slice(-300) })),

      // ---------- Dados ----------
      importData: (data) =>
        set((s) => ({
          ...data,
          settings: mergeSettings(mergeSettings(DEFAULT_SETTINGS, s.settings), data.settings || {}),
          hasDemoData: Object.values(data).some((v) => Array.isArray(v) && v.some((i) => i?.demo)),
          dismissedAlerts: [],
        })),
      clearDemoData: () =>
        set((s) => {
          const keep = (list) => list.filter((i) => !i.demo);
          const events = keep(s.events);
          const eventIds = new Set(events.map((e) => e.id));
          const habits = keep(s.habits);
          const habitIds = new Set(habits.map((h) => h.id));
          return {
            events,
            tasks: keep(s.tasks).map((t) => (t.eventId && !eventIds.has(t.eventId) ? { ...t, eventId: null } : t)),
            subjects: keep(s.subjects),
            studyLogs: keep(s.studyLogs),
            contents: keep(s.contents),
            exams: keep(s.exams),
            habits,
            goals: keep(s.goals).map((g) => (g.habitId && !habitIds.has(g.habitId) ? { ...g, source: 'manual', habitId: null } : g)),
            templates: keep(s.templates),
            hasDemoData: false,
          };
        }),
      resetAll: (withDemo = false) =>
        set((s) => {
          const base = withDemo ? buildDemoData() : buildEmptyData();
          return { ...base, settings: { ...base.settings, userName: s.settings.userName, theme: s.settings.theme } };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted || {}),
        settings: mergeSettings(DEFAULT_SETTINGS, persisted?.settings || current.settings),
      }),
    },
  ),
);

// Primeira visita: grava imediatamente os dados iniciais para que fiquem estáveis entre recarregamentos.
if (typeof window !== 'undefined' && !localStorageAdapter.getItem(STORAGE_KEY)) {
  useAppStore.setState({});
}
