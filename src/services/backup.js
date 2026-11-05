/** Exportação e importação de dados (JSON). */
import { downloadFile } from '../lib/utils.js';
import { dateKey } from '../lib/dates.js';

export const DATA_KEYS = [
  'settings', 'categories', 'events', 'tasks', 'subjects', 'studyLogs', 'contents', 'exams', 'habits', 'goals', 'templates',
];

export function exportState(state) {
  const data = Object.fromEntries(DATA_KEYS.map((k) => [k, state[k]]));
  const payload = { app: 'rotina', version: 1, exportedAt: new Date().toISOString(), data };
  downloadFile(`rotina-backup-${dateKey(new Date())}.json`, JSON.stringify(payload, null, 2));
}

/** Valida e normaliza um backup. Lança erro com mensagem amigável se inválido. */
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const data = json?.data ?? json;
  if (!data || typeof data !== 'object') throw new Error('Estrutura de backup não reconhecida.');
  const arrays = DATA_KEYS.filter((k) => k !== 'settings');
  const found = arrays.filter((k) => Array.isArray(data[k]));
  if (!found.length) throw new Error('Nenhum dado reconhecido no arquivo (tarefas, eventos, hábitos...).');
  for (const k of found) {
    if (data[k].some((item) => !item || typeof item !== 'object' || !item.id)) {
      throw new Error(`Itens inválidos encontrados em "${k}".`);
    }
  }
  const result = {};
  for (const k of arrays) if (Array.isArray(data[k])) result[k] = data[k];
  if (data.settings && typeof data.settings === 'object') result.settings = data.settings;
  return result;
}
