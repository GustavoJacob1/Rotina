# Rotina — gerenciador de rotina pessoal

Central de gerenciamento da rotina diária: agenda interativa, tarefas (Kanban), estudos com Pomodoro, hábitos, metas e estatísticas, com planejamento inteligente de horários livres.

> Ao abrir pela primeira vez, o app carrega **dados de demonstração** (todos marcados como exemplo). Eles podem ser removidos com um clique no aviso do topo ou em **Configurações → Dados**.

## Como executar

Requisitos: Node.js 18+.

```bash
cd rotina
npm install
npm run dev        # ambiente de desenvolvimento (http://localhost:5173)
npm run build      # build de produção em dist/
npm run preview    # serve a build localmente
npm test           # testes da lógica (recorrência, conflitos, sugestões, metas, hábitos)
```

A build usa caminhos relativos e `HashRouter`, então funciona em qualquer hospedagem estática (ex.: GitHub Pages).

## Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Dashboard** | Saudação e data, próximo compromisso com contagem regressiva, linha do tempo do dia com períodos livres, tarefas do dia, estudo planejado × realizado, tempo livre restante, índice de produtividade, metas da semana, hábitos de hoje e avisos. |
| **Minha Agenda** | Visões dia/semana/mês (FullCalendar). Selecione um intervalo para criar, arraste para reagendar, puxe a borda para mudar a duração, botão direito para duplicar/adiar/excluir. Atividades recorrentes (todos os dias, seg–sex, dias da semana, com data final) com edição “só esta ocorrência” ou “toda a série”. Conflitos destacados, faixas de horário livre, sono e descansos, filtro por categoria, ocupação diária e rotina semanal reutilizável (modelos). |
| **Tarefas** | Kanban (A Fazer · Em Andamento · Concluído) com arrastar e soltar (mouse e toque), visão em lista, filtros por prioridade, prazo e categoria. Cada tarefa tem descrição, categoria, prioridade, entrega, tempo estimado, status, checklist e agendamento opcional na agenda. |
| **Estudos** | Disciplinas/tecnologias com meta semanal, conteúdos pendentes, provas e trabalhos, registro de horas, comparação planejado (blocos na agenda) × realizado (registros), histórico de 8 semanas e Pomodoro configurável que registra o tempo automaticamente. |
| **Hábitos** | Frequência diária, em dias específicos ou X vezes por semana; check-in em 1 clique, sequência atual, % de conclusão em 30 dias e mapa das últimas 5 semanas. |
| **Metas** | Semanais ou mensais, com progresso automático (horas de estudo, tarefas concluídas, check-ins de um hábito) ou manual, ritmo esperado e alerta de atraso. |
| **Estatísticas** | Horas por categoria (rosca), distribuição por dia da semana, estudo planejado × realizado, tarefas concluídas, evolução dos hábitos, mapa de concentração dia × hora e equilíbrio sono/ocupado/livre/descanso. |
| **Configurações** | Nome, tema escuro/claro, horários de sono, descansos protegidos (ex.: almoço), preferências de planejamento, categorias personalizadas, exportação/importação JSON e limpeza de dados. |

Também incluídos: busca global (`Ctrl/⌘ + K`), adicionar rápido (botão `+` ou tecla `N`), notificações no app, confirmação antes de ações destrutivas (com “Desfazer” quando possível) e estados vazios com orientação.

### Planejamento inteligente

`src/lib/scheduling.js` calcula os horários livres de cada dia a partir de: compromissos (inclusive recorrentes), horário de sono, descansos protegidos e intervalo mínimo entre atividades. Para uma atividade de N minutos, as sugestões são ordenadas por proximidade, período preferido e carga do dia — dias que passariam do limite de horas ocupadas são penalizados e sinalizados.

Avisos automáticos: compromissos sobrepostos, dias acima do limite de ocupação, tarefas atrasadas, tarefas importantes perto do prazo (sem horário reservado), provas próximas, metas abaixo do ritmo esperado e compromissos que começam em breve.

## Arquitetura

```
src/
  lib/          lógica pura e testável (datas, recorrência, agenda, indicadores, avisos)
  services/     persistência (adaptador LocalStorage) e backup (exportar/importar)
  store/        estado global (Zustand): dados persistidos, UI e Pomodoro
  data/         dados de demonstração
  hooks/        dados derivados memorizados (ocorrências, avisos, mapas)
  components/   ui/ (primitivos), layout/, calendar/, tasks/, studies/, planner/, charts/
  pages/        Dashboard, Agenda, Tarefas, Estudos, Hábitos, Metas, Estatísticas, Configurações
```

Tecnologias: React 18, Vite, Tailwind CSS, FullCalendar 6, Recharts, dnd-kit, Zustand, date-fns, lucide-react.

### Integração futura com API REST

Toda a persistência passa por `src/services/persistence.js`, que expõe a interface `getItem / setItem / removeItem`. Para usar um back-end Node.js com banco de dados, basta implementar um adaptador com a mesma interface (há um exemplo comentado no arquivo) — páginas e componentes não precisam mudar. As ações do store (`addTask`, `moveOccurrence`, `toggleHabit`...) mapeiam diretamente para endpoints REST, e o formato JSON exportado em Configurações pode servir de contrato inicial.
