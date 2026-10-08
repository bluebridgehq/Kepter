import { createContext, useContext } from "react";

export const ToastContext = createContext<((message: string) => void) | null>(null);

export function useToast(): (message: string) => void {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
