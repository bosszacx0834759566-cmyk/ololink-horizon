import { useEffect, useRef } from "react";

import earthAsset from "@/assets/earth_daymap.jpg.asset.json";
import { clock } from "@/lib/mission/clock";
import {
  ASSETS,
  ASSETS_BY_ID,
  computeLinks,
  computeStates,
  qualityColor,
  type AssetKind,
  type StateMap,
} from "@/lib/mission/assets";
import { wrapLon } from "@/lib/mission/geo";
import { useMission } from "@/lib/mission/store";

const KIND_COLOR: Record<AssetKind, string> = {
  LEO: "#7fd9ff",
  HAPS: "#7ff0c4",
  DRONE: "#c9a6ff",
  GS: "#ffd08a",
};

const MIN_Z = 1;
const MAX_Z = 48;

export default function Map2D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mission = useMission();
  const missionRef = useRef(mission);
  missionRef.current = mission;

  const view = useRef({ zoom: 1.6, cx: 10, cy: 20 }); // cy = latitude center
  const drag = useRef<{ x: number; y: number } | null>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const states = useRef<StateMap>(new Map());

  // focus handling
  useEffect(() => {
    const id = mission.selectedId;
    if (!id) return;
    const s = states.current.get(id);
    if (!s) return;
    view.current.cx = s.lon;
    view.current.cy = s.lat;
    view.current.zoom = Math.max(view.current.zoom, id.startsWith("LEO") ? 3 : 14);
  }, [mission.selectedId, mission.focusToken]);

  useEffect(() => {
    const image = new Image();
    image.src = earthAsset.url;
    image.onload = () => (img.current = image);
  }, []);

  // wheel zoom (non-passive)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const v = view.current;
      const next = Math.max(MIN_Z, Math.min(MAX_Z, v.zoom * Math.exp(-dy * 0.0018)));
      // keep the geo point under the cursor fixed
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      const degPerPxOld = 360 / (rect.width * v.zoom);
      const degPerPxNew = 360 / (rect.width * next);
      v.cx = wrapLon(v.cx + px * (degPerPxOld - degPerPxNew));
      v.cy = Math.max(-85, Math.min(85, v.cy - py * (degPerPxOld - degPerPxNew)));
      v.zoom = next;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const wrap = wrapRef.current!;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ui = missionRef.current;
      const v = view.current;
      const scale = (w * v.zoom) / 360; // px per degree
      const proj = (lat: number, lon: number) => {
        let dl = wrapLon(lon - v.cx);
        return [w / 2 + dl * scale, h / 2 - (lat - v.cy) * scale] as const;
      };

      ctx.fillStyle = "#04070d";
      ctx.fillRect(0, 0, w, h);

      if (img.current) {
        const iw = 360 * scale;
        const ih = 180 * scale;
        const [x0, y0] = proj(90, v.cx - 180);
        ctx.imageSmoothingQuality = "high";
        for (const off of [-1, 0, 1]) {
          ctx.drawImage(img.current, x0 + off * iw, y0, iw, ih);
        }
      }

      ctx.fillStyle = "rgba(4,8,16,0.35)";
      ctx.fillRect(0, 0, w, h);

      // graticule
      ctx.strokeStyle = "rgba(120,170,220,0.12)";
      ctx.lineWidth = 1;
      const step = v.zoom > 12 ? 5 : v.zoom > 4 ? 15 : 30;
      ctx.beginPath();
      for (let lat = -90; lat <= 90; lat += step) {
        const [, y] = proj(lat, v.cx);
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      for (let lon = -180; lon < 180; lon += step) {
        const [x] = proj(0, lon);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      computeStates(clock.t, states.current);

      if (ui.showLinks) {
        const links = computeLinks(states.current, clock.t);
        ctx.lineWidth = 1.2;
        for (const l of links) {
          const chain = [l.leo, l.haps, l.drone, l.gs];
          ctx.strokeStyle = qualityColor(l.quality);
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          let started = false;
          for (const id of chain) {
            const s = id ? states.current.get(id) : null;
            if (!s) {
              started = false;
              continue;
            }
            const [x, y] = proj(s.lat, s.lon);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // assets
      const labelCandidates: { id: string; x: number; y: number }[] = [];
      ctx.font = "10px ui-monospace, monospace";
      for (const def of ASSETS) {
        if (!ui.layers[def.kind]) continue;
        const s = states.current.get(def.id);
        if (!s) continue;
        const [x, y] = proj(s.lat, s.lon);
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
        const selected = ui.selectedId === def.id;
        const r = def.kind === "LEO" ? 3 : 2.4;
        ctx.fillStyle = KIND_COLOR[def.kind];
        ctx.beginPath();
        if (def.kind === "GS") {
          ctx.rect(x - r, y - r, r * 2, r * 2);
        } else if (def.kind === "LEO") {
          ctx.moveTo(x, y - r * 1.4);
          ctx.lineTo(x + r * 1.3, y);
          ctx.lineTo(x, y + r * 1.4);
          ctx.lineTo(x - r * 1.3, y);
          ctx.closePath();
        } else {
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        if (selected) {
          ctx.strokeStyle = "#5ad7ff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.stroke();
          labelCandidates.unshift({ id: def.id, x, y });
        } else if (v.zoom > 6) {
          labelCandidates.push({ id: def.id, x, y });
        }
      }

      for (const l of labelCandidates.slice(0, ui.labelDensity)) {
        ctx.fillStyle = "rgba(6,10,16,0.78)";
        const tw = ctx.measureText(l.id).width + 8;
        ctx.fillRect(l.x + 8, l.y - 14, tw, 14);
        ctx.strokeStyle = "rgba(120,170,220,0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(l.x + 8, l.y - 14, tw, 14);
        ctx.fillStyle = "#cfe3f5";
        ctx.fillText(l.id, l.x + 12, l.y - 4);
      }
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pick = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current!;
    const rect = wrap.getBoundingClientRect();
    const v = view.current;
    const scale = (rect.width * v.zoom) / 360;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let bestId: string | null = null;
    let bestD = 12;
    for (const [id, s] of states.current) {
      const def = ASSETS_BY_ID.get(id)!;
      if (!missionRef.current.layers[def.kind]) continue;
      const x = rect.width / 2 + wrapLon(s.lon - v.cx) * scale;
      const y = rect.height / 2 - (s.lat - v.cy) * scale;
      const d = Math.hypot(x - px, y - py);
      if (d < bestD) {
        bestD = d;
        bestId = id;
      }
    }
    if (bestId) mission.select(bestId, false);
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const rect = wrapRef.current!.getBoundingClientRect();
        const v = view.current;
        const degPerPx = 360 / (rect.width * v.zoom);
        v.cx = wrapLon(v.cx - (e.clientX - drag.current.x) * degPerPx);
        v.cy = Math.max(-85, Math.min(85, v.cy + (e.clientY - drag.current.y) * degPerPx));
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (d && Math.abs(d.x - e.clientX) < 3 && Math.abs(d.y - e.clientY) < 3) pick(e.clientX, e.clientY);
      }}
      onPointerLeave={() => (drag.current = null)}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
