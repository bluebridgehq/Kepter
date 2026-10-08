/** Copies text. Returns false when the browser blocks the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Opens the system share sheet, falling back to copying. Returns what happened. */
export async function shareLink(url: string, title: string, text?: string): Promise<"shared" | "copied" | "none"> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title, text });
      return "shared";
    } catch {
      return "none";
    }
  }
  return (await copyText(url)) ? "copied" : "none";
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A calendar file with an all day reminder on the card's last day. */
export function calendarFile(title: string, description: string, endsAt: Date): string {
  const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const next = new Date(endsAt.getTime() + 86_400_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kepter//Gift card//EN",
    "BEGIN:VEVENT",
    `UID:${day(endsAt)}-${Math.random().toString(36).slice(2)}@kepter`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day(endsAt)}`,
    `DTEND;VALUE=DATE:${day(next)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function isLikelyDesktop(): boolean {
  return !window.matchMedia("(pointer: coarse)").matches && window.innerWidth >= 900;
}
