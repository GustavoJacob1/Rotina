import { useMemo, useState } from 'react';
import { Sparkles, Sun, Sunset, Moon, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { useOccurrences } from '../../hooks/useData.js';
import { suggestSlots } from '../../lib/scheduling.js';
import { addDays, fmt, fmtRelativeDay, startOfDay, timeOf } from '../../lib/dates.js';
import { cn, formatMinutes } from '../../lib/utils.js';
import { Segmented } from '../ui/primitives.jsx';

/**
 * Lista de horários sugeridos para uma atividade com determinada duração.
 * Considera compromissos existentes, sono, descansos protegidos e o limite diário de ocupação.
 */
export function SlotSuggestions({ durationMin, onPick, excludeEventId, deadline, from, days = 14, selected, limit = 5 }) {
  const settings = useAppStore((s) => s.settings);
  const [period, setPeriod] = useState(settings.planning?.preferredPeriod || 'any');
  const startRef = useMemo(() => from || new Date(), [from]);
  const occurrences = useOccurrences(startOfDay(startRef), addDays(startOfDay(startRef), days + 1));
  const filtered = useMemo(() => occurrences.filter((o) => o.eventId !== excludeEventId), [occurrences, excludeEventId]);

  const slots = useMemo(
    () =>
      durationMin > 0
        ? suggestSlots({ durationMin, occurrences: filtered, settings, from: startRef, days, preferredPeriod: period, limit, deadline })
        : [],
    [durationMin, filtered, settings, startRef, days, period, limit, deadline],
  );

  return (
    <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 to-brand-2/5 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Sparkles className="h-3.5 w-3.5 text-brand-2" />
          Horários sugeridos para {formatMinutes(durationMin)}
        </p>
        <Segmented
          size="sm"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'any', label: 'Qualquer' },
            { value: 'manha', label: 'Manhã', icon: Sun, hideLabelOnMobile: true },
            { value: 'tarde', label: 'Tarde', icon: Sunset, hideLabelOnMobile: true },
            { value: 'noite', label: 'Noite', icon: Moon, hideLabelOnMobile: true },
          ]}
        />
      </div>
      {slots.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted">
          Nenhum bloco livre de {formatMinutes(durationMin)} {deadline ? 'antes do prazo' : `nos próximos ${days} dias`}. Tente reduzir a duração ou
          liberar espaço na agenda.
        </p>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {slots.map((s) => {
            const isSel = selected && Math.abs(new Date(selected) - s.start) < 60000;
            return (
              <button
                key={s.start.getTime()}
                type="button"
                onClick={() => onPick(s)}
                title={s.reasons.join(' · ')}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition',
                  isSel ? 'border-brand bg-brand/10' : 'border-line bg-surface hover:border-brand/50',
                )}
              >
                <Clock className={cn('h-4 w-4 shrink-0', s.overload ? 'text-warn' : 'text-brand')} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold cap-first text-ink">
                    {fmtRelativeDay(s.start)} · {timeOf(s.start)}–{timeOf(s.end)}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {s.reasons[0] ? s.reasons[0] : fmt(s.start, "d 'de' MMMM")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
