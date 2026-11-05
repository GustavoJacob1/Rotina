/**
 * Dados de DEMONSTRAÇÃO — gerados relativos à data atual para que o app pareça "vivo".
 * Todos os itens possuem `demo: true` e podem ser removidos em Configurações → Dados.
 * Nenhum desses números representa dados reais do usuário.
 */
import { addDays, atTime, dateKey, startOfDay, weekRange } from '../lib/dates.js';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../lib/constants.js';

// gerador pseudoaleatório determinístico (mesmo resultado a cada geração)
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildDemoData(now = new Date()) {
  const rand = rng(42);
  const today = startOfDay(now);
  const { start: monday } = weekRange(now, 1);
  const day = (offset) => addDays(monday, offset); // 0 = segunda
  const iso = (d, time) => atTime(d, time).toISOString();
  const demo = true;

  const seriesStart = addDays(monday, -21); // séries começam 3 semanas atrás

  const subjects = [
    { id: 'sub_js', name: 'JavaScript', type: 'tecnologia', color: '#f5c518', weeklyGoalMin: 300, demo },
    { id: 'sub_node', name: 'Node.js', type: 'tecnologia', color: '#2f9e44', weeklyGoalMin: 180, demo },
    { id: 'sub_bd', name: 'Banco de Dados', type: 'disciplina', color: '#3987e5', weeklyGoalMin: 180, demo },
    { id: 'sub_web', name: 'Desenvolvimento Web', type: 'disciplina', color: '#d55181', weeklyGoalMin: 120, demo },
    { id: 'sub_proj', name: 'Projetos pessoais', type: 'tecnologia', color: '#9085e9', weeklyGoalMin: 120, demo },
  ];

  const weekly = (days, until = null) => ({ freq: 'weekly', interval: 1, daysOfWeek: days, until });

  const events = [
    {
      id: 'ev_faculdade', title: 'Aulas — ADS', categoryId: 'cat_faculdade', location: 'Campus',
      start: iso(seriesStart, '19:00'), end: iso(seriesStart, '22:30'), recurrence: weekly([1, 2, 3, 4, 5]), exdates: [], demo,
    },
    {
      id: 'ev_estagio', title: 'Estágio', categoryId: 'cat_trabalho', location: 'Escritório',
      start: iso(seriesStart, '13:00'), end: iso(seriesStart, '18:00'), recurrence: weekly([1, 2, 3, 4, 5]), exdates: [], demo,
    },
    {
      id: 'ev_academia', title: 'Academia', categoryId: 'cat_academia',
      start: iso(seriesStart, '07:00'), end: iso(seriesStart, '08:00'), recurrence: weekly([1, 3, 5]), exdates: [], demo,
    },
    {
      id: 'ev_estudo_js', title: 'Estudo: JavaScript', categoryId: 'cat_estudos', subjectId: 'sub_js',
      start: iso(addDays(seriesStart, 1), '09:00'), end: iso(addDays(seriesStart, 1), '11:00'), recurrence: weekly([2, 4]), exdates: [], demo,
    },
    {
      id: 'ev_estudo_bd', title: 'Estudo: Banco de Dados', categoryId: 'cat_estudos', subjectId: 'sub_bd',
      start: iso(seriesStart, '09:00'), end: iso(seriesStart, '10:30'), recurrence: weekly([1]), exdates: [], demo,
    },
    {
      id: 'ev_estudo_node', title: 'Estudo: Node.js', categoryId: 'cat_estudos', subjectId: 'sub_node',
      start: iso(addDays(seriesStart, 2), '09:00'), end: iso(addDays(seriesStart, 2), '10:30'), recurrence: weekly([3]), exdates: [], demo,
    },
    {
      id: 'ev_projeto', title: 'Projeto: Portfólio', categoryId: 'cat_projetos', subjectId: 'sub_proj',
      start: iso(addDays(seriesStart, 5), '10:00'), end: iso(addDays(seriesStart, 5), '12:00'), recurrence: weekly([6]), exdates: [], demo,
    },
    {
      id: 'ev_planejamento', title: 'Planejamento da semana', categoryId: 'cat_pessoal',
      start: iso(addDays(seriesStart, 6), '18:00'), end: iso(addDays(seriesStart, 6), '18:30'), recurrence: weekly([0]), exdates: [], demo,
    },
    {
      id: 'ev_dentista', title: 'Consulta no dentista', categoryId: 'cat_pessoal', location: 'Clínica',
      description: 'Exemplo de conflito: sobrepõe o horário do estágio.',
      start: iso(day(3), '17:00'), end: iso(day(3), '18:00'), recurrence: null, exdates: [], demo,
    },
    {
      id: 'ev_cinema', title: 'Cinema com amigos', categoryId: 'cat_descanso',
      start: iso(day(5), '19:00'), end: iso(day(5), '21:30'), recurrence: null, exdates: [], demo,
    },
    {
      id: 'ev_meetup', title: 'Meetup de Node.js (online)', categoryId: 'cat_carreira',
      start: iso(day(9), '19:30'), end: iso(day(9), '21:00'), recurrence: null, exdates: [], demo,
    },
    {
      id: 'ev_prova_bd', title: 'Prova — Banco de Dados', categoryId: 'cat_faculdade', allDay: true,
      start: startOfDay(day(10)).toISOString(), end: startOfDay(day(11)).toISOString(), recurrence: null, exdates: [], demo,
    },
    {
      id: 'ev_descanso_dom', title: 'Descanso / tempo livre', categoryId: 'cat_descanso',
      start: iso(addDays(seriesStart, 6), '14:00'), end: iso(addDays(seriesStart, 6), '17:00'), recurrence: weekly([0]), exdates: [], demo,
    },
  ];

  const t = (offset) => dateKey(addDays(today, offset));
  const st = (title, done = false) => ({ id: `st_${Math.round(rand() * 1e9).toString(36)}`, title, done });
  const created = addDays(today, -10).toISOString();

  const tasks = [
    {
      id: 'tk_1', title: 'Entregar trabalho de Desenvolvimento Web', description: 'Landing page responsiva com HTML, CSS e JS.',
      categoryId: 'cat_faculdade', priority: 'urgent', dueDate: t(1), estimatedMin: 180, status: 'doing',
      subtasks: [st('Estrutura HTML', true), st('Estilização responsiva', true), st('Formulário com validação'), st('Publicar no GitHub Pages')],
      createdAt: created, demo,
    },
    {
      id: 'tk_2', title: 'Revisar normalização (1FN, 2FN, 3FN)', description: 'Preparação para a prova de Banco de Dados.',
      categoryId: 'cat_estudos', priority: 'high', dueDate: t(5), estimatedMin: 120, status: 'todo',
      subtasks: [st('Resumo teórico'), st('Lista de exercícios')], createdAt: created, demo,
    },
    {
      id: 'tk_3', title: 'Atualizar currículo e LinkedIn', categoryId: 'cat_carreira', priority: 'medium', dueDate: t(-2),
      estimatedMin: 60, status: 'todo', subtasks: [], description: '', createdAt: created, demo,
    },
    {
      id: 'tk_4', title: 'Criar API REST de tarefas com Express', categoryId: 'cat_projetos', priority: 'medium', dueDate: t(9),
      estimatedMin: 240, status: 'todo', description: 'Projeto pessoal para o portfólio.',
      subtasks: [st('Rotas CRUD'), st('Validação de dados'), st('Conectar ao MySQL')], createdAt: created, demo,
    },
    {
      id: 'tk_5', title: 'Relatório semanal do estágio', categoryId: 'cat_trabalho', priority: 'high', dueDate: t(2),
      estimatedMin: 45, status: 'todo', subtasks: [], description: '', createdAt: created, demo,
    },
    {
      id: 'tk_6', title: 'Marcar exame de rotina', categoryId: 'cat_pessoal', priority: 'low', dueDate: t(12),
      estimatedMin: 15, status: 'todo', subtasks: [], description: '', createdAt: created, demo,
    },
    {
      id: 'tk_7', title: 'Exercícios de arrays e objetos (JS)', categoryId: 'cat_estudos', priority: 'medium', dueDate: t(-1),
      estimatedMin: 90, status: 'done', completedAt: addDays(now, -1).toISOString(), subtasks: [st('map/filter/reduce', true)],
      description: '', createdAt: created, demo,
    },
    {
      id: 'tk_8', title: 'Configurar ambiente Node + ESLint', categoryId: 'cat_projetos', priority: 'low', dueDate: t(-3),
      estimatedMin: 40, status: 'done', completedAt: addDays(now, -3).toISOString(), subtasks: [], description: '', createdAt: created, demo,
    },
    {
      id: 'tk_9', title: 'Ler capítulo 3 de "Código Limpo"', categoryId: 'cat_carreira', priority: 'low', dueDate: t(0),
      estimatedMin: 40, status: 'done', completedAt: now.toISOString(), subtasks: [], description: '', createdAt: created, demo,
    },
  ];
  // algumas tarefas concluídas nas semanas anteriores (para estatísticas)
  const pastTitles = [
    'Resumo da aula de Engenharia de Software', 'Lista de exercícios de SQL', 'Treino de pernas', 'Pagar boleto da faculdade',
    'Refatorar CSS do portfólio', 'Assistir aula gravada de Redes', 'Organizar arquivos do estágio', 'Estudar Git: branches e merge',
    'Responder e-mails do estágio', 'Revisar anotações de Lógica', 'Corrida no parque', 'Ler artigo sobre APIs REST',
    'Atualizar README do projeto', 'Fazer quiz de JavaScript', 'Planejar a semana', 'Reunião do grupo de PI',
    'Configurar banco MySQL local', 'Lavar roupa', 'Revisar pull request do colega', 'Documentar rotas da API', 'Exercícios de Flexbox', 'Comprar material',
  ];
  for (let i = 4; i < 26; i += 1) {
    if (rand() < 0.45) continue;
    const doneAt = addDays(today, -i);
    tasks.push({
      id: `tk_hist_${i}`, title: pastTitles[i - 4], categoryId: DEFAULT_CATEGORIES[i % 8].id,
      priority: ['low', 'medium', 'high'][i % 3], dueDate: dateKey(doneAt), estimatedMin: 30 + (i % 4) * 15,
      status: 'done', completedAt: atTime(doneAt, '16:00').toISOString(), subtasks: [], description: '', createdAt: created, demo,
    });
  }

  // registros de estudo dos últimos 27 dias (não inclui hoje)
  const studyLogs = [];
  const subjectByWeekday = { 1: 'sub_bd', 2: 'sub_js', 3: 'sub_node', 4: 'sub_js', 5: 'sub_web', 6: 'sub_proj' };
  for (let i = 1; i <= 27; i += 1) {
    const d = addDays(today, -i);
    const subjectId = subjectByWeekday[d.getDay()];
    if (!subjectId || rand() < 0.2) continue;
    const minutes = Math.round((50 + rand() * 70) / 5) * 5;
    studyLogs.push({ id: `sl_${i}`, subjectId, date: atTime(d, '10:00').toISOString(), minutes, source: 'manual', note: '', demo });
    if (rand() < 0.35) {
      studyLogs.push({ id: `sl_${i}b`, subjectId: 'sub_web', date: atTime(d, '22:45').toISOString(), minutes: 25, source: 'pomodoro', note: '', demo });
    }
  }

  const contents = [
    { id: 'ct_1', subjectId: 'sub_js', title: 'Promises e async/await', done: false, demo },
    { id: 'ct_2', subjectId: 'sub_js', title: 'Closures e escopo', done: true, demo },
    { id: 'ct_3', subjectId: 'sub_js', title: 'Módulos ES (import/export)', done: false, demo },
    { id: 'ct_4', subjectId: 'sub_node', title: 'Express: middlewares', done: false, demo },
    { id: 'ct_5', subjectId: 'sub_node', title: 'Variáveis de ambiente (.env)', done: true, demo },
    { id: 'ct_6', subjectId: 'sub_bd', title: 'JOINs (INNER, LEFT, RIGHT)', done: false, demo },
    { id: 'ct_7', subjectId: 'sub_bd', title: 'Normalização', done: false, demo },
    { id: 'ct_8', subjectId: 'sub_web', title: 'Flexbox e Grid', done: true, demo },
    { id: 'ct_9', subjectId: 'sub_web', title: 'Acessibilidade (ARIA)', done: false, demo },
  ];

  const exams = [
    { id: 'ex_1', subjectId: 'sub_bd', title: 'Prova de Banco de Dados', type: 'prova', date: dateKey(day(10)), notes: 'Modelagem, normalização e SQL.', done: false, demo },
    { id: 'ex_2', subjectId: 'sub_web', title: 'Trabalho: landing page', type: 'trabalho', date: t(1), notes: 'Entrega via GitHub.', done: false, demo },
    { id: 'ex_3', subjectId: 'sub_js', title: 'Avaliação prática de JS', type: 'prova', date: t(17), notes: '', done: false, demo },
  ];

  // hábitos com histórico dos últimos 35 dias
  const makeLog = (prob, daysFilter = null, includeToday = false) => {
    const log = {};
    for (let i = includeToday ? 0 : 1; i <= 35; i += 1) {
      const d = addDays(today, -i);
      if (daysFilter && !daysFilter.includes(d.getDay())) continue;
      // maior consistência nos dias mais recentes (sequência atual)
      const p = i <= 4 ? Math.min(1, prob + 0.3) : prob;
      if (rand() < p) log[dateKey(d)] = true;
    }
    return log;
  };
  const habitsCreated = addDays(today, -35).toISOString();
  const habits = [
    { id: 'hb_code', name: 'Estudar programação', icon: '💻', color: '#3987e5', frequency: { type: 'daily' }, log: makeLog(0.75), createdAt: habitsCreated, demo },
    { id: 'hb_gym', name: 'Praticar exercícios', icon: '🏋️', color: '#e66767', frequency: { type: 'days', days: [1, 3, 5] }, log: makeLog(0.8, [1, 3, 5]), createdAt: habitsCreated, demo },
    { id: 'hb_sleep', name: 'Dormir antes das 23h30', icon: '😴', color: '#9085e9', frequency: { type: 'daily' }, log: makeLog(0.55), createdAt: habitsCreated, demo },
    { id: 'hb_read', name: 'Ler 20 minutos', icon: '📚', color: '#c98500', frequency: { type: 'daily' }, log: makeLog(0.5, null, true), createdAt: habitsCreated, demo },
    { id: 'hb_proj', name: 'Desenvolver projetos', icon: '🚀', color: '#199e70', frequency: { type: 'weekly', timesPerWeek: 3 }, log: makeLog(0.4), createdAt: habitsCreated, demo },
    { id: 'hb_org', name: 'Revisar a agenda do dia', icon: '🗂️', color: '#d55181', frequency: { type: 'daily' }, log: makeLog(0.7, null, true), createdAt: habitsCreated, demo },
  ];

  const goals = [
    { id: 'gl_1', title: 'Estudar 12 horas na semana', period: 'weekly', source: 'studyHours', target: 12, unit: 'h', entries: [], createdAt: created, demo },
    { id: 'gl_2', title: 'Concluir 6 tarefas na semana', period: 'weekly', source: 'tasksDone', target: 6, unit: 'tarefas', entries: [], createdAt: created, demo },
    { id: 'gl_3', title: 'Treinar 3 vezes na semana', period: 'weekly', source: 'habit', habitId: 'hb_gym', target: 3, unit: 'treinos', entries: [], createdAt: created, demo },
    {
      id: 'gl_4', title: 'Ler 2 livros técnicos no mês', period: 'monthly', source: 'manual', target: 2, unit: 'livros',
      entries: [{ id: 'ge_1', date: atTime(today, '08:00').toISOString(), amount: 0.5 }], createdAt: created, demo,
    },
    {
      id: 'gl_5', title: 'Publicar 2 projetos no GitHub', period: 'monthly', source: 'manual', target: 2, unit: 'projetos',
      entries: [], createdAt: created, demo,
    },
  ];

  const templates = [
    {
      id: 'tpl_provas', name: 'Semana de provas (exemplo)', demo,
      blocks: [
        { title: 'Revisão geral', categoryId: 'cat_estudos', dayOfWeek: 1, start: '09:00', end: '11:00' },
        { title: 'Revisão geral', categoryId: 'cat_estudos', dayOfWeek: 3, start: '09:00', end: '11:00' },
        { title: 'Simulado', categoryId: 'cat_estudos', dayOfWeek: 6, start: '14:00', end: '16:00' },
        { title: 'Descanso ativo', categoryId: 'cat_descanso', dayOfWeek: 0, start: '10:00', end: '12:00' },
      ],
    },
  ];

  return {
    settings: { ...DEFAULT_SETTINGS, userName: 'Estudante' },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    events,
    tasks,
    subjects,
    studyLogs,
    contents,
    exams,
    habits,
    goals,
    templates,
    dismissedAlerts: [],
    hasDemoData: true,
  };
}

export function buildEmptyData(settings = DEFAULT_SETTINGS) {
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    events: [],
    tasks: [],
    subjects: [],
    studyLogs: [],
    contents: [],
    exams: [],
    habits: [],
    goals: [],
    templates: [],
    dismissedAlerts: [],
    hasDemoData: false,
  };
}
