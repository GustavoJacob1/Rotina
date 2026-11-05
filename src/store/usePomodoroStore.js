/** Cronômetro Pomodoro global (sobrevive à troca de página e ao recarregamento). */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { localStorageAdapter } from '../services/persistence.js';
import { useAppStore } from './useAppStore.js';

export const MODE_LABEL = { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' };

const durationFor = (mode) => {
  const p = useAppStore.getState().settings.pomodoro;
  return (mode === 'focus' ? p.focus : mode === 'short' ? p.short : p.long) * 60000;
};

export const usePomodoroStore = create(
  persist(
    (set, get) => ({
      mode: 'focus',
      status: 'idle', // idle | running | paused
      endsAt: null,
      remainingMs: null,
      cycle: 0,
      subjectId: null,
      completedToday: { date: null, count: 0 },

      setSubject: (subjectId) => set({ subjectId }),
      setMode: (mode) => set({ mode, status: 'idle', endsAt: null, remainingMs: durationFor(mode) }),
      start: () => {
        const { status, remainingMs, mode } = get();
        const ms = status === 'paused' && remainingMs ? remainingMs : remainingMs ?? durationFor(mode);
        set({ status: 'running', endsAt: Date.now() + ms, remainingMs: ms });
      },
      pause: () => {
        const { endsAt } = get();
        set({ status: 'paused', remainingMs: Math.max(0, endsAt - Date.now()), endsAt: null });
      },
      reset: () => set((s) => ({ status: 'idle', endsAt: null, remainingMs: durationFor(s.mode) })),
      syncDuration: () => set((s) => (s.status === 'idle' ? { remainingMs: durationFor(s.mode) } : {})),
      remaining: () => {
        const { status, endsAt, remainingMs, mode } = get();
        if (status === 'running') return Math.max(0, endsAt - Date.now());
        return remainingMs ?? durationFor(mode);
      },
      /** Chamado pelo motor quando o tempo acaba. Retorna a fase concluída. */
      complete: () => {
        const { mode, cycle, completedToday } = get();
        const p = useAppStore.getState().settings.pomodoro;
        const today = new Date().toDateString();
        if (mode === 'focus') {
          const nextCycle = cycle + 1;
          const next = nextCycle % (p.cyclesBeforeLong || 4) === 0 ? 'long' : 'short';
          const count = completedToday.date === today ? completedToday.count + 1 : 1;
          set({
            mode: next,
            cycle: nextCycle,
            status: p.autoStartBreaks ? 'running' : 'idle',
            endsAt: p.autoStartBreaks ? Date.now() + durationFor(next) : null,
            remainingMs: durationFor(next),
            completedToday: { date: today, count },
          });
        } else {
          set({ mode: 'focus', status: 'idle', endsAt: null, remainingMs: durationFor('focus') });
        }
        return mode;
      },
    }),
    { name: 'rotina:pomodoro', storage: createJSONStorage(() => localStorageAdapter) },
  ),
);

/** Bipe simples via Web Audio (sem arquivos externos). */
export function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* sem áudio disponível */
  }
}
