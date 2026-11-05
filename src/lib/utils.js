/** Utilitários genéricos (sem dependência de React). */

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Junta classes CSS ignorando valores falsos. */
export const cn = (...classes) => classes.flat().filter(Boolean).join(' ');

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const pct = (part, total) => (total > 0 ? clamp(Math.round((part / total) * 100), 0, 100) : 0);

/** Formata minutos como "1h 30min", "45min" ou "2h". */
export function formatMinutes(min, { short = false } = {}) {
  const m = Math.max(0, Math.round(min || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (short) return h ? `${h}h${r ? String(r).padStart(2, '0') : ''}` : `${r}min`;
  if (!h) return `${r}min`;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export const formatHours = (min, digits = 1) => {
  const h = (min || 0) / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(digits).replace('.', ',')}h`;
};

/** Normaliza texto para busca (sem acentos, minúsculo). */
export const normalize = (str = '') =>
  String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const groupBy = (list, keyFn) =>
  list.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});

export const sumBy = (list, fn) => list.reduce((acc, item) => acc + (fn(item) || 0), 0);

/** Converte hex (#rrggbb) para rgba com alpha. */
export function hexToRgba(hex, alpha = 1) {
  const h = (hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Retorna cor de texto legível (branco ou quase-preto) sobre uma cor de fundo. */
export function readableText(hex) {
  const h = (hex || '#888888').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? '#0b0b0b' : '#ffffff';
}

export function downloadFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
