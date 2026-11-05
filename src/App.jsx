import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Agenda from './pages/Agenda.jsx';
import Tasks from './pages/Tasks.jsx';
import Studies from './pages/Studies.jsx';
import Habits from './pages/Habits.jsx';
import Goals from './pages/Goals.jsx';
import Stats from './pages/Stats.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="tarefas" element={<Tasks />} />
          <Route path="estudos" element={<Studies />} />
          <Route path="habitos" element={<Habits />} />
          <Route path="metas" element={<Goals />} />
          <Route path="estatisticas" element={<Stats />} />
          <Route path="configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
