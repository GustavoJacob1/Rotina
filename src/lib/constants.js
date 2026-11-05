export const PRIORITIES = {
  low: { label: 'Baixa', order: 0, className: 'bg-surface-3 text-ink-2', dot: '#8b93ad' },
  medium: { label: 'Média', order: 1, className: 'bg-brand/15 text-brand', dot: '#5b8cff' },
  high: { label: 'Alta', order: 2, className: 'bg-warn/15 text-warn', dot: '#f5a623' },
  urgent: { label: 'Urgente', order: 3, className: 'bg-bad/15 text-bad', dot: '#f86060' },
};

export const TASK_STATUS = {
  todo: { label: 'A Fazer' },
  doing: { label: 'Em Andamento' },
  done: { label: 'Concluído' },
};

/** Cores sugeridas (paleta categórica validada para daltonismo), na ordem de uso. */
export const CATEGORY_COLORS = [
  '#3987e5', '#9085e9', '#d95926', '#199e70', '#e66767', '#d55181', '#2f9e44', '#c98500',
  '#0ea5e9', '#64748b',
];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_faculdade', name: 'Faculdade', color: '#3987e5', kind: 'study' },
  { id: 'cat_estudos', name: 'Estudos', color: '#9085e9', kind: 'study' },
  { id: 'cat_trabalho', name: 'Trabalho / Estágio', color: '#d95926', kind: 'work' },
  { id: 'cat_projetos', name: 'Projetos pessoais', color: '#199e70', kind: 'project' },
  { id: 'cat_academia', name: 'Academia', color: '#e66767', kind: 'health' },
  { id: 'cat_pessoal', name: 'Compromissos pessoais', color: '#d55181', kind: 'personal' },
  { id: 'cat_descanso', name: 'Descanso e lazer', color: '#2f9e44', kind: 'rest' },
  { id: 'cat_carreira', name: 'Desenvolvimento profissional', color: '#c98500', kind: 'career' },
];

export const CATEGORY_KINDS = {
  study: 'Estudos',
  work: 'Trabalho',
  project: 'Projetos',
  health: 'Saúde',
  personal: 'Pessoal',
  rest: 'Descanso',
  career: 'Carreira',
  other: 'Outro',
};

export const DEFAULT_SETTINGS = {
  userName: 'Estudante',
  theme: 'dark',
  weekStartsOn: 1,
  sleep: { bedtime: '23:30', wake: '06:30' },
  restBlocks: [{ id: 'rest_almoco', label: 'Almoço', start: '12:00', end: '13:00', days: [], enabled: true }],
  planning: { bufferMin: 10, maxBusyHours: 11, preferredPeriod: 'manha', deadlineWarningDays: 2 },
  pomodoro: { focus: 25, short: 5, long: 15, cyclesBeforeLong: 4, autoStartBreaks: false, sound: true },
  calendar: { showFree: true, showSleep: true, slotMinTime: '06:00', slotMaxTime: '24:00' },
  notifications: { upcomingMinutes: 15 },
};

export const GOAL_SOURCES = {
  manual: 'Registro manual',
  studyHours: 'Horas de estudo (automático)',
  tasksDone: 'Tarefas concluídas (automático)',
  habit: 'Check-ins de um hábito (automático)',
};

export const HABIT_ICONS = ['💻', '🏋️', '😴', '📚', '🚀', '🗂️', '💧', '🧘', '🎯', '🥗', '✍️', '🎧'];
