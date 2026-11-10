import type { Theme } from "@/components/arc/theme-switch/theme-switch";
import { MagneticDock } from "@/components/ui/magnetic-dock";
import { DEFAULT_WS, WORKSPACES, scopeData, store, useAppData, type Workspace } from "@/lib/data";
import { CalendarView } from "@/views/calendar-view";
import { LibraryView } from "@/views/library-view";
import { StatsView } from "@/views/stats-view";
import { TemplatesView } from "@/views/templates-view";
import { BarChart3, CalendarDays, Check, ChevronDown, Clapperboard, LayoutTemplate, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Header menu that switches the brand: every view then shows only that brand's networks and posts.
function WorkspaceMenu({ value, onChange }: { value: Workspace; onChange: (w: Workspace) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const current = WORKSPACES.find((w) => w.id === value) ?? WORKSPACES[0];
  if (WORKSPACES.length < 2) return <div className="ws"><span className="ws-btn">{current.label}</span></div>;
  return (
    <div className="ws" ref={box}>
      <button type="button" className="ws-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {current.label}
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div className="ws-menu" role="menu" aria-label="Marque">
          {WORKSPACES.map((w) => (
            <button key={w.id} type="button" role="menuitemradio" aria-checked={w.id === value} onClick={() => { onChange(w.id); setOpen(false); }}>
              <Check size={14} strokeWidth={2.2} aria-hidden="true" style={{ visibility: w.id === value ? "visible" : "hidden" }} />
              {w.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type View = "stats" | "calendar" | "library" | "templates";
const TITLES: Record<View, string> = { stats: "Statistiques", calendar: "Calendrier", library: "Bibliothèque", templates: "Templates" };

const hashView = (): View | null => {
  const h = location.hash.slice(1);
  return h in TITLES ? (h as View) : null;
};

const systemTheme = (): Theme => (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

export default function App() {
  const { data: all, error, update } = useAppData();
  const [picked, setWorkspace] = useState<Workspace>(() => store.get<Workspace>("workspace", ""));
  // The brands come with the data (config.json): fall back to the first one when none is picked yet.
  const workspace = all && WORKSPACES.some((x) => x.id === picked) ? picked : DEFAULT_WS();
  const data = all && scopeData(all, workspace);
  const pickWorkspace = (w: Workspace) => {
    setWorkspace(w);
    store.set("workspace", w);
  };
  const [view, setView] = useState<View>(() => hashView() ?? store.get<View>("view2", "stats"));
  const [selected, setSelected] = useState<string | null>(() => store.get<string | null>("current", null));
  const [theme, setTheme] = useState<Theme>(() => store.get<Theme | null>("theme", null) ?? systemTheme());

  useEffect(() => applyTheme(theme), [theme]);
  // ⌘1 to ⌘4 switch views like a Mac app's View menu; ⌘F jumps to the library search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const target = ({ "1": "stats", "2": "calendar", "3": "library", "4": "templates" } as Record<string, View>)[e.key];
      if (target) {
        e.preventDefault();
        go(target);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        go("library");
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>(".sl-tools input")?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Back and forward buttons move between views.
  useEffect(() => {
    const onHash = () => {
      const v = hashView();
      if (v) setView(v);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  // Follow the system appearance until the user picks one in the app.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => store.get<Theme | null>("theme", null) === null && setTheme(systemTheme());
    mq?.addEventListener("change", onChange);
    return () => mq?.removeEventListener("change", onChange);
  }, []);

  const go = (v: View) => {
    setView(v);
    store.set("view2", v);
    if (location.hash !== "#" + v) history.pushState(null, "", "#" + v);
    document.querySelector(".content")?.scrollTo({ top: 0 });
  };
  const openReel = (id: string) => {
    setSelected(id);
    store.set("current", id);
    go("library");
  };
  const changeTheme = (next: Theme) => {
    store.set("theme", next);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => applyTheme(next));
    setTheme(next);
  };

  const dockItems = [
    { id: "stats", label: "Statistiques  ⌘1", icon: <BarChart3 strokeWidth={1.75} />, view: "stats" as View },
    { id: "calendar", label: "Calendrier  ⌘2", icon: <CalendarDays strokeWidth={1.75} />, view: "calendar" as View },
    { id: "library", label: "Bibliothèque  ⌘3", icon: <Clapperboard strokeWidth={1.75} />, view: "library" as View },
    { id: "templates", label: "Templates  ⌘4", icon: <LayoutTemplate strokeWidth={1.75} />, view: "templates" as View },
  ]
    .map(({ view: v, ...it }) => ({ ...it, isActive: view === v, onClick: () => go(v) }))
    .concat({
      id: "theme",
      label: theme === "light" ? "Mode sombre" : "Mode clair",
      icon: theme === "light" ? <Moon strokeWidth={1.75} /> : <Sun strokeWidth={1.75} />,
      isActive: false,
      onClick: () => changeTheme(theme === "light" ? "dark" : "light"),
    });

  return (
    <div className="window">
      <header className="toolbar">
        <div className="app-name">
          <svg className="app-mark" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <rect width="20" height="20" rx="5.5" fill="var(--brand)" />
            <rect x="4.5" y="5.5" width="11" height="10" rx="2" fill="none" stroke="var(--on-brand)" strokeWidth="1.4" />
            <path d="M4.5 8.6h11" stroke="var(--on-brand)" strokeWidth="1.4" />
            <path d="M8.9 10.4v3.2l2.8-1.6z" fill="var(--on-brand)" />
          </svg>
          Social media app
          {view !== "stats" && <span className="toolbar-title">{TITLES[view]}</span>}
        </div>
        {all && <WorkspaceMenu value={workspace} onChange={pickWorkspace} />}
      </header>

      <main className={`content view-${view}`}>
        {error && <p className="error pad">{error}</p>}
        {!data && !error && <div className="loading" aria-busy="true" />}
        {data && view === "stats" && <StatsView data={data} onOpenReel={openReel} />}
        {data && view === "calendar" && <CalendarView data={data} onOpenReel={openReel} onReschedule={(id, iso) => update(id, { scheduled: iso })} />}
        {data && view === "templates" && <TemplatesView workspace={workspace} media={data.media} />}
        {data && view === "library" && (
          <LibraryView
            data={data}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              store.set("current", id);
            }}
            onUpdate={update}
          />
        )}
      </main>

      <nav className="dock" aria-label="Navigation">
        <MagneticDock items={dockItems} iconSize={44} maxScale={1.45} magneticDistance={120} variant="glass" />
      </nav>
    </div>
  );
}
