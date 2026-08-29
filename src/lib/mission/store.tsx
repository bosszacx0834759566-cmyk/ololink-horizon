import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AssetKind } from "./assets";

export type ViewMode = "3d" | "2d";

export interface MissionUI {
  view: ViewMode;
  layers: Record<AssetKind, boolean>;
  showLinks: boolean;
  showClouds: boolean;
  showAtmosphere: boolean;
  showOrbits: boolean;
  labelDensity: number; // max labels shown
  selectedId: string | null;
  focusToken: number;
  panel: "none" | "LEO" | "HAPS" | "DRONE" | "GS" | "search" | "settings";
}

interface Ctx extends MissionUI {
  set: (patch: Partial<MissionUI>) => void;
  select: (id: string | null, focus?: boolean) => void;
  toggleLayer: (k: AssetKind) => void;
}

const MissionContext = createContext<Ctx | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [ui, setUi] = useState<MissionUI>({
    view: "3d",
    layers: { LEO: true, HAPS: true, DRONE: true, GS: true },
    showLinks: true,
    showClouds: true,
    showAtmosphere: true,
    showOrbits: false,
    labelDensity: 10,
    selectedId: null,
    focusToken: 0,
    panel: "none",
  });

  const value = useMemo<Ctx>(
    () => ({
      ...ui,
      set: (patch) => setUi((p) => ({ ...p, ...patch })),
      select: (id, focus = true) =>
        setUi((p) => ({ ...p, selectedId: id, focusToken: focus ? p.focusToken + 1 : p.focusToken })),
      toggleLayer: (k) => setUi((p) => ({ ...p, layers: { ...p.layers, [k]: !p.layers[k] } })),
    }),
    [ui],
  );

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
}

export function useMission() {
  const c = useContext(MissionContext);
  if (!c) throw new Error("useMission must be used inside MissionProvider");
  return c;
}
