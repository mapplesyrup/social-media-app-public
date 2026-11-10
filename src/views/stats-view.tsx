import { useState } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { PlatformIcon } from "@/components/app/platform-icon";
import { ACCOUNT_LABEL, PLATFORM_LABEL, type Account, type AppData, type Platform, type PostStat, type Reel, type Week } from "@/lib/data";
import { num, pct, schedLabel, shortDate, stamp } from "@/lib/format";
import { Trends } from "@/views/trends";

interface Props {
  data: AppData;
  onOpenReel: (id: string) => void;
}

// « Instagram, TikTok et YouTube »
const listFr = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} et ${xs.at(-1)}`);

const sum = (posts: PostStat[], key: keyof PostStat) => posts.reduce((n, p) => n + (Number(p[key]) || 0), 0);

type ReelSort = "recent" | "views";
const REEL_SORTS = [
  { value: "recent", label: "Les plus récents" },
  { value: "views", label: "Les tops vues" },
];

export function StatsView({ data, onOpenReel }: Props) {
  const { reels, stats, media, platforms } = data;
  const posts = stats.posts;
  const byReel = new Map<string, PostStat[]>();
  posts.forEach((p) => byReel.set(p.reelId, [...(byReel.get(p.reelId) ?? []), p]));
  const [reelSort, setReelSort] = useState<ReelSort>("recent");
  const firstSent = (id: string) => byReel.get(id)!.map((p) => p.sentAt).sort()[0];
  const published = reels
    .filter((r) => byReel.has(r.id))
    .sort((a, b) => (reelSort === "views" ? sum(byReel.get(b.id)!, "views") - sum(byReel.get(a.id)!, "views") : firstSent(b.id).localeCompare(firstSent(a.id))));

  const maxViews = Math.max(1, ...posts.map((p) => p.views));
  const freshest = posts.map((p) => p.metricsUpdatedAt).sort().at(-1);
  const now = Date.now();
  const upcoming = reels
    .filter((r) => r.scheduled && r.status !== "published" && new Date(r.scheduled).getTime() > now)
    .sort((a, b) => a.scheduled!.localeCompare(b.scheduled!));

  const accounts = stats.accounts?.items ?? [];
  const weeks = stats.weekly?.weeks ?? [];
  const latest = (a: Account) => a.snapshots.at(-1);
  const followers = accounts.filter((a) => a.platform !== "newsletter").reduce((n, a) => n + (latest(a)?.followers ?? 0), 0);
  const newsletter = accounts.find((a) => a.platform === "newsletter");
  const subscribers = newsletter && latest(newsletter)?.followers;
  const weekViews = (w: Week) => platforms.reduce((n, p) => n + (w[p]?.views ?? 0), 0);
  const periodViews = weeks.reduce((n, w) => n + weekViews(w), 0);
  const snapDate = accounts.flatMap((a) => a.snapshots.map((x) => x.date)).sort().at(-1);

  return (
    <div className="page stats">
      <header className="page-head">
        <h1>Statistiques</h1>
        <p className="lede">
          {weeks.length > 0 && (
            <>
              Depuis le {shortDate(weeks[0].start)}, tes posts ont fait <strong>{num(periodViews)} vues</strong> sur {listFr(platforms.map((p) => ACCOUNT_LABEL[p]))}.{" "}
            </>
          )}
          Tu as <strong>{num(followers)} abonnés</strong> sur tes réseaux
          {subscribers ? <> et <strong>{num(subscribers)} inscrits</strong> à la newsletter.</> : "."}
        </p>
        <p className="source">
          Abonnés via Treg{snapDate && <> (relevé du {shortDate(snapDate)})</>} · vues et interactions via {stats.source}
          {freshest && <> (chiffres du {stamp(freshest)})</>}
        </p>
      </header>

      <div className="stats-grid">
        <section className="panel accounts" aria-labelledby="acc-title">
          <div className="panel-head">
            <h2 id="acc-title">👥 Tes comptes</h2>
            {weeks.length > 0 && <span className="muted">Vues, portée et posts : depuis le {shortDate(weeks[0].start)}</span>}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Compte</th>
                  <th scope="col" className="n">Abonnés</th>
                  <th scope="col">Évolution</th>
                  <th scope="col" className="n">Vues des posts</th>
                  <th scope="col" className="n">Portée</th>
                  <th scope="col" className="n">Posts</th>
                  <th scope="col" className="n">Interactions</th>
                  <th scope="col">Sur tout le compte</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <AccountRow key={a.platform} account={a} weeks={weeks} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="footnote">
            {accounts.some((a) => a.platform === "linkedin" || a.platform === "newsletter")
              ? stats.accounts?.note
              : "Abonnés des réseaux relevés via Treg, une fois par jour : la croissance se calcule entre deux relevés."}{" "}
            Portée : personnes uniques ayant vu tes posts
            {platforms.includes("youtube") ? " (YouTube ne la fournit pas)" : platforms.includes("x") ? " (X ne la fournit pas)" : ""}. Interactions : likes,
            commentaires, partages et enregistrements.
          </p>
        </section>

        <Trends posts={stats.timeline?.posts ?? []} accounts={accounts} platforms={platforms} />

        <section className="panel board" aria-labelledby="board-title">
          <div className="panel-head">
            <h2 id="board-title">🎬 Posts publiés depuis l'app</h2>
            <SegmentedControl label="Trier les reels" options={REEL_SORTS} value={reelSort} onValueChange={(v) => setReelSort(v as ReelSort)} />
            <span className="legend board-legend">
              {platforms.map((p) => (
                <span key={p} className={`legend-item c-${p}`}>
                  <i />
                  {PLATFORM_LABEL[p]}
                </span>
              ))}
            </span>
          </div>
          {published.map((reel) => (
            <ReelRow key={reel.id} reel={reel} platforms={platforms} posts={byReel.get(reel.id)!} maxViews={maxViews} cover={media(reel.thumbnail)} onOpen={() => onOpenReel(reel.id)} />
          ))}
          {published.length === 0 && <p className="muted pad">Aucun post publié pour l'instant.</p>}
        </section>

        <aside className="rail">
          <section className="panel" aria-labelledby="next-title">
            <div className="panel-head">
              <h2 id="next-title">🗓️ Prochaines publications</h2>
            </div>
            {upcoming.length ? (
              <ul className="next-list">
                {upcoming.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onOpenReel(r.id)}>
                      {r.thumbnail ? <img src={media(r.thumbnail)} alt="" loading="lazy" /> : <span className="cover-ph" />}
                      <span className="next-text">
                        <span className="next-when">{schedLabel(r.scheduled!)}</span>
                        <span className="next-title">{r.title}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted pad">Rien de programmé. Demande à Claude Code de publier le prochain reel.</p>
            )}
          </section>

        </aside>

        <section className="panel ledger" aria-labelledby="ledger-title">
          <div className="panel-head">
            <h2 id="ledger-title">📊 Posts de l'app, par réseau</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Réseau</th>
                  <th scope="col" className="n">Posts</th>
                  <th scope="col" className="n">Vues</th>
                  <th scope="col" className="n">Likes</th>
                  <th scope="col" className="n">Commentaires</th>
                  <th scope="col" className="n">Partages</th>
                  <th scope="col" className="n">Enregistrements</th>
                  <th scope="col" className="n">Temps de visionnage</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p) => {
                  const ps = posts.filter((x) => x.platform === p);
                  const has = (k: keyof PostStat) => ps.some((x) => x[k] !== undefined);
                  const cell = (k: keyof PostStat, f = num) => (has(k) ? f(sum(ps, k)) : "—");
                  return (
                    <tr key={p}>
                      <th scope="row">
                        <span className={`net c-${p}`}>
                          <PlatformIcon platform={p} size={15} />
                          {PLATFORM_LABEL[p]}
                        </span>
                      </th>
                      <td className="n">{ps.length}</td>
                      <td className="n strong">{cell("views")}</td>
                      <td className="n">{cell("likes")}</td>
                      <td className="n">{cell("comments")}</td>
                      <td className="n">{cell("shares")}</td>
                      <td className="n">{cell("saves")}</td>
                      <td className="n">{has("watchTimeMin") ? `${num(sum(ps, "watchTimeMin"))} min` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="footnote">
            « — » : Buffer ne fournit pas cette mesure pour ce réseau.
            {platforms.includes("youtube") && " YouTube ne remonte ni temps de visionnage ni enregistrements."}
            {platforms.includes("x") && " Sur X, les vues sont les impressions et les partages les reposts."}
          </p>
        </section>
      </div>
    </div>
  );
}

function ReelRow({ reel, platforms, posts, maxViews, cover, onOpen }: { reel: Reel; platforms: Platform[]; posts: PostStat[]; maxViews: number; cover: string; onOpen: () => void }) {
  const by = (p: Platform) => posts.find((x) => x.platform === p);
  const sentAt = posts.map((p) => p.sentAt).sort()[0];
  return (
    <div className="reel-row">
      <button type="button" className="reel-id" onClick={onOpen}>
        {cover ? <img src={cover} alt="" /> : <span className="cover-ph" />}
        <span>
          <span className="reel-title">{reel.title}</span>
          <span className="muted">Publié le {shortDate(sentAt)}</span>
        </span>
      </button>
      <div className="bars">
        {platforms.map((p) => {
          const s = by(p);
          return (
            <div key={p} className={`bar-line c-${p}`}>
              <PlatformIcon platform={p} size={13} />
              <span className="track">
                {s && <span className="fill" style={{ width: `${Math.max(1.5, (s.views / maxViews) * 100)}%` }} />}
              </span>
              <span className="val">{s ? num(s.views) : "—"}</span>
            </div>
          );
        })}
      </div>
      <div className="retention">
        <span className="ret-label">Regardé en moyenne, sur {Math.round(reel.durationSec ?? 0)} s</span>
        {platforms.map((p) => {
          const s = by(p);
          const r = s?.avgWatchSec && reel.durationSec ? s.avgWatchSec / reel.durationSec : null;
          return (
            <span key={p} className={`ret c-${p}`}>
              <PlatformIcon platform={p} size={12} />
              {r !== null ? (
                <>
                  <span>
                    <b>{Math.round(s!.avgWatchSec!)} s</b> <em>· {pct(r)} de la vidéo</em>
                  </span>
                </>
              ) : (
                <em>non fourni</em>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AccountRow({ account: a, weeks }: { account: Account; weeks: Week[] }) {
  const first = a.snapshots[0];
  const last = a.snapshots.at(-1);
  const net = a.platform === "linkedin" || a.platform === "newsletter" ? null : (a.platform as Platform);
  const lastMonth = a.monthly?.at(-1);
  const monthName = (m: string) => new Date(m + "-01").toLocaleDateString("fr-FR", { month: "short" });
  const tot = (k: "views" | "reach" | "posts") => (net ? weeks.reduce((n, w) => n + (w[net]?.[k] ?? 0), 0) : 0);
  const hasReach = net ? weeks.some((w) => w[net]?.reach !== undefined) : false;
  const inter = net ? weeks.reduce((n, w) => { const x = w[net]; return n + (x ? (x.likes ?? 0) + (x.comments ?? 0) + (x.shares ?? 0) + (x.saves ?? 0) : 0); }, 0) : 0;
  const label = (
    <span className={`net c-${a.platform}`}>
      <PlatformIcon platform={a.platform} size={15} />
      <span>
        {ACCOUNT_LABEL[a.platform]}
        {a.handle && (a.url ? <a className="handle" href={a.url} target="_blank" rel="noopener">{a.handle}</a> : <span className="handle">{a.handle}</span>)}
      </span>
    </span>
  );
  if (!last) {
    return (
      <tr className="pending">
        <th scope="row">{label}</th>
        <td colSpan={7} className="muted">Pas encore de relevé : les abonnés arrivent avec la routine du matin.</td>
      </tr>
    );
  }
  const delta = first && last !== first ? last.followers - first.followers : null;
  const lifetime = [
    last.totalViews !== undefined && `${num(last.totalViews)} vues`,
    last.likes !== undefined && `${num(last.likes)} likes`,
    last.posts !== undefined && `${num(last.posts)} ${a.platform === "instagram" || a.platform === "x" ? "posts" : "vidéos"}`,
  ].filter(Boolean).join(" · ") || (a.monthly ? "Inscrits : " + a.monthly.map((m) => `${num(m.signups)} ${monthName(m.month)}`).join(" · ") : "");
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="n big">{num(last.followers)}</td>
      <td>
        {lastMonth ? (
          <span className="delta up">
            +{num(lastMonth.signups)} en {monthName(lastMonth.month)}
            {lastMonth.partial ? " (en cours)" : ""}
          </span>
        ) : delta !== null ? (
          <span className={`delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`}>
            {delta > 0 ? "+" : ""}{num(delta)} depuis le {shortDate(first.date)}
          </span>
        ) : (
          <span className="muted">Suivi depuis le {shortDate(first.date)}</span>
        )}
      </td>
      <td className="n strong">{net ? num(tot("views")) : "—"}</td>
      <td className="n">{hasReach ? num(tot("reach")) : "—"}</td>
      <td className="n">{net ? num(tot("posts")) : "—"}</td>
      <td className="n">{net ? num(inter) : "—"}</td>
      <td className="muted lifetime">{lifetime || "—"}</td>
    </tr>
  );
}
