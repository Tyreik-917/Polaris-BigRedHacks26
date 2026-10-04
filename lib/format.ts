/** Display API numbers without client-side math beyond formatting. */

export function formatUsd(amount: number): string {
  const abs = Math.abs(amount);
  const digits = abs % 1 === 0 ? 0 : 2;
  const text = `$${abs.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
  return amount < 0 ? `−${text}` : text;
}

export function formatMonDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatSpokenDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
