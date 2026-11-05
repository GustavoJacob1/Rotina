/** Funções de data/hora usadas em todo o app. Datas "de calendário" usam a chave YYYY-MM-DD (horário local). */
import {
  addDays,
  addMinutes,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export { ptBR };

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // segunda primeiro

export const toDate = (value) => (value instanceof Date ? value : new Date(value));

/** Chave YYYY-MM-DD no fuso local. */
export const dateKey = (value) => format(toDate(value), 'yyyy-MM-dd');

/** Converte 'YYYY-MM-DD' para Date às 00:00 local. */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => dateKey(new Date());

/** 'HH:mm' -> minutos desde a meia-noite */
export function timeToMinutes(time = '00:00') {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const minutesToTime = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Date em determinado dia + 'HH:mm' */
export function atTime(day, time) {
  const d = startOfDay(toDate(day));
  return addMinutes(d, timeToMinutes(time));
}

export const timeOf = (value) => format(toDate(value), 'HH:mm');

/** Formato para <input type="datetime-local"> */
export const toInputDateTime = (value) => format(toDate(value), "yyyy-MM-dd'T'HH:mm");

export const fmt = (value, pattern) => format(toDate(value), pattern, { locale: ptBR });

export const fmtLong = (value) => fmt(value, "EEEE, d 'de' MMMM 'de' yyyy");
export const fmtDayMonth = (value) => fmt(value, "d 'de' MMM");
export const fmtShort = (value) => fmt(value, 'dd/MM');

export function fmtRelativeDay(value) {
  const d = startOfDay(toDate(value));
  const today = startOfDay(new Date());
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 1 && diff < 7) return fmt(d, 'EEEE');
  return fmt(d, "d 'de' MMM");
}

export const durationMin = (start, end) => differenceInMinutes(toDate(end), toDate(start));

export const weekRange = (date = new Date(), weekStartsOn = 1) => ({
  start: startOfWeek(toDate(date), { weekStartsOn }),
  end: endOfWeek(toDate(date), { weekStartsOn }),
});

export const monthRange = (date = new Date()) => ({
  start: startOfMonth(toDate(date)),
  end: endOfMonth(toDate(date)),
});

/** Lista de dias (Date às 00:00) entre start e end, inclusive. */
export function eachDay(start, end) {
  const days = [];
  let d = startOfDay(toDate(start));
  const last = startOfDay(toDate(end));
  while (d <= last) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export { addDays, addMinutes, isSameDay, startOfDay };
