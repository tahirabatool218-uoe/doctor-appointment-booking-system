"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type T = { id: number; type: "success" | "error"; message: string };
const Ctx = createContext<{ success: (m: string) => void; error: (m: string) => void }>({ success: () => {}, error: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((type: T["type"], message: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, type, message }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ success: (m) => push("success", m), error: (m) => push("error", m) }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-2 rounded-lg bg-navy px-4 py-3 text-sm text-white shadow-lg">
            {t.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-300" /> : <XCircle className="h-4 w-4 shrink-0 text-red-300" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
