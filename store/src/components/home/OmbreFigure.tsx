"use client";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

/**
 * A drawn Ombre in three-quarter view: a wooden frame that lifts from the sand,
 * a canvas that unrolls along it, and the shadow it casts.
 *
 * Two numbers describe its state, both 0..1:
 *   lift   - the frame rises from flat (folded) to fully open
 *   canvas - the canvas unrolls from the front rail to the top rail
 * The parent drives them (scroll, hover, buttons) through the ref, without re-rendering React.
 */

export interface OmbreHandle {
  set: (lift: number, canvas: number) => void;
}

interface Props {
  fabric?: string;
  lift?: number;
  canvas?: number;
  className?: string;
  title?: string;
}

const GROUND = 400;
const FRONT = { x: 330, y: GROUND };
const DEPTH = { x: -190, y: -70 }; // from the front side of the frame to the back side
const RAIL = 320; // length of the canopy rails
const LEG = 240; // length of the support legs
const MAX_ANGLE = (40 * Math.PI) / 180;
const LIGHT = 0.5; // how far the shadow falls to the right per unit of height

type Pt = { x: number; y: number };
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const pts = (...p: Pt[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

function geometry(lift: number, canvas: number) {
  const a = MAX_ANGLE * easeInOut(clamp(lift));
  const f0 = FRONT;
  const f1 = add(FRONT, DEPTH);
  const t0 = { x: f0.x + RAIL * Math.cos(a), y: f0.y - RAIL * Math.sin(a) };
  const t1 = add(t0, DEPTH);
  // legs hang from the top rail and rest on the sand under the canopy
  const h = f0.y - t0.y;
  const g0 = { x: t0.x - Math.sqrt(Math.max(0, LEG * LEG - h * h)), y: f0.y };
  const g1 = add(g0, DEPTH);
  // canvas edge, unrolled from the front rail upwards
  const u = clamp(canvas);
  const c0 = lerp(f0, t0, u);
  const c1 = lerp(f1, t1, u);
  // shadow: each canvas corner dropped to the sand along the light
  const drop = (p: Pt, ground: number): Pt => {
    const height = ground - p.y;
    return { x: p.x + height * LIGHT, y: ground - height * 0.08 };
  };
  const shadow = [drop(f0, f0.y), drop(c0, f0.y), drop(c1, f1.y), drop(f1, f1.y)];
  return { f0, f1, t0, t1, g0, g1, c0, c1, shadow, u, a };
}

type Geo = ReturnType<typeof geometry>;
const shadowOpacity = (g: Geo) => (0.12 + 0.2 * g.u * (g.a / MAX_ANGLE)).toFixed(3);
const sheenOpacity = (g: Geo) => (0.35 * (1 - g.a / MAX_ANGLE)).toFixed(3);
const rollOpacity = (g: Geo) => (g.u > 0.02 && g.u < 0.98 ? "1" : "0");

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export const OmbreFigure = forwardRef<OmbreHandle, Props>(function OmbreFigure(
  { fabric = "#2AA7CC", lift = 0, canvas = 0, className, title = "The Ombre beach shade" },
  ref,
) {
  const svg = useRef<SVGSVGElement>(null);
  // the latest state, so a re-render (e.g. a new fabric colour) keeps the current pose
  const pose = useRef({ lift, canvas });

  const apply = useCallback((l: number, c: number) => {
    const el = svg.current;
    pose.current = { lift: l, canvas: c };
    if (!el) return;
    const g = geometry(l, c);
    const q = (sel: string) => el.querySelector(`[data-p="${sel}"]`);
    const line = (sel: string, a: Pt, b: Pt) => {
      const n = q(sel);
      if (!n) return;
      n.setAttribute("x1", a.x.toFixed(1));
      n.setAttribute("y1", a.y.toFixed(1));
      n.setAttribute("x2", b.x.toFixed(1));
      n.setAttribute("y2", b.y.toFixed(1));
    };
    q("shadow")?.setAttribute("points", pts(...g.shadow));
    q("shadow")?.setAttribute("opacity", shadowOpacity(g));
    q("fabric")?.setAttribute("points", pts(g.f0, g.c0, g.c1, g.f1));
    q("sheen")?.setAttribute("points", pts(g.f0, g.c0, g.c1, g.f1));
    q("sheen")?.setAttribute("opacity", sheenOpacity(g));
    line("rail-back", g.f1, g.t1);
    line("leg-back", g.t1, g.g1);
    line("bar-front", g.f0, g.f1);
    line("bar-top", g.t0, g.t1);
    line("bar-foot", g.g0, g.g1);
    line("rail-front", g.f0, g.t0);
    line("leg-front", g.t0, g.g0);
    line("roll", g.c0, g.c1);
    q("roll")?.setAttribute("opacity", rollOpacity(g));
  }, []);

  useImperativeHandle(ref, () => ({ set: apply }), [apply]);

  // First paint is rendered on the server from the same geometry, so there is no flash or loader.
  const g = geometry(pose.current.lift, pose.current.canvas);
  const wood = "url(#ombre-wood)";

  return (
    <svg ref={svg} viewBox="0 0 760 460" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id="ombre-wood" gradientUnits="userSpaceOnUse" x1="100" y1="100" x2="700" y2="440">
          <stop offset="0" stopColor="#C8955A" />
          <stop offset="1" stopColor="#9A6630" />
        </linearGradient>
        <linearGradient id="ombre-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ombre-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <polygon data-p="shadow" points={pts(...g.shadow)} fill="#1F2325" opacity={shadowOpacity(g)} filter="url(#ombre-soft)" />

      <g strokeLinecap="round" stroke={wood}>
        <line data-p="rail-back" x1={g.f1.x} y1={g.f1.y} x2={g.t1.x} y2={g.t1.y} strokeWidth={8} />
        <line data-p="leg-back" x1={g.t1.x} y1={g.t1.y} x2={g.g1.x} y2={g.g1.y} strokeWidth={7} />
        <line data-p="bar-foot" x1={g.g0.x} y1={g.g0.y} x2={g.g1.x} y2={g.g1.y} strokeWidth={6} />
      </g>

      <polygon data-p="fabric" points={pts(g.f0, g.c0, g.c1, g.f1)} fill={fabric} style={{ transition: "fill .6s ease" }} />
      <polygon data-p="sheen" points={pts(g.f0, g.c0, g.c1, g.f1)} fill="url(#ombre-sheen)" opacity={sheenOpacity(g)} />

      <g strokeLinecap="round" stroke={wood}>
        <line data-p="roll" x1={g.c0.x} y1={g.c0.y} x2={g.c1.x} y2={g.c1.y} strokeWidth={12} stroke={fabric} opacity={rollOpacity(g)} />
        <line data-p="bar-front" x1={g.f0.x} y1={g.f0.y} x2={g.f1.x} y2={g.f1.y} strokeWidth={9} />
        <line data-p="bar-top" x1={g.t0.x} y1={g.t0.y} x2={g.t1.x} y2={g.t1.y} strokeWidth={9} />
        <line data-p="rail-front" x1={g.f0.x} y1={g.f0.y} x2={g.t0.x} y2={g.t0.y} strokeWidth={10} />
        <line data-p="leg-front" x1={g.t0.x} y1={g.t0.y} x2={g.g0.x} y2={g.g0.y} strokeWidth={8} />
      </g>
    </svg>
  );
});
