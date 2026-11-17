// Escritório isométrico desenhado só com formas (sem imagens externas).
const TILE_W = 64, TILE_H = 32, ORIGIN = { x: 480, y: 56 }, GRID = 11;
const STATE_COLOR = { idle: 0x9ca3af, working: 0xfacc15, done: 0x22c55e };
const ACTIVITY = {
  pesquisador: "🔎 Pesquisando o tema…",
  redator: "✍️ Escrevendo o post…",
  revisor: "🧐 Revisando o texto…",
};

const iso = (gx, gy) => ({
  x: ORIGIN.x + ((gx - gy) * TILE_W) / 2,
  y: ORIGIN.y + ((gx + gy) * TILE_H) / 2,
});

function poly(g, pts, fill, alpha = 1) {
  g.fillStyle(fill, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
  g.closePath();
  g.fillPath();
}

function box(g, gx, gy, w, d, h, top, left, right, z = 0) {
  const b = [iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)].map((p) => ({ x: p.x, y: p.y - z }));
  const t = b.map((p) => ({ x: p.x, y: p.y - h }));
  poly(g, [b[3], b[2], t[2], t[3]], left);
  poly(g, [b[2], b[1], t[1], t[2]], right);
  poly(g, t, top);
}

// painel na parede do fundo (plano gy = 0), de x1 a x2, alturas h1 a h2
function wallX(g, x1, x2, h1, h2, color) {
  const a = iso(x1, 0), b = iso(x2, 0);
  poly(g, [{ x: a.x, y: a.y - h1 }, { x: b.x, y: b.y - h1 }, { x: b.x, y: b.y - h2 }, { x: a.x, y: a.y - h2 }], color);
}
// painel num plano gy = gy (face voltada para a frente), de x1 a x2
function wallXAt(g, gy, x1, x2, h1, h2, color) {
  const a = iso(x1, gy), b = iso(x2, gy);
  poly(g, [{ x: a.x, y: a.y - h1 }, { x: b.x, y: b.y - h1 }, { x: b.x, y: b.y - h2 }, { x: a.x, y: a.y - h2 }], color);
}
// painel horizontal no topo de uma peça (altura h), de (x0,y0) a (x1,y1)
function topPanel(g, x0, y0, x1, y1, h, color) {
  const pts = [iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)].map((p) => ({ x: p.x, y: p.y - h }));
  poly(g, pts, color);
}
// painel na parede esquerda (plano gx = 0), de y1 a y2
function wallY(g, y1, y2, h1, h2, color) {
  const a = iso(0, y1), b = iso(0, y2);
  poly(g, [{ x: a.x, y: a.y - h1 }, { x: b.x, y: b.y - h1 }, { x: b.x, y: b.y - h2 }, { x: a.x, y: a.y - h2 }], color);
}
// painel numa face voltada para +gx (plano gx = x), de y1 a y2
function faceRight(g, x, y1, y2, h1, h2, color) {
  const a = iso(x, y1), b = iso(x, y2);
  poly(g, [{ x: a.x, y: a.y - h1 }, { x: b.x, y: b.y - h1 }, { x: b.x, y: b.y - h2 }, { x: a.x, y: a.y - h2 }], color);
}

function furn(sc, gx, gy, w, d, draw, depthY) {
  const g = sc.add.graphics().setDepth(depthY ?? iso(gx + w, gy + d).y);
  draw(g);
  return g;
}

// ---------- ilha central de mesas ----------
// side "back": agente senta atrás da mesa; "front": senta na frente (de frente para o colega)
const LAYOUT = {
  pesquisador: { gx: 4.0, gy: 4.3, side: "back" },
  redator: { gx: 5.7, gy: 4.3, side: "back" },
  revisor: { gx: 5.7, gy: 5.9, side: "front" },
};
const D = [3.9, 4.2, 7.4, 7.0]; // área ocupada pelas mesas (para desviar o caminho)
const order = []; // ordem dos agentes (para passar a tarefa adiante)

function desk(sc, gx, gy) {
  furn(sc, gx, gy, 1.6, 1, (g) => {
    box(g, gx, gy, 1.6, 1, 18, 0xc89b6d, 0xa97c50, 0x8a633d);
    box(g, gx + 0.5, gy + 0.2, 0.5, 0.1, 14, 0x1e293b, 0x0f172a, 0x0f172a);
  });
}

function drawIsland(sc) {
  [[4.0, 4.3], [5.7, 4.3], [4.0, 5.9], [5.7, 5.9]].forEach(([x, y]) => desk(sc, x, y));
  // faixa central (duas metades, para a ordem de desenho ficar correta)
  const segmento = (x0, w, soma) =>
    furn(sc, x0, 5.3, w, 0.6, (g) => {
      box(g, x0, 5.3, w, 0.6, 18, 0xd6a96e, 0xb58559, 0x946a43);
      const p = iso(x0 + w / 2, 5.6);
      g.fillStyle(0xfafafa); g.fillCircle(p.x - 6, p.y - 21, 3.2);
      g.fillStyle(0xfca5a5); g.fillCircle(p.x + 7, p.y - 21, 3.2);
    }, ORIGIN.y + soma * 16);
  segmento(4.0, 1.65, 11.7);
  segmento(5.65, 1.65, 13.4);
  obstacles.push([3.6, 3.5, 7.7, 7.7]);
}

const agents = {};
const obstacles = []; // [gx0, gy0, gx1, gy1] onde os personagens não andam
let socket, scene;

function drawRoom(sc) {
  const floor = sc.add.graphics().setDepth(-1000);
  for (let x = 0; x < GRID; x++)
    for (let y = 0; y < GRID; y++) {
      // cimento queimado: cinza médio com leve variação de tom (manchado)
      const v = ((x * 73 + y * 151) % 7) - 3;
      const c = Phaser.Display.Color.GetColor(150 + v * 3, 152 + v * 3, 155 + v * 3);
      poly(floor, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], c);
    }
  // tapete
  poly(floor, [iso(7.9, 1.2), iso(10.9, 1.2), iso(10.9, 4.6), iso(7.9, 4.6)], 0xa5b4fc, 0.55);

  // paredes
  const walls = sc.add.graphics().setDepth(-900);
  box(walls, 0, -0.2, GRID, 0.2, 60, 0x64748b, 0x475569, 0x334155);
  box(walls, -0.2, 0, 0.2, GRID, 60, 0x64748b, 0x475569, 0x334155);

  // janelas e quadro
  const deco = sc.add.graphics().setDepth(-899);
  [[1.2, 2.6], [3.4, 4.8]].forEach(([a, b]) => {
    wallX(deco, a - 0.08, b + 0.08, 18, 52, 0x94a3b8);
    wallX(deco, a, b, 20, 50, 0xbae6fd);
    wallX(deco, (a + b) / 2 - 0.03, (a + b) / 2 + 0.03, 20, 50, 0x94a3b8);
    wallX(deco, a, b, 34, 36, 0x94a3b8);
  });
  [[1.6, 3.0], [3.8, 5.2], [8.8, 10.2]].forEach(([a, b]) => {
    wallY(deco, a - 0.08, b + 0.08, 18, 52, 0x94a3b8);
    wallY(deco, a, b, 20, 50, 0xbae6fd);
    wallY(deco, (a + b) / 2 - 0.03, (a + b) / 2 + 0.03, 20, 50, 0x94a3b8);
    wallY(deco, a, b, 34, 36, 0x94a3b8);
  });
  wallX(deco, 6.2, 7.5, 20, 46, 0x1e293b);
  wallX(deco, 6.3, 7.4, 22, 44, 0xfde68a);
  wallX(deco, 6.3, 7.4, 22, 32, 0xf97316);

  // sofá + mesinha
  // (sofá virado para a TV, que fica na parede do fundo)
  furn(sc, 8.4, 3.0, 2, 1.2, (g) => {
    box(g, 8.4, 3.0, 2, 0.9, 11, 0x818cf8, 0x6366f1, 0x4f46e5);
    box(g, 8.4, 3.0, 0.25, 0.9, 19, 0x818cf8, 0x6366f1, 0x4f46e5);
    box(g, 10.15, 3.0, 0.25, 0.9, 19, 0x818cf8, 0x6366f1, 0x4f46e5);
    box(g, 8.4, 3.9, 2, 0.3, 26, 0x6366f1, 0x4f46e5, 0x4338ca);
  });
  furn(sc, 8.9, 1.7, 1.2, 0.6, (g) => {
    box(g, 8.9, 1.7, 1.2, 0.6, 8, 0xf3f4f6, 0xd1d5db, 0xb6bcc6);
    box(g, 9.1, 1.85, 0.2, 0.14, 3, 0x1f2937, 0x111827, 0x0b0f1a, 8); // controles de PS5
    box(g, 9.6, 1.85, 0.2, 0.14, 3, 0xf8fafc, 0xe2e8f0, 0xcbd5e1, 8);
  });

  // TV na parede do fundo + rack + PS5
  wallX(deco, 8.33, 9.87, 22, 58, 0x0b0f1a);
  furn(sc, 8.2, 0.15, 1.8, 0.55, (g) => {
    box(g, 8.2, 0.15, 1.8, 0.55, 12, 0x374151, 0x1f2937, 0x111827);
    box(g, 9.45, 0.28, 0.2, 0.4, 14, 0xf8fafc, 0xe2e8f0, 0xcbd5e1, 12); // PS5
    wallXAt(g, 0.68, 9.45, 9.65, 14, 24, 0x3b82f6); // luz azul do PS5
  });
  const tvG = sc.add.graphics().setDepth(-898);
  let tick = 0;
  const drawTv = () => {
    const P = (u, v) => { const a = iso(8.4 + 1.4 * u, 0); return { x: a.x, y: a.y - (26 + 30 * v) }; };
    const quad = (u0, v0, u1, v1, cor, al = 1) => poly(tvG, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], cor, al);
    tvG.clear();
    const modo = Math.floor(tick / 30) % 2; // 9 s em cada modo
    const prog = (tick % 30) / 30;
    if (modo === 0) { // YouTube
      quad(0, 0, 1, 1, 0x111111);
      quad(0.36, 0.3, 0.64, 0.7, 0xdc2626);
      poly(tvG, [P(0.46, 0.38), P(0.46, 0.62), P(0.58, 0.5)], 0xffffff);
      quad(0.08, 0.1, 0.92, 0.16, 0x4b5563);
      quad(0.08, 0.1, 0.08 + 0.84 * prog, 0.16, 0xef4444);
    } else { // PS5
      quad(0, 0, 1, 1, 0x172554);
      quad(0, 0.35 + 0.1 * Math.sin(tick / 4), 1, 0.55 + 0.1 * Math.sin(tick / 4), 0x1d4ed8, 0.6);
      const r = tick % 2 ? 4 : 3;
      [[0.5, 0.78, 0x22c55e], [0.5, 0.22, 0xec4899], [0.42, 0.5, 0x60a5fa], [0.58, 0.5, 0xef4444]].forEach(([u, v, c]) => {
        const p = P(u, v); tvG.fillStyle(c); tvG.fillCircle(p.x, p.y, r);
      });
    }
    tick++;
  };
  drawTv();
  sc.time.addEvent({ delay: 300, loop: true, callback: drawTv });
  obstacles.push([8.0, 0.0, 10.8, 4.5]);

  // plantas
  [[0.5, 0.5], [10.0, 0.5]].forEach(([gx, gy]) => {
    furn(sc, gx, gy, 0.5, 0.5, (g) => {
      box(g, gx, gy, 0.5, 0.5, 10, 0x92400e, 0x78350f, 0x7c2d12);
      const p = iso(gx + 0.25, gy + 0.25);
      g.fillStyle(0x15803d); g.fillCircle(p.x, p.y - 24, 13);
      g.fillStyle(0x16a34a); g.fillCircle(p.x - 8, p.y - 18, 10); g.fillCircle(p.x + 8, p.y - 20, 10);
      g.fillStyle(0x22c55e); g.fillCircle(p.x, p.y - 32, 9);
    });
    obstacles.push([gx - 0.3, gy - 0.3, gx + 0.9, gy + 0.9]);
  });

  // bebedouro
  furn(sc, 7.0, 0.5, 0.5, 0.5, (g) => {
    box(g, 7.0, 0.5, 0.5, 0.5, 24, 0xe0f2fe, 0xbae6fd, 0x7dd3fc);
    const p = iso(7.25, 0.75);
    g.fillStyle(0x38bdf8); g.fillCircle(p.x, p.y - 34, 8);
  });
  obstacles.push([6.7, 0.2, 7.8, 1.2]);

  // estante na parede esquerda
  furn(sc, 0.05, 5.6, 0.5, 1.8, (g) => {
    box(g, 0.05, 5.6, 0.5, 1.8, 46, 0x92400e, 0x78350f, 0x7c2d12);
    const cores = [0xef4444, 0x3b82f6, 0xfacc15, 0x22c55e];
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < 4; i++)
        faceRight(g, 0.55, 5.7 + i * 0.4, 5.95 + i * 0.4, 6 + r * 14, 15 + r * 14, cores[(i + r) % 4]);
  });
  obstacles.push([0, 5.3, 1.1, 7.7]);

  // mesa de sinuca
  const px = 1.3, py = 8.3, pw = 2.4, pd = 1.3, ph = 16;
  furn(sc, px, py, pw, pd, (g) => {
    box(g, px, py, pw, pd, ph, 0x7c4a21, 0x5b3517, 0x45290f);
    topPanel(g, px + 0.12, py + 0.12, px + pw - 0.12, py + pd - 0.12, ph, 0x15803d);
    g.fillStyle(0x111827);
    [[0.12, 0.12], [pw / 2, 0.12], [pw - 0.12, 0.12], [0.12, pd - 0.12], [pw / 2, pd - 0.12], [pw - 0.12, pd - 0.12]].forEach(([dx, dy]) => {
      const p = iso(px + dx, py + dy);
      g.fillEllipse(p.x, p.y - ph, 9, 5);
    });
    const bola = (dx, dy, cor) => {
      const p = iso(px + dx, py + dy);
      g.fillStyle(cor); g.fillCircle(p.x, p.y - ph - 2, 2.6);
    };
    bola(0.65, 0.65, 0xffffff);
    bola(1.5, 0.6, 0xfacc15); bola(1.62, 0.7, 0xef4444); bola(1.5, 0.8, 0x1f2937);
    bola(1.74, 0.6, 0x3b82f6); bola(1.74, 0.8, 0xf97316);
    // taco
    const a = iso(px + 0.2, py + 1.0), b = iso(px + 0.9, py + 0.72);
    g.lineStyle(2, 0xfde68a); g.beginPath(); g.moveTo(a.x, a.y - ph - 2); g.lineTo(b.x, b.y - ph - 2); g.strokePath();
  });
  obstacles.push([px - 0.3, py - 0.3, px + pw + 0.3, py + pd + 0.3]);

  // bar: prateleira de garrafas + balcão + bancos
  const bx = 6.0, bw = 2.4;
  furn(sc, bx, 8.7, bw, 0.3, (g) => {
    box(g, bx, 8.7, bw, 0.3, 40, 0x78350f, 0x5b2a0c, 0x451a03);
    [10, 26].forEach((h) => wallXAt(g, 9.0, bx + 0.05, bx + bw - 0.05, h + 10, h + 12, 0x451a03));
    const cores = [0x16a34a, 0xdc2626, 0xf59e0b, 0x2563eb, 0x16a34a, 0xdc2626, 0xf59e0b, 0x2563eb];
    for (let i = 0; i < 8; i++) {
      const x = bx + 0.18 + i * 0.27;
      wallXAt(g, 9.0, x, x + 0.12, 12, 22, cores[i]);
      wallXAt(g, 9.0, x, x + 0.12, 28, 38, cores[(i + 3) % 8]);
    }
  });
  furn(sc, bx, 9.4, bw, 0.7, (g) => {
    box(g, bx, 9.4, bw, 0.7, 20, 0xd6a96e, 0x92400e, 0x78350f);
    wallXAt(g, 10.1, bx + 0.05, bx + bw - 0.05, 4, 8, 0x451a03);
  });
  [6.6, 7.2, 7.8].forEach((sx) => {
    furn(sc, sx, 10.55, 0.1, 0.1, (g) => {
      const p = iso(sx, 10.55);
      g.fillStyle(0x4b5563); g.fillRect(p.x - 1.5, p.y - 15, 3, 15);
      g.fillStyle(0xef4444); g.fillEllipse(p.x, p.y - 16, 17, 8);
    });
  });
  const sp = iso(bx + bw / 2, 8.7);
  sc.add.text(sp.x, sp.y - 54, "🍺 BAR", { fontSize: "12px", color: "#fde68a", backgroundColor: "#451a03", padding: { x: 5, y: 2 } })
    .setOrigin(0.5).setDepth(iso(bx + bw, 9.0).y + 1);
  obstacles.push([bx - 0.3, 8.4, bx + bw + 0.3, 10.9]);

  drawIsland(sc);
}

function buildAgent(sc, a) {
  let L = LAYOUT[a.id];
  if (!L) { // agente sem lugar na ilha: ganha uma mesa própria
    L = { gx: a.pos[0], gy: a.pos[1], side: "back" };
    desk(sc, L.gx, L.gy);
    obstacles.push([L.gx - 0.3, L.gy - 0.2, L.gx + 1.9, L.gy + 1.3]);
  }
  const gx = L.gx, gy = L.gy;
  order.push(a.id);

  const color = Phaser.Display.Color.HexStringToColor(a.color).color;
  const shadow = sc.add.ellipse(0, 0, 22, 9, 0x000000, 0.25);
  const sprite = sc.add.container(0, 0, [
    sc.add.rectangle(-4, -5, 5, 10, 0x1f2937),
    sc.add.rectangle(4, -5, 5, 10, 0x1f2937),
    sc.add.rectangle(0, -19, 16, 18, color),
    sc.add.circle(0, -35, 8, 0xf5d0a9),
    sc.add.rectangle(0, -41, 16, 6, 0x3b2f2f),
    sc.add.circle(-3, -34, 1.2, 0x111827),
    sc.add.circle(3, -34, 1.2, 0x111827),
  ]);
  const label = sc.add
    .text(0, -56, a.name, { fontSize: "12px", color: "#fff", backgroundColor: "#0f172acc", padding: { x: 4, y: 2 } })
    .setOrigin(0.5);
  const dot = sc.add.circle(label.width / 2 + 8, -56, 5, STATE_COLOR.idle);
  const seat = { gx: gx + 0.8, gy: L.side === "front" ? gy + 1.4 : gy - 0.4 };
  const p = iso(seat.gx, seat.gy);
  const c = sc.add.container(p.x, p.y, [shadow, sprite, label, dot]);
  const bubble = sc.add
    .text(0, 0, "", { fontSize: "11px", color: "#111827", backgroundColor: "#ffffff", padding: { x: 6, y: 3 } })
    .setOrigin(0.5, 1)
    .setDepth(100000)
    .setVisible(false);

  const ag = { c, sprite, dot, bubble, seat, token: 0, move: null, bob: null, timer: null,
               seated: false, deskDepth: L.side === "front" ? iso(gx + 1.6, gy + 1).y + 1 : null,
               activity: ACTIVITY[a.id] || "Trabalhando…" };
  agents[a.id] = ag;
  setIdle(ag, Phaser.Math.Between(500, 3000));
}

// ---------- movimento e estados ----------
function startBob(a, dur, amp) {
  stopBob(a);
  a.bob = scene.tweens.add({ targets: a.sprite, y: -amp, duration: dur, yoyo: true, repeat: -1 });
}
function stopBob(a) {
  if (a.bob) { a.bob.stop(); a.bob = null; }
  a.sprite.y = 0;
}
function halt(a) {
  if (a.move) { a.move.stop(); a.move = null; }
  if (a.timer) { a.timer.remove(false); a.timer = null; }
  stopBob(a);
  a.seated = false;
  a.token++;
  return a.token;
}

// ---------- caminhos que desviam da ilha ----------
const inv = (x, y) => {
  const u = (x - ORIGIN.x) / (TILE_W / 2), v = (y - ORIGIN.y) / (TILE_H / 2);
  return { x: (u + v) / 2, y: (v - u) / 2 };
};
function hits(p, q) {
  for (let i = 1; i < 24; i++) {
    const t = i / 24, x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
    if (x > D[0] && x < D[2] && y > D[1] && y < D[3]) return true;
  }
  return false;
}
function route(p, q) {
  if (!hits(p, q)) return [q];
  const m = 0.3;
  const TL = { x: D[0] - m, y: D[1] - m }, TR = { x: D[2] + m, y: D[1] - m };
  const BL = { x: D[0] - m, y: D[3] + m }, BR = { x: D[2] + m, y: D[3] + m };
  const opcoes = [[TL], [TR], [BL], [BR], [TL, TR], [TR, TL], [BL, BR], [BR, BL], [TL, BL], [BL, TL], [TR, BR], [BR, TR]];
  let melhor = null, menor = Infinity;
  opcoes.forEach((pts) => {
    const seq = [p, ...pts, q];
    let ok = true, len = 0;
    for (let i = 0; i < seq.length - 1; i++) {
      if (hits(seq[i], seq[i + 1])) ok = false;
      len += Math.hypot(seq[i + 1].x - seq[i].x, seq[i + 1].y - seq[i].y);
    }
    if (ok && len < menor) { menor = len; melhor = [...pts, q]; }
  });
  return melhor || [q];
}
function walkPath(a, pts, token, done) {
  if (!pts.length) { if (token === a.token && done) done(); return; }
  walkTo(a, pts[0].x, pts[0].y, token, () => walkPath(a, pts.slice(1), token, done));
}

// papel que voa de um agente para o próximo (passagem da tarefa)
function handoff(id) {
  const i = order.indexOf(id);
  if (i < 1) return;
  const de = agents[order[i - 1]], para = agents[id];
  const alvo = iso(para.seat.gx, para.seat.gy);
  const papel = scene.add.rectangle(de.c.x, de.c.y - 30, 10, 13, 0xffffff).setStrokeStyle(1, 0x94a3b8).setDepth(100001);
  scene.tweens.add({
    targets: papel, x: alvo.x, y: alvo.y - 30, angle: 360, duration: 800, ease: "Sine.easeInOut",
    onComplete: () => papel.destroy(),
  });
}
function walkTo(a, gx, gy, token, done) {
  const p = iso(gx, gy);
  const dist = Phaser.Math.Distance.Between(a.c.x, a.c.y, p.x, p.y);
  startBob(a, 150, 3);
  a.move = scene.tweens.add({
    targets: a.c, x: p.x, y: p.y,
    duration: Math.max(300, (dist / 55) * 1000),
    onComplete: () => {
      a.move = null;
      stopBob(a);
      if (token === a.token && done) done();
    },
  });
}
function randomFree() {
  for (let i = 0; i < 30; i++) {
    const x = Phaser.Math.FloatBetween(0.8, GRID - 0.7), y = Phaser.Math.FloatBetween(0.8, GRID - 0.7);
    if (!obstacles.some((o) => x > o[0] && x < o[2] && y > o[1] && y < o[3])) return { x, y };
  }
  return { x: 4.5, y: 4.5 };
}
function wander(a, token) {
  if (token !== a.token) return;
  const pt = randomFree();
  walkPath(a, route(inv(a.c.x, a.c.y), pt), token, () => {
    a.timer = scene.time.delayedCall(Phaser.Math.Between(1500, 4000), () => wander(a, token));
  });
}
function setIdle(a, delay = 0) {
  const t = halt(a);
  a.bubble.setVisible(false);
  a.timer = scene.time.delayedCall(delay, () => wander(a, t));
}
function setWorking(a) {
  const t = halt(a);
  a.bubble.setText(a.activity).setVisible(true);
  const destino = { x: a.seat.gx, y: a.seat.gy };
  walkPath(a, route(inv(a.c.x, a.c.y), destino), t, () => {
    a.seated = true;
    startBob(a, 110, 2);
  });
}
function setDone(a) {
  halt(a);
  a.bubble.setText("Pronto ✔").setVisible(true);
}

function setState(id, state) {
  const a = agents[id];
  if (!a) return;
  a.dot.setFillStyle(STATE_COLOR[state]);
  if (state === "working") { handoff(id); setWorking(a); }
  else if (state === "done") setDone(a);
  else setIdle(a, Phaser.Math.Between(300, 1500));
}

class Office extends Phaser.Scene {
  async create() {
    scene = this;
    drawRoom(this);
    const list = await (await fetch("/api/agents")).json();
    document.title = `Escritório de Agentes (${list.length} agentes)`;
    list.forEach((a) => buildAgent(this, a));
    connect();
  }
  update() {
    Object.values(agents).forEach((a) => {
      a.c.setDepth(a.seated && a.deskDepth ? a.deskDepth : a.c.y);
      a.bubble.setPosition(a.c.x, a.c.y - 64);
    });
  }
}

function addCard(title, text) {
  const d = document.createElement("div");
  d.className = "card";
  d.innerHTML = `<b></b><span></span>`;
  d.querySelector("b").textContent = title;
  d.querySelector("span").textContent = text;
  document.getElementById("log").prepend(d);
}

function connect() {
  socket = new WebSocket(`ws://${location.host}/ws`);
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "status") setState(m.agent, m.state);
    if (m.type === "result") addCard(m.name, m.text);
    if (m.type === "done") {
      document.getElementById("send").disabled = false;
      setTimeout(() => Object.keys(agents).forEach((id) => setState(id, "idle")), 2500);
    }
  };
  socket.onclose = () => setTimeout(connect, 1500);
}

document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("task");
  if (!input.value.trim() || !socket || socket.readyState !== 1) return;
  document.getElementById("send").disabled = true;
  socket.send(JSON.stringify({ task: input.value }));
  addCard("Você", input.value);
  input.value = "";
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 460,
  backgroundColor: "#0f172a",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: Office,
});
