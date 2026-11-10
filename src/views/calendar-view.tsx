import { Button } from "@/components/arc/button/button";
import { STATUS_LABEL, type AppData, type Reel } from "@/lib/data";
import { timeLabel, ymd } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type DragEvent } from "react";

interface Props {
  data: AppData;
  onOpenReel: (id: string) => void;
  onReschedule: (id: string, iso: string) => void;
}

const DOW = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

export function CalendarView({ data, onOpenReel, onReschedule }: Props) {
  const today = ymd(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [over, setOver] = useState<string | null>(null);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - ((first.getDay() + 6) % 7));

  const byDay = new Map<string, Reel[]>();
  data.reels.forEach((r) => r.scheduled && byDay.set(r.scheduled.slice(0, 10), [...(byDay.get(r.scheduled.slice(0, 10)) ?? []), r]));
  byDay.forEach((list) => list.sort((a, b) => a.scheduled!.localeCompare(b.scheduled!)));

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (i >= 35 && d.getMonth() !== m - 1) break;
    days.push(d);
  }
  const inMonth = [...byDay.entries()].filter(([k]) => k.startsWith(month)).reduce((n, [, l]) => n + l.length, 0);
  const unplanned = data.reels.filter((r) => !r.scheduled);
  const shift = (n: number) => setMonth(ymd(new Date(y, m - 1 + n, 1)).slice(0, 7));

  const drop = (day: string) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const reel = data.reels.find((r) => r.id === id);
    if (reel) onReschedule(id, `${day}T${reel.scheduled ? reel.scheduled.slice(11, 16) : "12:00"}`);
  };

  const chip = (r: Reel, withTime = true) => (
    <button
      key={r.id}
      type="button"
      className={`ev s-${r.status}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
      onClick={() => onOpenReel(r.id)}
      title={`${r.title} · ${STATUS_LABEL[r.status]}`}
    >
      {withTime && r.scheduled && <b>{timeLabel(r.scheduled)}</b>}
      <span>{r.title}</span>
    </button>
  );

  return (
    <div className="page calendar">
      <header className="page-head row">
        <div>
          <h1 className="month-title">{first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h1>
          <p className="source">
            {inMonth ? `${inMonth} publication${inMonth > 1 ? "s" : ""} ce mois-ci` : "Aucune publication ce mois-ci"}
            <span className="drag-hint"> · glisse un post sur un jour pour le replanifier</span>
          </p>
        </div>
        <div className="cal-nav">
          <Button variant="ghost" size="sm" aria-label="Mois précédent" onClick={() => shift(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(today.slice(0, 7))}>
            Aujourd'hui
          </Button>
          <Button variant="ghost" size="sm" aria-label="Mois suivant" onClick={() => shift(1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </header>

      <div className="month" role="grid">
        {DOW.map((d) => (
          <div key={d} className="dow" role="columnheader">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const k = ymd(d);
          const list = byDay.get(k) ?? [];
          const cls = ["cell", d.getMonth() !== m - 1 && "out", k === today && "today", !list.length && "empty", over === k && "drop"].filter(Boolean).join(" ");
          return (
            <div
              key={k}
              className={cls}
              role="gridcell"
              onDragOver={(e) => {
                e.preventDefault();
                setOver(k);
              }}
              onDragLeave={() => setOver((o) => (o === k ? null : o))}
              onDrop={drop(k)}
            >
              <span className="num" data-dow={d.toLocaleDateString("fr-FR", { weekday: "long" })}>
                {d.getDate()}
              </span>
              {list.map((r) => chip(r))}
            </div>
          );
        })}
      </div>

      <div className="cal-foot">
        <span className="legend">
          <span className="legend-item s-todo"><i />À programmer</span>
          <span className="legend-item s-programmed"><i />Programmée</span>
          <span className="legend-item s-published"><i />Publiée</span>
        </span>
        {unplanned.length > 0 && (
          <div className="tray">
            <span className="muted">Sans date :</span>
            {unplanned.map((r) => chip(r, false))}
          </div>
        )}
      </div>
    </div>
  );
}
