import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  ASSETS_BY_ID,
  CLUSTERS,
  computeLinks,
  computeStates,
  qualityColor,
  type StateMap,
} from "@/lib/mission/assets";
import { clock } from "@/lib/mission/clock";
import { useMission } from "@/lib/mission/store";

const cache: StateMap = new Map();

export default function DetailPanel() {
  const { selectedId, select } = useMission();
  const [, tick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(i);
  }, []);

  if (!selectedId) return null;
  const def = ASSETS_BY_ID.get(selectedId);
  if (!def) return null;

  computeStates(clock.t, cache);
  const s = cache.get(selectedId)!;
  const cluster = def.clusterId !== null ? CLUSTERS[def.clusterId]! : null;
  const link = cluster ? computeLinks(cache, clock.t)[cluster.id]! : null;

  const rows: [string, string][] = [
    ["Class", def.kind === "GS" ? "Ground terminal" : def.kind],
    ["Latitude", `${s.lat.toFixed(3)}°`],
    ["Longitude", `${s.lon.toFixed(3)}°`],
    ["Altitude", def.kind === "GS" ? "surface" : `${s.altKm.toFixed(def.kind === "LEO" ? 0 : 2)} km`],
    ["Heading", `${((s.heading + 360) % 360).toFixed(0)}°`],
  ];
  if (def.orbit) {
    rows.push(["Plane", `P${String(def.orbit.plane + 1).padStart(2, "0")}`]);
    rows.push(["Inclination", `${def.orbit.inc.toFixed(0)}°`]);
    rows.push(["Period", `${(def.orbit.period / 60).toFixed(1)} min`]);
  }
  if (cluster) rows.push(["Cluster", `C-${String(cluster.id + 1).padStart(2, "0")} ${cluster.name}`]);

  return (
    <div className="pointer-events-auto absolute right-3 top-3 w-[268px] rounded-sm border border-border bg-card/85 backdrop-blur">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[12px] tracking-wider text-primary">{def.id}</span>
        <button onClick={() => select(null, false)} className="text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </header>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
            <dd className="text-right font-mono text-[11px] text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      {link && (
        <div className="border-t border-border px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Link chain
            </span>
            <span className="font-mono text-[10px]" style={{ color: qualityColor(link.quality) }}>
              {(link.quality * 100).toFixed(0)}%
            </span>
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-foreground/80">
            {link.leo ?? "no-sat"} → {link.haps} → {link.drone} → {link.gs}
          </p>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>{link.latencyMs.toFixed(1)} ms</span>
            <span>{link.throughputMbps} Mbps</span>
          </div>
        </div>
      )}
    </div>
  );
}
