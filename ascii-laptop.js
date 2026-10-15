(() => {
  /* ===== Ajustes ===== */
  const TILT_DEG   = 35;    // inclinação (graus)
  const TILT_AXIS  = 'z';   // 'x' = vista de cima a 45°, girando como um prato | 'z' = eixo de giro deitado a 45°
  const SPIN_SPEED = 0.9;   // radianos por segundo
  const COLS = 124, ROWS = 64;
  const RAMP = " .,:;-~=+*#%@";
  const CAM  = 8.5;         // distância da câmera

  /* ===== Modelo: pontos sobre as superfícies ===== */
  // cada ponto: [x, y, z, nx, ny, nz, material]  (material 0..1 = brilho próprio da textura)
  const pts = [];
  const STEP = 0.045;

  function rotX(p, a) { const c=Math.cos(a), s=Math.sin(a); return [p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]; }
  function rotY(p, a) { const c=Math.cos(a), s=Math.sin(a); return [p[0]*c + p[2]*s, p[1], -p[0]*s + p[2]*c]; }
  function rotZ(p, a) { const c=Math.cos(a), s=Math.sin(a); return [p[0]*c - p[1]*s, p[0]*s + p[1]*c, p[2]]; }

  // face retangular: eixo fixo (axis 'x'|'y'|'z'), posição, limites dos outros dois eixos
  function face(axis, pos, sign, a0, a1, b0, b1, mat, xf) {
    const na = Math.max(2, Math.round((a1 - a0) / STEP));
    const nb = Math.max(2, Math.round((b1 - b0) / STEP));
    for (let i = 0; i <= na; i++) for (let j = 0; j <= nb; j++) {
      const a = a0 + (a1 - a0) * i / na, b = b0 + (b1 - b0) * j / nb;
      let p, n;
      if (axis === 'y') { p = [a, pos, b]; n = [0, sign, 0]; }
      else if (axis === 'z') { p = [a, b, pos]; n = [0, 0, sign]; }
      else { p = [pos, a, b]; n = [sign, 0, 0]; }
      const m = typeof mat === 'function' ? mat(a, b) : mat;
      add(p, n, m, xf);
    }
  }
  function add(p, n, m, xf) {
    if (xf) { p = xf(p); n = xf(n, true); }
    pts.push([p[0], p[1], p[2], n[0], n[1], n[2], m]);
  }
  function edge(p0, p1, xf, m = 1.4) {
    const len = Math.hypot(p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]);
    const n = Math.max(2, Math.round(len / (STEP * 0.7)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let p = [p0[0] + (p1[0]-p0[0]) * t, p0[1] + (p1[1]-p0[1]) * t, p0[2] + (p1[2]-p0[2]) * t];
      if (xf) p = xf(p);
      pts.push([p[0], p[1], p[2], 0, 0, 0, m]); // normal 0 = ponto de borda (sempre visível)
    }
  }
  function boxEdges(x0, x1, y0, y1, z0, z1, xf) {
    const c = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) c.push([x, y, z]);
    const pairs = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
    pairs.forEach(([i, j]) => edge(c[i], c[j], xf));
  }

  // ----- base -----
  const BW = 1.6, BD = 1.1, BH = 0.07;
  // teclado: grade de teclas + trackpad
  const keyTex = (x, z) => {
    if (z > 0.52 && z < 0.98 && Math.abs(x) < 0.55) {            // trackpad
      const edgeT = (Math.abs(Math.abs(x) - 0.55) < 0.03) || (Math.abs(z - 0.52) < 0.03) || (Math.abs(z - 0.98) < 0.03);
      return edgeT ? 1.0 : 0.15;
    }
    if (z > -0.85 && z < 0.42 && Math.abs(x) < 1.42) {            // teclado
      const fx = ((x + 1.42) * 4.2) % 1, fz = ((z + 0.85) * 4.2) % 1;
      return (fx > 0.18 && fz > 0.18) ? 0.2 : 0.95;               // tecla escura, vão claro
    }
    return 0.55;
  };
  face('y',  BH, +1, -BW, BW, -BD, BD, keyTex);
  face('y', -BH, -1, -BW, BW, -BD, BD, 0.3);
  face('z',  BD, +1, -BW, BW, -BH, BH, 0.5);
  face('z', -BD, -1, -BW, BW, -BH, BH, 0.5);
  face('x',  BW, +1, -BH, BH, -BD, BD, 0.5);
  face('x', -BW, -1, -BH, BH, -BD, BD, 0.5);
  boxEdges(-BW, BW, -BH, BH, -BD, BD);

  // ----- tela (articulada na borda de trás da base) -----
  const OPEN = -16 * Math.PI / 180;       // inclinação da tela para trás
  const hinge = [0, BH, -BD];
  const screenXf = (p, isNormal) => {
    let q = rotX(p, OPEN);
    return isNormal ? q : [q[0] + hinge[0], q[1] + hinge[1], q[2] + hinge[2]];
  };
  const SW = 1.6, SH = 2.05, ST = 0.05;
  const display = (x, y) => {
    const bez = 0.14;
    if (Math.abs(x) > SW - bez || y < bez || y > SH - bez) return 0.16;     // moldura escura
    // "janelas" simulando uma interface
    const inBar = y > SH - bez - 0.18;
    if (inBar) return 0.55;
    if (x > -1.25 && x < -0.2 && y > 0.5 && y < 1.5) return (Math.abs(y - 1.5) < 0.05 || Math.abs(y - 0.5) < 0.03 || Math.abs(x + 1.25) < 0.03 || Math.abs(x + 0.2) < 0.03) ? 1.0 : 0.72;
    if (x > 0.0 && x < 1.25 && y > 0.45 && y < 1.55) return ((Math.floor((y - 0.45) * 9)) % 2 === 0) ? 0.95 : 0.6;
    return 0.82;
  };
  face('z',  ST, +1, -SW, SW, 0, SH, display, screenXf);
  const lid = (x, y) => (Math.hypot(x, y - SH / 2) < 0.28 ? 1.0 : 0.62);       // logo na tampa
  face('z', -ST, -1, -SW, SW, 0, SH, lid, screenXf);
  face('y',  SH, +1, -SW, SW, -ST, ST, 0.5, screenXf);
  face('y',   0, -1, -SW, SW, -ST, ST, 0.5, screenXf);
  face('x',  SW, +1, 0, SH, -ST, ST, 0.5, screenXf);
  face('x', -SW, -1, 0, SH, -ST, ST, 0.5, screenXf);
  boxEdges(-SW, SW, 0, SH, -ST, ST, (p) => screenXf(p, false));


  // ----- caneca de café (ao lado da base) -----
  const MX = 2.35, MZ = 0.35, MR = 0.42, MH = 0.8, MY0 = -BH;
  const MTOP = MY0 + MH;
  for (let i = 0; i < 150; i++) for (let j = 0; j <= 22; j++) {
    const a = i / 150 * Math.PI * 2, y = MY0 + MH * j / 22;
    const band = (j % 11 === 0) ? 1.0 : 0.62;
    add([MX + Math.cos(a) * MR, y, MZ + Math.sin(a) * MR], [Math.cos(a), 0, Math.sin(a)], band);
  }
  for (let r = 0; r <= MR; r += STEP) for (let i = 0; i < Math.max(1, Math.round(r * 2 * Math.PI / STEP)); i++) {
    const a = i / Math.max(1, Math.round(r * 2 * Math.PI / STEP)) * Math.PI * 2;
    add([MX + Math.cos(a) * r, MTOP - 0.06, MZ + Math.sin(a) * r], [0, 1, 0], 0.18);   // café
    add([MX + Math.cos(a) * r, MY0, MZ + Math.sin(a) * r], [0, -1, 0], 0.3);
  }
  for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2;                    // borda
    pts.push([MX + Math.cos(a) * MR, MTOP, MZ + Math.sin(a) * MR, 0, 0, 0, 1.4]); }
  for (let i = 0; i <= 60; i++) { const a = -Math.PI / 2 + Math.PI * i / 60;          // alça
    for (let k = 0; k < 3; k++) pts.push([MX + MR + Math.cos(a) * 0.3 + k * 0.01, MY0 + MH / 2 + Math.sin(a) * 0.27, MZ, 0, 0, 0, 1.2]); }

  // centraliza o modelo na origem
  let cy = 0, cn = 0;
  pts.forEach(p => { cy += p[1]; cn++; });
  cy /= cn;
  pts.forEach(p => { p[1] -= cy; });
  const mugTop = [MX, MTOP - cy, MZ];

  /* ===== Render ===== */
  const out = document.getElementById('ascii-laptop');
  if (!out) return;
  let tilt = TILT_DEG * Math.PI / 180;
  const tiltIt = (p) => TILT_AXIS === 'z' ? rotZ(p, tilt) : rotX(p, -tilt);
  const L = (() => { const v = [0.35, 0.65, -0.7]; const m = Math.hypot(...v); return v.map(c => c / m); })();
  let S = ROWS / 6.9; const S0 = S;                    // escala
  const buf = new Array(COLS * ROWS), zb = new Float32Array(COLS * ROWS);

  let angle = 0;
  function frame(t) {
    const spin = angle;
    buf.fill(' '); zb.fill(Infinity);
    for (let k = 0; k < pts.length; k++) {
      const P = pts[k];
      // gira em torno do eixo próprio (Y) e depois inclui a inclinação (Z)
      let p = tiltIt(rotY([P[0], P[1], P[2]], spin));
      const isEdge = P[3] === 0 && P[4] === 0 && P[5] === 0;
      let b;
      if (isEdge) {
        b = P[6];
      } else {
        const n = tiltIt(rotY([P[3], P[4], P[5]], spin));
        // visível se a normal aponta para a câmera (câmera em z = -CAM)
        const vx = -p[0], vy = -p[1], vz = -CAM - p[2];
        if (n[0]*vx + n[1]*vy + n[2]*vz <= 0) continue;
        const d = Math.max(0, n[0]*L[0] + n[1]*L[1] + n[2]*L[2]);
        b = (0.22 + 0.78 * d) * (0.35 + 0.9 * P[6]);
      }
      const depth = p[2] + CAM;
      if (depth <= 0.1) continue;
      const sx = p[0] * CAM / depth, sy = p[1] * CAM / depth;
      const col = Math.round(COLS / 2 + sx * S * 2);
      const row = Math.round(ROWS / 2 - sy * S);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
      const idx = row * COLS + col;
      if (depth < zb[idx]) {
        zb[idx] = depth;
        const lvl = Math.max(0, Math.min(RAMP.length - 1, Math.floor(b * (RAMP.length - 1) + 0.5)));
        buf[idx] = RAMP[lvl];
      }
    }

    // vapor leve: sobe na vertical (no mundo), balançando devagar
    const base = tiltIt(rotY(mugTop, spin));
    const WISPS = 3, PER = 14, GL = ['.', ':', '~', "'", '.'];
    for (let w = 0; w < WISPS; w++) for (let k = 0; k < PER; k++) {
      const u = ((t * 0.28 + k / PER + w / WISPS * 0.37) % 1);
      const rise = 0.12 + u * 1.7;
      const wob = Math.sin(u * 7 + w * 2.1 + t * 1.3) * (0.06 + u * 0.16) + (w - 1) * 0.1;
      if (Math.sin(u * Math.PI) < 0.28) continue;          // some no começo/fim
      const p = [base[0] + wob, base[1] + rise, base[2] + Math.cos(u * 5 + w) * 0.05];
      const depth = p[2] + CAM; if (depth <= 0.1) continue;
      const col = Math.round(COLS / 2 + p[0] * CAM / depth * S * 2);
      const row = Math.round(ROWS / 2 - p[1] * CAM / depth * S);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
      const idx = row * COLS + col;
      if (depth - 0.4 < zb[idx]) { buf[idx] = GL[(k + w) % GL.length]; }
    }
    let s = '';
    for (let r = 0; r < ROWS; r++) s += buf.slice(r * COLS, (r + 1) * COLS).join('') + '\n';
    out.textContent = s;
  }

  window.__frame = (t) => { angle = t * SPIN_SPEED; frame(t); };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===== Interação: arrastar gira/inclina, roda do mouse dá zoom, duplo clique reseta ===== */
  let dragging = false, lx = 0, ly = 0, vel = 0, boost = 0;
  const el = out;
  el.style.cursor = 'grab'; el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', (e) => {
    dragging = true; lx = e.clientX; ly = e.clientY; vel = 0;
    el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing';
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    angle += dx * 0.012; vel = dx * 0.012;
    if (e.pointerType !== 'touch') tilt = Math.max(0, Math.min(80 * Math.PI / 180, tilt + dy * 0.008));
  });
  const end = () => { dragging = false; el.style.cursor = 'grab'; boost = vel * 60; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('dblclick', () => { tilt = TILT_DEG * Math.PI / 180; S = S0; boost = 0; });

  const box = out.parentElement;
  function fit() {
    const w = box.clientWidth, h = box.clientHeight;
    const fs = Math.max(5, Math.min(w / (COLS * 0.602), h * 0.86 / ROWS, 17));
    out.style.fontSize = fs + 'px';
  }
  fit(); if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box); else addEventListener('resize', fit);
  let visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(box);
  if (reduce) { frame(0); return; }
  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!dragging) { angle += (SPIN_SPEED + boost) * dt; boost *= Math.pow(0.12, dt); }  // inércia do arrasto
    if (visible) frame(now / 1000);
    requestAnimationFrame(loop);
  })(last);
})();
