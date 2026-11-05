import { test } from 'node:test';
import assert from 'node:assert/strict';
import { habitStreak, habitCompletion, goalProgress } from '../src/lib/insights.js';
import { parseBackup } from '../src/services/backup.js';
import { buildDemoData } from '../src/data/seed.js';

const now = new Date('2026-11-05T15:00:00'); // quinta-feira

test('sequência de hábito diário ignora hoje ainda não cumprido', () => {
  const habit = { frequency: { type: 'daily' }, createdAt: '2026-10-01T00:00:00', log: { '2026-11-04': true, '2026-11-03': true, '2026-11-01': true } };
  assert.deepEqual(habitStreak(habit, now), { value: 2, unit: 'dias' });
});

test('hábito em dias específicos só conta os dias previstos', () => {
  // seg, qua, sex — cumpriu seg (02) e qua (04); sex (30/10) também
  const habit = { frequency: { type: 'days', days: [1, 3, 5] }, createdAt: '2026-10-01T00:00:00', log: { '2026-11-02': true, '2026-11-04': true, '2026-10-30': true } };
  assert.equal(habitStreak(habit, now).value, 3);
});

test('porcentagem de conclusão respeita a data de criação', () => {
  const habit = { frequency: { type: 'daily' }, createdAt: '2026-11-02T00:00:00', log: { '2026-11-02': true, '2026-11-03': true } };
  // 02, 03, 04 previstos (hoje ainda em aberto): 2/3
  assert.equal(habitCompletion(habit, 30, now), 67);
});

test('meta automática de horas de estudo soma registros da semana', () => {
  const state = {
    studyLogs: [
      { date: '2026-11-02T10:00:00', minutes: 90 },
      { date: '2026-11-04T10:00:00', minutes: 150 },
      { date: '2026-10-30T10:00:00', minutes: 600 }, // semana anterior
    ],
    tasks: [],
    habits: [],
  };
  const p = goalProgress({ period: 'weekly', source: 'studyHours', target: 8 }, state, now);
  assert.equal(p.current, 4);
  assert.equal(p.pct, 50);
});

test('backup inválido gera erro amigável e backup válido é aceito', () => {
  assert.throws(() => parseBackup('não é json'), /JSON válido/);
  const demo = buildDemoData(now);
  const parsed = parseBackup(JSON.stringify({ app: 'rotina', data: demo }));
  assert.equal(parsed.tasks.length, demo.tasks.length);
});

test('dados de demonstração estão todos marcados como demo', () => {
  const demo = buildDemoData(now);
  for (const key of ['events', 'tasks', 'subjects', 'studyLogs', 'habits', 'goals']) {
    assert.ok(demo[key].every((i) => i.demo === true), key);
  }
});
