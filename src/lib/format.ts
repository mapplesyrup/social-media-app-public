const nf = new Intl.NumberFormat("fr-FR");
export const num = (n: number) => nf.format(Math.round(n));
export const pct = (n: number) => `${Math.round(n * 100)} %`;

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
export const schedLabel = (iso: string) =>
  `${new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${timeLabel(iso)}`;
export const stamp = (iso: string) => `${shortDate(iso)} à ${timeLabel(iso)}`;

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
