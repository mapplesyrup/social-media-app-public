// Views and followers over a chosen period: by day for a month, by month for 3, 6 or 12 months.
// Views count on the day (or month) the post was published, as Buffer reports them per post.
import { useLayoutEffect, useRef, useState } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { ACCOUNT_LABEL, type Account, type AccountPlatform, type Platform, type TimelinePost } from "@/lib/data";
import { num, shortDate, ymd } from "@/lib/format";

type Range = "month" | "30d" | "3m" | "6m" | "12m";
const RANGES: { value: Range; label: string }[] = [
  { value: "month", label: "Mois en cours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "3m", label: "3 mois" },
  { value: "6m", label: "6 mois" },
  { value: "12m", label: "1 an" },
];

interface Bucket {
  key: string; // YYYY-MM-DD for a day, YYYY-MM for a month
  label: string; // axis label
  long: string; // tooltip title
  future: boolean;
  partial: boolean;
}

const ym = (d: Date) => ymd(d).slice(0, 7);
const monthShort = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
const monthLong = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

function buckets(range: Range, now = new Date()): { daily: boolean; list: Bucket[]; title: string } {
  const today = ymd(now);
  if (range === "30d") {
    const list = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + i);
      const key = ymd(d);
      return { key, label: d.getDate() === 1 || i === 0 ? `${d.getDate()} ${monthShort(d)}` : String(d.getDate()), long: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), future: false, partial: key === today };
    });
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    return { daily: true, list, title: `${a.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} → aujourd'hui` };
  }
  if (range === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const list = Array.from({ length: days }, (_, i) => {
      const d = new Date(first.getFullYear(), first.getMonth(), i + 1);
      const key = ymd(d);
      return { key, label: String(i + 1), long: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), future: key > today, partial: key === today };
    });
    return { daily: true, list, title: monthLong(first) };
  }
  const n = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const list = Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: ym(d), label: monthShort(d), long: monthLong(d), future: false, partial: i === n - 1 };
  });
  const a = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  return { daily: false, list, title: `${monthLong(a)} → aujourd'hui` };
}

const bucketOf = (iso: string, daily: boolean) => (daily ? ymd(new Date(iso)) : ym(new Date(iso)));

// Rounded "nice" axis maximum and ticks, compact from 1 000 up.
function niceTicks(max: number, count = 4) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: n >= 10000 ? 0 : 1 })} k` : num(n));

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setW(node.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Tip { x: number; y: number; title: string; below?: boolean; rows: { platform?: AccountPlatform; label: string; value: string; note?: string }[] }

function Tooltip({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null;
  // Columns: centered above the mark. Lines: beside the crosshair, on the side with room, so the curves stay visible.
  const side = tip.below ? (tip.x > width / 2 ? " side-left" : " side-right") : "";
  const left = tip.below ? tip.x : Math.min(Math.max(tip.x, 90), Math.max(90, width - 90));
  return (
    <div className={`tr-tip${side}`} style={{ left, top: tip.y }} role="status">
      <b>{tip.title}</b>
      {tip.rows.map((r) => (
        <span key={r.label} className={r.platform ? `c-${r.platform}` : undefined}>
          {r.platform && <i />}
          {r.label}
          <em>{r.value}</em>
          {r.note !== undefined && <small className={r.note.startsWith("+") && r.note !== "+0" ? "up" : undefined}>{r.note}</small>}
        </span>
      ))}
    </div>
  );
}

// Top-rounded column segment: 4px data-end, square at the bottom.
const topRounded = (x: number, y: number, w: number, h: number, r = 4) => {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

function ViewsChart({ posts, range, platforms }: { posts: TimelinePost[]; range: Range; platforms: Platform[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const { daily, list } = buckets(range);
  const keys = new Set(list.map((b) => b.key));
  const values = new Map(list.map((b) => [b.key, { ...Object.fromEntries(platforms.map((p) => [p, 0])), posts: 0 } as Record<Platform | "posts", number>]));
  posts.forEach((p) => {
    const k = bucketOf(p.sentAt, daily);
    if (!keys.has(k)) return;
    const v = values.get(k)!;
    if (!(p.platform in v)) return;
    v[p.platform] += p.views;
    v.posts += 1;
  });
  const totals = platforms.map((p) => list.reduce((n, b) => n + values.get(b.key)![p], 0));
  const total = totals.reduce((a, b) => a + b, 0);
  const max = Math.max(0, ...list.map((b) => platforms.reduce((n, p) => n + values.get(b.key)![p], 0)));
  const { top, ticks } = niceTicks(max);

  const H = 230, padL = 44, padB = 26, padT = 10;
  const innerW = Math.max(0, width - padL - 4), innerH = H - padB - padT;
  const band = list.length ? innerW / list.length : 0;
  const barW = Math.max(3, Math.min(24, band * 0.62));
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  const showLabel = (i: number) => !daily || i === 0 || (i + 1) % 5 === 0;

  return (
    <div className="tr-chart">
      <div className="tr-chart-head">
        <h3>Vues</h3>
        <span className="tr-total">{num(total)}</span>
        <span className="legend">
          {platforms.map((p, i) => (
            <span key={p} className={`legend-item c-${p}`}>
              <i />
              {ACCOUNT_LABEL[p]} <b>{num(totals[i])}</b>
            </span>
          ))}
        </span>
      </div>
      <div ref={ref} className="tr-plot" onMouseLeave={() => setTip(null)}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Vues ${daily ? "par jour" : "par mois"} : ${num(total)} au total`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="tr-grid" x1={padL} x2={width - 4} y1={y(t)} y2={y(t)} />
                <text className="tr-axis" x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end">{compact(t)}</text>
              </g>
            ))}
            {list.map((b, i) => {
              const v = values.get(b.key)!;
              const cx = padL + band * i + band / 2;
              let base = padT + innerH;
              const present = platforms.filter((p) => v[p] > 0);
              return (
                <g key={b.key} className={b.future ? "tr-future" : undefined}>
                  {present.map((p, k) => {
                    const h = (v[p] / top) * innerH;
                    const gap = k > 0 ? 2 : 0;
                    const segH = Math.max(1, h - gap);
                    const yy = base - gap - segH;
                    base = yy;
                    const isTop = k === present.length - 1;
                    return isTop ? (
                      <path key={p} className={`tr-bar c-${p}`} d={topRounded(cx - barW / 2, yy, barW, segH)} />
                    ) : (
                      <rect key={p} className={`tr-bar c-${p}`} x={cx - barW / 2} y={yy} width={barW} height={segH} />
                    );
                  })}
                  {showLabel(i) && (
                    <text className="tr-axis" x={cx} y={H - 8} textAnchor="middle">{b.label}</text>
                  )}
                  <rect
                    className="tr-hit"
                    x={padL + band * i}
                    y={padT}
                    width={band}
                    height={innerH}
                    onMouseEnter={() =>
                      setTip({
                        x: cx,
                        y: Math.min(base, padT + innerH) - 8,
                        title: b.long + (b.partial ? " (en cours)" : ""),
                        rows: [
                          ...platforms.map((p) => ({ platform: p, label: ACCOUNT_LABEL[p], value: num(v[p]) })),
                          { label: v.posts === 1 ? "1 post publié" : `${v.posts} posts publiés`, value: num(platforms.reduce((n, p) => n + v[p], 0)) },
                        ],
                      })
                    }
                  />
                </g>
              );
            })}
            <line className="tr-base" x1={padL} x2={width - 4} y1={padT + innerH} y2={padT + innerH} />
          </svg>
        )}
        <Tooltip tip={tip} width={width} />
      </div>
      <details className="tr-table">
        <summary>Voir les chiffres</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{daily ? "Jour" : "Mois"}</th>
              {platforms.map((p) => <th key={p} scope="col" className="n">{ACCOUNT_LABEL[p]}</th>)}
              <th scope="col" className="n">Posts</th>
            </tr>
          </thead>
          <tbody>
            {list.filter((b) => !b.future).map((b) => {
              const v = values.get(b.key)!;
              return (
                <tr key={b.key}>
                  <th scope="row">{b.long}</th>
                  {platforms.map((p) => <td key={p} className="n">{num(v[p])}</td>)}
                  <td className="n">{v.posts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}

type Net = Exclude<AccountPlatform, "newsletter">;

// Followers of every network on one shared axis (from 0). The legend toggles a network and the axis rescales;
// hovering a day or month lists each network's count and its gain since the previous reading.
function FollowersChart({ accounts, range }: { accounts: Account[]; range: Range }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const { daily, list } = buckets(range);
  const keyOf = (date: string) => (daily ? date : date.slice(0, 7));

  const series = accounts.map((a) => {
    // value per key over the whole history: the day's reading, or the month's last one
    const all = new Map<string, number>();
    const firstIn = new Map<string, number>();
    a.snapshots.forEach((sn) => {
      const k = keyOf(sn.date);
      if (!firstIn.has(k)) firstIn.set(k, sn.followers);
      all.set(k, sn.followers);
    });
    const keys = [...all.keys()].sort();
    const gain = (k: string) => {
      const prev = keys.filter((x) => x < k).at(-1);
      if (prev !== undefined) return all.get(k)! - all.get(prev)!;
      return daily ? null : all.get(k)! - firstIn.get(k)!;
    };
    const pts = list.map((bk, i) => ({ i, key: bk.key, v: all.get(bk.key) })).filter((q): q is { i: number; key: string; v: number } => q.v !== undefined);
    const net = a.platform as Net;
    const start = pts[0], end = pts.at(-1);
    return { net, pts, gain, end, delta: start && end && start !== end ? end.v - start.v : null };
  });
  const shown = series.filter((sr) => !hidden.has(sr.net) && sr.pts.length);
  const { top, ticks } = niceTicks(Math.max(0, ...shown.flatMap((sr) => sr.pts.map((q) => q.v))));

  const H = 230, padL = 44, padR = 64, padB = 26, padT = 10;
  const innerW = Math.max(0, width - padL - padR), innerH = H - padB - padT;
  const band = list.length ? innerW / list.length : 0;
  const x = (i: number) => padL + band * i + band / 2;
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  const showLabel = (i: number) => !daily || i === 0 || (i + 1) % 5 === 0;

  // end labels (network name) only where they don't collide
  const ends = shown.map((sr) => ({ net: sr.net, x: x(sr.end!.i), y: y(sr.end!.v) })).sort((p, q) => p.y - q.y);
  const labels: typeof ends = [];
  ends.forEach((e) => { if (!labels.some((l) => Math.abs(l.y - e.y) < 13)) labels.push(e); });

  const toggle = (net: string) => {
    setTip(null);
    setHover(null);
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(net)) n.delete(net);
      else if (series.filter((sr) => sr.pts.length && !n.has(sr.net)).length > 1) n.add(net);
      return n;
    });
  };

  const enter = (i: number) => {
    const b = list[i];
    const rows = shown.flatMap((sr) => {
      const q = sr.pts.find((p) => p.i === i);
      if (!q) return [];
      const g = sr.gain(q.key);
      return [{ platform: sr.net as AccountPlatform, label: ACCOUNT_LABEL[sr.net], value: num(q.v), note: g === null ? undefined : `${g > 0 ? "+" : ""}${num(g)}` }];
    });
    setHover(i);
    setTip(rows.length ? { x: x(i), y: padT + 4, title: b.long + (b.partial ? " (en cours)" : ""), rows, below: true } : null);
  };

  return (
    <div className="tr-chart">
      <div className="tr-chart-head">
        <h3>Abonnés</h3>
        <span className="legend tr-toggles" role="group" aria-label="Réseaux affichés">
          {series.map((sr) => (
            <button key={sr.net} type="button" className={`legend-item c-${sr.net}`} aria-pressed={!hidden.has(sr.net)} disabled={!sr.pts.length} onClick={() => toggle(sr.net)}>
              <i />
              {ACCOUNT_LABEL[sr.net]} <b>{sr.end ? num(sr.end.v) : "—"}</b>
              {sr.delta !== null && <em className={`delta ${sr.delta > 0 ? "up" : sr.delta < 0 ? "down" : ""}`}>{sr.delta > 0 ? "+" : ""}{num(sr.delta)}</em>}
            </button>
          ))}
        </span>
      </div>
      <div ref={ref} className="tr-plot" onMouseLeave={() => { setTip(null); setHover(null); }}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={"Abonnés : " + series.map((sr) => `${ACCOUNT_LABEL[sr.net]} ${sr.end ? num(sr.end.v) : "—"}`).join(", ")}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="tr-grid" x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} />
                <text className="tr-axis" x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end">{compact(t)}</text>
              </g>
            ))}
            {list.map((b, i) => showLabel(i) && <text key={b.key} className="tr-axis" x={x(i)} y={H - 8} textAnchor="middle">{b.label}</text>)}
            {hover !== null && <line className="tr-cross" x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} />}
            {shown.map((sr) => (
              <g key={sr.net} className={`c-${sr.net}`}>
                {sr.pts.length > 1 && <path className="tr-line" d={sr.pts.map((q, k) => `${k ? "L" : "M"}${x(q.i)},${y(q.v)}`).join("")} />}
                {sr.pts.map((q) => <circle key={q.key} className="tr-dot" cx={x(q.i)} cy={y(q.v)} r={hover === q.i ? 5 : 4} />)}
              </g>
            ))}
            {labels.map((l) => <text key={l.net} className="tr-end" x={l.x + 10} y={l.y} dy="0.32em">{ACCOUNT_LABEL[l.net]}</text>)}
            {list.map((b, i) => <rect key={b.key} className="tr-hit" x={padL + band * i} y={padT} width={band} height={innerH} onMouseEnter={() => enter(i)} />)}
          </svg>
        )}
        <Tooltip tip={tip} width={width} />
      </div>
    </div>
  );
}

export function Trends({ posts, accounts, platforms }: { posts: TimelinePost[]; accounts: Account[]; platforms: Platform[] }) {
  const [range, setRange] = useState<Range>(() => {
    try {
      const saved = localStorage.getItem("pub:trends-range") as Range | null;
      return saved && RANGES.some((r) => r.value === saved) ? saved : "month";
    } catch {
      return "month";
    }
  });
  const pick = (v: string) => {
    setRange(v as Range);
    try {
      localStorage.setItem("pub:trends-range", v);
    } catch {
      /* private mode */
    }
  };
  const { daily, title } = buckets(range);
  const nets = accounts.filter((a) => a.platform !== "newsletter");
  const since = accounts.flatMap((a) => a.snapshots.map((s) => s.date)).sort()[0];
  return (
    <section className="panel trends" aria-labelledby="tr-title">
      <div className="panel-head">
        <h2 id="tr-title">📈 Évolution</h2>
        <SegmentedControl label="Période" options={RANGES} value={range} onValueChange={pick} />
      </div>
      <p className="tr-sub muted">
        {title.charAt(0).toUpperCase() + title.slice(1)} · {daily ? "par jour" : "par mois"}
      </p>
      {posts.length ? (
        <ViewsChart key={"views-" + range} posts={posts} range={range} platforms={platforms} />
      ) : (
        <p className="tr-sub muted" style={{ padding: "12px 0" }}>Pas encore de vues : elles arrivent après ta première publication, avec le relevé du matin.</p>
      )}
      <FollowersChart key={"followers-" + range} accounts={nets} range={range} />
      <p className="footnote">
        Vues : celles des posts publiés ce {daily ? "jour" : "mois"}-là, à ce jour (Buffer, tous les posts du compte).
        {since && <> Abonnés : {daily ? "relevé de chaque jour" : "dernier relevé de chaque mois"}, chaque matin depuis le {shortDate(since)} via Treg (pas d'historique avant) ; au survol, le +X depuis le relevé précédent. Clique un réseau pour le masquer.</>}
      </p>
    </section>
  );
}
