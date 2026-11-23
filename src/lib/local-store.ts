/**
 * Tiny localStorage-backed external store for useSyncExternalStore.
 *  - stable snapshots (re-parsed only when the value changes)
 *  - cross-tab sync via the "storage" event
 *  - server snapshot = empty value, so hydration never mismatches
 */
export type LocalStore<T> = {
  get: () => T;
  getServer: () => T;
  set: (updater: (prev: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createLocalStore<T>(key: string, parse: (raw: unknown) => T, empty: T): LocalStore<T> {
  let cache: T | null = null;
  const listeners = new Set<() => void>();

  const load = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? parse(JSON.parse(raw)) : empty;
    } catch {
      return empty;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const store: LocalStore<T> = {
    get() {
      if (typeof window === "undefined") return empty;
      if (cache === null) cache = load();
      return cache;
    },
    getServer: () => empty,
    set(updater) {
      const next = updater(store.get());
      cache = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage full or disabled — keep in memory */
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache = load();
          emit();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
  return store;
}

const noopSubscribe = () => () => {};
/** true after hydration on the client, false during SSR/hydration. */
export const hydratedSnapshot = { subscribe: noopSubscribe, client: () => true, server: () => false };
