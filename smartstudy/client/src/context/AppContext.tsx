import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api, setUnauthorizedHandler, tokenStore } from '@/lib/api';
import type { PlanReport, Subject, User } from '@/lib/types';

interface AppState {
  user: User | null;
  ready: boolean;
  subjects: Subject[];
  report: PlanReport | null;
  version: number;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
  handleReport: (r: PlanReport | null | undefined, opts?: { silent?: boolean }) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [report, setReport] = useState<PlanReport | null>(null);
  const [version, setVersion] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const lastDeficitToast = useRef('');

  const refresh = useCallback(async () => {
    const [s, r] = await Promise.all([api.subjects(), api.report()]);
    setSubjects(s);
    setReport(r);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.set(null);
      setUser(null);
    });
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(async (u) => {
        setUser(u);
        await refresh();
      })
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    tokenStore.set(token);
    setUser(user);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user } = await api.register(name, email, password);
    tokenStore.set(token);
    setUser(user);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    tokenStore.set(null);
    setUser(null);
    setSubjects([]);
    setReport(null);
  }, []);

  const handleReport = useCallback(
    (r: PlanReport | null | undefined, opts?: { silent?: boolean }) => {
      if (r) setReport(r);
      api.subjects().then(setSubjects).catch(() => {});
      setVersion((v) => v + 1);
      if (!r || opts?.silent) return;
      if (!r.feasible) {
        const key = r.deficits.map((d) => d.subjectId + d.deficitMinutes).join();
        if (key !== lastDeficitToast.current) {
          lastDeficitToast.current = key;
          const d = r.deficits[0];
          toast.warning(`Plan dla „${d.subject}” się nie domyka`, {
            description: `Brakuje ${d.deficitMinutes} min. Dodaj ~${d.suggestions.extraPerDay} min dziennie lub ogranicz zakres.`,
          });
        }
      } else lastDeficitToast.current = '';
    },
    [],
  );

  const value = useMemo(
    () => ({ user, ready, subjects, report, version, login, register, logout, setUser, refresh, handleReport, paletteOpen, setPaletteOpen }),
    [user, ready, subjects, report, version, login, register, logout, refresh, handleReport, paletteOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp poza AppProvider');
  return c;
}

/** Pobiera dane i odświeża je przy każdej zmianie wersji danych w aplikacji. */
export function useLive<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const { version } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const load = useCallback(() => {
    return fnRef.current().then(
      (d) => { setData(d); setLoading(false); },
      (e) => { setLoading(false); toast.error(e.message); },
    );
  }, []);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, load, ...deps]);
  return { data, loading, reload: load, setData };
}
