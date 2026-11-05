import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandEvents, describeRecurrence } from '../src/lib/recurrence.js';
import { findConflicts, freeSlotsForDay, suggestSlots, busyMinutes, mergeIntervals } from '../src/lib/scheduling.js';

const settings = {
  sleep: { wake: '07:00', bedtime: '23:00' },
  restBlocks: [{ label: 'Almoço', start: '12:00', end: '13:00', days: [] }],
  planning: { bufferMin: 0, maxBusyHours: 10, preferredPeriod: 'any' },
};
const D = (s) => new Date(s);

test('expande evento semanal de segunda a sexta', () => {
  const ev = {
    id: 'fac', title: 'Faculdade', start: '2026-11-02T19:00:00', end: '2026-11-02T22:30:00',
    recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [1, 2, 3, 4, 5], until: null }, exdates: ['2026-11-04'],
  };
  const occ = expandEvents([ev], D('2026-11-02T00:00:00'), D('2026-11-09T00:00:00'));
  assert.equal(occ.length, 4); // 5 dias menos a exceção
  assert.equal(occ[0].start.getHours(), 19);
  assert.equal(occ[0].id, 'fac@2026-11-02');
  assert.equal(describeRecurrence(ev.recurrence), 'Segunda a sexta');
});

test('respeita data final da recorrência', () => {
  const ev = { id: 'a', start: '2026-11-02T08:00:00', end: '2026-11-02T09:00:00', recurrence: { freq: 'daily', until: '2026-11-04' } };
  assert.equal(expandEvents([ev], D('2026-11-01'), D('2026-11-30')).length, 3);
});

test('detecta conflitos', () => {
  const evs = [
    { id: 'a', start: '2026-11-05T10:00:00', end: '2026-11-05T11:00:00' },
    { id: 'b', start: '2026-11-05T10:30:00', end: '2026-11-05T12:00:00' },
    { id: 'c', start: '2026-11-05T12:00:00', end: '2026-11-05T13:00:00' },
  ];
  const { ids, pairs } = findConflicts(expandEvents(evs, D('2026-11-05'), D('2026-11-06')));
  assert.equal(pairs.length, 1);
  assert.ok(ids.has('a') && ids.has('b') && !ids.has('c'));
});

test('horários livres excluem compromissos, almoço e sono', () => {
  const occ = expandEvents([{ id: 'a', start: '2026-11-05T08:00:00', end: '2026-11-05T10:00:00' }], D('2026-11-05'), D('2026-11-06'));
  const free = freeSlotsForDay(D('2026-11-05T00:00:00'), occ, settings);
  assert.deepEqual(free.map((s) => s.minutes), [60, 120, 600]); // 7-8, 10-12, 13-23
  assert.equal(busyMinutes(D('2026-11-05T00:00:00'), occ, settings), 120);
});

test('sugere blocos que comportam a duração pedida', () => {
  const occ = expandEvents([{ id: 'a', start: '2026-11-05T07:00:00', end: '2026-11-05T12:00:00' }], D('2026-11-05'), D('2026-11-20'));
  const s = suggestSlots({ durationMin: 120, occurrences: occ, settings, from: D('2026-11-05T06:00:00'), days: 2 });
  assert.ok(s.length > 0);
  for (const slot of s) {
    assert.equal((slot.end - slot.start) / 60000, 120);
    assert.ok(!(slot.start < D('2026-11-05T13:00:00') && slot.end > D('2026-11-05T07:00:00')) || slot.start >= D('2026-11-06'));
  }
});

test('mergeIntervals une sobreposições', () => {
  const m = mergeIntervals([{ start: D('2026-01-01T08:00'), end: D('2026-01-01T09:00') }, { start: D('2026-01-01T08:30'), end: D('2026-01-01T10:00') }]);
  assert.equal(m.length, 1);
});
