// Gera as máscaras "quadro a quadro" da aquarela (rodar: node scripts/gerar-mascaras.mjs).
//
// Cada máscara é uma folha de quadros (sprite). Os quadros saem de um "mapa de chegada" da
// tinta: para cada ponto, quando a tinta chega até ele. O mapa nasce de distância a pontos
// de origem + ruído fractal com distorção de domínio (lóbulos, dedos) + granulação na borda,
// como pigmento assentando no papel. O CSS percorre os quadros (global.css, .wc / .paint-ink).
//
//   public/aquarela/florescer.webp  48 quadros 8×6 — mancha que se espalha (imagens, lavanda)
//   public/aquarela/pincel.webp     24 quadros 4×6 — pincel arrastado da esquerda p/ direita
import sharp from 'sharp';

// ---------- ruído (Perlin 2D com semente) ----------
function ruido(semente) {
  const p = new Uint8Array(512);
  let s = semente >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => { const a = (h & 7) * Math.PI / 4; return Math.cos(a) * x + Math.sin(a) * y; };
  const n = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return x1 + v * (x2 - x1); // ~[-0.7, 0.7]
  };
  const fbm = (x, y, oit = 5) => { let t = 0, a = 0.5, f = 1; for (let i = 0; i < oit; i++) { t += a * n(x * f, y * f); f *= 2; a *= 0.5; } return t; };
  return { n, fbm };
}

const cl = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Normaliza o mapa para [0, alcance] (alcance < 1 garante o último quadro coberto).
function normaliza(mapa, alcance) {
  let lo = Infinity, hi = -Infinity;
  for (const v of mapa) { if (v < lo) lo = v; if (v > hi) hi = v; }
  for (let i = 0; i < mapa.length; i++) mapa[i] = ((mapa[i] - lo) / (hi - lo)) * alcance;
}

async function folha({ arquivo, W, H, cols, linhas, chegada, borda, granulo }) {
  const F = cols * linhas;
  const mapa = new Float32Array(W * H), gr = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    mapa[i] = chegada(x / (W - 1), y / (H - 1));
    gr[i] = granulo(x / (W - 1), y / (H - 1));
  }
  normaliza(mapa, 0.9);
  const img = Buffer.alloc(W * cols * H * linhas * 4); // preto + alfa
  for (let f = 0; f < F; f++) {
    const t = f / (F - 1), c = f % cols, r = Math.floor(f / cols);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let a;
      if (f === 0) a = 0; else if (f === F - 1) a = 1;
      else {
        // borda macia com granulação: o pigmento chega em pontinhos antes de cobrir
        const e = (t - mapa[i]) / borda;
        a = ss(0, 1, e + (gr[i] - 0.5) * 0.9 * (1 - cl(e - 0.5)));
      }
      const o = (((r * H + y) * W * cols) + (c * W + x)) * 4;
      img[o + 3] = Math.round(a * 255);
    }
  }
  const info = await sharp(img, { raw: { width: W * cols, height: H * linhas, channels: 4 } })
    .webp({ quality: 80, alphaQuality: 70, effort: 6 })
    .toFile(arquivo);
  console.log(arquivo, `${W * cols}×${H * linhas}`, Math.round(info.size / 1024) + 'KB');
}

// ---------- florescer: três origens (as mesmas posições das manchas antigas) ----------
{
  const { fbm, n } = ruido(7);
  const origens = [[0.22, 0.28, 0], [0.78, 0.52, 0.16], [0.40, 0.88, 0.3]];
  await folha({
    arquivo: 'public/aquarela/florescer.webp', W: 288, H: 288, cols: 8, linhas: 6,
    borda: 0.05,
    chegada: (u, v) => {
      // distorção de domínio: lóbulos e "dedos" irregulares
      const wu = fbm(u * 1.8 + 1.7, v * 1.8 + 9.2), wv = fbm(u * 1.8 + 8.3, v * 1.8 + 2.8);
      const pu = u + 0.34 * wu + 0.08 * fbm(u * 6 + wu, v * 6), pv = v + 0.34 * wv + 0.08 * fbm(u * 6, v * 6 + wv);
      let a = Infinity;
      for (const [x, y, d] of origens) a = Math.min(a, d + Math.hypot(pu - x, pv - y) * (1 + 0.25 * fbm(x * 9, y * 9)));
      return a + 0.1 * Math.abs(fbm(u * 7 + 3, v * 7 + 5)) + 0.025 * n(u * 30, v * 30);
    },
    granulo: (u, v) => 0.5 + 0.9 * n(u * 70 + 11, v * 70 + 4),
  });
}

// ---------- pincel: arrasto da esquerda p/ direita, com cerdas que atrasam ----------
{
  const { fbm, n } = ruido(21);
  await folha({
    arquivo: 'public/aquarela/pincel.webp', W: 448, H: 112, cols: 4, linhas: 6,
    borda: 0.06,
    chegada: (u, v) => {
      const cerdas = 0.16 * Math.abs(fbm(u * 1.2 + 4, v * 9, 3)) + 0.05 * fbm(u * 2, v * 40, 2); // faixas atrasadas
      const pressao = 0.07 * Math.pow((v - 0.5) * 2, 2);             // o centro do pincel chega antes
      return u * 0.85 + 0.06 * fbm(u * 3, v * 4 + 7) + cerdas + pressao;
    },
    granulo: (u, v) => 0.5 + 0.8 * n(u * 18 + 2, v * 90 + 6),       // fibras no sentido do traço
  });
}
