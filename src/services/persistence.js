/**
 * Camada de persistência.
 *
 * Hoje os dados ficam no LocalStorage. Para integrar com uma API REST (Node.js + banco de dados),
 * basta implementar um adaptador com a mesma interface (getItem / setItem / removeItem) que
 * converse com o back-end — o restante do app não precisa mudar.
 */
export const STORAGE_KEY = 'rotina:v1';

export const localStorageAdapter = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch (err) {
      console.error('Não foi possível salvar os dados localmente', err);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

/*
 * Exemplo de adaptador REST (para o futuro):
 *
 * export const restAdapter = {
 *   getItem: async () => JSON.stringify(await (await fetch('/api/state')).json()),
 *   setItem: async (_name, value) => fetch('/api/state', { method: 'PUT', body: value,
 *     headers: { 'Content-Type': 'application/json' } }),
 *   removeItem: async () => fetch('/api/state', { method: 'DELETE' }),
 * };
 */
