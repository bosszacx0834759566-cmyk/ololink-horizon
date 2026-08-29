import {
  DEG,
  EARTH_RADIUS_KM,
  haversineKm,
  mulberry32,
  offsetLatLon,
  wrapLon,
} from "./geo";

export type AssetKind = "LEO" | "HAPS" | "DRONE" | "GS";

export interface AssetDef {
  id: string;
  kind: AssetKind;
  index: number;
  clusterId: number | null;
  /** LEO orbital elements */
  orbit?: { inc: number; raan: number; u0: number; altKm: number; period: number; plane: number };
  /** Atmospheric / surface assets */
  home?: { lat: number; lon: number; altKm: number; loiterKm: number; loiterPeriod: number; phase: number };
}

export interface AssetState {
  lat: number;
  lon: number;
  altKm: number;
  /** unit heading in degrees (0 = north) */
  heading: number;
}

export interface Cluster {
  id: number;
  name: string;
  gs: string;
  drone: string;
  haps: string;
  /** currently serving satellite */
  leo: string | null;
  weather: number; // 0 clear .. 1 heavy
}

/** 50 real-world regional anchors for the operational clusters. */
const ANCHORS: [string, number, number][] = [
  ["Reykjavik", 64.14, -21.94], ["Oslo", 59.91, 10.75], ["Edinburgh", 55.95, -3.19],
  ["Madrid", 40.42, -3.7], ["Rome", 41.9, 12.5], ["Warsaw", 52.23, 21.01],
  ["Kyiv", 50.45, 30.52], ["Istanbul", 41.01, 28.98], ["Cairo", 30.04, 31.24],
  ["Nairobi", -1.29, 36.82], ["Lagos", 6.52, 3.38], ["Dakar", 14.72, -17.47],
  ["Kinshasa", -4.44, 15.27], ["Johannesburg", -26.2, 28.05], ["Antananarivo", -18.88, 47.51],
  ["Riyadh", 24.71, 46.68], ["Tehran", 35.69, 51.39], ["Karachi", 24.86, 67.01],
  ["Delhi", 28.61, 77.21], ["Chennai", 13.08, 80.27], ["Dhaka", 23.81, 90.41],
  ["Bangkok", 13.76, 100.5], ["Singapore", 1.35, 103.82], ["Jakarta", -6.21, 106.85],
  ["Manila", 14.6, 120.98], ["Hanoi", 21.03, 105.85], ["Hong Kong", 22.32, 114.17],
  ["Shanghai", 31.23, 121.47], ["Beijing", 39.9, 116.41], ["Seoul", 37.57, 126.98],
  ["Tokyo", 35.68, 139.69], ["Sapporo", 43.06, 141.35], ["Vladivostok", 43.12, 131.89],
  ["Novosibirsk", 55.01, 82.93], ["Almaty", 43.24, 76.89], ["Perth", -31.95, 115.86],
  ["Darwin", -12.46, 130.84], ["Sydney", -33.87, 151.21], ["Auckland", -36.85, 174.76],
  ["Port Moresby", -9.44, 147.18], ["Honolulu", 21.31, -157.86], ["Anchorage", 61.22, -149.9],
  ["Vancouver", 49.28, -123.12], ["San Francisco", 37.77, -122.42], ["Denver", 39.74, -104.99],
  ["Houston", 29.76, -95.37], ["Toronto", 43.65, -79.38], ["Mexico City", 19.43, -99.13],
  ["Bogota", 4.71, -74.07], ["Sao Paulo", -23.55, -46.63],
];

function pad(n: number, w = 3) {
  return String(n).padStart(w, "0");
}

const rnd = mulberry32(20260829);

export const LEO_PLANES = 10;
const LEO_PER_PLANE = 10;

export const ASSETS: AssetDef[] = [];

// ---- 100 LEO satellites across 10 orbital planes -------------------------
for (let p = 0; p < LEO_PLANES; p++) {
  const inc = 53 + (p % 3) * 12; // 53 / 65 / 77 deg
  const raan = (360 / LEO_PLANES) * p;
  const altKm = 540 + (p % 4) * 25;
  const period = 2 * Math.PI * Math.sqrt(((EARTH_RADIUS_KM + altKm) * 1000) ** 3 / 3.986e14);
  for (let s = 0; s < LEO_PER_PLANE; s++) {
    const i = p * LEO_PER_PLANE + s + 1;
    ASSETS.push({
      id: `LEO-${pad(i)}`,
      kind: "LEO",
      index: i - 1,
      clusterId: null,
      orbit: { inc, raan, u0: (360 / LEO_PER_PLANE) * s + p * 8, altKm, period, plane: p },
    });
  }
}

// ---- Clusters: HAPS / Drone / Ground station -----------------------------
export const CLUSTERS: Cluster[] = [];

for (let c = 0; c < 50; c++) {
  const [name, lat, lon] = ANCHORS[c];
  const gsId = `GS-${pad(c + 1)}`;
  const droneId = `Drone-${pad(c + 1)}`;
  const hapsId = `HAPS-${pad(c + 1)}`;

  const gsLat = lat + (rnd() - 0.5) * 0.6;
  const gsLon = wrapLon(lon + (rnd() - 0.5) * 0.6);

  const bearing = rnd() * 360;
  const dronePos = offsetLatLon(gsLat, gsLon, 10 + rnd() * 5, bearing); // 10–15 km
  const hapsPos = offsetLatLon(gsLat, gsLon, 22 + rnd() * 14, bearing + 40 + rnd() * 40);

  ASSETS.push({
    id: gsId,
    kind: "GS",
    index: c,
    clusterId: c,
    home: { lat: gsLat, lon: gsLon, altKm: 0.05, loiterKm: 0, loiterPeriod: 1, phase: 0 },
  });
  ASSETS.push({
    id: droneId,
    kind: "DRONE",
    index: c,
    clusterId: c,
    home: {
      lat: dronePos.lat,
      lon: dronePos.lon,
      altKm: 3.8 + rnd() * 0.8,
      loiterKm: 2.5 + rnd() * 1.5,
      loiterPeriod: 210 + rnd() * 90,
      phase: rnd() * Math.PI * 2,
    },
  });
  ASSETS.push({
    id: hapsId,
    kind: "HAPS",
    index: c,
    clusterId: c,
    home: {
      lat: hapsPos.lat,
      lon: hapsPos.lon,
      altKm: 18 + rnd() * 2,
      loiterKm: 9 + rnd() * 5,
      loiterPeriod: 1100 + rnd() * 400,
      phase: rnd() * Math.PI * 2,
    },
  });

  CLUSTERS.push({
    id: c,
    name,
    gs: gsId,
    drone: droneId,
    haps: hapsId,
    leo: null,
    weather: rnd(),
  });
}

export const ASSETS_BY_ID = new Map(ASSETS.map((a) => [a.id, a]));
export const ASSETS_BY_KIND: Record<AssetKind, AssetDef[]> = {
  LEO: ASSETS.filter((a) => a.kind === "LEO"),
  HAPS: ASSETS.filter((a) => a.kind === "HAPS"),
  DRONE: ASSETS.filter((a) => a.kind === "DRONE"),
  GS: ASSETS.filter((a) => a.kind === "GS"),
};

export const KIND_LABEL: Record<AssetKind, string> = {
  LEO: "LEO Satellites",
  HAPS: "HAPS Platforms",
  DRONE: "Relay Drones",
  GS: "Ground Stations",
};

// ---- Propagation ---------------------------------------------------------
const EARTH_ROT_DEG_PER_S = 360 / 86164.1;

function leoState(o: NonNullable<AssetDef["orbit"]>, t: number): AssetState {
  const u = (o.u0 * DEG + (2 * Math.PI * t) / o.period) % (Math.PI * 2);
  const inc = o.inc * DEG;
  const lat = Math.asin(Math.sin(inc) * Math.sin(u)) / DEG;
  const lonEci = o.raan + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) / DEG;
  const lon = wrapLon(lonEci - t * EARTH_ROT_DEG_PER_S);
  // heading from the inclination geometry
  const heading =
    Math.atan2(Math.cos(inc), Math.sin(inc) * Math.cos(u)) / DEG;
  return { lat, lon, altKm: o.altKm, heading };
}

function loiterState(h: NonNullable<AssetDef["home"]>, t: number): AssetState {
  if (h.loiterKm === 0) return { lat: h.lat, lon: h.lon, altKm: h.altKm, heading: 0 };
  const a = h.phase + (2 * Math.PI * t) / h.loiterPeriod;
  const p = offsetLatLon(h.lat, h.lon, h.loiterKm, (a / DEG) % 360);
  return { lat: p.lat, lon: p.lon, altKm: h.altKm, heading: wrapLon(a / DEG + 90) };
}

export function stateOf(def: AssetDef, t: number): AssetState {
  return def.orbit ? leoState(def.orbit, t) : loiterState(def.home!, t);
}

export type StateMap = Map<string, AssetState>;

export function computeStates(t: number, out: StateMap = new Map()): StateMap {
  for (const a of ASSETS) {
    const s = stateOf(a, t);
    const prev = out.get(a.id);
    if (prev) {
      prev.lat = s.lat;
      prev.lon = s.lon;
      prev.altKm = s.altKm;
      prev.heading = s.heading;
    } else out.set(a.id, s);
  }
  return out;
}

export interface LinkSet {
  clusterId: number;
  leo: string | null;
  haps: string;
  drone: string;
  gs: string;
  quality: number; // 0..1
  latencyMs: number;
  throughputMbps: number;
}

/** Pick the best visible satellite per cluster and score the chain. */
export function computeLinks(states: StateMap, t: number): LinkSet[] {
  const leos = ASSETS_BY_KIND.LEO;
  const out: LinkSet[] = [];
  for (const c of CLUSTERS) {
    const h = states.get(c.haps)!;
    let best: string | null = null;
    let bestD = Infinity;
    for (const l of leos) {
      const s = states.get(l.id)!;
      if (Math.abs(s.lat - h.lat) > 22) continue;
      const dLon = Math.abs(wrapLon(s.lon - h.lon));
      if (dLon > 22) continue;
      const d = haversineKm(s, h);
      if (d < bestD) {
        bestD = d;
        best = l.id;
      }
    }
    c.leo = best;
    const wx = 0.5 + 0.5 * Math.sin(t / 900 + c.id * 1.7) * c.weather;
    const slant = best ? Math.sqrt(bestD ** 2 + 540 ** 2) : 0;
    const geo = best ? Math.max(0, 1 - bestD / 2400) : 0;
    const quality = best ? Math.max(0.05, Math.min(1, geo * (1 - 0.45 * wx))) : 0;
    out.push({
      clusterId: c.id,
      leo: best,
      haps: c.haps,
      drone: c.drone,
      gs: c.gs,
      quality,
      latencyMs: best ? 4 + slant / 200 : 0,
      throughputMbps: best ? Math.round(120 + quality * 880) : 0,
    });
  }
  return out;
}

export function qualityColor(q: number) {
  if (q <= 0) return "#5b6270";
  if (q > 0.66) return "#3ce7b4";
  if (q > 0.33) return "#f5c451";
  return "#ff6b5e";
}
