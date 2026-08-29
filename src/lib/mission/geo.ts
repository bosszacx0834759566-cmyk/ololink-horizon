export const EARTH_RADIUS_KM = 6371;
export const DEG = Math.PI / 180;

/** Scene units: 1 unit = Earth radius. */
export function kmToUnits(km: number) {
  return km / EARTH_RADIUS_KM;
}

export function latLonToVec3(
  latDeg: number,
  lonDeg: number,
  radius: number,
  out: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const cl = Math.cos(lat);
  out[0] = radius * cl * Math.cos(lon);
  out[1] = radius * Math.sin(lat);
  out[2] = -radius * cl * Math.sin(lon);
  return out;
}

export function wrapLon(lon: number) {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  if (l === -180) l = 180;
  return l;
}

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Offset a lat/lon by distance (km) along a bearing (deg). */
export function offsetLatLon(lat: number, lon: number, km: number, bearingDeg: number) {
  const dLat = (km / 111.32) * Math.cos(bearingDeg * DEG);
  const dLon = (km / (111.32 * Math.max(0.2, Math.cos(lat * DEG)))) * Math.sin(bearingDeg * DEG);
  return { lat: Math.max(-85, Math.min(85, lat + dLat)), lon: wrapLon(lon + dLon) };
}

/** Deterministic PRNG. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sub-solar point for a given simulated epoch (ms). */
export function sunPosition(epochMs: number) {
  const d = epochMs / 86400000 - 10957.5; // days since J2000
  const g = (357.529 + 0.98560028 * d) * DEG;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
  const e = 23.439 * DEG;
  const decl = Math.asin(Math.sin(e) * Math.sin(L)) / DEG;
  const utcHours = ((epochMs / 3600000) % 24 + 24) % 24;
  const lon = wrapLon(180 - utcHours * 15);
  return { lat: decl, lon };
}
