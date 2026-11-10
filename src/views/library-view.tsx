import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { SearchField } from "@/components/arc/search-field/search-field";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/arc/tabs/tabs";
import { PlatformIcon } from "@/components/app/platform-icon";
import { PLATFORM_LABEL, STATUS_LABEL, store, type AppData, type Platform, type Reel, type Status } from "@/lib/data";
import { dayLabel, num, schedLabel, timeLabel } from "@/lib/format";
import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Props {
  data: AppData;
  selected: string | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Reel, "status" | "scheduled">>) => void;
}

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "todo", label: "À programmer" },
  { value: "programmed", label: "Programmés" },
  { value: "published", label: "Publiés" },
];

export function LibraryView({ data, selected, onSelect, onUpdate }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(() => store.get("filter2", "all"));
  const setF = (v: string) => {
    setFilter(v);
    store.set("filter2", v);
  };
  const shown = data.reels.filter(
    (r) => (filter === "all" || r.status === filter) && (!q || `${r.title} ${r.id}`.toLowerCase().includes(q.toLowerCase())),
  );
  const reel = data.reels.find((r) => r.id === selected) ?? data.reels[0];

  let lastDay = "";
  return (
    <div className="library">
      <aside className="source-list" aria-label="Bibliothèque">
        <div className="sl-tools">
          <SearchField value={q} onValueChange={setQ} placeholder="Rechercher un post" label="Rechercher un post" />
          <SegmentedControl options={FILTERS} value={filter} onValueChange={setF} label="Filtrer par statut" />
        </div>
        <nav className="sl-items">
          {shown.map((r) => {
            const day = r.created.slice(0, 10);
            const head = day !== lastDay ? <div className="sl-day">{dayLabel(r.created)}</div> : null;
            lastDay = day;
            return (
              <div key={r.id}>
                {head}
                <button type="button" className={`sl-item${reel?.id === r.id ? " on" : ""}`} aria-current={reel?.id === r.id} onClick={() => onSelect(r.id)}>
                  {r.thumbnail ? <img src={data.media(r.thumbnail)} alt="" loading="lazy" /> : <span className="cover-ph" />}
                  <span className="sl-text">
                    <span className="sl-title">{r.title}</span>
                    <span className="sl-meta">
                      <i className={`dot s-${r.status}`} />
                      {r.scheduled ? schedLabel(r.scheduled) : STATUS_LABEL[r.status]}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
          {shown.length === 0 && <p className="muted pad">Aucun post ne correspond.</p>}
        </nav>
      </aside>
      {reel ? <ReelDetail key={reel.id} reel={reel} data={data} onUpdate={onUpdate} /> : <section className="panel empty-state" style={{ margin: 24 }}><h2>Pas encore de post</h2><p>Dis à Claude : <strong>« Publie ma vidéo &lt;nom du fichier&gt; sur Instagram demain à 18 h »</strong>. Il écrit les textes, tu valides, il programme, et le post apparaît ici.</p></section>}
    </div>
  );
}

const FIELDS: Record<Platform, [string, string, number][]> = {
  instagram: [["caption", "Légende", 2200]],
  tiktok: [["title", "Titre", 90], ["caption", "Légende", 2200]],
  youtube: [["title", "Titre", 100], ["description", "Description", 5000]],
  x: [["text", "Post", 280]],
  linkedin: [["text", "Post", 3000]],
};

function ReelDetail({ reel, data, onUpdate }: { reel: Reel; data: AppData; onUpdate: Props["onUpdate"] }) {
  const saved = store.get<string>("tab2", "instagram");
  const [tab, setTab] = useState<string>(() => (data.platforms.includes(saved as Platform) ? saved : data.platforms[0]));
  const statsFor = (p: Platform) => data.stats.posts.find((s) => s.reelId === reel.id && s.platform === p);
  const cover = data.media(reel.thumbnail);
  // A long horizontal video only goes to YouTube: no empty Instagram / TikTok tabs.
  // Only the networks this post goes to (the ones with texts); a long horizontal video goes to YouTube only.
  const withText = data.platforms.filter((p) => reel[p]);
  const platforms = reel.landscape ? data.platforms.filter((p) => p === "youtube") : withText.length ? withText : data.platforms;
  const current = platforms.includes(tab as Platform) ? tab : platforms[0];

  return (
    <article className="detail">
      <header className="detail-head">
        <div>
          <h1>{reel.title}</h1>
          <div className="meta">
            <span className={`state s-${reel.status}`}>
              <i className={`dot s-${reel.status}`} />
              {reel.scheduled ? `${STATUS_LABEL[reel.status]} · ${schedLabel(reel.scheduled)}` : STATUS_LABEL[reel.status]}
            </span>
            <span>Créé le {dayLabel(reel.created)} à {timeLabel(reel.created)}</span>
            <span>{reel.duration}</span>
            <span>{reel.format}</span>
            {reel.music && <span>Musique : {reel.music}</span>}
          </div>
        </div>
      </header>

      <div className={`detail-grid${reel.landscape ? " wide" : ""}`}>
        <div className="media-col">
          {reel.video && <video className={reel.landscape ? "wide" : undefined} src={data.media(reel.video)} controls playsInline preload="metadata" poster={cover || undefined} />}
          {cover && (
            <div className="cover-row">
              <a href={cover} target="_blank" rel="noopener" className={`cover-thumb${reel.landscape ? " wide" : ""}`} aria-label="Voir la miniature en grand">
                <img src={cover} alt={`Miniature de ${reel.title}`} />
              </a>
              <div>
                <span className="label">{reel.landscape ? "Miniature YouTube" : "Miniature Instagram"}</span>
                <span className="muted">{reel.landscape ? "1280 × 720, JPG" : "1080 × 1920, JPG"}</span>
                <a className="dl" href={cover} download={`${reel.id}-miniature.jpg`}>
                  <Download size={14} /> Télécharger
                </a>
              </div>
            </div>
          )}
          <div className="file">
            <span className="label">Fichier sur ton Mac</span>
            <code>{reel.path}</code>
            <CopyButton value={reel.path} label="Copier le chemin" variant="outline" />
          </div>
        </div>

        <div className="text-col">

          <Tabs
            value={current}
            onValueChange={(v) => {
              setTab(v);
              store.set("tab2", v);
            }}
          >
            <TabsList>
              {platforms.map((p) => (
                <TabsTrigger key={p} value={p}>
                  <span className={`net c-${p}`}>
                    <PlatformIcon platform={p} size={14} />
                    {PLATFORM_LABEL[p]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            {platforms.map((p) => {
              const s = statsFor(p);
              const texts = (reel[p] ?? {}) as Record<string, string>;
              return (
                <TabsContent key={p} value={p}>
                  {s && (
                    <p className="post-stats">
                      {num(s.views)} vues · {num(s.likes)} likes
                      {s.saves !== undefined && <> · {num(s.saves)} enregistrements</>}
                      {s.avgWatchSec !== undefined && <> · vue moyenne {Math.round(s.avgWatchSec)} s</>}
                    </p>
                  )}
                  {FIELDS[p].map(([key, label, max]) => {
                    const text = texts[key] ?? "";
                    const n = [...text].length;
                    return (
                      <section key={key} className="field">
                        <header>
                          <span className="label">{label}</span>
                          <span className={`count${n > max ? " over" : ""}`}>
                            {num(n)} / {num(max)}
                          </span>
                          <CopyButton value={text} label="Copier" variant="outline" />
                        </header>
                        <p>{text}</p>
                      </section>
                    );
                  })}
                </TabsContent>
              );
            })}
          </Tabs>


          <section className="publish" aria-label="Publication">
            <span className="label">Publication</span>
            <SegmentedControl
              options={(["todo", "programmed", "published"] as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              value={reel.status}
              onValueChange={(v) => onUpdate(reel.id, { status: v as Status })}
              label="Statut"
            />
            <label className="when">
              <span>Date</span>
              <input type="datetime-local" value={reel.scheduled ?? ""} onChange={(e) => onUpdate(reel.id, { scheduled: e.target.value || undefined })} />
            </label>
          </section>

          {reel.sources.length > 0 && (
            <section className="sources">
              <span className="label">Sources</span>
              <ul>
                {reel.sources.map((s) => (
                  <li key={s.label}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener">
                        {s.label} <ExternalLink size={12} />
                      </a>
                    ) : (
                      s.label
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
