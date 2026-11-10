// Data layer: config.json (your brands and networks), publications.json (your posts) and stats.json (Buffer and Treg
// numbers). Claude Code writes all three: you never edit them by hand.
// Status and date edits made in the app live in localStorage until the JSON changes that entry.
import { useEffect, useState } from "react";

export type Status = "todo" | "programmed" | "published";
export type Platform = "instagram" | "tiktok" | "youtube" | "x" | "linkedin";
export const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "linkedin", "x"];

export const STATUS_LABEL: Record<Status, string> = { todo: "À programmer", programmed: "Programmée", published: "Publiée" };
export const PLATFORM_LABEL: Record<Platform, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X", linkedin: "LinkedIn" };

export type AccountPlatform = Platform | "newsletter";
export const ACCOUNT_LABEL: Record<AccountPlatform, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X", linkedin: "LinkedIn", newsletter: "Newsletter" };

// Brands: each groups the social accounts, posts and stats shown together (most people have one). Read from
// public/data/config.json, which Claude Code writes during the installation.
export type Workspace = string;
export interface Brand { id: Workspace; label: string; platforms: Platform[] }
export let WORKSPACES: Brand[] = [{ id: "main", label: "Ma marque", platforms: ["instagram", "tiktok", "linkedin"] }];
export const DEFAULT_WS = () => WORKSPACES[0]?.id ?? "main";

export interface Reel {
  id: string;
  /** Brand the post belongs to; absent = the first brand. */
  workspace?: Workspace;
  avatar: boolean;
  title: string;
  created: string;
  duration: string;
  durationSec?: number;
  format: string;
  status: Status;
  scheduled?: string;
  path: string;
  video: string;
  thumbnail?: string;
  music?: string;
  sources: { label: string; url: string }[];
  /** Texts per network: only the networks the post goes to. */
  instagram?: { caption: string };
  tiktok?: { title: string; caption: string };
  youtube?: { title: string; description: string };
  linkedin?: { text: string };
  /** X post (280 characters on the free plan). */
  x?: { text: string };
  /** Public Google Drive link of the video, the one Buffer downloads. */
  driveUrl?: string;
  /** Horizontal video (long YouTube video): 16:9 player and 1280 × 720 thumbnail. */
  landscape?: boolean;
}

export interface PostStat {
  reelId: string;
  platform: Platform;
  bufferId: string;
  sentAt: string;
  metricsUpdatedAt: string;
  views: number;
  reach?: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  watchTimeMin?: number;
  avgWatchSec?: number;
}

export interface Snapshot {
  date: string;
  followers: number;
  posts?: number;
  likes?: number;
  totalViews?: number;
}

export interface Account {
  /** Unique key across brands (two Instagram accounts can coexist); absent = platform. */
  id?: string;
  /** Brand; absent = the first brand. */
  workspace?: Workspace;
  platform: AccountPlatform;
  handle: string | null;
  url: string | null;
  source: string;
  snapshots: Snapshot[];
  /** Newsletter only: sign-ups per month (YYYY-MM). */
  monthly?: { month: string; signups: number; partial?: boolean }[];
}

export interface WeekNet {
  views: number;
  posts: number;
  reach?: number;
  likes?: number | null;
  comments?: number | null;
  saves?: number;
  shares?: number;
  avgWatchSec?: number;
}

/** One week of one brand (absent = the first brand). */
export type Week = { workspace?: Workspace; start: string; end: string; partial: boolean } & Partial<Record<Platform, WeekNet>>;

export interface Stats {
  source: string;
  fetchedAt: string;
  posts: PostStat[];
  accounts?: { note: string; items: Account[] };
  weekly?: { source: string; note: string; weeks: Week[] };
  /** Every sent post of the Buffer channels with its views to date, for the views charts. */
  timeline?: { source: string; note: string; posts: TimelinePost[] };
}

export interface TimelinePost {
  id: string;
  /** Brand of the post's Buffer channel; absent = the first brand. */
  workspace?: Workspace;
  platform: Platform;
  sentAt: string;
  views: number;
  /** Written by the server-side reading: the start of the post's text, to find its reel, and its other metrics. */
  text?: string;
  metricsUpdatedAt?: string;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  watchTimeMin?: number;
  avgWatchSec?: number;
}

interface Publications {
  mediaBase: string;
  items: Reel[];
}

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem("pub:" + key);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem("pub:" + key, JSON.stringify(value));
    } catch {
      /* private mode: edits stay in memory */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem("pub:" + key);
    } catch {
      /* nothing stored */
    }
  },
};
export { store };

const clean = (t: string) => t.replace(/\s+/g, " ").trim();
const reelText = (r: Reel, p: Platform) =>
  p === "instagram" ? r.instagram?.caption : p === "tiktok" ? r.tiktok?.caption : p === "youtube" ? r.youtube?.description : p === "linkedin" ? r.linkedin?.text : r.x?.text;

// The server-side reading stores every sent post with the start of its text. A post whose text opens like a reel's
// caption (or YouTube description) is that reel's post; it updates the reel's stats, and the reel counts as published.
function matchReels(items: Reel[], stats: Stats): { items: Reel[]; stats: Stats } {
  const byId = new Map(stats.posts.map((p) => [p.bufferId, p]));
  for (const t of stats.timeline?.posts ?? []) {
    if (!t.text) continue;
    const head = clean(t.text);
    const ws = t.workspace ?? DEFAULT_WS();
    const reel = items.find((r) => (r.workspace ?? DEFAULT_WS()) === ws && clean(reelText(r, t.platform) ?? "").startsWith(head));
    if (!reel) continue;
    const old = byId.get(t.id);
    if (old && (old.metricsUpdatedAt ?? "") > (t.metricsUpdatedAt ?? "")) continue;
    byId.set(t.id, {
      reelId: reel.id, platform: t.platform, bufferId: t.id, sentAt: t.sentAt, metricsUpdatedAt: t.metricsUpdatedAt ?? old?.metricsUpdatedAt ?? t.sentAt,
      views: t.views, reach: t.reach, likes: t.likes ?? 0, comments: t.comments ?? 0, shares: t.shares, saves: t.saves, watchTimeMin: t.watchTimeMin, avgWatchSec: t.avgWatchSec,
    });
  }
  const posts = [...byId.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.platform.localeCompare(b.platform));
  const sent = new Set(posts.map((p) => p.reelId));
  return { items: items.map((r) => (r.status === "programmed" && sent.has(r.id) ? { ...r, status: "published" as Status } : r)), stats: { ...stats, posts } };
}

// Stats live in public/data/stats.json, refreshed every morning by the Claude routine. Before the first reading it is empty.
const EMPTY_STATS: Stats = { source: "Buffer", fetchedAt: "", posts: [] };
async function loadStats(): Promise<Stats> {
  try {
    const r = await fetch("data/stats.json", { cache: "no-cache" });
    if (r.ok) return (await r.json()) as Stats;
  } catch {
    /* not created yet */
  }
  return EMPTY_STATS;
}

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(path, { cache: "no-cache" });
    if (r.ok) return (await r.json()) as T;
  } catch {
    /* not created yet */
  }
  return fallback;
}

// When the JSON changes an entry's status or date (after a Buffer sync), it wins over edits made in the page.
function applyOverrides(items: Reel[]): Reel[] {
  return items.map((it) => {
    const sig = `${it.status}|${it.scheduled ?? ""}`;
    if (store.get<string | null>("seen:" + it.id, null) !== sig) {
      store.remove("status:" + it.id);
      store.remove("sched:" + it.id);
    }
    store.set("seen:" + it.id, sig);
    return {
      ...it,
      status: store.get<Status>("status:" + it.id, it.status),
      scheduled: store.get<string>("sched:" + it.id, it.scheduled ?? "") || undefined,
    };
  });
}

export interface AppData {
  reels: Reel[];
  stats: Stats;
  /** Networks of the brand shown, in display order. */
  platforms: Platform[];
  media: (path?: string) => string;
}

// What one brand sees: its reels, its accounts, its networks, and the Buffer weeks and posts of its channels.
export function scopeData(data: AppData, ws: Workspace): AppData {
  const conf = WORKSPACES.find((w) => w.id === ws) ?? WORKSPACES[0];
  const reels = data.reels.filter((r) => (r.workspace ?? DEFAULT_WS()) === ws);
  const ids = new Set(reels.map((r) => r.id));
  const st = data.stats;
  const mine = (x: { workspace?: Workspace }) => (x.workspace ?? DEFAULT_WS()) === ws;
  return {
    ...data,
    reels,
    platforms: conf.platforms,
    stats: {
      ...st,
      posts: st.posts.filter((p) => ids.has(p.reelId)),
      accounts: st.accounts && { ...st.accounts, items: st.accounts.items.filter((a) => (a.workspace ?? DEFAULT_WS()) === ws) },
      weekly: st.weekly && { ...st.weekly, weeks: st.weekly.weeks.filter(mine) },
      timeline: st.timeline && { ...st.timeline, posts: st.timeline.posts.filter(mine) },
    },
  };
}

export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadJson<Publications>("data/publications.json", { mediaBase: "media/", items: [] }),
      loadStats(),
      loadJson<{ brands?: Brand[] }>("data/config.json", {}),
    ])
      .then(([pubs, raw, config]) => {
        if (config.brands?.length) WORKSPACES = config.brands;
        const base = pubs.mediaBase ?? "";
        const media = (p?: string) => (!p ? "" : /^(https?:|\/)/.test(p) ? p : base + p);
        const { items, stats } = matchReels(pubs.items, raw);
        const reels = applyOverrides(items).sort((a, b) => b.created.localeCompare(a.created));
        setData({ reels, stats, media, platforms: PLATFORMS });
      })
      .catch(() => setError("Impossible de lire les données de l'app. Demande à Claude : « répare mon social media app »."));
  }, []);

  const update = (id: string, patch: Partial<Pick<Reel, "status" | "scheduled">>) => {
    if (patch.status !== undefined) store.set("status:" + id, patch.status);
    if ("scheduled" in patch) store.set("sched:" + id, patch.scheduled ?? "");
    setData((d) => (d ? { ...d, reels: d.reels.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : d));
  };

  return { data, error, update };
}
