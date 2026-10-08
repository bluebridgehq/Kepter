import { useCallback, useRef, useState, type ReactNode } from "react";

import { ToastContext } from "./toast-context.ts";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div
          data-noprint
          role="status"
          className="animate-kup-fast fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#14211D] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,.25)]"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
