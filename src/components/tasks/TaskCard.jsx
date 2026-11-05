import { AlarmClock, CalendarCheck, CheckSquare, Clock, MoreHorizontal, Pencil, Sparkles, Trash2, ArrowRightLeft } from 'lucide-react';
import { Checkbox } from '../ui/primitives.jsx';
import { Menu } from '../ui/Menu.jsx';
import { PRIORITIES, TASK_STATUS } from '../../lib/constants.js';
import { fmt, fmtRelativeDay, todayKey } from '../../lib/dates.js';
import { cn, formatMinutes, pct } from '../../lib/utils.js';
import { useAppStore } from '../../store/useAppStore.js';
import { confirmAction, toast, useUiStore } from '../../store/useUiStore.js';

export function DueLabel({ dueDate, done }) {
  if (!dueDate) return <span className="text-muted">Sem prazo</span>;
  const today = todayKey();
  const late = !done && dueDate < today;
  const isToday = dueDate === today;
  return (
    <span className={cn('inline-flex items-center gap-1', late ? 'font-medium text-bad' : isToday && !done ? 'font-medium text-warn' : 'text-muted')}>
      <AlarmClock className="h-3 w-3" />
      {late ? `Atrasada · ${fmt(`${dueDate}T12:00`, 'dd/MM')}` : fmtRelativeDay(`${dueDate}T12:00`)}
    </span>
  );
}

export function TaskCard({ task, category, dragging, overlay }) {
  const openTaskEditor = useUiStore((s) => s.openTaskEditor);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const toggleTaskDone = useAppStore((s) => s.toggleTaskDone);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const p = PRIORITIES[task.priority] || PRIORITIES.medium;
  const subDone = (task.subtasks || []).filter((s) => s.done).length;
  const subTotal = (task.subtasks || []).length;
  const done = task.status === 'done';

  const remove = async () => {
    if (await confirmAction({ title: 'Excluir tarefa?', message: `"${task.title}" será removida permanentemente.`, confirmLabel: 'Excluir' })) {
      deleteTask(task.id);
      toast('Tarefa excluída', { action: { label: 'Desfazer', onClick: () => useAppStore.setState((s) => ({ tasks: [task, ...s.tasks] })) } });
    }
  };

  return (
    <div
      onClick={() => !dragging && openTaskEditor({ taskId: task.id })}
      className={cn(
        'group relative cursor-grab rounded-xl border border-line bg-surface p-3 shadow-sm transition-all hover:border-brand/40 hover:shadow-card active:cursor-grabbing',
        dragging && 'opacity-40',
        overlay && 'rotate-2 scale-[1.02] border-brand/50 shadow-pop',
      )}
    >
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ background: p.dot }} />
      <div className="flex items-start gap-2.5">
        <Checkbox checked={done} onChange={() => toggleTaskDone(task.id)} label={done ? 'Reabrir tarefa' : 'Concluir tarefa'} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium leading-snug', done ? 'text-muted line-through' : 'text-ink')}>{task.title}</p>
          {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{task.description}</p>}
        </div>
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <Menu
            trigger={
              <button type="button" className="rounded-md p-1 text-muted opacity-60 hover:bg-surface-2 hover:text-ink group-hover:opacity-100" aria-label="Ações da tarefa">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
            items={[
              { label: 'Editar', icon: Pencil, onClick: () => openTaskEditor({ taskId: task.id }) },
              { label: task.eventId ? 'Reagendar na agenda' : 'Agendar na agenda', icon: Sparkles, onClick: () => openTaskEditor({ taskId: task.id, plan: true }) },
              { heading: 'Mover para' },
              ...Object.entries(TASK_STATUS)
                .filter(([k]) => k !== task.status)
                .map(([k, s]) => ({ label: s.label, icon: ArrowRightLeft, onClick: () => setTaskStatus(task.id, k) })),
              { divider: true },
              { label: 'Excluir', icon: Trash2, danger: true, onClick: remove },
            ]}
          />
        </div>
      </div>

      {subTotal > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <CheckSquare className="h-3 w-3 text-muted" />
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-good" style={{ width: `${pct(subDone, subTotal)}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-muted">
            {subDone}/{subTotal}
          </span>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        <span className={cn('chip', p.className)}>{p.label}</span>
        {category && (
          <span className="inline-flex items-center gap-1 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: category.color }} />
            {category.name}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <DueLabel dueDate={task.dueDate} done={done} />
        {task.estimatedMin > 0 && (
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock className="h-3 w-3" />
            {formatMinutes(task.estimatedMin, { short: true })}
          </span>
        )}
        {task.eventId && (
          <span className="inline-flex items-center gap-1 text-good" title="Horário reservado na agenda">
            <CalendarCheck className="h-3 w-3" /> Agendada
          </span>
        )}
      </div>
    </div>
  );
}
