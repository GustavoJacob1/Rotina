import { forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

const BUTTON_VARIANTS = {
  primary: 'gradient-brand text-white shadow-sm hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-2 text-ink border border-line hover:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-bad/90 text-white hover:bg-bad',
  'danger-ghost': 'text-bad hover:bg-bad/10',
  soft: 'bg-brand/10 text-brand hover:bg-brand/20',
};
const BUTTON_SIZES = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
      {IconRight && <IconRight className="h-4 w-4" />}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, className, size = 'md', active, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        active && 'bg-surface-2 text-ink',
        className,
      )}
      {...props}
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} />
    </button>
  );
});

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-4', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Badge({ className, children, color, style, ...props }) {
  return (
    <span
      className={cn('chip', !color && 'bg-surface-3 text-ink-2', className)}
      style={color ? { backgroundColor: `${color}22`, color: 'rgb(var(--ink))', ...style } : style}
      {...props}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function ProgressBar({ value = 0, color, className, size = 'md', tone }) {
  const toneColor = tone === 'good' ? 'rgb(var(--good))' : tone === 'warn' ? 'rgb(var(--warn))' : tone === 'bad' ? 'rgb(var(--bad))' : null;
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', size === 'sm' ? 'h-1.5' : 'h-2', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', !color && !toneColor && 'gradient-brand')}
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color || toneColor || undefined }}
      />
    </div>
  );
}

/** Indicador circular de progresso. */
export function Ring({ value = 0, size = 64, stroke = 7, children, color = 'url(#ring-gradient)', track = 'rgb(var(--surface-3))' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand))" />
            <stop offset="100%" stopColor="rgb(var(--brand-2))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-6' : 'px-6 py-12', className)}>
      {Icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand/15 to-brand-2/15 text-brand">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface-2 p-0.5', className)} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[10px] font-medium transition-all',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm',
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span className={opt.icon && opt.hideLabelOnMobile ? 'hidden sm:inline' : ''}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, hint, children, className, htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('field', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('field min-h-[72px] resize-y', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn('field cursor-pointer appearance-none bg-no-repeat pr-8', className)} style={{
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundPosition: 'right 0.7rem center',
    }} {...props}>
      {children}
    </select>
  );
});

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="block text-xs text-muted">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-surface-3')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, color, className, label, size = 'md' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid shrink-0 place-items-center rounded-md border-2 transition-all',
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        checked ? 'border-transparent text-white' : 'border-line hover:border-brand/60',
        className,
      )}
      style={checked ? { background: color || 'rgb(var(--brand))' } : undefined}
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
    </button>
  );
}

export function DemoBadge({ className }) {
  return <span className={cn('chip bg-brand-2/15 text-brand-2', className)}>Demonstração</span>;
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
