import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import earthAsset from "@/assets/earth_daymap.jpg.asset.json";
import { clock, epochMs } from "@/lib/mission/clock";
import {
  ASSETS_BY_ID,
  ASSETS_BY_KIND,
  CLUSTERS,
  computeLinks,
  computeStates,
  qualityColor,
  type AssetKind,
  type StateMap,
} from "@/lib/mission/assets";
import { DEG, EARTH_RADIUS_KM, latLonToVec3, sunPosition } from "@/lib/mission/geo";
import { makeCloudTexture } from "@/lib/mission/textures";
import { useMission } from "@/lib/mission/store";

/** Altitude exaggeration so 20 km platforms remain visible at globe scale. */
const ALT_EXAG: Record<AssetKind, number> = { LEO: 1, HAPS: 9, DRONE: 9, GS: 1 };
const KIND_COLOR: Record<AssetKind, string> = {
  LEO: "#7fd9ff",
  HAPS: "#7ff0c4",
  DRONE: "#c9a6ff",
  GS: "#ffd08a",
};

function radiusOf(altKm: number, kind: AssetKind) {
  return 1 + (altKm * ALT_EXAG[kind]) / EARTH_RADIUS_KM;
}

const shared = {
  states: new Map() as StateMap,
  pos: new Map<string, THREE.Vector3>(),
};

function useSharedFrame() {
  useFrame(() => {
    computeStates(clock.t, shared.states);
    for (const [id, s] of shared.states) {
      let v = shared.pos.get(id);
      if (!v) {
        v = new THREE.Vector3();
        shared.pos.set(id, v);
      }
      const def = ASSETS_BY_ID.get(id)!;
      const p = latLonToVec3(s.lat, s.lon, radiusOf(s.altKm, def.kind));
      v.set(p[0], p[1], p[2]);
    }
  }, -1);
}

// ---------------------------------------------------------------- Earth ----
function Earth() {
  const { showClouds, showAtmosphere } = useMission();
  const dayMap = useLoader(THREE.TextureLoader, earthAsset.url);
  const clouds = useMemo(() => makeCloudTexture(), []);
  const cloudRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;
  }, [dayMap]);

  useFrame(() => {
    const s = sunPosition(epochMs());
    const p = latLonToVec3(s.lat, s.lon, 8);
    lightRef.current?.position.set(p[0], p[1], p[2]);
    if (cloudRef.current) cloudRef.current.rotation.y = clock.t * 4e-6;
  });

  return (
    <group>
      <directionalLight ref={lightRef} intensity={2.6} color="#fff6e8" />
      <ambientLight intensity={0.34} color="#6d8bbd" />
      <mesh>
        <sphereGeometry args={[1, 96, 64]} />
        <meshStandardMaterial map={dayMap} roughness={0.92} metalness={0.02} />
      </mesh>
      {showClouds && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[1.006, 72, 48]} />
          <meshStandardMaterial
            map={clouds}
            transparent
            opacity={0.5}
            depthWrite={false}
            roughness={1}
          />
        </mesh>
      )}
      {showAtmosphere && (
        <mesh scale={1.022}>
          <sphereGeometry args={[1, 64, 48]} />
          <shaderMaterial
            transparent
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            uniforms={{ uColor: { value: new THREE.Color("#4aa8ff") } }}
            vertexShader={`varying vec3 vN; varying vec3 vP;
              void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`}
            fragmentShader={`uniform vec3 uColor; varying vec3 vN; varying vec3 vP;
              void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 3.0);
              gl_FragColor = vec4(uColor, f * 0.55); }`}
          />
        </mesh>
      )}
    </group>
  );
}

// ----------------------------------------------------------------- Fleet ---
interface Part {
  geometry: THREE.BufferGeometry;
  color: string;
  emissive?: string;
  offset: [number, number, number];
  rotation?: [number, number, number];
  metalness?: number;
  roughness?: number;
}

function buildParts(kind: AssetKind): Part[] {
  const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
  const cyl = (r: number, h: number, seg = 8) => new THREE.CylinderGeometry(r, r, h, seg);
  const col = KIND_COLOR[kind];
  if (kind === "LEO") {
    return [
      { geometry: box(0.006, 0.005, 0.009), color: "#d8e3f0", emissive: col, offset: [0, 0, 0], metalness: 0.7, roughness: 0.35 },
      { geometry: box(0.016, 0.0008, 0.007), color: "#1b3f6b", emissive: "#0d2a4d", offset: [0.012, 0, 0] },
      { geometry: box(0.016, 0.0008, 0.007), color: "#1b3f6b", emissive: "#0d2a4d", offset: [-0.012, 0, 0] },
      { geometry: new THREE.ConeGeometry(0.0032, 0.005, 10), color: "#9fb4c8", emissive: col, offset: [0, -0.0048, 0], rotation: [Math.PI, 0, 0] },
    ];
  }
  if (kind === "HAPS") {
    return [
      { geometry: cyl(0.0011, 0.014, 8), color: "#e6eef7", emissive: col, offset: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
      { geometry: box(0.042, 0.0006, 0.0042), color: "#22364a", emissive: "#0f2233", offset: [0, 0.0012, 0.001] },
      { geometry: box(0.012, 0.0005, 0.0026), color: "#dbe6f2", emissive: col, offset: [0, 0.0012, -0.0062] },
      { geometry: box(0.0006, 0.0032, 0.0026), color: "#dbe6f2", emissive: col, offset: [0, 0.0028, -0.0062] },
    ];
  }
  if (kind === "DRONE") {
    return [
      { geometry: cyl(0.0009, 0.009, 8), color: "#cfd8e6", emissive: col, offset: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
      { geometry: box(0.02, 0.0005, 0.0032), color: "#8f78c9", emissive: "#3b2b63", offset: [0, 0.0008, 0.0004] },
      { geometry: box(0.008, 0.0005, 0.002), color: "#cfd8e6", emissive: col, offset: [0, 0.0008, -0.0042] },
    ];
  }
  return [
    { geometry: cyl(0.0016, 0.0032, 10), color: "#8d96a6", emissive: "#20262f", offset: [0, 0.0016, 0] },
    { geometry: new THREE.ConeGeometry(0.0044, 0.0032, 14, 1, true), color: "#eef3fa", emissive: col, offset: [0, 0.0052, 0], rotation: [0.5, 0, 0] },
    { geometry: box(0.0075, 0.0022, 0.005), color: "#4a5361", emissive: "#141922", offset: [0.0075, 0.0011, 0] },
    { geometry: cyl(0.0004, 0.006, 6), color: "#b9c3d1", emissive: col, offset: [-0.0065, 0.003, 0] },
  ];
}

function Fleet({ kind }: { kind: AssetKind }) {
  const defs = ASSETS_BY_KIND[kind];
  const parts = useMemo(() => buildParts(kind), [kind]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const local = useMemo(
    () =>
      parts.map((p) => {
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        if (p.rotation) q.setFromEuler(new THREE.Euler(...p.rotation));
        m.compose(new THREE.Vector3(...p.offset), q, new THREE.Vector3(1, 1, 1));
        return m;
      }),
    [parts],
  );
  const scratch = useMemo(
    () => ({
      up: new THREE.Vector3(),
      east: new THREE.Vector3(),
      north: new THREE.Vector3(),
      fwd: new THREE.Vector3(),
      right: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      out: new THREE.Matrix4(),
    }),
    [],
  );

  useFrame(() => {
    const s = scratch;
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]!;
      const st = shared.states.get(def.id);
      const p = shared.pos.get(def.id);
      if (!st || !p) continue;
      s.up.copy(p).normalize();
      s.east.set(-Math.sin(-st.lon * DEG), 0, -Math.cos(-st.lon * DEG)).normalize();
      s.north.crossVectors(s.up, s.east).normalize();
      const hd = st.heading * DEG;
      s.fwd.copy(s.north).multiplyScalar(Math.cos(hd)).addScaledVector(s.east, Math.sin(hd)).normalize();
      s.right.crossVectors(s.up, s.fwd).normalize();
      s.basis.makeBasis(s.right, s.up, s.fwd);
      s.basis.setPosition(p);
      for (let k = 0; k < parts.length; k++) {
        s.out.multiplyMatrices(s.basis, local[k]!);
        refs.current[k]?.setMatrixAt(i, s.out);
      }
    }
    for (const m of refs.current) if (m) m.instanceMatrix.needsUpdate = true;
    dummy.updateMatrix();
  });

  return (
    <>
      {parts.map((p, k) => (
        <instancedMesh
          key={k}
          ref={(el) => {
            refs.current[k] = el;
          }}
          args={[p.geometry, undefined, defs.length]}
          frustumCulled={false}
        >
          <meshStandardMaterial
            color={p.color}
            emissive={p.emissive ?? "#000000"}
            emissiveIntensity={0.45}
            metalness={p.metalness ?? 0.5}
            roughness={p.roughness ?? 0.5}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      ))}
    </>
  );
}

// ----------------------------------------------------------------- Links ---
function Links() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CLUSTERS.length * 6 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(CLUSTERS.length * 6 * 3), 3));
    return g;
  }, []);
  const c = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const links = computeLinks(shared.states, clock.t);
    const pos = geom.getAttribute("position") as THREE.BufferAttribute;
    const col = geom.getAttribute("color") as THREE.BufferAttribute;
    let v = 0;
    for (const l of links) {
      const chain = [l.leo, l.haps, l.drone, l.gs];
      c.set(qualityColor(l.quality));
      for (let i = 0; i < 3; i++) {
        const a = chain[i] ? shared.pos.get(chain[i]!) : null;
        const b = shared.pos.get(chain[i + 1]!);
        for (const p of [a, b]) {
          if (p && a && b) pos.setXYZ(v, p.x, p.y, p.z);
          else pos.setXYZ(v, 0, 0, 0);
          col.setXYZ(v, c.r, c.g, c.b);
          v++;
        }
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geom} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={0.65} depthWrite={false} />
    </lineSegments>
  );
}

// ---------------------------------------------------------------- Orbits ---
function Orbits() {
  const planes = 10;
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(planes * 128 * 3), 3));
    return g;
  }, []);

  useFrame(() => {
    const pos = geom.getAttribute("position") as THREE.BufferAttribute;
    let v = 0;
    for (let p = 0; p < planes; p++) {
      const def = ASSETS_BY_KIND.LEO[p * 10]!.orbit!;
      const inc = def.inc * DEG;
      const r = 1 + def.altKm / EARTH_RADIUS_KM;
      for (let i = 0; i < 64; i++) {
        for (const step of [i, i + 1]) {
          const u = (step / 64) * Math.PI * 2;
          const lat = Math.asin(Math.sin(inc) * Math.sin(u)) / DEG;
          const lon =
            def.raan + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) / DEG - clock.t * (360 / 86164.1);
          const q = latLonToVec3(lat, lon, r);
          pos.setXYZ(v++, q[0], q[1], q[2]);
        }
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geom} frustumCulled={false}>
      <lineBasicMaterial color="#2f6f9e" transparent opacity={0.28} depthWrite={false} />
    </lineSegments>
  );
}

// --------------------------------------------------------------- Labels ----
function Labels() {
  const { selectedId, labelDensity, layers, select } = useMission();
  const { camera } = useThree();
  const [ids, setIds] = useState<string[]>([]);
  const acc = useRef(0);

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.4) return;
    acc.current = 0;
    const dist = camera.position.length();
    const list: { id: string; d: number }[] = [];
    if (dist < 2.6) {
      for (const [id, p] of shared.pos) {
        const def = ASSETS_BY_ID.get(id)!;
        if (!layers[def.kind]) continue;
        if (p.clone().normalize().dot(camera.position.clone().normalize()) < 0.55) continue;
        list.push({ id, d: p.distanceTo(camera.position) });
      }
      list.sort((a, b) => a.d - b.d);
    }
    const next = list.slice(0, labelDensity).map((x) => x.id);
    if (selectedId && !next.includes(selectedId)) next.unshift(selectedId);
    setIds((prev) => (prev.join() === next.join() ? prev : next));
  });

  return (
    <>
      {ids.map((id) => {
        const p = shared.pos.get(id);
        if (!p) return null;
        const def = ASSETS_BY_ID.get(id)!;
        const active = id === selectedId;
        return (
          <Html key={id} position={[p.x, p.y, p.z]} center distanceFactor={2.2} zIndexRange={[20, 0]}>
            <button
              onClick={() => select(id)}
              className={`whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wider backdrop-blur-sm transition-colors ${
                active
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
              }`}
              style={{ transform: "translateY(-14px)" }}
            >
              {def.id}
            </button>
          </Html>
        );
      })}
    </>
  );
}

// -------------------------------------------------------------- Selection --
function SelectionMarker() {
  const { selectedId } = useMission();
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g) return;
    const p = selectedId ? shared.pos.get(selectedId) : null;
    g.visible = !!p;
    if (p) {
      g.position.copy(p);
      g.lookAt(camera.position);
      const s = camera.position.distanceTo(p) * 0.05;
      g.scale.setScalar(s);
    }
  });
  return (
    <group ref={ref} visible={false}>
      <mesh>
        <ringGeometry args={[0.5, 0.56, 48]} />
        <meshBasicMaterial color="#5ad7ff" transparent opacity={0.9} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- Camera ---
function CameraRig() {
  const { selectedId, focusToken } = useMission();
  const target = useRef<THREE.Vector3 | null>(null);
  const controls = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!selectedId) return;
    const p = shared.pos.get(selectedId);
    if (!p) return;
    const dist = ASSETS_BY_ID.get(selectedId)!.kind === "LEO" ? 1.45 : 1.16;
    target.current = p.clone().normalize().multiplyScalar(dist);
  }, [selectedId, focusToken]);

  useFrame(() => {
    if (!target.current) return;
    camera.position.lerp(target.current, 0.07);
    controls.current?.update();
    if (camera.position.distanceTo(target.current) < 0.004) target.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.05}
      maxDistance={6}
      rotateSpeed={0.5}
      zoomSpeed={0.7}
      onStart={() => (target.current = null)}
    />
  );
}

function Scene() {
  const { layers, showLinks, showOrbits } = useMission();
  useSharedFrame();
  return (
    <>
      <Earth />
      {showOrbits && <Orbits />}
      {(Object.keys(layers) as AssetKind[]).map((k) => (layers[k] ? <Fleet key={k} kind={k} /> : null))}
      {showLinks && <Links />}
      <SelectionMarker />
      <Labels />
      <CameraRig />
    </>
  );
}

export default function Globe3D() {
  return (
    <Canvas
      camera={{ position: [2.35, 0.95, 0.6], fov: 42, near: 0.01, far: 100 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#04070d"]} />
      <Suspense fallback={null}>
        <Stars radius={40} depth={20} count={2200} factor={2} fade speed={0} />
        <Scene />
      </Suspense>
    </Canvas>
  );
}
