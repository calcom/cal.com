"use client";

import { Badge } from "@coss/ui/components/badge";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Color, InstancedBufferAttribute } from "three";
import { parseCSSColor } from "./color-utils";
import {
  CITIES,
  DEFAULT_SPEED_INDEX,
  latToRowF,
  lngToCol,
  lngToColF,
  SPEED_LABELS,
  SPEED_STEPS,
  TIMEZONES,
} from "./map-constants";
import { getDaylightAmount, getLocalTime, getSunPosition } from "./solar-utils";
import { LAND_GRID, MAP_COLS, MAP_ROWS, PHASES } from "./world-map-data";

interface MapLayout {
  offsetX: number;
  offsetY: number;
  spacing: number;
  cw: number;
  ch: number;
}

interface AnimatedGridBackgroundProps {
  showCityPings?: boolean;
}

// Check if we should skip animations
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = (): void => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

export function AnimatedGridBackground({ showCityPings = true }: AnimatedGridBackgroundProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const [layout, setLayout] = useState<MapLayout | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const speedIndexRef = useRef(DEFAULT_SPEED_INDEX);
  const [speedLabel, setSpeedLabel] = useState<string | null>(null);
  const speedHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldSkip = isMobile || reducedMotion;

  useEffect(() => {
    if (shouldSkip) return;
    const container = containerRef.current;
    if (!container) return;

    // Dynamic import three.js to avoid SSR issues
    let cancelled = false;

    const init = async () => {
      const THREE = await import("three");
      if (cancelled) return;

      // ── Scene setup ───────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";

      // ── Resolve brand color ───────────────────────────────
      const resolveBrand = (): Color => {
        const el = container;
        const style = getComputedStyle(el);
        const brand = style.getPropertyValue("--cal-brand").trim();
        if (brand) {
          const rgb = parseCSSColor(brand);
          return new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
        }
        return document.documentElement.classList.contains("dark")
          ? new THREE.Color(1, 1, 1)
          : new THREE.Color(23 / 255, 37 / 255, 63 / 255);
      };

      let brandColor: Color = resolveBrand();
      let isDark: boolean = document.documentElement.classList.contains("dark");
      const observer = new MutationObserver(() => {
        brandColor = resolveBrand();
        isDark = document.documentElement.classList.contains("dark");
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      // ── Dot geometry — circle shape via shader ────────────
      const TOTAL = MAP_ROWS * MAP_COLS;
      const dotGeo = new THREE.PlaneGeometry(1, 1);
      const dotMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: brandColor },
          uAmberColor: { value: new THREE.Color(251 / 255, 191 / 255, 36 / 255) },
        },
        vertexShader: `
          attribute float aAlpha;
          attribute float aSize;
          attribute float aIsAmber;
          varying float vAlpha;
          varying vec2 vUv;
          varying float vIsAmber;
          void main() {
            vAlpha = aAlpha;
            vUv = uv;
            vIsAmber = aIsAmber;
            // Scale the quad by aSize
            vec3 pos = position * aSize;
            pos += instanceMatrix[3].xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec3 uAmberColor;
          varying float vAlpha;
          varying vec2 vUv;
          varying float vIsAmber;
          void main() {
            // Circle SDF from quad UVs
            vec2 center = vUv - 0.5;
            float dist = length(center);
            if (dist > 0.5) discard;
            // Slight soft edge for quality
            float edge = 1.0 - smoothstep(0.4, 0.5, dist);
            vec3 col = mix(uColor, uAmberColor, vIsAmber);
            gl_FragColor = vec4(col, vAlpha * edge);
          }
        `,
      });

      const mesh = new THREE.InstancedMesh(dotGeo, dotMat, TOTAL);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      // Per-instance attributes
      const alphaAttr = new Float32Array(TOTAL);
      const sizeAttr = new Float32Array(TOTAL);
      const amberAttr = new Float32Array(TOTAL);
      dotGeo.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(alphaAttr, 1));
      dotGeo.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizeAttr, 1));
      dotGeo.setAttribute("aIsAmber", new THREE.InstancedBufferAttribute(amberAttr, 1));

      scene.add(mesh);
      const dummy = new THREE.Object3D();

      // ── Pre-compute city dot indices (avoids O(dots×cities) per frame) ──
      const cityDotMap = new Map<number, number>(); // grid index → city index
      for (let ci = 0; ci < CITIES.length; ci++) {
        const city = CITIES[ci];
        const cityCol = Math.round(lngToColF(city.lng));
        const cityRow = Math.round(latToRowF(city.lat));
        cityDotMap.set(cityRow * MAP_COLS + cityCol, ci);
      }

      // ── Pre-compute static per-dot data ───────────────────
      const dotLats = new Float32Array(TOTAL);
      const dotLngs = new Float32Array(TOTAL);
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          const idx = r * MAP_COLS + c;
          dotLats[idx] = 85 - (r / (MAP_ROWS - 1)) * (85 + 60);
          dotLngs[idx] = -180 + (c / (MAP_COLS - 1)) * 360;
        }
      }

      // ── Cached layout values (updated on resize only) ─────
      let cachedCw = 0,
        cachedCh = 0;
      let cachedSpacing = 0,
        cachedOffsetX = 0,
        cachedOffsetY = 0;
      let cachedDotRadius = 0,
        cachedWaterDotRadius = 0,
        cachedGlowRadius = 0;
      let cachedCx = 0,
        cachedCy = 0;
      let cachedFadeRadiusX = 0,
        cachedFadeRadiusY = 0;
      // Pre-computed per-dot fade masks (only change on resize)
      const fadeMasks = new Float32Array(TOTAL);

      const updateLayoutCache = (cw: number, ch: number): void => {
        cachedCw = cw;
        cachedCh = ch;
        const spacingX = cw / MAP_COLS;
        const spacingY = ch / MAP_ROWS;
        cachedSpacing = Math.max(spacingX, spacingY);
        const mapW = MAP_COLS * cachedSpacing;
        const mapH = MAP_ROWS * cachedSpacing;
        cachedOffsetX = (cw - mapW) / 2;
        cachedOffsetY = (ch - mapH) / 2;
        cachedDotRadius = cachedSpacing * 0.22;
        cachedWaterDotRadius = cachedSpacing * 0.08;
        cachedGlowRadius = cachedSpacing * 0.32;
        cachedCx = cw / 2;
        cachedCy = ch / 2;
        cachedFadeRadiusX = cw * 0.55;
        cachedFadeRadiusY = ch * 0.55;

        // Set instance positions ONCE (they never change until resize)
        for (let r = 0; r < MAP_ROWS; r++) {
          for (let c = 0; c < MAP_COLS; c++) {
            const idx = r * MAP_COLS + c;
            const x = cachedOffsetX + c * cachedSpacing + cachedSpacing / 2;
            const y = ch - (cachedOffsetY + r * cachedSpacing + cachedSpacing / 2);
            dummy.position.set(x, y, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);

            // Pre-compute elliptical fade mask
            const dx = (x - cachedCx) / cachedFadeRadiusX;
            const dy = (ch - y - cachedCy) / cachedFadeRadiusY;
            const ellipseDist = Math.sqrt(dx * dx + dy * dy);
            if (ellipseDist > 1) {
              fadeMasks[idx] = 0;
            } else if (ellipseDist < 0.75) {
              fadeMasks[idx] = 1;
            } else {
              fadeMasks[idx] = 1 - (ellipseDist - 0.75) / 0.25;
            }
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
      };

      // ── Resize ────────────────────────────────────────────
      const handleResize = (): void => {
        const rect = container.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        renderer.setSize(cw, ch);
        camera.left = 0;
        camera.right = cw;
        camera.top = ch;
        camera.bottom = 0;
        camera.updateProjectionMatrix();

        updateLayoutCache(cw, ch);

        setLayout({
          offsetX: cachedOffsetX,
          offsetY: cachedOffsetY,
          spacing: cachedSpacing,
          cw,
          ch,
        });
      };
      handleResize();
      window.addEventListener("resize", handleResize);

      // ── Arrow key speed control ───────────────────────────
      const handleKeyDown = (e: KeyboardEvent): void => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        let changed = false;
        if (e.key === "ArrowRight") {
          const next = Math.min(speedIndexRef.current + 1, SPEED_STEPS.length - 1);
          if (next !== speedIndexRef.current) {
            speedIndexRef.current = next;
            changed = true;
          }
        } else if (e.key === "ArrowLeft") {
          const next = Math.max(speedIndexRef.current - 1, 0);
          if (next !== speedIndexRef.current) {
            speedIndexRef.current = next;
            changed = true;
          }
        }
        if (changed) {
          setSpeedLabel(SPEED_LABELS[speedIndexRef.current]);
          if (speedHideRef.current) clearTimeout(speedHideRef.current);
          speedHideRef.current = setTimeout(() => setSpeedLabel(null), 1500);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      startRef.current = performance.now();

      // ── Animation loop ────────────────────────────────────
      let lastTimeSec = -1;
      const dotRadius2 = (): number => cachedDotRadius * 2;
      const waterDotRadius2 = (): number => cachedWaterDotRadius * 2;
      const glowRadius2 = (): number => cachedGlowRadius * 2;

      const animate = (): void => {
        if (cancelled) return;
        const now = performance.now();
        const elapsed = (now - startRef.current) / 1000;

        // Sun position
        const nowDate = new Date();
        const speedMultiplier = SPEED_STEPS[speedIndexRef.current];
        const fastDate = new Date(nowDate.getTime() + elapsed * 1000 * (speedMultiplier - 1));
        const { declination, subSolarLng } = getSunPosition(fastDate);

        // Throttle React state updates to ~1/sec
        const currentSec = Math.floor(elapsed);
        if (currentSec !== lastTimeSec) {
          lastTimeSec = currentSec;
          setCurrentTime(fastDate);
        }

        // Update uniforms (cached isDark from MutationObserver, no DOM read)
        (dotMat.uniforms.uColor as { value: Color }).value = brandColor;
        const alphaMul = isDark ? 1 : 1.6;

        const dr2 = dotRadius2();
        const wr2 = waterDotRadius2();
        const gr2 = glowRadius2();

        // Update per-instance attributes only (positions set on resize)
        for (let idx = 0; idx < TOTAL; idx++) {
          const fm = fadeMasks[idx];
          if (fm === 0) {
            alphaAttr[idx] = 0;
            sizeAttr[idx] = 0;
            amberAttr[idx] = 0;
            continue;
          }

          const daylight = getDaylightAmount(dotLats[idx], dotLngs[idx], declination, subSolarLng);

          let alpha: number;
          let size: number;
          let amber = 0;

          // City override check (O(1) map lookup instead of O(cities) loop)
          const cityIdx = showCityPings ? cityDotMap.get(idx) : undefined;
          if (cityIdx !== undefined) {
            const city = CITIES[cityIdx];
            const cityDaylight = getDaylightAmount(city.lat, city.lng, declination, subSolarLng);
            if (cityDaylight < 0.3) {
              const flicker = 0.7 + Math.sin(elapsed * 1.2 + cityIdx * 1.7) * 0.1;
              alpha = 0.3 * fm * flicker * alphaMul;
              size = dr2 * 1.3;
              amber = 1;
            } else {
              alpha = 0.18 * fm * alphaMul;
              size = dr2 * 1.2;
            }
          } else if (LAND_GRID[idx]) {
            const pulse = Math.sin(elapsed * 0.6 + PHASES[idx] * Math.PI * 2) * 0.02;
            alpha = (0.12 + daylight * 0.06 + pulse) * fm * alphaMul;
            size = dr2;
            if (daylight > 0.3) {
              alpha += (daylight - 0.3) * 0.05 * fm * alphaMul;
              size = gr2;
            }
          } else {
            alpha = (0.05 + daylight * 0.015) * fm * alphaMul;
            size = wr2;
          }

          alphaAttr[idx] = alpha;
          sizeAttr[idx] = size;
          amberAttr[idx] = amber;
        }

        // Only attribute buffers need updating (matrices are static)
        (dotGeo.getAttribute("aAlpha") as InstancedBufferAttribute).needsUpdate = true;
        (dotGeo.getAttribute("aSize") as InstancedBufferAttribute).needsUpdate = true;
        (dotGeo.getAttribute("aIsAmber") as InstancedBufferAttribute).needsUpdate = true;

        renderer.render(scene, camera);
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);

      // Cleanup
      return (): void => {
        cancelled = true;
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("keydown", handleKeyDown);
        if (speedHideRef.current) clearTimeout(speedHideRef.current);
        observer.disconnect();
        renderer.dispose();
        dotGeo.dispose();
        dotMat.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    };

    let cleanup: (() => void) | undefined;
    const initPromise = init().then((c) => {
      cleanup = c;
      return c;
    });

    return (): void => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      // Wait for init to complete before running cleanup to avoid resource leaks
      initPromise.then(() => cleanup?.());
    };
  }, [shouldSkip, showCityPings]);

  if (shouldSkip) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ "--cal-brand": "var(--cal-brand)" } as React.CSSProperties}>
      {/* Timezone vertical lines + labels, positioned by map longitude */}
      {layout &&
        TIMEZONES.map((tz) => {
          const col = lngToCol(tz.lng);
          const x = layout.offsetX + col * layout.spacing + layout.spacing / 2;

          // Skip if off-screen
          if (x < -20 || x > layout.cw + 20) return null;

          const localTime = getLocalTime(tz.offset, currentTime);
          const utcHours = currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60;
          const localHour = (utcHours + tz.offset + 24) % 24;
          const isDay = localHour >= 6 && localHour < 18;

          return (
            <div key={tz.label}>
              {/* Dashed vertical line */}
              <div
                className="absolute top-0 w-px dark:invert"
                style={{
                  left: x,
                  height: layout.ch - 48,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 4px, ${
                    isDay ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)"
                  } 4px, ${isDay ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)"} 8px)`,
                  transition: "opacity 0.3s ease",
                }}
              />
              {/* Label at bottom */}
              <div
                className="absolute bottom-4 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap"
                style={{
                  left: x,
                  opacity: isDay ? 0.7 : 0.35,
                  transition: "opacity 0.3s ease",
                }}>
                <span className="text-xs font-medium tabular-nums text-[#F97316]">{localTime}</span>
                <span className="text-[10px] tabular-nums text-subtle">{tz.label}</span>
              </div>
            </div>
          );
        })}

      {/* Speed indicator */}
      <AnimatePresence>
        {speedLabel && (
          <motion.div
            key={speedLabel}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <Badge variant="outline" size="lg" className="px-3 font-mono tabular-nums">
              {speedLabel}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
