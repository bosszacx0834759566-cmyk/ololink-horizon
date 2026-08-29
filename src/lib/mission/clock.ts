/** Shared simulation clock: both the 3D and 2D views read the same time. */
export const BASE_EPOCH_MS = Date.UTC(2026, 7, 29, 12, 0, 0);

export const clock = {
  /** Simulated seconds since epoch. */
  t: 0,
  scale: 1,
  running: true,
};

export function epochMs() {
  return BASE_EPOCH_MS + clock.t * 1000;
}

let started = false;
export function startClock() {
  if (started || typeof window === "undefined") return;
  started = true;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (clock.running) clock.t += dt * clock.scale;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
