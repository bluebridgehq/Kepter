import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import QRCode from "qrcode";

import { STATUS_LABEL, STATUS_TONE, type CardStatus, type Tone } from "../lib/status.ts";
import { CheckIcon } from "./icons.tsx";

type Variant = "brand" | "accent" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  brand: "bg-brand text-brand-ink border-none",
  accent: "bg-accent text-accent-ink border-none",
  secondary: "bg-surface text-ink border-[1.5px] border-line",
  danger: "bg-bad text-white border-none",
  ghost: "bg-transparent text-ink border-none",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Base button. Size, radius and text size come from className so each screen matches the design. */
export function Button({ variant = "brand", className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`cursor-pointer font-bold disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${className}`}
    />
  );
}

const TONES: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  muted: "bg-muted-bg text-muted",
};

export function StatusPill({ status, large }: { status: CardStatus; large?: boolean }) {
  return (
    <span
      className={`rounded-full font-bold ${TONES[STATUS_TONE[status]]} ${
        large ? "px-[11px] py-[5px] text-[13px]" : "px-2 py-[3px] text-xs"
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="rounded-full bg-accent px-2 py-[3px] text-xs font-extrabold text-accent-ink">New</span>
  );
}

export function BackingBadge({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tabular flex min-h-9 cursor-pointer items-center gap-[7px] self-start rounded-full border-none bg-ok-bg px-[13px] py-[7px] text-sm font-bold text-ok"
    >
      <CheckIcon size={14} stroke={2.4} />
      {text}
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-kpulse bg-surface-2 ${className}`} />;
}

/** A crisp QR code for `text`, drawn as a pixel image. */
export function QrImage({ text, size, label }: { text: string; size: number | string; label: string }) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 0, scale: 8 })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(undefined));
    return () => {
      live = false;
    };
  }, [text]);

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: size,
        display: "block",
        imageRendering: "pixelated",
        backgroundImage: src ? `url(${src})` : "none",
        backgroundSize: "100% 100%",
      }}
    />
  );
}

interface ChipsProps<T> {
  options: T[];
  value: T | null;
  label: (option: T) => string;
  onPick: (option: T) => void;
  className?: string;
  chipClassName?: string;
}

export function Chips<T>({ options, value, label, onPick, className = "", chipClassName = "" }: ChipsProps<T>) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {options.map((option) => {
        const on = option === value;
        return (
          <button
            key={label(option)}
            onClick={() => onPick(option)}
            aria-pressed={on}
            className={`tabular cursor-pointer rounded-[14px] border-[1.5px] font-bold ${
              on ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-ink"
            } ${chipClassName}`}
          >
            {label(option)}
          </button>
        );
      })}
    </div>
  );
}

/** A centered card used for errors and info states. */
export function MessagePanel({
  icon,
  tone = "muted",
  title,
  children,
  action,
  className = "",
}: {
  icon: ReactNode;
  tone?: "muted" | "brand";
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-[22px] border border-line bg-surface px-6 py-8 text-center ${className}`}
    >
      <span
        className={`flex size-14 items-center justify-center rounded-full text-[26px] font-extrabold ${
          tone === "brand" ? "bg-brand-soft text-brand-text" : "bg-muted-bg text-muted"
        }`}
      >
        {icon}
      </span>
      <h1 className="m-0 text-2xl font-extrabold text-balance">{title}</h1>
      {children && <p className="m-0 text-ink-2">{children}</p>}
      {action}
    </div>
  );
}

export function SuccessCheck({ size = 64, icon = 30 }: { size?: number; icon?: number }) {
  return (
    <span
      className="animate-kpop flex items-center justify-center rounded-full bg-ok-bg text-ok"
      style={{ width: size, height: size }}
    >
      <CheckIcon size={icon} stroke={2} />
    </span>
  );
}

/** Label and value rows inside a bordered box. */
export function Rows({ rows }: { rows: Array<[ReactNode, ReactNode]> }) {
  return (
    <div className="flex flex-col rounded-[18px] border border-line bg-surface">
      {rows.map(([label, value], i) => (
        <div
          key={i}
          className={`flex justify-between gap-3 px-[18px] py-[15px] ${i < rows.length - 1 ? "border-b border-line" : ""}`}
        >
          <span className="text-ink-2">{label}</span>
          <span className="tabular text-right font-bold [overflow-wrap:anywhere]">{value}</span>
        </div>
      ))}
    </div>
  );
}
