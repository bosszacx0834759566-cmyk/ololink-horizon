import * as THREE from "three";

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Tiny value-noise field, seamless in x. */
function makeNoise(seed: number, size: number) {
  const g = new Float32Array(size * size);
  let s = seed;
  for (let i = 0; i < g.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    g[i] = s / 4294967296;
  }
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = fade(x - xi), yf = fade(y - yi);
    const w = (a: number, b: number) => ((a % size) + size) % size;
    const i0 = w(xi), i1 = w(xi + 1), j0 = w(yi), j1 = w(yi + 1);
    const a = g[j0 * size + i0]!, b = g[j0 * size + i1]!;
    const c = g[j1 * size + i0]!, d = g[j1 * size + i1]!;
    return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf;
  };
}

/** Procedural cloud sheet (equirectangular, alpha-mapped). */
export function makeCloudTexture(width = 2048): THREE.Texture {
  const h = width / 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(width, h);
  const n1 = makeNoise(1337, 32);
  const n2 = makeNoise(7331, 64);
  const n3 = makeNoise(4242, 128);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    // banded circulation: ITCZ + mid-latitude storm tracks
    const latBand =
      0.55 * Math.exp(-(((v - 0.5) * 12) ** 2)) +
      0.5 * Math.exp(-(((v - 0.27) * 9) ** 2)) +
      0.5 * Math.exp(-(((v - 0.73) * 9) ** 2)) +
      0.35 * Math.exp(-(((v - 0.04) * 8) ** 2)) +
      0.35 * Math.exp(-(((v - 0.96) * 8) ** 2));
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const f =
        0.55 * n1(u * 32, v * 16) +
        0.3 * n2(u * 64, v * 32) +
        0.15 * n3(u * 128, v * 64);
      let a = (f * 0.9 + latBand * 0.6 - 0.62) * 3.2;
      a = Math.max(0, Math.min(1, a));
      const i = (y * width + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 235);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
