import { useEffect, type ReactNode } from "react";

interface SheetProps {
  onClose: () => void;
  children: ReactNode;
  /** Show the Cancel button at the bottom. */
  cancel?: boolean;
}

/** Bottom sheet with a scrim. Tapping the scrim or pressing Escape closes it. */
export function Sheet({ onClose, children, cancel = true }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      data-noprint
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="animate-[kup_.25s_ease-out] flex max-h-[92vh] w-full max-w-[480px] flex-col gap-4 overflow-auto rounded-t-[26px] bg-surface px-[22px] pt-2.5 pb-7 text-ink shadow-card"
      >
        <span className="h-[5px] w-10 self-center rounded-[3px] bg-line" />
        {children}
        {cancel && (
          <button
            onClick={onClose}
            className="min-h-11 cursor-pointer border-none bg-transparent text-base font-bold text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function SheetTitle({ children, danger }: { children: ReactNode; danger?: boolean }) {
  return <h2 className={`m-0 text-[22px] font-extrabold ${danger ? "text-bad" : ""}`}>{children}</h2>;
}
