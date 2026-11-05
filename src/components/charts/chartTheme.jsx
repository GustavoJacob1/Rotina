import { useAppStore } from '../../store/useAppStore.js';

/** Cores dos gráficos por tema (selecionadas para cada modo, não invertidas automaticamente). */
export function useChartTheme() {
  const theme = useAppStore((s) => s.settings.theme);
  const dark = theme !== 'light';
  return dark
    ? { grid: '#272c40', axis: '#8087a0', text: '#e9ebf3', surface: '#121520', accent: '#3987e5', accent2: '#9085e9', planned: '#5a6280', good: '#34c778', cursor: 'rgba(255,255,255,0.04)' }
    : { grid: '#e3e6ee', axis: '#6b7186', text: '#11131c', surface: '#ffffff', accent: '#2a78d6', accent2: '#6250d6', planned: '#b9bfcf', good: '#16a34a', cursor: 'rgba(0,0,0,0.04)' };
}

export const axisProps = (t) => ({
  stroke: t.grid,
  tick: { fill: t.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
});

/** Tooltip consistente: texto em tokens de texto, cor só no marcador. */
export function ChartTooltip({ active, payload, label, formatter = (v) => v, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      {label != null && <p className="mb-1 font-semibold cap-first text-ink">{labelFormatter ? labelFormatter(label, payload) : label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{formatter(p.value, p)}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Ticks em horas cheias para eixos em minutos. */
export function hourTicks(maxMinutes, target = 4) {
  const maxH = Math.max(1, Math.ceil((maxMinutes || 0) / 60));
  const step = Math.max(1, Math.ceil(maxH / target));
  const top = Math.ceil(maxH / step) * step;
  const ticks = [];
  for (let h = 0; h <= top; h += step) ticks.push(h * 60);
  return ticks;
}
