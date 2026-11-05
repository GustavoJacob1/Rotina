/** Estado de interface (não persistido): modais, toasts, confirmações, busca. */
import { create } from 'zustand';
import { uid } from '../lib/utils.js';

export const useUiStore = create((set, get) => ({
  toasts: [],
  confirmState: null,
  quickAddOpen: false,
  quickAddTab: 'event',
  searchOpen: false,
  notificationsOpen: false,
  eventEditor: null, // { occurrence?, defaults? }
  taskEditor: null, // { taskId?, defaults? }

  toast: (message, opts = {}) => {
    const id = uid('t');
    set((s) => ({ toasts: [...s.toasts, { id, message, tone: 'default', ...opts }].slice(-4) }));
    setTimeout(() => get().dismissToast(id), opts.duration ?? 3800);
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  /** Confirmação antes de ações destrutivas. Retorna Promise<boolean | string> */
  confirm: (opts) =>
    new Promise((resolve) => {
      set({ confirmState: { title: 'Tem certeza?', confirmLabel: 'Confirmar', tone: 'danger', ...opts, resolve } });
    }),
  resolveConfirm: (value) => {
    const c = get().confirmState;
    c?.resolve(value);
    set({ confirmState: null });
  },

  openQuickAdd: (tab = 'event') => set({ quickAddOpen: true, quickAddTab: tab }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setNotificationsOpen: (v) => set({ notificationsOpen: v }),
  openEventEditor: (payload = {}) => set({ eventEditor: payload }),
  closeEventEditor: () => set({ eventEditor: null }),
  openTaskEditor: (payload = {}) => set({ taskEditor: payload }),
  closeTaskEditor: () => set({ taskEditor: null }),
}));

export const toast = (...args) => useUiStore.getState().toast(...args);
export const confirmAction = (opts) => useUiStore.getState().confirm(opts);
