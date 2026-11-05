import { WEEKDAYS_SHORT, WEEKDAY_ORDER } from '../../lib/dates.js';
import { cn } from '../../lib/utils.js';
import { useAppStore } from '../../store/useAppStore.js';

export function CategoryPicker({ value, onChange, allowEmpty = false }) {
  const categories = useAppStore((s) => s.categories);
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowEmpty && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn('chip border px-2.5 py-1 text-xs', !value ? 'border-brand/60 bg-brand/10 text-ink' : 'border-line text-muted hover:text-ink')}
        >
          Sem categoria
        </button>
      )}
      {categories.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn('chip border px-2.5 py-1 text-xs transition', active ? 'text-ink' : 'border-line text-ink-2 hover:text-ink')}
            style={active ? { borderColor: c.color, background: `${c.color}22` } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export function WeekdayPicker({ value = [], onChange }) {
  return (
    <div className="flex gap-1">
      {WEEKDAY_ORDER.map((d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(active ? value.filter((x) => x !== d) : [...value, d])}
            className={cn(
              'h-8 flex-1 rounded-lg text-xs font-medium transition',
              active ? 'gradient-brand text-white' : 'bg-surface-2 text-muted hover:text-ink',
            )}
          >
            {WEEKDAYS_SHORT[d]}
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({ value, onChange, colors }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn('h-7 w-7 rounded-full transition', value === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:scale-110')}
          style={{ background: c }}
          aria-label={`Cor ${c}`}
        />
      ))}
      <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-line" title="Cor personalizada">
        <input type="color" value={value || '#3987e5'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        <span className="grid h-full w-full place-items-center text-xs text-muted">+</span>
      </label>
    </div>
  );
}

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240];

export function DurationPicker({ value, onChange, presets = DURATION_PRESETS }) {
  const label = (m) => (m < 60 ? `${m}min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
            value === m ? 'gradient-brand text-white' : 'bg-surface-2 text-ink-2 hover:text-ink',
          )}
        >
          {label(m)}
        </button>
      ))}
    </div>
  );
}
