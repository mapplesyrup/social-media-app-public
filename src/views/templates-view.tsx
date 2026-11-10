// Templates of the selected brand: the model video next to its guidelines, written by Claude Code when you say
// « Enregistre ce reel comme template », and followed when you ask « Fais-moi un script avec le template A ».
import { useEffect, useState } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { WORKSPACES, store, type Workspace } from "@/lib/data";

interface Template {
  id: string;
  workspace: Workspace;
  letter: string;
  name: string;
  use: string;
  source?: { url: string; creator: string; date?: string; stats?: string };
  video: string;
  /** « horizontal » for 16:9 YouTube formats; vertical (9:16 reels) by default. */
  format?: "vertical" | "horizontal";
  palette?: { hex: string; label: string }[];
  sections: { title: string; items: string[] }[];
}

export function TemplatesView({ workspace, media }: { workspace: Workspace; media: (p?: string) => string }) {
  const [all, setAll] = useState<Template[] | null>(null);
  const [error] = useState(false);
  const [current, setCurrent] = useState<string>(() => store.get<string>("template", ""));

  useEffect(() => {
    fetch("data/templates.json", { cache: "no-cache" })
      .then((r) => r.json())
      .then((d: { items: Template[] }) => setAll(d.items))
      .catch(() => setAll([]));
  }, []);

  const list = (all ?? []).filter((t) => t.workspace === workspace);
  const t = list.find((x) => x.id === current) ?? list[0];
  const wsLabel = (WORKSPACES.find((w) => w.id === workspace) ?? WORKSPACES[0])?.label ?? "";
  const pick = (id: string) => {
    setCurrent(id);
    store.set("template", id);
  };

  return (
    <div className="page templates">
      <header className="page-head">
        <h1>Templates</h1>
        <p className="lede">
          Les formats de montage de <strong>{wsLabel}</strong>. Chaque fiche dit quand utiliser le template et comment le reproduire.
        </p>
      </header>
      {error && <p className="error pad">Impossible de lire templates.json.</p>}
      {!list.length && !error && (
        <section className="panel empty-state">
          <h2>Pas encore de template</h2>
          <p>Un reel a bien marché ? Dis à Claude : <strong>« Enregistre ce reel comme template »</strong>. Il note sa structure (accroche, rythme, style) pour t'aider à en refaire un du même type.</p>
        </section>
      )}
      {t && (
        <>
          {list.length > 1 && (
            <SegmentedControl label="Template" options={list.map((x) => ({ value: x.id, label: `${x.letter} · ${x.name}` }))} value={t.id} onValueChange={pick} className="tpl-switch" />
          )}
          <div className={`tpl${t.format === "horizontal" ? " landscape" : ""}`} key={t.id}>
            <aside className="tpl-media">
              <video src={media(t.video) + "#t=0.5"} controls playsInline preload="metadata" />
              {t.source && (
                <a className="tpl-src" href={t.source.url} target="_blank" rel="noopener">
                  {t.source.creator}
                  <span>{[t.source.date, t.source.stats].filter(Boolean).join(" · ")}</span>
                </a>
              )}
            </aside>
            <div className="tpl-notes">
              <section className="panel tpl-use">
                <span className="tpl-letter">{t.letter}</span>
                <div>
                  <h2>{t.name}</h2>
                  <p>{t.use}</p>
                </div>
              </section>
              {!!t.palette?.length && (
              <section className="panel tpl-palette" aria-label="Palette">
                {t.palette!.map((c) => (
                  <span key={c.hex} className="tpl-swatch">
                    <i style={{ background: c.hex }} />
                    <b>{c.hex}</b>
                    <em>{c.label}</em>
                  </span>
                ))}
              </section>
              )}
              <div className="tpl-grid">
                {t.sections.map((s) => (
                  <section key={s.title} className="panel tpl-sec">
                    <h3>{s.title}</h3>
                    <ul>
                      {s.items.map((it) => <li key={it}>{it}</li>)}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
