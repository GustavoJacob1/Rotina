import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Settings2, SkipForward } from 'lucide-react';
import { Button, Card, Field, Input, Ring, Segmented, Select, Toggle } from '../ui/primitives.jsx';
import { MODE_LABEL, usePomodoroStore } from '../../store/usePomodoroStore.js';
import { useAppStore } from '../../store/useAppStore.js';
import { cn } from '../../lib/utils.js';

export function Pomodoro() {
  const p = usePomodoroStore();
  const subjects = useAppStore((s) => s.subjects);
  const settings = useAppStore((s) => s.settings.pomodoro);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [, force] = useState(0);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (p.status !== 'running') return undefined;
    const id = setInterval(() => force((x) => x + 1), 500);
    return () => clearInterval(id);
  }, [p.status]);

  useEffect(() => {
    p.syncDuration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.focus, settings.short, settings.long]);

  const total = (p.mode === 'focus' ? settings.focus : p.mode === 'short' ? settings.short : settings.long) * 60000;
  const ms = p.remaining();
  const mm = String(Math.floor(ms / 60000)).padStart(2, '0');
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const progress = total ? ((total - ms) / total) * 100 : 0;
  const today = new Date().toDateString();
  const doneToday = p.completedToday.date === today ? p.completedToday.count : 0;
  const cyclePos = p.cycle % (settings.cyclesBeforeLong || 4);
  const setPomo = (patch) => updateSettings({ pomodoro: patch });

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <Card className="flex flex-col items-center p-6 sm:p-8">
        <Segmented
          value={p.mode}
          onChange={(m) => p.setMode(m)}
          options={[
            { value: 'focus', label: 'Foco' },
            { value: 'short', label: 'Pausa curta' },
            { value: 'long', label: 'Pausa longa' },
          ]}
        />
        <div className="my-8">
          <Ring value={progress} size={260} stroke={12} color={p.mode === 'focus' ? 'url(#ring-gradient)' : 'rgb(var(--good))'}>
            <div className="text-center">
              <p className="text-6xl font-semibold tabular-nums tracking-tight text-ink">
                {mm}:{ss}
              </p>
              <p className="mt-1 text-sm text-muted">{MODE_LABEL[p.mode]}{p.status === 'paused' ? ' · pausado' : ''}</p>
            </div>
          </Ring>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={RotateCcw} onClick={p.reset} aria-label="Reiniciar">
            Reiniciar
          </Button>
          {p.status === 'running' ? (
            <Button variant="primary" size="lg" icon={Pause} onClick={p.pause} className="min-w-[150px]">
              Pausar
            </Button>
          ) : (
            <Button variant="primary" size="lg" icon={Play} onClick={p.start} className="min-w-[150px]">
              {p.status === 'paused' ? 'Continuar' : 'Iniciar'}
            </Button>
          )}
          <Button variant="ghost" icon={SkipForward} onClick={() => p.setMode(p.mode === 'focus' ? (cyclePos === (settings.cyclesBeforeLong || 4) - 1 ? 'long' : 'short') : 'focus')}>
            Pular
          </Button>
        </div>
        <div className="mt-6 flex items-center gap-2">
          {Array.from({ length: settings.cyclesBeforeLong || 4 }).map((_, i) => (
            <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < cyclePos ? 'gradient-brand' : 'bg-surface-3')} />
          ))}
          <span className="ml-2 text-xs text-muted">{doneToday} {doneToday === 1 ? 'ciclo de foco concluído' : 'ciclos de foco concluídos'} hoje</span>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <Field label="Estudando agora" hint="Ao terminar cada ciclo de foco, o tempo é registrado automaticamente nesta disciplina.">
            <Select value={p.subjectId || ''} onChange={(e) => p.setSubject(e.target.value || null)}>
              <option value="">Não registrar (sem disciplina)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        </Card>
        <Card className="p-5">
          <button type="button" onClick={() => setShowConfig((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold text-ink">
            <span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted" /> Configurar Pomodoro</span>
            <span className="text-xs font-normal text-muted">{settings.focus}/{settings.short}/{settings.long} min</span>
          </button>
          {showConfig && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Foco (min)">
                  <Input type="number" min={1} max={180} value={settings.focus} onChange={(e) => setPomo({ focus: Math.max(1, Number(e.target.value) || 25) })} />
                </Field>
                <Field label="Pausa curta">
                  <Input type="number" min={1} max={60} value={settings.short} onChange={(e) => setPomo({ short: Math.max(1, Number(e.target.value) || 5) })} />
                </Field>
                <Field label="Pausa longa">
                  <Input type="number" min={1} max={90} value={settings.long} onChange={(e) => setPomo({ long: Math.max(1, Number(e.target.value) || 15) })} />
                </Field>
              </div>
              <Field label="Ciclos até a pausa longa">
                <Input type="number" min={2} max={10} value={settings.cyclesBeforeLong} onChange={(e) => setPomo({ cyclesBeforeLong: Math.max(2, Number(e.target.value) || 4) })} />
              </Field>
              <Toggle checked={settings.autoStartBreaks} onChange={(v) => setPomo({ autoStartBreaks: v })} label="Iniciar pausas automaticamente" />
              <Toggle checked={settings.sound} onChange={(v) => setPomo({ sound: v })} label="Som ao terminar" />
            </div>
          )}
        </Card>
        <Card className="p-5 text-xs leading-relaxed text-muted">
          <p className="mb-1 font-semibold text-ink">Como funciona</p>
          Foque por {settings.focus} minutos sem distrações, faça uma pausa curta de {settings.short} minutos e, a cada {settings.cyclesBeforeLong} ciclos, uma pausa longa de {settings.long} minutos.
          O cronômetro continua rodando mesmo se você trocar de página ou recarregar o site.
        </Card>
      </div>
    </div>
  );
}
