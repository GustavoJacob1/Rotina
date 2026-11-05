import { useEffect } from 'react';
import { usePomodoroStore, beep, MODE_LABEL } from '../../store/usePomodoroStore.js';
import { useAppStore } from '../../store/useAppStore.js';
import { toast } from '../../store/useUiStore.js';

/** Motor global do Pomodoro: conclui fases e registra o tempo de foco automaticamente. */
export function PomodoroEngine() {
  const status = usePomodoroStore((s) => s.status);
  useEffect(() => {
    if (status !== 'running') return undefined;
    const tick = () => {
      const p = usePomodoroStore.getState();
      if (p.status !== 'running' || p.endsAt > Date.now()) return;
      const { settings, subjects, addStudyLog } = useAppStore.getState();
      const finished = p.complete();
      if (settings.pomodoro.sound) beep();
      if (finished === 'focus') {
        const subject = subjects.find((s) => s.id === p.subjectId);
        if (subject) {
          addStudyLog({ subjectId: subject.id, minutes: settings.pomodoro.focus, source: 'pomodoro', date: new Date().toISOString() });
          toast(`Foco concluído! ${settings.pomodoro.focus} min registrados em ${subject.name}.`, { tone: 'success', duration: 6000 });
        } else toast('Foco concluído! Hora de uma pausa.', { tone: 'success', duration: 6000 });
      } else toast(`${MODE_LABEL[finished]} encerrada. Bora voltar ao foco?`, { duration: 6000 });
      document.title = 'Rotina';
    };
    tick();
    const id = setInterval(() => {
      tick();
      const p = usePomodoroStore.getState();
      if (p.status === 'running') {
        const ms = Math.max(0, p.endsAt - Date.now());
        document.title = `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')} · ${MODE_LABEL[p.mode]}`;
      }
    }, 1000);
    return () => {
      clearInterval(id);
      document.title = 'Rotina';
    };
  }, [status]);
  return null;
}
