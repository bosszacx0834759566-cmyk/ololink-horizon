import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

import Sidebar from "@/components/mission/Sidebar";
import SidePanel from "@/components/mission/SidePanel";
import DetailPanel from "@/components/mission/DetailPanel";
import Map2D from "@/components/mission/Map2D";
import { MissionProvider, useMission } from "@/lib/mission/store";
import { clock, epochMs, startClock } from "@/lib/mission/clock";
import { ASSETS_BY_KIND, CLUSTERS } from "@/lib/mission/assets";

const Globe3D = lazy(() => import("@/components/mission/Globe3D"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OloLink Technologies — Space-to-Earth Mission Control" },
      {
        name: "description",
        content:
          "Live mission-control view of OloLink's Space-to-Earth network: 100 LEO satellites, 50 HAPS, 50 relay drones and 50 ground stations across 50 operational clusters.",
      },
      { property: "og:title", content: "OloLink Technologies — Space-to-Earth Mission Control" },
      {
        property: "og:description",
        content:
          "Synchronized 3D globe and 2D world map tracking OloLink's LEO, HAPS, drone and ground-station network in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function TopBar() {
  const { view, set } = useMission();
  const [utc, setUtc] = useState("");
  useEffect(() => {
    const i = setInterval(() => setUtc(new Date(epochMs()).toISOString().slice(11, 19)), 250);
    return () => clearInterval(i);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 backdrop-blur">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[13px] font-semibold tracking-[0.18em] text-foreground">OLOLINK</h1>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Space-to-Earth Mission Control
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:flex">
          <span>LEO {ASSETS_BY_KIND.LEO.length}</span>
          <span>HAPS {ASSETS_BY_KIND.HAPS.length}</span>
          <span>UAV {ASSETS_BY_KIND.DRONE.length}</span>
          <span>GS {ASSETS_BY_KIND.GS.length}</span>
          <span className="text-primary">CLUSTERS {CLUSTERS.length}</span>
        </div>
        <span className="font-mono text-[11px] text-foreground/80">{utc} UTC · {clock.scale}×</span>
        <div className="flex rounded-sm border border-border p-0.5">
          {(["3d", "2d"] as const).map((v) => (
            <button
              key={v}
              onClick={() => set({ view: v })}
              className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                view === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "3d" ? "Globe" : "Map"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function Stage() {
  const { view } = useMission();
  return (
    <div className="relative flex-1 overflow-hidden bg-[#04070d]">
      {view === "3d" ? (
        <Suspense
          fallback={
            <div className="grid h-full place-items-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Initialising globe…
            </div>
          }
        >
          <Globe3D />
        </Suspense>
      ) : (
        <Map2D />
      )}
      <DetailPanel />
    </div>
  );
}

function Page() {
  useEffect(() => startClock(), []);
  return (
    <MissionProvider>
      <div className="dark flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <SidePanel />
          <Stage />
        </div>
      </div>
    </MissionProvider>
  );
}
