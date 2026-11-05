import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BedDouble, Database, Download, Layers, Moon, Palette, Plus, RotateCcw, Sparkles, Sun, Trash2, Upload, User, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { confirmAction, toast } from '../store/useUiStore.js';
import { Button, Card, CardHeader, Field, Input, PageHeader, Segmented, Select, Toggle } from '../components/ui/primitives.jsx';
import { ColorPicker, WeekdayPicker } from '../components/ui/Pickers.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { CATEGORY_COLORS, CATEGORY_KINDS } from '../lib/constants.js';
import { exportState, parseBackup } from '../services/backup.js';
import { timeToMinutes } from '../lib/dates.js';
import { formatMinutes, uid } from '../lib/utils.js';

const TABS = [
  { value: 'geral', label: 'Geral', icon: User },
  { value: 'horarios', label: 'Horários', icon: Clock },
  { value: 'categorias', label: 'Categorias', icon: Layers },
  { value: 'dados', label: 'Dados', icon: Database },
];

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'geral';
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Configurações" description="Personalize o app de acordo com a sua rotina" />
      <div className="scroll-thin -mx-4 mb-5 overflow-x-auto px-4">
        <Segmented value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} options={TABS} />
      </div>
      {tab === 'geral' && <General />}
      {tab === 'horarios' && <Schedule />}
      {tab === 'categorias' && <Categories />}
      {tab === 'dados' && <DataTab />}
    </div>
  );
}

function General() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader icon={User} title="Perfil" />
        <div className="p-5">
          <Field label="Como você quer ser chamado?">
            <Input value={settings.userName} onChange={(e) => update({ userName: e.target.value })} placeholder="Seu nome" className="max-w-sm" />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader icon={Palette} title="Aparência" />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            { value: 'dark', label: 'Escuro', icon: Moon, preview: 'bg-[#0a0c13]' },
            { value: 'light', label: 'Claro', icon: Sun, preview: 'bg-[#f5f6fa]' },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update({ theme: t.value })}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${settings.theme === t.value ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-brand/40'}`}
            >
              <span className={`grid h-12 w-16 place-items-center rounded-lg border border-line ${t.preview}`}>
                <span className="gradient-brand h-2 w-8 rounded-full" />
              </span>
              <span className="flex items-center gap-2 text-sm font-medium text-ink"><t.icon className="h-4 w-4" /> Tema {t.label.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader icon={Clock} title="Notificações no app" />
        <div className="space-y-4 p-5">
          <Field label="Avisar sobre compromissos que começam em até (min)">
            <Input type="number" min={5} max={120} value={settings.notifications?.upcomingMinutes ?? 15} onChange={(e) => update({ notifications: { upcomingMinutes: Math.max(5, Number(e.target.value) || 15) } })} className="max-w-[140px]" />
          </Field>
          <Field label="Avisar sobre tarefas de prioridade alta/urgente com prazo em até (dias)">
            <Input type="number" min={1} max={14} value={settings.planning?.deadlineWarningDays ?? 2} onChange={(e) => update({ planning: { deadlineWarningDays: Math.max(1, Number(e.target.value) || 2) } })} className="max-w-[140px]" />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function Schedule() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const wake = timeToMinutes(settings.sleep.wake);
  const bed = timeToMinutes(settings.sleep.bedtime);
  const sleepMin = bed > wake ? 1440 - bed + wake : wake - bed;
  const rest = settings.restBlocks || [];
  const setRest = (list) => update({ restBlocks: list });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader icon={BedDouble} title="Sono e disponibilidade" subtitle="Usados para calcular tempo livre e sugerir horários" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Acordo às"><Input type="time" value={settings.sleep.wake} onChange={(e) => e.target.value && update({ sleep: { wake: e.target.value } })} /></Field>
          <Field label="Durmo às"><Input type="time" value={settings.sleep.bedtime} onChange={(e) => e.target.value && update({ sleep: { bedtime: e.target.value } })} /></Field>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-muted">Sono planejado</p>
            <p className={`text-lg font-semibold ${sleepMin < 420 ? 'text-warn' : 'text-ink'}`}>{formatMinutes(sleepMin)}</p>
            {sleepMin < 420 && <p className="text-[11px] text-warn">Abaixo de 7h recomendadas</p>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Sparkles}
          title="Períodos de descanso protegidos"
          subtitle="O planejamento inteligente nunca sugere atividades nesses horários"
          action={<Button size="sm" icon={Plus} onClick={() => setRest([...rest, { id: uid('rest'), label: 'Pausa', start: '15:00', end: '15:30', days: [], enabled: true }])}>Adicionar</Button>}
        />
        <div className="space-y-3 p-5">
          {rest.length === 0 && <p className="text-center text-xs text-muted">Nenhum período protegido. Adicione almoço, jantar ou pausas.</p>}
          {rest.map((r, i) => (
            <div key={r.id} className="rounded-xl border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
                <Field label="Nome"><Input value={r.label} onChange={(e) => setRest(rest.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></Field>
                <Field label="Início"><Input type="time" value={r.start} onChange={(e) => setRest(rest.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} /></Field>
                <Field label="Fim"><Input type="time" value={r.end} onChange={(e) => setRest(rest.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} /></Field>
                <div className="flex items-center gap-2 pb-1">
                  <Toggle checked={r.enabled !== false} onChange={(v) => setRest(rest.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} />
                  <Button size="sm" variant="danger-ghost" icon={Trash2} aria-label="Remover" onClick={() => setRest(rest.filter((_, j) => j !== i))} />
                </div>
              </div>
              <div className="mt-3">
                <p className="mb-1 text-[11px] text-muted">Dias (nenhum selecionado = todos os dias)</p>
                <WeekdayPicker value={r.days || []} onChange={(days) => setRest(rest.map((x, j) => (j === i ? { ...x, days } : x)))} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader icon={Clock} title="Preferências de planejamento" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Período preferido para atividades" hint="Usado para priorizar sugestões de horário">
            <Select value={settings.planning?.preferredPeriod || 'any'} onChange={(e) => update({ planning: { preferredPeriod: e.target.value } })}>
              <option value="any">Sem preferência</option>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
            </Select>
          </Field>
          <Field label="Intervalo mínimo entre atividades (min)">
            <Input type="number" min={0} max={60} value={settings.planning?.bufferMin ?? 10} onChange={(e) => update({ planning: { bufferMin: Math.max(0, Number(e.target.value) || 0) } })} />
          </Field>
          <Field label="Limite de horas ocupadas por dia" hint="Acima disso o dia é marcado como sobrecarregado">
            <Input type="number" min={2} max={20} value={settings.planning?.maxBusyHours ?? 10} onChange={(e) => update({ planning: { maxBusyHours: Math.max(1, Number(e.target.value) || 10) } })} />
          </Field>
          <Field label="Agenda começa a exibir às">
            <Select value={settings.calendar?.slotMinTime || '06:00'} onChange={(e) => update({ calendar: { slotMinTime: e.target.value } })}>
              {['00:00', '05:00', '06:00', '07:00', '08:00'].map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
      </Card>
    </div>
  );
}

function Categories() {
  const categories = useAppStore((s) => s.categories);
  const events = useAppStore((s) => s.events);
  const tasks = useAppStore((s) => s.tasks);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const [editing, setEditing] = useState(null);

  const save = () => {
    if (!editing.name.trim()) return toast('Dê um nome à categoria', { tone: 'warning' });
    if (editing.id) updateCategory(editing.id, { name: editing.name.trim(), color: editing.color, kind: editing.kind });
    else addCategory({ name: editing.name.trim(), color: editing.color, kind: editing.kind });
    setEditing(null);
  };

  const remove = async (c) => {
    if (categories.length <= 1) return toast('Mantenha pelo menos uma categoria', { tone: 'warning' });
    const used = events.filter((e) => e.categoryId === c.id).length + tasks.filter((t) => t.categoryId === c.id).length;
    const target = categories.find((x) => x.id !== c.id);
    const ok = await confirmAction({
      title: `Excluir "${c.name}"?`,
      message: used ? `${used} itens usam esta categoria e serão movidos para "${target.name}".` : 'Nenhum item usa esta categoria.',
      confirmLabel: 'Excluir categoria',
    });
    if (ok) deleteCategory(c.id, target.id);
  };

  return (
    <Card>
      <CardHeader icon={Layers} title="Categorias" subtitle="Definem as cores na agenda e o agrupamento nas estatísticas" action={<Button size="sm" variant="primary" icon={Plus} onClick={() => setEditing({ name: '', color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length], kind: 'other' })}>Nova</Button>} />
      <div className="divide-y divide-line p-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="h-4 w-4 rounded-md" style={{ background: c.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{c.name}</p>
              <p className="text-[11px] text-muted">Tipo: {CATEGORY_KINDS[c.kind] || 'Outro'}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditing({ ...c })}>Editar</Button>
            <Button size="sm" variant="danger-ghost" icon={Trash2} aria-label="Excluir" onClick={() => remove(c)} />
          </div>
        ))}
      </div>
      {editing && (
        <Modal open onClose={() => setEditing(null)} size="sm" title={editing.id ? 'Editar categoria' : 'Nova categoria'} footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" onClick={save}>Salvar</Button></>}>
          <div className="space-y-4">
            <Field label="Nome"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
            <Field label="Cor"><ColorPicker value={editing.color} onChange={(color) => setEditing({ ...editing, color })} colors={CATEGORY_COLORS} /></Field>
            <Field label="Tipo" hint="“Estudos” conta como estudo planejado; “Descanso” conta como tempo de lazer nas estatísticas.">
              <Select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                {Object.entries(CATEGORY_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function DataTab() {
  const state = useAppStore();
  const fileRef = useRef(null);
  const counts = [
    ['Atividades na agenda', state.events.length],
    ['Tarefas', state.tasks.length],
    ['Disciplinas', state.subjects.length],
    ['Registros de estudo', state.studyLogs.length],
    ['Hábitos', state.habits.length],
    ['Metas', state.goals.length],
  ];

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      const n = Object.values(data).filter(Array.isArray).reduce((a, l) => a + l.length, 0);
      const ok = await confirmAction({
        title: 'Importar backup?',
        message: `O arquivo contém ${n} itens. Os dados atuais das seções presentes no arquivo serão SUBSTITUÍDOS. Recomendamos exportar um backup antes.`,
        confirmLabel: 'Importar e substituir',
      });
      if (!ok) return;
      state.importData(data);
      toast('Dados importados com sucesso', { tone: 'success' });
    } catch (err) {
      toast(err.message || 'Não foi possível importar o arquivo', { tone: 'error', duration: 6000 });
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader icon={Database} title="Seus dados" subtitle="Salvos automaticamente neste navegador (LocalStorage)" />
        <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
          {counts.map(([l, n]) => (
            <div key={l} className="rounded-xl bg-surface-2 px-3 py-2">
              <p className="text-[11px] text-muted">{l}</p>
              <p className="text-lg font-semibold tabular-nums text-ink">{n}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader icon={Download} title="Exportar e importar" subtitle="Faça backups ou leve seus dados para outro dispositivo" />
        <div className="flex flex-wrap gap-2 p-5">
          <Button variant="primary" icon={Download} onClick={() => { exportState(state); toast('Backup exportado', { tone: 'success' }); }}>Exportar dados (.json)</Button>
          <Button icon={Upload} onClick={() => fileRef.current?.click()}>Importar backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        </div>
      </Card>
      <Card className="border-bad/30">
        <CardHeader icon={Trash2} title="Zona de cuidado" subtitle="Ações que apagam dados" />
        <div className="space-y-3 p-5">
          {state.hasDemoData && (
            <Row title="Remover dados de demonstração" description="Apaga apenas os exemplos. O que você cadastrou é mantido.">
              <Button
                variant="secondary"
                onClick={async () => {
                  if (await confirmAction({ title: 'Remover dados de demonstração?', message: 'Todos os itens de exemplo serão apagados.', confirmLabel: 'Remover exemplos' })) {
                    state.clearDemoData();
                    toast('Exemplos removidos', { tone: 'success' });
                  }
                }}
              >
                Remover exemplos
              </Button>
            </Row>
          )}
          <Row title="Restaurar dados de demonstração" description="Substitui tudo pelos exemplos (útil para explorar o app).">
            <Button
              variant="secondary"
              icon={RotateCcw}
              onClick={async () => {
                if (await confirmAction({ title: 'Restaurar demonstração?', message: 'TODOS os seus dados atuais serão substituídos pelos exemplos. Esta ação não pode ser desfeita.', confirmLabel: 'Restaurar' })) {
                  state.resetAll(true);
                  toast('Dados de demonstração restaurados', { tone: 'success' });
                }
              }}
            >
              Restaurar
            </Button>
          </Row>
          <Row title="Apagar todos os dados" description="Começa do zero, com as categorias padrão. Não pode ser desfeito.">
            <Button
              variant="danger"
              icon={Trash2}
              onClick={async () => {
                if (await confirmAction({ title: 'Apagar TODOS os dados?', message: 'Agenda, tarefas, estudos, hábitos e metas serão apagados permanentemente. Exporte um backup antes se quiser guardar algo.', confirmLabel: 'Apagar tudo' })) {
                  state.resetAll(false);
                  toast('Todos os dados foram apagados', { tone: 'success' });
                }
              }}
            >
              Apagar tudo
            </Button>
          </Row>
        </div>
      </Card>
    </div>
  );
}

function Row({ title, description, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
