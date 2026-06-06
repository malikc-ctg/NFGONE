'use client';

import { useEffect, useRef } from 'react';

// ── Shader sources ────────────────────────────────────────────────────────────
const VERT_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG_SRC = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uCurrents;
uniform float uCaustics;
uniform float uRays;
uniform float uSpeed;
uniform float uExposure;

const vec3 ABYSS    = vec3(0.004, 0.039, 0.078);
const vec3 MIDNIGHT = vec3(0.008, 0.102, 0.208);
const vec3 DEEP     = vec3(0.043, 0.239, 0.431);
const vec3 SEA      = vec3(0.180, 0.427, 0.710);
const vec3 MIST     = vec3(0.863, 0.918, 0.969);

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 p){
  float v = 0.0, a = 0.55;
  for(int i = 0; i < 6; i++){
    v += a * noise(p);
    p = M * p;
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p  = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.04 * uSpeed;

  float r    = length(p * vec2(0.8, 1.0));
  float ring = smoothstep(0.22, 0.62, r) * (1.0 - 0.55 * smoothstep(0.80, 1.30, r));
  float calm = smoothstep(0.46, 0.04, r);

  // Layer 1: deep ocean gradient
  vec3 col = mix(ABYSS, MIDNIGHT, smoothstep(-0.25, 1.25, uv.y));
  col = mix(col, ABYSS, smoothstep(0.40, 1.15, r));

  // Layer 2: domain-warped flow-field currents
  vec2 flow = p * 0.95 + vec2(0.30, 0.18) * t;
  vec2 q = vec2(fbm(flow + vec2(0.0, 1.7) + t * 0.5),
                fbm(flow + vec2(5.2, 1.3) - t * 0.4));
  vec2 s = vec2(fbm(flow + 2.0 * q + vec2(1.7, 9.2) + t * 0.25),
                fbm(flow + 2.0 * q + vec2(8.3, 2.8) - t * 0.20));
  float current = fbm(flow + 2.6 * s);
  float vein = smoothstep(0.30, 0.95, current);
  vec3 currentCol = mix(MIDNIGHT, DEEP, vein);
  currentCol = mix(currentCol, SEA, smoothstep(0.78, 1.0, current) * 0.45);
  col = mix(col, currentCol, vein * (0.09 + 0.42 * ring) * uCurrents);

  // Layer 4 haze
  float haze = fbm(p * 0.8 - t * 0.12);
  col += DEEP * haze * 0.05 * ring;

  // Layer 3: caustics
  vec2 cuv = p * 3.0 + 0.4 * s;
  float n1 = fbm(cuv + vec2(0.0, t * 1.0));
  float n2 = fbm(cuv * 1.25 - vec2(t * 0.8, 0.0) + 4.0);
  float net = abs(n1 - n2);
  float caustic = pow(1.0 - smoothstep(0.0, 0.45, net), 3.5);
  caustic *= ring * smoothstep(-0.1, 0.95, uv.y);
  col += MIST * caustic * 0.10 * uCaustics;

  // Layer 4: god rays
  vec2 g = p;
  g.x += (1.0 - uv.y) * 0.10;
  float shaft = pow(fbm(vec2(g.x * 3.0 - t * 0.5, g.y * 0.35 + t * 0.08)), 2.4);
  float rays = shaft * smoothstep(-0.30, 1.0, uv.y) * (0.30 + 0.70 * ring);
  col += mix(SEA, MIST, 0.5) * rays * 0.09 * uRays;

  // central glow
  col += DEEP * calm * 0.035;

  // exposure / contrast
  col *= 0.92 * uExposure;
  col = pow(col, vec3(1.18));
  col = max(col, ABYSS * 0.5);

  // dithering
  float d = hash(gl_FragCoord.xy + fract(uTime)) - 0.5;
  col += d / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Default render params ─────────────────────────────────────────────────────
const PARAMS = { currents: 2.0, caustics: 1.55, rays: 1.4, speed: 1.1, exposure: 1.3 };

// ── Component ─────────────────────────────────────────────────────────────────
export function OceanCanvas() {
  const glRef  = useRef<HTMLCanvasElement>(null);
  const ptRef  = useRef<HTMLCanvasElement>(null);
  const rafGl  = useRef<number>(0);
  const rafPt  = useRef<number>(0);

  // ── WebGL ocean shader ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = glRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      antialias: false, alpha: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    });
    if (!gl) return;

    function compile(type: number, src: string) {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      return sh;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VERT_SRC));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {
      res:      gl.getUniformLocation(prog, 'uRes'),
      time:     gl.getUniformLocation(prog, 'uTime'),
      currents: gl.getUniformLocation(prog, 'uCurrents'),
      caustics: gl.getUniformLocation(prog, 'uCaustics'),
      rays:     gl.getUniformLocation(prog, 'uRays'),
      speed:    gl.getUniformLocation(prog, 'uSpeed'),
      exposure: gl.getUniformLocation(prog, 'uExposure'),
    };

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas!.offsetWidth  * dpr);
      const h = Math.floor(canvas!.offsetHeight * dpr);
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width  = w;
        canvas!.height = h;
      }
      gl!.viewport(0, 0, w, h);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const start = performance.now();
    function frame(now: number) {
      const t = (now - start) / 1000;
      gl!.uniform2f(U.res, canvas!.width, canvas!.height);
      gl!.uniform1f(U.time,     t);
      gl!.uniform1f(U.currents, PARAMS.currents);
      gl!.uniform1f(U.caustics, PARAMS.caustics);
      gl!.uniform1f(U.rays,     PARAMS.rays);
      gl!.uniform1f(U.speed,    PARAMS.speed);
      gl!.uniform1f(U.exposure, PARAMS.exposure);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      rafGl.current = requestAnimationFrame(frame);
    }
    rafGl.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafGl.current);
      ro.disconnect();
    };
  }, []);

  // ── Canvas 2D particles ─────────────────────────────────────────────────────
  useEffect(() => {
    const c = ptRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;

    type Particle = {
      x: number; y: number; r: number;
      vx: number; vy: number;
      a: number; tw: number; tws: number;
    };

    let W = 0, H = 0, parts: Particle[] = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c!.width  = Math.floor(c!.offsetWidth  * dpr);
      H = c!.height = Math.floor(c!.offsetHeight * dpr);
      const count = Math.round((c!.offsetWidth * c!.offsetHeight) / 14000);
      parts = [];
      for (let i = 0; i < count; i++) {
        const edge = Math.random();
        const ex = (Math.random() < 0.5 ? -1 : 1) * Math.pow(Math.random(), 0.6) * 0.5 + 0.5;
        parts.push({
          x: (Math.random() * 0.35 + (edge > 0.5 ? ex : Math.random())) * W,
          y: Math.random() * H,
          r: (Math.random() * 1.3 + 0.3) * dpr,
          vy: -(Math.random() * 0.10 + 0.02) * dpr,
          vx: (Math.random() - 0.5) * 0.05 * dpr,
          a: Math.random() * 0.5 + 0.15,
          tw:  Math.random() * Math.PI * 2,
          tws: Math.random() * 0.6 + 0.2,
        });
      }
    }

    const ro = new ResizeObserver(build);
    ro.observe(c);
    build();

    let last = performance.now();
    function loop(now: number) {
      const dt = Math.min(now - last, 50); last = now;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5, cy = H * 0.5;
      for (const p of parts) {
        p.y += p.vy * dt * PARAMS.speed;
        p.x += (p.vx + Math.sin(now * 0.0002 + p.tw) * 0.02 * dpr) * dt * PARAMS.speed;
        p.tw += p.tws * dt * 0.002;
        if (p.y < -10)    { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10)    p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        const d = Math.hypot((p.x - cx) / (W * 0.5), (p.y - cy) / (H * 0.5));
        const centerFade = Math.min(1, Math.max(0.12, (d - 0.15) / 0.55));
        const tw = 0.55 + 0.45 * Math.sin(p.tw);
        const alpha = p.a * tw * centerFade;
        if (alpha <= 0.01) continue;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
        grad.addColorStop(0, `rgba(220,234,247,${alpha})`);
        grad.addColorStop(1, 'rgba(46,109,181,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      rafPt.current = requestAnimationFrame(loop);
    }
    rafPt.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafPt.current);
      ro.disconnect();
    };
  }, []);

  return (
    /* Absolute fill — sits behind everything inside the hero section */
    <div className="absolute inset-0 w-full h-full" aria-hidden="true">
      {/* WebGL shader canvas */}
      <canvas
        ref={glRef}
        className="absolute inset-0 w-full h-full block"
        style={{ display: 'block' }}
      />
      {/* Particles canvas — screen blend for additive light */}
      <canvas
        ref={ptRef}
        className="absolute inset-0 w-full h-full block"
        style={{ mixBlendMode: 'screen', opacity: 0.9 }}
      />
      {/* Film grain to kill banding */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.05,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Vignette — weight gathers toward edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(120% 120% at 50% 42%, rgba(1,10,20,0) 38%, rgba(1,10,20,0.55) 100%)',
        }}
      />
    </div>
  );
}
