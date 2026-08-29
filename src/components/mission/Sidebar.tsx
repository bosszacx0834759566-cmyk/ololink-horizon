import {
  Satellite,
  PlaneTakeoff,
  Radar,
  RadioTower,
  Search,
  Globe2,
  Settings2,
} from "lucide-react";

import { useMission } from "@/lib/mission/store";
import type { MissionUI } from "@/lib/mission/store";

const ITEMS: { key: MissionUI["panel"]; label: string; icon: typeof Satellite }[] = [
  { key: "LEO", label: "LEO", icon: Satellite },
  { key: "HAPS", label: "HAPS", icon: PlaneTakeoff },
  { key: "DRONE", label: "Drones", icon: Radar },
  { key: "GS", label: "Ground", icon: RadioTower },
  { key: "search", label: "Search", icon: Search },
  { key: "none", label: "World", icon: Globe2 },
  { key: "settings", label: "Settings", icon: Settings2 },
];

export default function Sidebar() {
  const { panel, set } = useMission();

  return (
    <nav className="flex h-full w-[74px] shrink-0 flex-col items-center gap-1 border-r border-border bg-card/60 py-3 backdrop-blur">
      <div className="mb-3 flex flex-col items-center">
        <div className="grid size-8 place-items-center rounded-sm border border-primary/50 bg-primary/10">
          <span className="font-mono text-[11px] font-semibold text-primary">OL</span>
        </div>
      </div>
      {ITEMS.map((it) => {
        const active = panel === it.key;
        return (
          <button
            key={it.label}
            onClick={() => set({ panel: it.key })}
            className={`flex w-[58px] flex-col items-center gap-1 rounded-sm border px-1 py-2 text-[9px] font-medium uppercase tracking-[0.12em] transition-colors ${
              active
                ? "border-primary/60 bg-primary/12 text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            <it.icon className="size-[18px]" strokeWidth={1.6} />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
