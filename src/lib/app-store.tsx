import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TxType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  date: string; // ISO
  pending?: boolean;
  walletId?: string;
};

export type User = {
  name: string;
  handle: string;
  provider: "telegram" | "google";
  avatar?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
};

export const defaultNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Transaksi tersimpan",
    body: "Pengeluaran Rp 45.000 (Transport) berhasil dicatat.",
    time: "5 menit lalu",
  },
  {
    id: "n2",
    title: "Ringkasan mingguan siap",
    body: "Pengeluaran minggu ini 12% lebih rendah dari minggu lalu.",
    time: "Kemarin",
  },
];

export type TxFilters = {
  month: string;
  week: string; // "all" | "this" | "last"
  type: "all" | "income" | "expense";
  category: string;
  keyword: string;
};

export const defaultTxFilters: TxFilters = {
  month: "all",
  week: "all",
  type: "all",
  category: "all",
  keyword: "",
};

export type Settings = {
  darkTheme: boolean;
  pushNotifications: boolean;
  biometricLock: boolean;
  cloudSync: boolean;
};

export type Language = "id" | "en";

/**
 * Categories are user-owned: the app ships with NONE. A category may be
 * global (walletId undefined) or routed to one specific wallet account.
 */
export type Category = {
  id: string;
  name: string;
  type: TxType;
  walletId?: string;
};

export type WalletType = "cash" | "bank" | "ewallet";

export type Wallet = {
  id: string;
  name: string;
  type: WalletType;
  provider?: string;
  balance: number;
};

export type WalletActivityKind = "topup" | "transfer" | "create";

export type WalletActivity = {
  id: string;
  kind: WalletActivityKind;
  title: string;
  detail: string;
  amount: number;
  date: string; // ISO
};

export const WALLET_TYPE_LABEL: Record<WalletType, string> = {
  cash: "Tunai",
  bank: "Bank Utama",
  ewallet: "E-Wallet",
};

export const WALLET_PROVIDERS: Record<WalletType, string[]> = {
  cash: ["Dompet Fisik", "Kas Kantor", "Tabungan Rumah"],
  bank: ["BCA", "Mandiri", "BNI", "BRI", "CIMB Niaga", "Permata"],
  ewallet: ["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"],
};

const STORAGE_KEY = "tmab-state-v1";

const defaultSettings: Settings = {
  darkTheme: true,
  pushNotifications: false,
  biometricLock: false,
  cloudSync: false,
};

const seedWallets = (): Wallet[] => [
  { id: "w1", name: "Tunai", type: "cash", provider: "Dompet Fisik", balance: 1250000 },
  { id: "w2", name: "Bank Utama", type: "bank", provider: "BCA", balance: 6400000 },
  { id: "w3", name: "E-Wallet", type: "ewallet", provider: "GoPay", balance: 850000 },
];

const seedWalletActivity = (): WalletActivity[] => {
  const now = Date.now();
  const day = 86_400_000;
  return [
    {
      id: "wa1",
      kind: "topup",
      title: "Isi Saldo E-Wallet",
      detail: "GoPay · dari Bank Utama",
      amount: 300000,
      date: new Date(now - day).toISOString(),
    },
    {
      id: "wa2",
      kind: "transfer",
      title: "Transfer Antar Kantong",
      detail: "Bank Utama → Tunai",
      amount: 500000,
      date: new Date(now - 3 * day).toISOString(),
    },
    {
      id: "wa3",
      kind: "create",
      title: "Kantong Dibuat",
      detail: "E-Wallet · GoPay",
      amount: 0,
      date: new Date(now - 20 * day).toISOString(),
    },
  ];
};


const seedTransactions = (): Transaction[] => {
  const now = Date.now();
  const day = 86_400_000;
  const mk = (
    id: string,
    type: TxType,
    amount: number,
    category: string,
    note: string,
    daysAgo: number,
    walletId: string,
  ): Transaction => ({
    id,
    type,
    amount,
    category,
    note,
    date: new Date(now - daysAgo * day).toISOString(),
    walletId,
  });
  return [
    mk("s1", "income", 7500000, "Gaji", "Gaji bulanan", 2, "w2"),
    mk("s2", "expense", 185000, "Makanan", "Belanja mingguan", 0, "w1"),
    mk("s3", "expense", 45000, "Transport", "Ojek online", 0, "w3"),
    mk("s4", "expense", 320000, "Tagihan", "Listrik", 5, "w2"),
    mk("s5", "income", 1200000, "Freelance", "Proyek desain", 12, "w2"),
    mk("s6", "expense", 890000, "Belanja", "Sepatu lari", 40, "w2"),
    mk("s7", "expense", 250000, "Hiburan", "Langganan streaming", 120, "w3"),
    mk("s8", "income", 2000000, "Bonus", "Bonus kuartal", 200, "w2"),
    // Mock test transaction with a short note (Catatan Singkat)
    mk("s9", "expense", 75000, "Makanan", "Catatan singkat: makan siang tim", 1, "w1"),
  ];
};

type AppState = {
  hydrated: boolean;
  user: User | null;
  authLoading: null | "telegram" | "google";
  transactions: Transaction[];
  settings: Settings;
  addTxOpen: boolean;
  allTxOpen: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationsRead: () => void;
  updateProfile: (update: { name?: string; avatar?: string }) => void;
  txFilters: TxFilters;
  setTxFilters: (update: Partial<TxFilters>) => void;
  resetTxFilters: () => void;
  setAllTxOpen: (open: boolean) => void;
  openCurrentMonth: () => void;
  login: (provider: "telegram" | "google", name?: string) => Promise<void>;
  logout: () => void;
  addTransaction: (
    input: Omit<Transaction, "id" | "date" | "pending"> & { date?: string },
  ) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  toggleSetting: (key: keyof Settings) => void;
  setAddTxOpen: (open: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  categories: Category[];
  addCategory: (input: { name: string; type: TxType; walletId?: string }) => boolean;
  renameCategory: (id: string, name: string) => boolean;
  deleteCategory: (id: string) => boolean;
  categoryUsage: (id: string) => number;
  categoriesFor: (type: TxType, walletId?: string) => Category[];

  locked: boolean;
  unlockApp: (pin?: string) => boolean;
  lockApp: () => void;
  wallets: Wallet[];
  walletActivity: WalletActivity[];
  addWallet: (input: { name: string; type: WalletType; provider?: string; balance: number }) => void;
  topUpWallet: (input: { walletId: string; amount: number; source?: string }) => boolean;
  transferBetweenWallets: (input: { fromId: string; toId: string; amount: number }) => boolean;
  balance: number;
  walletBalance: number;
  totalIncome: number;
  totalExpense: number;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<null | "telegram" | "google">(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [language, setLanguage] = useState<Language>("id");
  const [categories, setCategories] = useState<Category[]>([]);
  const [locked, setLocked] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>(seedWallets);
  const [walletActivity, setWalletActivity] = useState<WalletActivity[]>(seedWalletActivity);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [allTxOpen, setAllTxOpen] = useState(false);
  const [txFilters, setTxFiltersState] = useState<TxFilters>(defaultTxFilters);
  const [notifications] = useState<AppNotification[]>(defaultNotifications);
  const [unreadCount, setUnreadCount] = useState(defaultNotifications.length);

  const addCategory = useCallback(
    (input: { name: string; type: TxType; walletId?: string }) => {
      const name = input.name.trim().replace(/\s+/g, " ");
      if (name.length < 2 || name.length > 24) return false;
      let ok = false;
      setCategories((prev) => {
        const duplicate = prev.some(
          (c) =>
            c.type === input.type &&
            c.name.toLowerCase() === name.toLowerCase() &&
            (c.walletId ?? "") === (input.walletId ?? ""),
        );
        if (duplicate) return prev;
        ok = true;
        return [
          ...prev,
          {
            id: `c${Date.now()}${Math.round(Math.random() * 1000)}`,
            name,
            type: input.type,
            ...(input.walletId ? { walletId: input.walletId } : {}),
          },
        ];
      });
      return ok;
    },
    [],
  );

  const categoryUsage = useCallback(
    (id: string) => {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return 0;
      return transactions.filter(
        (tx) =>
          tx.type === cat.type &&
          tx.category.toLowerCase() === cat.name.toLowerCase() &&
          (!cat.walletId || tx.walletId === cat.walletId),
      ).length;
    },
    [categories, transactions],
  );

  const renameCategory = useCallback((id: string, next: string) => {
    const name = next.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 24) return false;
    let ok = false;
    setCategories((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target) return prev;
      const duplicate = prev.some(
        (c) =>
          c.id !== id &&
          c.type === target.type &&
          c.name.toLowerCase() === name.toLowerCase() &&
          (c.walletId ?? "") === (target.walletId ?? ""),
      );
      if (duplicate) return prev;
      ok = true;
      return prev.map((c) => (c.id === id ? { ...c, name } : c));
    });
    return ok;
  }, []);

  const deleteCategory = useCallback(
    (id: string) => {
      if (!id) return false;
      if (categoryUsage(id) > 0) return false;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return true;
    },
    [categoryUsage],
  );



  const categoriesFor = useCallback(
    (type: TxType, walletId?: string) =>
      categories.filter(
        (c) => c.type === type && (!c.walletId || (!!walletId && c.walletId === walletId)),
      ),
    [categories],
  );

  const unlockApp = useCallback(() => {
    setLocked(false);
    return true;
  }, []);

  const lockApp = useCallback(() => setLocked(true), []);

  const addWallet = useCallback(
    (input: { name: string; type: WalletType; provider?: string; balance: number }) => {
      const name = input.name.trim();
      if (!name) return;
      const id = `w${Date.now()}`;
      const wallet: Wallet = {
        id,
        name,
        type: input.type,
        balance: Math.max(0, Math.round(input.balance) || 0),
        ...(input.provider?.trim() ? { provider: input.provider.trim() } : {}),
      };
      setWallets((prev) => [...prev, wallet]);
      setWalletActivity((prev) => [
        {
          id: `wa${Date.now()}`,
          kind: "create",
          title: "Kantong Dibuat",
          detail: `${WALLET_TYPE_LABEL[wallet.type]}${wallet.provider ? ` · ${wallet.provider}` : ""}`,
          amount: wallet.balance,
          date: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [],
  );


  const pushActivity = useCallback((activity: Omit<WalletActivity, "id" | "date">) => {
    setWalletActivity((prev) => [
      { ...activity, id: `wa${Date.now()}${Math.round(Math.random() * 1000)}`, date: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const topUpWallet = useCallback(
    ({ walletId, amount, source }: { walletId: string; amount: number; source?: string }) => {
      const value = Math.round(amount);
      if (!walletId || !Number.isFinite(value) || value <= 0) return false;
      let ok = false;
      setWallets((prev) => {
        const target = prev.find((w) => w.id === walletId);
        if (!target) return prev;
        ok = true;
        return prev.map((w) => (w.id === walletId ? { ...w, balance: w.balance + value } : w));
      });
      if (!ok) return false;
      const target = wallets.find((w) => w.id === walletId);
      pushActivity({
        kind: "topup",
        title: `Isi Saldo ${target?.name ?? "Kantong"}`,
        detail: source?.trim() ? `${target?.provider ?? ""} · dari ${source.trim()}`.replace(/^ · /, "") : target?.provider ?? "Top up manual",
        amount: value,
      });
      return true;
    },
    [pushActivity, wallets],
  );

  const transferBetweenWallets = useCallback(
    ({ fromId, toId, amount }: { fromId: string; toId: string; amount: number }) => {
      const value = Math.round(amount);
      if (!fromId || !toId || fromId === toId) return false;
      if (!Number.isFinite(value) || value <= 0) return false;
      let ok = false;
      setWallets((prev) => {
        const from = prev.find((w) => w.id === fromId);
        const to = prev.find((w) => w.id === toId);
        if (!from || !to || from.balance < value) return prev;
        ok = true;
        return prev.map((w) =>
          w.id === fromId
            ? { ...w, balance: w.balance - value }
            : w.id === toId
              ? { ...w, balance: w.balance + value }
              : w,
        );
      });
      if (!ok) return false;
      const from = wallets.find((w) => w.id === fromId);
      const to = wallets.find((w) => w.id === toId);
      pushActivity({
        kind: "transfer",
        title: "Transfer Antar Kantong",
        detail: `${from?.name ?? "?"} → ${to?.name ?? "?"}`,
        amount: value,
      });
      return true;
    },
    [pushActivity, wallets],
  );

  const markNotificationsRead = useCallback(() => setUnreadCount(0), []);

  const updateProfile = useCallback((update: { name?: string; avatar?: string }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = { ...prev };
      if (update.name?.trim()) next.name = update.name.trim();
      if (update.avatar?.trim()) next.avatar = update.avatar.trim();
      else delete next.avatar;
      return next;
    });
  }, []);

  const setTxFilters = useCallback((update: Partial<TxFilters>) => {
    setTxFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  const resetTxFilters = useCallback(() => setTxFiltersState(defaultTxFilters), []);

  const openCurrentMonth = useCallback(() => {
    setTxFiltersState({
      ...defaultTxFilters,
      month: String(new Date().getMonth()),
    });
    setAllTxOpen(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          user?: User | null;
          transactions?: Transaction[];
          settings?: Settings;
          language?: Language;
          wallets?: Wallet[];
          walletActivity?: WalletActivity[];
          categories?: Category[];
        };
        setUser(parsed.user ?? null);
        if (parsed.transactions?.length) {
          // Keep existing data; only add the mock note transaction if missing.
          const mock = seedTransactions().find((t) => t.id === "s9")!;
          const hasMock = parsed.transactions.some((t) => t.id === "s9");
          setTransactions(hasMock ? parsed.transactions : [mock, ...parsed.transactions]);
        } else {
          setTransactions(seedTransactions());
        }
        setSettings({ ...defaultSettings, ...(parsed.settings ?? {}) });
        if (parsed.language === "id" || parsed.language === "en") setLanguage(parsed.language);
        if (parsed.wallets?.length) setWallets(parsed.wallets);
        if (parsed.walletActivity?.length) setWalletActivity(parsed.walletActivity);
        if (Array.isArray(parsed.categories)) setCategories(parsed.categories);
        if (parsed.settings?.biometricLock) setLocked(true);
      } else {
        setTransactions(seedTransactions());
      }
    } catch {
      setTransactions(seedTransactions());
    }
    setHydrated(true);
  }, []);

  // Persist off the render path and coalesced, so rapid state updates never
  // block the UI with repeated JSON serialization.
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            user,
            transactions,
            settings,
            language,
            wallets,
            walletActivity,
            categories,
          }),
        );
      } catch {
        /* ignore quota errors */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [hydrated, user, transactions, settings, language, wallets, walletActivity, categories]);

  // Apply the theme switch to the document so the toggle is visually real.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("theme-light", !settings.darkTheme);
    root.classList.toggle("dark", settings.darkTheme);
  }, [hydrated, settings.darkTheme]);

  const login = useCallback(async (provider: "telegram" | "google", name?: string) => {
    setAuthLoading(provider);
    await new Promise((r) => setTimeout(r, 1200));
    const tgUser = (globalThis as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    setUser({
      name:
        name ||
        (provider === "telegram"
          ? [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(" ") || "Pengguna Telegram"
          : "Pengguna Google"),
      handle:
        provider === "telegram"
          ? tgUser?.username
            ? `@${tgUser.username}`
            : "@telegram_user"
          : "google@gmail.com",
      provider,
    });
    setAuthLoading(null);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const addTransaction = useCallback(
    (input: Omit<Transaction, "id" | "date" | "pending"> & { date?: string }) => {
      const id = `t${Date.now()}`;
      const { date, ...rest } = input;
      const iso = (() => {
        if (!date) return new Date().toISOString();
        const d = new Date(date);
        return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      })();
      // Optimistic insert: list + balance update instantly, then confirm.
      setTransactions((prev) => [{ ...rest, id, date: iso, pending: true }, ...prev]);
      if (rest.walletId) {
        const delta = rest.type === "income" ? rest.amount : -rest.amount;
        setWallets((prev) =>
          prev.map((w) => (w.id === rest.walletId ? { ...w, balance: w.balance + delta } : w)),
        );
      }
      setTimeout(() => {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, pending: false } : t)),
        );
      }, 700);
    },
    [],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<Transaction, "id">>) => {
      if (!id) return;
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t)),
      );
    },
    [],
  );

  const deleteTransaction = useCallback((id: string) => {
    if (!id) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleSetting = useCallback((key: keyof Settings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // App Lock arms/releases the challenge immediately.
      if (key === "biometricLock") setLocked(next.biometricLock);
      return next;
    });
  }, []);

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  const walletBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets],
  );

  // Stable context value: consumers only re-render when real data changes.
  const value = useMemo<AppState>(
    () => ({
      hydrated,
      user,
      authLoading,
      transactions,
      settings,
      addTxOpen,
      allTxOpen,
      notifications,
      unreadCount,
      markNotificationsRead,
      updateProfile,
      txFilters,
      setTxFilters,
      resetTxFilters,
      setAllTxOpen,
      openCurrentMonth,
      login,
      logout,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleSetting,
      setAddTxOpen,
      language,
      setLanguage,
      categories,
      addCategory,
      renameCategory,
      deleteCategory,
      categoryUsage,

      categoriesFor,
      locked,
      unlockApp,
      lockApp,
      wallets,
      walletActivity,
      addWallet,
      topUpWallet,
      transferBetweenWallets,
      balance: totalIncome - totalExpense,
      walletBalance,
      totalIncome,
      totalExpense,
    }),
    [
      hydrated,
      user,
      authLoading,
      transactions,
      settings,
      addTxOpen,
      allTxOpen,
      notifications,
      unreadCount,
      markNotificationsRead,
      updateProfile,
      txFilters,
      setTxFilters,
      resetTxFilters,
      openCurrentMonth,
      login,
      logout,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      toggleSetting,
      language,
      categories,
      addCategory,
      renameCategory,
      deleteCategory,
      categoryUsage,

      categoriesFor,
      locked,
      unlockApp,
      lockApp,
      wallets,
      walletActivity,
      addWallet,
      topUpWallet,
      transferBetweenWallets,
      walletBalance,
      totalIncome,
      totalExpense,
    ],

  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function formatIDR(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}Rp ${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;
}
