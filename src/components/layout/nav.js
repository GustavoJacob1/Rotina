import { BarChart3, CalendarDays, GraduationCap, KanbanSquare, LayoutDashboard, Flame, Settings, Target } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Minha Agenda', icon: CalendarDays },
  { to: '/tarefas', label: 'Tarefas', icon: KanbanSquare },
  { to: '/estudos', label: 'Estudos', icon: GraduationCap },
  { to: '/habitos', label: 'Hábitos', icon: Flame },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];
