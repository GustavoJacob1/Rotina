import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button, Field, Input, Segmented } from '../ui/primitives.jsx';
import { ColorPicker } from '../ui/Pickers.jsx';
import { CATEGORY_COLORS } from '../../lib/constants.js';
import { useAppStore } from '../../store/useAppStore.js';
import { toast } from '../../store/useUiStore.js';

export function SubjectModal({ open, subject, onClose }) {
  const addSubject = useAppStore((s) => s.addSubject);
  const updateSubject = useAppStore((s) => s.updateSubject);
  const [form, setForm] = useState({ name: '', type: 'tecnologia', color: CATEGORY_COLORS[0], weeklyGoalH: 2 });
  useEffect(() => {
    if (open) setForm(subject ? { ...subject, weeklyGoalH: (subject.weeklyGoalMin || 0) / 60 } : { name: '', type: 'tecnologia', color: CATEGORY_COLORS[Math.floor(Math.random() * 8)], weeklyGoalH: 2 });
  }, [open, subject]);
  if (!open) return null;
  const save = () => {
    if (!form.name.trim()) return toast('Dê um nome à disciplina/tecnologia', { tone: 'warning' });
    const data = { name: form.name.trim(), type: form.type, color: form.color, weeklyGoalMin: Math.round((Number(form.weeklyGoalH) || 0) * 60) };
    if (subject) updateSubject(subject.id, data);
    else addSubject(data);
    toast(subject ? 'Disciplina atualizada' : 'Disciplina adicionada', { tone: 'success' });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={subject ? 'Editar disciplina/tecnologia' : 'Nova disciplina/tecnologia'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Ex.: JavaScript, Banco de Dados" />
        </Field>
        <Field label="Tipo">
          <Segmented value={form.type} onChange={(type) => setForm({ ...form, type })} options={[{ value: 'disciplina', label: 'Disciplina da faculdade' }, { value: 'tecnologia', label: 'Tecnologia / curso' }]} />
        </Field>
        <Field label="Meta semanal (horas)">
          <Input type="number" min={0} step={0.5} value={form.weeklyGoalH} onChange={(e) => setForm({ ...form, weeklyGoalH: e.target.value })} />
        </Field>
        <Field label="Cor">
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} colors={CATEGORY_COLORS} />
        </Field>
      </div>
    </Modal>
  );
}
