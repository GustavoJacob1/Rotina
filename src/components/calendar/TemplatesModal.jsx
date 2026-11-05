import { useState } from 'react';
import { CalendarRange, Save, Trash2, Wand2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button, EmptyState, Input, DemoBadge } from '../ui/primitives.jsx';
import { useAppStore } from '../../store/useAppStore.js';
import { confirmAction, toast } from '../../store/useUiStore.js';
import { addDays, fmt, WEEKDAYS_SHORT, WEEKDAY_ORDER } from '../../lib/dates.js';
import { expandEvents } from '../../lib/recurrence.js';
import { useCategoryMap } from '../../hooks/useData.js';

/** Rotina semanal reutilizável: salvar a semana como modelo e aplicá-la em outras semanas. */
export function TemplatesModal({ open, onClose, weekStart }) {
  const templates = useAppStore((s) => s.templates);
  const events = useAppStore((s) => s.events);
  const saveTemplate = useAppStore((s) => s.saveTemplate);
  const applyTemplate = useAppStore((s) => s.applyTemplate);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const catMap = useCategoryMap();
  const [name, setName] = useState('');
  if (!open) return null;

  const weekOcc = expandEvents(events, weekStart, addDays(weekStart, 7));

  const save = () => {
    if (!weekOcc.length) return toast('A semana visível está vazia', { tone: 'warning' });
    const t = saveTemplate(name.trim() || `Rotina de ${fmt(weekStart, "d 'de' MMM")}`, weekOcc);
    toast(`Modelo "${t.name}" salvo com ${t.blocks.length} blocos`, { tone: 'success' });
    setName('');
  };

  const apply = async (tpl, offsetWeeks) => {
    const target = addDays(weekStart, offsetWeeks * 7);
    const ok = await confirmAction({
      title: `Aplicar "${tpl.name}"?`,
      message: `Os ${tpl.blocks.length} blocos serão adicionados à semana de ${fmt(target, "d 'de' MMM")}. Blocos idênticos já existentes serão ignorados.`,
      confirmLabel: 'Aplicar modelo',
      tone: 'info',
    });
    if (!ok) return;
    const created = applyTemplate(tpl.id, target, expandEvents(useAppStore.getState().events, target, addDays(target, 7)));
    toast(created ? `${created} atividades adicionadas` : 'Nada a adicionar — a semana já contém esses blocos', { tone: created ? 'success' : 'default' });
  };

  return (
    <Modal open onClose={onClose} title="Rotina semanal reutilizável" description="Salve uma semana como modelo e reaplique quando quiser" size="lg">
      <div className="mb-5 rounded-xl border border-line bg-surface-2/50 p-3">
        <p className="mb-2 text-sm font-medium text-ink">Salvar a semana visível ({fmt(weekStart, "d 'de' MMM")} – {fmt(addDays(weekStart, 6), "d 'de' MMM")})</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do modelo (ex.: Semana de provas)" onKeyDown={(e) => e.key === 'Enter' && save()} />
          <Button variant="primary" icon={Save} onClick={save}>Salvar</Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{weekOcc.filter((o) => !o.allDay).length} blocos com horário serão salvos (inclui atividades recorrentes).</p>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Nenhum modelo salvo" description="Monte uma semana ideal na agenda e salve-a como modelo para reutilizar em semanas de provas, férias ou rotinas diferentes." />
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{tpl.name} {tpl.demo && <DemoBadge className="ml-1" />}</p>
                  <p className="text-xs text-muted">{tpl.blocks.length} blocos</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="soft" icon={Wand2} onClick={() => apply(tpl, 0)}>Nesta semana</Button>
                  <Button size="sm" onClick={() => apply(tpl, 1)}>Próxima semana</Button>
                  <Button
                    size="sm"
                    variant="danger-ghost"
                    icon={Trash2}
                    aria-label="Excluir modelo"
                    onClick={async () => {
                      if (await confirmAction({ title: 'Excluir modelo?', message: `"${tpl.name}" será removido. As atividades já criadas não serão afetadas.`, confirmLabel: 'Excluir' })) deleteTemplate(tpl.id);
                    }}
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {WEEKDAY_ORDER.map((d) => (
                  <div key={d} className="min-w-0">
                    <p className="mb-1 text-center text-[10px] font-semibold text-muted">{WEEKDAYS_SHORT[d]}</p>
                    <div className="space-y-0.5">
                      {tpl.blocks.filter((b) => b.dayOfWeek === d).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5).map((b, i) => (
                        <div key={i} className="truncate rounded px-1 py-0.5 text-[9px] text-ink" style={{ background: `${catMap[b.categoryId]?.color || '#888'}33` }} title={`${b.start}–${b.end} ${b.title}`}>
                          {b.start} {b.title}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
