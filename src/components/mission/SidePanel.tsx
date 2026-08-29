import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  ASSETS,
  ASSETS_BY_ID,
  ASSETS_BY_KIND,
  CLUSTERS,
  KIND_LABEL,
  stateOf,
  type AssetKind,
} from "@/lib/mission/assets";
import { clock } from "@/lib/mission/clock";
import { useMission } from "@/lib/mission/store";

function AssetRow({ id, sub }: { id: string; sub: string }) {
  const { selectedId, select } = useMission();
  return (
    <button
      onClick={() => select(id)}
      className={`flex w-full items-center justify-between rounded-sm border px-2.5 py-1.5 text-left transition-colors ${
        selectedId === id
          ? "border-primary/60 bg-primary/12"
          : "border-transparent hover:border-border hover:bg-accent/40"
      }`}
    >
      <span className="font-mono text-[11px] tracking-wide text-foreground">{id}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{sub}</span>
    </button>
  );
}

function KindList({ kind }: { kind: AssetKind }) {
  const defs = ASSETS_BY_KIND[kind];
  return (
    <div className="flex flex-col gap-0.5">
      {defs.map((d) => {
        const s = stateOf(d, clock.t);
        return (
          <AssetRow
            key={d.id}
            id={d.id}
            sub={
              kind === "LEO"
                ? `PLANE ${String((d.orbit?.plane ?? 0) + 1).padStart(2, "0")} · ${d.orbit?.altKm} km`
                : `${s.lat.toFixed(1)}° ${s.lon.toFixed(1)}°`
            }
          />
        );
      })}
    </div>
  );
}

function SearchPanel() {
  const { select } = useMission();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return ASSETS.filter(
      (a) => a.id.toLowerCase().includes(needle) || (a.clusterId !== null && CLUSTERS[a.clusterId]!.name.toLowerCase().includes(needle)),
    ).slice(0, 60);
  }, [q]);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) select(results[0].id);
        }}
        placeholder="LEO-042, HAPS-007, Drone-013, GS-021…"
        className="w-full rounded-sm border border-border bg-input/40 px-2.5 py-2 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/60"
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {q ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Type an asset ID to focus"}
      </p>
      <div className="flex flex-col gap-0.5">
        {results.map((r) => (
          <AssetRow
            key={r.id}
            id={r.id}
            sub={r.clusterId !== null ? CLUSTERS[r.clusterId]!.name : KIND_LABEL[r.kind]}
          />
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const ui = useMission();
  const rows: [string, boolean, () => void][] = [
    ["Cloud layer", ui.showClouds, () => ui.set({ showClouds: !ui.showClouds })],
    ["Atmosphere", ui.showAtmosphere, () => ui.set({ showAtmosphere: !ui.showAtmosphere })],
    ["Link chains", ui.showLinks, () => ui.set({ showLinks: !ui.showLinks })],
    ["Orbital planes", ui.showOrbits, () => ui.set({ showOrbits: !ui.showOrbits })],
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {rows.map(([label, on, toggle]) => (
          <button
            key={label}
            onClick={toggle}
            className="flex items-center justify-between rounded-sm border border-transparent px-2 py-1.5 text-[11px] text-foreground hover:border-border hover:bg-accent/40"
          >
            {label}
            <span
              className={`h-[14px] w-[26px] rounded-full border transition-colors ${
                on ? "border-primary/70 bg-primary/40" : "border-border bg-muted"
              } relative`}
            >
              <span
                className={`absolute top-[1px] size-[10px] rounded-full transition-all ${
                  on ? "left-[13px] bg-primary" : "left-[1px] bg-muted-foreground"
                }`}
              />
            </span>
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 px-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Label density · {ui.labelDensity}
        </span>
        <input
          type="range"
          min={0}
          max={30}
          value={ui.labelDensity}
          onChange={(e) => ui.set({ labelDensity: Number(e.target.value) })}
          className="accent-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5 px-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Time scale · {clock.scale}×
        </span>
        <input
          type="range"
          min={1}
          max={200}
          defaultValue={clock.scale}
          onChange={(e) => {
            clock.scale = Number(e.target.value);
            ui.set({});
          }}
          className="accent-primary"
        />
      </label>

      <div className="flex flex-col gap-1 px-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Layers
        </span>
        {(Object.keys(ui.layers) as AssetKind[]).map((k) => (
          <button
            key={k}
            onClick={() => ui.toggleLayer(k)}
            className="flex items-center justify-between py-1 text-[11px] text-foreground"
          >
            {KIND_LABEL[k]}
            <span className={`font-mono text-[10px] ${ui.layers[k] ? "text-primary" : "text-muted-foreground"}`}>
              {ui.layers[k] ? "ON" : "OFF"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SidePanel() {
  const { panel, set } = useMission();
  if (panel === "none") return null;

  const title =
    panel === "search" ? "Asset search" : panel === "settings" ? "Settings" : KIND_LABEL[panel];
  const count = panel === "search" || panel === "settings" ? null : ASSETS_BY_KIND[panel].length;

  return (
    <aside className="flex h-full w-[286px] shrink-0 flex-col border-r border-border bg-card/70 backdrop-blur">
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div>
          <h2 className="text-[12px] font-medium tracking-wide text-foreground">{title}</h2>
          {count !== null && (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {count} assets
            </p>
          )}
        </div>
        <button
          onClick={() => set({ panel: "none" })}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-2">
        {panel === "search" ? (
          <SearchPanel />
        ) : panel === "settings" ? (
          <SettingsPanel />
        ) : (
          <KindList kind={panel} />
        )}
      </div>
    </aside>
  );
}

export function useSelectedDef() {
  const { selectedId } = useMission();
  return selectedId ? (ASSETS_BY_ID.get(selectedId) ?? null) : null;
}
