import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { CheckCircle2, CircleDashed, Columns3, List, ListTodo, Loader, Plus, Search, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { toast, useUiStore } from '../store/useUiStore.js';
import { useCategoryMap } from '../hooks/useData.js';
import { Button, Card, Checkbox, EmptyState, Input, PageHeader, Segmented, Select } from '../components/ui/primitives.jsx';
import { DueLabel, TaskCard } from '../components/tasks/TaskCard.jsx';
import { PRIORITIES, TASK_STATUS } from '../lib/constants.js';
import { addDays, dateKey, todayKey } from '../lib/dates.js';
import { cn, formatMinutes, normalize } from '../lib/utils.js';

const COLUMNS = [
  { id: 'todo', icon: CircleDashed, accent: 'text-muted' },
  { id: 'doing', icon: Loader, accent: 'text-brand' },
  { id: 'done', icon: CheckCircle2, accent: 'text-good' },
];

const DUE_FILTERS = {
  all: 'Qualquer prazo',
  overdue: 'Atrasadas',
  today: 'Para hoje',
  week: 'Próximos 7 dias',
  none: 'Sem prazo',
};

function DraggableCard({ task, category }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-manipulation outline-none">
      <TaskCard task={task} category={category} dragging={isDragging} />
    </div>
  );
}

function Column({ column, tasks, catMap, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showAll, setShowAll] = useState(false);
  const limit = column.id === 'done' && !showAll ? 8 : Infinity;
  const Icon = column.icon;
  const est = tasks.reduce((a, t) => a + (t.status !== 'done' ? t.estimatedMin || 0 : 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[200px] flex-col rounded-2xl border border-line bg-surface-2/40 p-3 transition-colors lg:min-h-[520px]',
        isOver && 'border-brand/50 bg-brand/5',
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', column.accent)} />
          <h3 className="text-sm font-semibold text-ink">{TASK_STATUS[column.id].label}</h3>
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-2">{tasks.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {est > 0 && <span className="text-[11px] text-muted">{formatMinutes(est, { short: true })}</span>}
          <button type="button" onClick={onAdd} className="rounded-md p-1 text-muted hover:bg-surface-3 hover:text-ink" aria-label={`Adicionar em ${TASK_STATUS[column.id].label}`}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.slice(0, limit).map((t) => (
          <DraggableCard key={t.id} task={t} category={catMap[t.categoryId]} />
        ))}
        {tasks.length > limit && (
          <button type="button" onClick={() => setShowAll(true)} className="rounded-xl py-2 text-xs font-semibold text-brand hover:bg-surface-2">
            Mostrar mais {tasks.length - limit} concluídas
          </button>
        )}
        {tasks.length === 0 && (
          <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-line/70 p-6 text-center text-xs text-muted">
            {column.id === 'done' ? 'Arraste para cá as tarefas concluídas' : column.id === 'doing' ? 'Arraste para cá o que você está fazendo agora' : 'Nenhuma tarefa aqui'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const tasks = useAppStore((s) => s.tasks);
  const categories = useAppStore((s) => s.categories);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const toggleTaskDone = useAppStore((s) => s.toggleTaskDone);
  const openTaskEditor = useUiStore((s) => s.openTaskEditor);
  const catMap = useCategoryMap();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState(() => localStorage.getItem('rotina:tasks-view') || 'kanban');
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [due, setDue] = useState(params.get('filter') || 'all');
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const id = params.get('task');
    if (id) {
      openTaskEditor({ taskId: id });
      params.delete('task');
      setParams(params, { replace: true });
    }
    if (params.get('filter')) setDue(params.get('filter'));
  }, [params, openTaskEditor, setParams]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const filtered = useMemo(() => {
    const today = todayKey();
    const week = dateKey(addDays(new Date(), 7));
    const term = normalize(q.trim());
    return tasks
      .filter((t) => !term || normalize(`${t.title} ${t.description}`).includes(term))
      .filter((t) => priority === 'all' || t.priority === priority)
      .filter((t) => category === 'all' || t.categoryId === category)
      .filter((t) => {
        if (due === 'all') return true;
        if (due === 'none') return !t.dueDate;
        if (!t.dueDate) return false;
        if (due === 'overdue') return t.status !== 'done' && t.dueDate < today;
        if (due === 'today') return t.dueDate === today;
        if (due === 'week') return t.dueDate >= today && t.dueDate <= week;
        return true;
      })
      .sort(
        (a, b) =>
          PRIORITIES[b.priority].order - PRIORITIES[a.priority].order || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
      );
  }, [tasks, q, priority, category, due]);

  const byStatus = useMemo(() => {
    const groups = { todo: [], doing: [], done: [] };
    filtered.forEach((t) => groups[t.status]?.push(t));
    groups.done.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    return groups;
  }, [filtered]);

  const activeTask = tasks.find((t) => t.id === activeId);
  const hasFilters = q || priority !== 'all' || category !== 'all' || due !== 'all';
  const clearFilters = () => {
    setQ('');
    setPriority('all');
    setCategory('all');
    setDue('all');
    params.delete('filter');
    setParams(params, { replace: true });
  };
  const counts = { todo: tasks.filter((t) => t.status === 'todo').length, doing: tasks.filter((t) => t.status === 'doing').length };
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayKey()).length;

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description={`${counts.todo} a fazer · ${counts.doing} em andamento${overdue ? ` · ${overdue} atrasada${overdue > 1 ? 's' : ''}` : ''}`}
        actions={
          <>
            <Segmented
              value={view}
              onChange={(v) => {
                setView(v);
                localStorage.setItem('rotina:tasks-view', v);
              }}
              options={[
                { value: 'kanban', label: 'Kanban', icon: Columns3 },
                { value: 'list', label: 'Lista', icon: List },
              ]}
            />
            <Button variant="primary" icon={Plus} onClick={() => openTaskEditor({ defaults: {} })}>
              Nova tarefa
            </Button>
          </>
        }
      />

      <Card className="mb-4 flex flex-col gap-2 p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por título ou descrição" className="pl-9" />
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Prioridade" className="md:w-40">
            <option value="all">Toda prioridade</option>
            {Object.entries(PRIORITIES).reverse().map(([k, p]) => (
              <option key={k} value={k}>{p.label}</option>
            ))}
          </Select>
          <Select value={due} onChange={(e) => setDue(e.target.value)} aria-label="Prazo" className="md:w-40">
            {Object.entries(DUE_FILTERS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria" className="md:w-48">
            <option value="all">Toda categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>
            Limpar
          </Button>
        )}
      </Card>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListTodo}
            title="Nenhuma tarefa ainda"
            description="Crie tarefas com prioridade, prazo, tempo estimado e checklist. Depois, arraste entre as colunas conforme avança."
            action={<Button variant="primary" icon={Plus} onClick={() => openTaskEditor({ defaults: {} })}>Criar primeira tarefa</Button>}
          />
        </Card>
      ) : view === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={({ active, over }) => {
            setActiveId(null);
            if (!over) return;
            const task = tasks.find((t) => t.id === active.id);
            if (task && task.status !== over.id) {
              setTaskStatus(task.id, over.id);
              if (over.id === 'done') toast(`"${task.title}" concluída 🎉`, { tone: 'success', action: { label: 'Desfazer', onClick: () => setTaskStatus(task.id, task.status) } });
            }
          }}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {COLUMNS.map((c) => (
              <Column key={c.id} column={c} tasks={byStatus[c.id]} catMap={catMap} onAdd={() => openTaskEditor({ defaults: { status: c.id } })} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180 }}>{activeTask ? <TaskCard task={activeTask} category={catMap[activeTask.categoryId]} overlay /> : null}</DragOverlay>
        </DndContext>
      ) : (
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState title="Nenhuma tarefa com esses filtros" description="Ajuste os filtros para ver mais resultados." action={<Button size="sm" onClick={clearFilters}>Limpar filtros</Button>} />
          ) : (
            <div className="divide-y divide-line">
              {filtered.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50">
                  <Checkbox checked={t.status === 'done'} onChange={() => toggleTaskDone(t.id)} label="Concluir" />
                  <button type="button" onClick={() => openTaskEditor({ taskId: t.id })} className="min-w-0 flex-1 text-left">
                    <p className={cn('truncate text-sm font-medium', t.status === 'done' ? 'text-muted line-through' : 'text-ink')}>{t.title}</p>
                    <p className="flex flex-wrap gap-x-3 text-[11px]">
                      <DueLabel dueDate={t.dueDate} done={t.status === 'done'} />
                      {catMap[t.categoryId] && (
                        <span className="inline-flex items-center gap-1 text-muted">
                          <span className="h-2 w-2 rounded-full" style={{ background: catMap[t.categoryId].color }} />
                          {catMap[t.categoryId].name}
                        </span>
                      )}
                      {t.subtasks?.length > 0 && <span className="text-muted">{t.subtasks.filter((s) => s.done).length}/{t.subtasks.length} itens</span>}
                    </p>
                  </button>
                  <span className="hidden text-xs text-muted sm:block">{TASK_STATUS[t.status].label}</span>
                  <span className={cn('chip', PRIORITIES[t.priority].className)}>{PRIORITIES[t.priority].label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
