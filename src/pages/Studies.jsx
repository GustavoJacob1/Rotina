import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  BookOpen, CalendarPlus, Check, ClipboardList, FileText, GraduationCap, History, LayoutGrid, Pencil, Plus, Timer, Trash2, Target, X,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { confirmAction, toast, useUiStore } from '../store/useUiStore.js';
import { useOccurrences, useSubjectMap } from '../hooks/useData.js';
import { Badge, Button, Card, CardHeader, Checkbox, DemoBadge, EmptyState, Field, Input, PageHeader, ProgressBar, Segmented, Select, Textarea } from '../components/ui/primitives.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Pomodoro } from '../components/studies/Pomodoro.jsx';
import { SubjectModal } from '../components/studies/SubjectModal.jsx';
import { ChartTooltip, Legend, axisProps, hourTicks, useChartTheme } from '../components/charts/chartTheme.jsx';
import { addDays, atTime, dateKey, fmt, fmtRelativeDay, fromKey, startOfDay, weekRange } from '../lib/dates.js';
import { plannedStudyMinutes, studyMinutes } from '../lib/insights.js';
import { cn, formatMinutes, pct } from '../lib/utils.js';
import { differenceInCalendarDays } from 'date-fns';

const TABS = [
  { value: 'visao', label: 'Visão geral', icon: LayoutGrid },
  { value: 'disciplinas', label: 'Disciplinas', icon: BookOpen },
  { value: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { value: 'avaliacoes', label: 'Provas e trabalhos', icon: ClipboardList },
  { value: 'historico', label: 'Histórico', icon: History },
];

export default function Studies() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('subject') ? 'disciplinas' : params.get('tab') || 'visao';
  const setTab = (t) => setParams({ tab: t }, { replace: true });
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const openEventEditor = useUiStore((s) => s.openEventEditor);
  const [subjectModal, setSubjectModal] = useState({ open: false, subject: null });

  const planSession = (subject) =>
    openEventEditor({
      defaults: {
        title: subject ? `Estudo: ${subject.name}` : 'Sessão de estudo',
        categoryId: 'cat_estudos',
        subjectId: subject?.id || '',
        start: atTime(addDays(new Date(), 1), '09:00'),
        end: atTime(addDays(new Date(), 1), '10:30'),
      },
    });

  return (
    <div>
      <PageHeader
        title="Estudos"
        description="Planeje sessões, registre horas e compare o planejado com o realizado"
        actions={
          <>
            <Button icon={CalendarPlus} onClick={() => planSession(null)}>Planejar sessão</Button>
            <Button variant="primary" icon={Plus} onClick={() => openQuickAdd('study')}>Registrar estudo</Button>
          </>
        }
      />
      <div className="scroll-thin -mx-4 mb-5 overflow-x-auto px-4">
        <Segmented value={tab} onChange={setTab} options={TABS} />
      </div>
      {tab === 'visao' && <Overview onPlan={planSession} onAddSubject={() => setSubjectModal({ open: true, subject: null })} />}
      {tab === 'disciplinas' && <Subjects onPlan={planSession} onEdit={(subject) => setSubjectModal({ open: true, subject })} />}
      {tab === 'pomodoro' && <Pomodoro />}
      {tab === 'avaliacoes' && <Exams />}
      {tab === 'historico' && <HistoryTab />}
      <SubjectModal open={subjectModal.open} subject={subjectModal.subject} onClose={() => setSubjectModal({ open: false, subject: null })} />
    </div>
  );
}

function useWeekStudy(weekOffset = 0) {
  const subjects = useAppStore((s) => s.subjects);
  const logs = useAppStore((s) => s.studyLogs);
  const { start, end } = weekRange(addDays(new Date(), weekOffset * 7), 1);
  const occ = useOccurrences(start, addDays(end, 1));
  return useMemo(() => {
    const rows = subjects.map((s) => ({
      subject: s,
      planned: plannedStudyMinutes(occ, start, end, s.id),
      done: studyMinutes(logs, start, end, s.id),
      goal: s.weeklyGoalMin || 0,
    }));
    return { rows, start, end, planned: rows.reduce((a, r) => a + r.planned, 0), done: rows.reduce((a, r) => a + r.done, 0), goal: rows.reduce((a, r) => a + r.goal, 0) };
  }, [subjects, logs, occ, start.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Overview({ onPlan, onAddSubject }) {
  const subjects = useAppStore((s) => s.subjects);
  const exams = useAppStore((s) => s.exams);
  const contents = useAppStore((s) => s.contents);
  const subjectMap = useSubjectMap();
  const chart = useChartTheme();
  const [offset, setOffset] = useState(0);
  const week = useWeekStudy(offset);

  if (!subjects.length) {
    return (
      <Card>
        <EmptyState
          icon={GraduationCap}
          title="Cadastre suas disciplinas e tecnologias"
          description="Ex.: JavaScript, Node.js, Banco de Dados, Desenvolvimento Web. Depois planeje sessões na agenda e registre o tempo estudado."
          action={<Button variant="primary" icon={Plus} onClick={onAddSubject}>Adicionar disciplina</Button>}
        />
      </Card>
    );
  }

  const data = week.rows.map((r) => ({ name: r.subject.name, planejado: Math.round(r.planned), realizado: Math.round(r.done), meta: r.goal }));
  const ticks = hourTicks(Math.max(...data.map((d) => Math.max(d.planejado, d.realizado, d.meta))));
  const upcomingExams = exams.filter((e) => !e.done && e.date >= dateKey(new Date())).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const pending = contents.filter((c) => !c.done);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted">Planejado na semana</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatMinutes(week.planned, { short: true })}</p>
          <p className="text-xs text-muted">blocos de estudo na agenda</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Realizado na semana</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatMinutes(week.done, { short: true })}</p>
          <p className={cn('text-xs', week.done >= week.planned ? 'text-good' : 'text-muted')}>{pct(week.done, week.planned)}% do planejado</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Metas semanais somadas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatMinutes(week.goal, { short: true })}</p>
          <ProgressBar value={pct(week.done, week.goal)} size="sm" className="mt-2" />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Conteúdos pendentes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{pending.length}</p>
          <p className="text-xs text-muted">{upcomingExams.length} avaliações próximas</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={Target}
            title="Planejado × realizado por disciplina"
            subtitle={`Semana de ${fmt(week.start, "d 'de' MMM")} a ${fmt(week.end, "d 'de' MMM")}`}
            action={
              <div className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => setOffset(offset - 1)}>‹ Anterior</Button>
                {offset !== 0 && <Button size="xs" variant="ghost" onClick={() => setOffset(0)}>Atual</Button>}
                <Button size="xs" variant="ghost" onClick={() => setOffset(offset + 1)} disabled={offset >= 1}>Próxima ›</Button>
              </div>
            }
          />
          <div className="px-5 pt-2">
            <Legend items={[{ label: 'Planejado (agenda)', color: chart.planned }, { label: 'Realizado (registros)', color: chart.accent }]} />
          </div>
          <div className="h-72 px-2 pb-4 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={2} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chart.grid} />
                <XAxis dataKey="name" {...axisProps(chart)} interval={0} tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} />
                <YAxis {...axisProps(chart)} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} tickFormatter={(v) => `${v / 60}h`} />
                <Tooltip cursor={{ fill: chart.cursor }} content={<ChartTooltip formatter={(v) => formatMinutes(v)} />} />
                <Bar dataKey="planejado" name="Planejado" fill={chart.planned} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="realizado" name="Realizado" fill={chart.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Target} title="Metas semanais por disciplina" />
          <div className="space-y-3.5 px-5 pb-5 pt-4">
            {week.rows.map((r) => (
              <div key={r.subject.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.subject.color }} />{r.subject.name}</span>
                  <span className="text-xs tabular-nums text-muted">{formatMinutes(r.done, { short: true })} / {formatMinutes(r.goal, { short: true })}</span>
                </div>
                <ProgressBar value={pct(r.done, r.goal)} color={r.subject.color} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={FileText} title="Próximas provas e trabalhos" />
          <div className="space-y-2 px-4 pb-4 pt-3">
            {upcomingExams.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">Nenhuma avaliação próxima cadastrada.</p>
            ) : (
              upcomingExams.map((e) => <ExamRow key={e.id} exam={e} subject={subjectMap[e.subjectId]} />)
            )}
          </div>
        </Card>
        <Card>
          <CardHeader icon={ClipboardList} title="Conteúdos pendentes" subtitle="Marque conforme for estudando" />
          <div className="space-y-1 px-3 pb-4 pt-3">
            {pending.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">Nenhum conteúdo pendente. Adicione tópicos na aba Disciplinas.</p>
            ) : (
              pending.slice(0, 8).map((c) => <ContentRow key={c.id} content={c} subject={subjectMap[c.subjectId]} onPlan={onPlan} />)
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ContentRow({ content, subject, onPlan }) {
  const toggleContent = useAppStore((s) => s.toggleContent);
  const deleteContent = useAppStore((s) => s.deleteContent);
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
      <Checkbox checked={content.done} onChange={() => toggleContent(content.id)} color={subject?.color} size="sm" />
      <span className={cn('min-w-0 flex-1 truncate text-sm', content.done ? 'text-muted line-through' : 'text-ink')}>{content.title}</span>
      {subject && <span className="hidden text-[11px] text-muted sm:inline">{subject.name}</span>}
      {onPlan && subject && !content.done && (
        <button type="button" onClick={() => onPlan(subject)} className="rounded p-1 text-muted opacity-0 hover:text-brand group-hover:opacity-100" title="Planejar sessão">
          <CalendarPlus className="h-3.5 w-3.5" />
        </button>
      )}
      <button type="button" onClick={() => deleteContent(content.id)} className="rounded p-1 text-muted opacity-0 hover:text-bad group-hover:opacity-100" aria-label="Remover conteúdo">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Subjects({ onPlan, onEdit }) {
  const subjects = useAppStore((s) => s.subjects);
  const contents = useAppStore((s) => s.contents);
  const logs = useAppStore((s) => s.studyLogs);
  const exams = useAppStore((s) => s.exams);
  const addContent = useAppStore((s) => s.addContent);
  const deleteSubject = useAppStore((s) => s.deleteSubject);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('subject') || subjects[0]?.id;
  const selected = subjects.find((s) => s.id === selectedId);
  const [newContent, setNewContent] = useState('');
  const week = weekRange(new Date(), 1);

  if (!subjects.length) {
    return (
      <Card>
        <EmptyState icon={BookOpen} title="Nenhuma disciplina cadastrada" description="Adicione disciplinas da faculdade e tecnologias que você está aprendendo." action={<Button variant="primary" icon={Plus} onClick={() => onEdit(null)}>Adicionar</Button>} />
      </Card>
    );
  }

  const subjectLogs = logs.filter((l) => l.subjectId === selected?.id).sort((a, b) => b.date.localeCompare(a.date));
  const subjectContents = contents.filter((c) => c.subjectId === selected?.id);
  const total = subjectLogs.reduce((a, l) => a + l.minutes, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        {subjects.map((s) => {
          const w = studyMinutes(logs, week.start, week.end, s.id);
          const pendingCount = contents.filter((c) => c.subjectId === s.id && !c.done).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setParams({ tab: 'disciplinas', subject: s.id }, { replace: true })}
              className={cn('w-full rounded-2xl border bg-surface p-3.5 text-left transition', s.id === selected?.id ? 'border-brand/50 shadow-card' : 'border-line hover:border-brand/30')}
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: s.color }}>{s.name.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
                  <p className="text-[11px] text-muted">{s.type === 'disciplina' ? 'Disciplina' : 'Tecnologia'} · {pendingCount} pendentes</p>
                </div>
                {s.demo && <DemoBadge />}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <ProgressBar value={pct(w, s.weeklyGoalMin)} color={s.color} size="sm" />
                <span className="shrink-0 text-[11px] tabular-nums text-muted">{formatMinutes(w, { short: true })}/{formatMinutes(s.weeklyGoalMin, { short: true })}</span>
              </div>
            </button>
          );
        })}
        <Button variant="ghost" icon={Plus} className="w-full border border-dashed border-line" onClick={() => onEdit(null)}>
          Nova disciplina/tecnologia
        </Button>
      </div>

      {selected && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: selected.color }} />
                  <h2 className="text-lg font-semibold text-ink">{selected.name}</h2>
                  <Badge>{selected.type === 'disciplina' ? 'Disciplina' : 'Tecnologia'}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Total registrado: <b className="text-ink">{formatMinutes(total)}</b> · meta semanal {formatMinutes(selected.weeklyGoalMin)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={CalendarPlus} onClick={() => onPlan(selected)}>Planejar sessão</Button>
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(selected)}>Editar</Button>
                <Button
                  size="sm"
                  variant="danger-ghost"
                  icon={Trash2}
                  onClick={async () => {
                    if (
                      await confirmAction({
                        title: `Excluir "${selected.name}"?`,
                        message: 'Os registros de horas e conteúdos desta disciplina também serão apagados. Blocos na agenda serão mantidos, sem vínculo.',
                        confirmLabel: 'Excluir disciplina',
                      })
                    ) {
                      deleteSubject(selected.id);
                      setParams({ tab: 'disciplinas' }, { replace: true });
                    }
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader icon={ClipboardList} title="Conteúdos" subtitle={`${subjectContents.filter((c) => c.done).length}/${subjectContents.length} estudados`} />
              <div className="px-3 pb-4 pt-3">
                <ProgressBar value={pct(subjectContents.filter((c) => c.done).length, subjectContents.length)} color={selected.color} size="sm" className="mx-2 mb-3 w-auto" />
                {subjectContents.map((c) => <ContentRow key={c.id} content={c} />)}
                <form
                  className="mt-2 flex gap-2 px-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newContent.trim()) return;
                    addContent({ subjectId: selected.id, title: newContent.trim() });
                    setNewContent('');
                  }}
                >
                  <Input value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Novo tópico (ex.: Promises)" className="h-8 text-xs" />
                  <Button size="sm" type="submit" icon={Plus}>Adicionar</Button>
                </form>
              </div>
            </Card>
            <Card>
              <CardHeader icon={History} title="Registros de estudo" subtitle={`${subjectLogs.length} sessões`} />
              <div className="scroll-thin max-h-80 space-y-1 overflow-y-auto px-3 pb-4 pt-3">
                {subjectLogs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted">Nenhuma sessão registrada. Use o Pomodoro ou “Registrar estudo”.</p>
                ) : (
                  subjectLogs.slice(0, 40).map((l) => <LogRow key={l.id} log={l} />)
                )}
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader icon={FileText} title="Provas e trabalhos desta disciplina" />
            <div className="space-y-2 px-4 pb-4 pt-3">
              {exams.filter((e) => e.subjectId === selected.id).length === 0 ? (
                <p className="py-3 text-center text-xs text-muted">Nenhuma avaliação cadastrada. Adicione na aba “Provas e trabalhos”.</p>
              ) : (
                exams.filter((e) => e.subjectId === selected.id).map((e) => <ExamRow key={e.id} exam={e} subject={selected} />)
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function LogRow({ log, subject }) {
  const deleteStudyLog = useAppStore((s) => s.deleteStudyLog);
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
      {subject && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: subject.color }} />}
      <span className="w-24 shrink-0 text-xs text-muted">{fmt(log.date, 'dd/MM · HH:mm')}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{subject ? subject.name : log.note || 'Sessão de estudo'}{subject && log.note ? ` — ${log.note}` : ''}</span>
      <span className="chip bg-surface-3 text-ink-2">{log.source === 'pomodoro' ? '🍅 Pomodoro' : 'Manual'}</span>
      <span className="w-14 text-right text-sm font-medium tabular-nums text-ink">{formatMinutes(log.minutes, { short: true })}</span>
      <button
        type="button"
        onClick={async () => (await confirmAction({ title: 'Excluir registro?', message: `${formatMinutes(log.minutes)} de estudo serão removidos do histórico.`, confirmLabel: 'Excluir' })) && deleteStudyLog(log.id)}
        className="rounded p-1 text-muted opacity-0 hover:text-bad group-hover:opacity-100"
        aria-label="Excluir registro"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ExamRow({ exam, subject, onEdit }) {
  const updateExam = useAppStore((s) => s.updateExam);
  const days = differenceInCalendarDays(fromKey(exam.date), startOfDay(new Date()));
  const tone = exam.done ? 'text-muted' : days < 0 ? 'text-muted' : days <= 3 ? 'text-bad' : days <= 7 ? 'text-warn' : 'text-ink-2';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
      <Checkbox checked={exam.done} onChange={(v) => updateExam(exam.id, { done: v })} label="Concluída" />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onEdit} disabled={!onEdit}>
        <p className={cn('truncate text-sm font-medium', exam.done ? 'text-muted line-through' : 'text-ink')}>{exam.title}</p>
        <p className="truncate text-[11px] text-muted">
          {exam.type === 'trabalho' ? 'Trabalho' : 'Prova'}
          {subject ? ` · ${subject.name}` : ''} · {fmt(`${exam.date}T12:00`, "EEE, d 'de' MMM")}
        </p>
      </button>
      <span className={cn('shrink-0 text-xs font-semibold tabular-nums', tone)}>
        {exam.done ? 'Concluída' : days < 0 ? 'Passou' : days === 0 ? 'Hoje' : `em ${days} ${days === 1 ? 'dia' : 'dias'}`}
      </span>
    </div>
  );
}

function Exams() {
  const exams = useAppStore((s) => s.exams);
  const subjects = useAppStore((s) => s.subjects);
  const events = useAppStore((s) => s.events);
  const addExam = useAppStore((s) => s.addExam);
  const updateExam = useAppStore((s) => s.updateExam);
  const deleteExam = useAppStore((s) => s.deleteExam);
  const addEvent = useAppStore((s) => s.addEvent);
  const subjectMap = useSubjectMap();
  const [editing, setEditing] = useState(null);
  const sorted = [...exams].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date));

  const save = () => {
    if (!editing.title.trim() || !editing.date) return toast('Informe título e data', { tone: 'warning' });
    const data = { ...editing, title: editing.title.trim(), subjectId: editing.subjectId || null };
    if (editing.id) updateExam(editing.id, data);
    else addExam(data);
    toast('Avaliação salva', { tone: 'success' });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" icon={Plus} onClick={() => setEditing({ title: '', type: 'prova', date: dateKey(addDays(new Date(), 7)), subjectId: subjects[0]?.id || '', notes: '' })}>
          Nova prova/trabalho
        </Button>
      </div>
      <Card>
        {sorted.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhuma prova ou trabalho" description="Cadastre suas avaliações para receber avisos quando estiverem próximas." />
        ) : (
          <div className="space-y-2 p-4">
            {sorted.map((e) => {
              const onCalendar = events.some((ev) => ev.examId === e.id);
              return (
                <div key={e.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <ExamRow exam={e} subject={subjectMap[e.subjectId]} onEdit={() => setEditing({ ...e, subjectId: e.subjectId || '' })} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={onCalendar ? Check : CalendarPlus}
                    disabled={onCalendar}
                    title={onCalendar ? 'Já está na agenda' : 'Adicionar à agenda'}
                    onClick={() => {
                      const d = fromKey(e.date);
                      addEvent({ title: `${e.type === 'trabalho' ? 'Entrega' : 'Prova'} — ${e.title}`, categoryId: 'cat_faculdade', allDay: true, start: d.toISOString(), end: addDays(d, 1).toISOString(), examId: e.id, subjectId: null });
                      toast('Adicionada à agenda como evento de dia inteiro', { tone: 'success' });
                    }}
                  >
                    <span className="hidden sm:inline">{onCalendar ? 'Na agenda' : 'Agenda'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    icon={Trash2}
                    aria-label="Excluir"
                    onClick={async () => (await confirmAction({ title: 'Excluir avaliação?', message: `"${e.title}" será removida.`, confirmLabel: 'Excluir' })) && deleteExam(e.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editing.id ? 'Editar avaliação' : 'Nova avaliação'}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button variant="primary" onClick={save}>Salvar</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Título"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Ex.: Prova de Banco de Dados" /></Field>
            <Field label="Tipo"><Segmented value={editing.type} onChange={(type) => setEditing({ ...editing, type })} options={[{ value: 'prova', label: 'Prova' }, { value: 'trabalho', label: 'Trabalho' }]} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data"><Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
              <Field label="Disciplina">
                <Select value={editing.subjectId} onChange={(e) => setEditing({ ...editing, subjectId: e.target.value })}>
                  <option value="">Nenhuma</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Anotações"><Textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Conteúdo, critérios, links..." /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

function HistoryTab() {
  const logs = useAppStore((s) => s.studyLogs);
  const subjects = useAppStore((s) => s.subjects);
  const subjectMap = useSubjectMap();
  const chart = useChartTheme();
  const [filter, setFilter] = useState('all');
  const weeks = useMemo(() => {
    const out = [];
    const { start } = weekRange(new Date(), 1);
    for (let i = 7; i >= 0; i -= 1) {
      const s = addDays(start, -7 * i);
      const e = addDays(s, 7);
      out.push({ label: fmt(s, 'dd/MM'), minutos: Math.round(studyMinutes(logs, s, new Date(e - 1), filter === 'all' ? null : filter)) });
    }
    return out;
  }, [logs, filter]);
  const ticks = hourTicks(Math.max(...weeks.map((w) => w.minutos)));
  const list = logs.filter((l) => filter === 'all' || l.subjectId === filter).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          icon={History}
          title="Evolução semanal"
          subtitle="Horas estudadas nas últimas 8 semanas"
          action={
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 w-48 py-1 text-xs">
              <option value="all">Todas as disciplinas</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          }
        />
        <div className="h-64 px-2 pb-4 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid} />
              <XAxis dataKey="label" {...axisProps(chart)} />
              <YAxis {...axisProps(chart)} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} tickFormatter={(v) => `${v / 60}h`} />
              <Tooltip cursor={{ fill: chart.cursor }} content={<ChartTooltip formatter={(v) => formatMinutes(v)} labelFormatter={(l) => `Semana de ${l}`} />} />
              <Bar dataKey="minutos" name="Estudado" fill={filter === 'all' ? chart.accent : subjectMap[filter]?.color || chart.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardHeader icon={BookOpen} title="Todos os registros" subtitle={`${list.length} sessões · ${formatMinutes(list.reduce((a, l) => a + l.minutes, 0))}`} />
        <div className="scroll-thin max-h-[480px] space-y-1 overflow-y-auto px-3 pb-4 pt-3">
          {list.length === 0 ? <p className="py-6 text-center text-xs text-muted">Nenhum registro ainda.</p> : list.slice(0, 100).map((l) => <LogRow key={l.id} log={l} subject={subjectMap[l.subjectId]} />)}
        </div>
      </Card>
    </div>
  );
}
