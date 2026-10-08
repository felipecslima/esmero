// Converte as aquarelas (WebP) em SVG editável/animável (rodar: node scripts/vetorizar-aquarelas.mjs).
//
// Vetoriza com vtracer (@neplex/vectorizer) em camadas de cor empilhadas e otimiza com SVGO.
// As imagens são aplicadas sobre a cor do papel antes (as bordas são semitransparentes) e a
// camada de fundo é descartada — então os SVG são feitos para ficar sobre o papel creme.
//
// Duas configurações: pinceladas soltas (flores, folhas) aguentam separação de cor mais grossa;
// lavagens suaves (céu, água, pedra…) precisam de separação fina, senão o degradê vira fundo.
import { vectorize } from '@neplex/vectorizer';
import { optimize } from 'svgo';
import sharp from 'sharp';
import fs from 'node:fs';
import { svgPathBbox } from 'svg-path-bbox';

const PINCELADAS = { colorPrecision: 6, filterSpeckle: 8, layerDifference: 16 };
const LAVAGENS = { colorPrecision: 8, filterSpeckle: 4, layerDifference: 6 };
// origem: de onde a ilustração "cresce" (em fração da imagem); movimento: balanço (plantas) ou deriva (lavagens)
const IMAGENS = {
  buganvilia: { ...PINCELADAS, origem: [0.49, 1], movimento: 'balanca', tufos: 110 },
  'buganvilia-2': { ...PINCELADAS, origem: [0.33, 0.92], movimento: 'balanca', tufos: 60 },
  folhagem: { ...PINCELADAS, origem: [0.5, 1], movimento: 'balanca', tufos: 70 },
  copa: { ...PINCELADAS, origem: [0.52, 0.95], movimento: 'balanca', tufos: 80 },
  coral: { ...PINCELADAS, origem: [0.5, 1], movimento: 'balanca', tufos: 50 },
  ceu: { ...LAVAGENS, origem: [0.22, 0.28], movimento: 'deriva', tufos: 14 },
  agua: { ...LAVAGENS, origem: [0, 0.5], movimento: 'deriva', tufos: 12 },
  pedra: { ...LAVAGENS, origem: [0, 0.5], movimento: 'deriva', tufos: 6 },
  lavanda: { ...LAVAGENS, origem: [0.4, 0.55], movimento: 'deriva', tufos: 8 },
  terracota: { ...LAVAGENS, origem: [0.5, 0.55], movimento: 'deriva', tufos: 6 },
  // pinceladas: separação um pouco mais grossa (são longas e só fazem a varredura de pincel)
  pincelada: { colorPrecision: 8, filterSpeckle: 6, layerDifference: 7, origem: [0, 0.5], soFundo: true },
  'pincelada-lavanda': { colorPrecision: 8, filterSpeckle: 6, layerDifference: 7, origem: [0, 0.5], soFundo: true },
  turquesa: { ...LAVAGENS, origem: [0.5, 0.5] },
  // versões com a transparência real (sem o papel por trás), para fundos escuros e sobre fotos
  'buganvilia-2-alfa': { ...PINCELADAS, fonte: 'buganvilia-2', alfa: true, origem: [0.33, 0.92], movimento: 'balanca', tufos: 60 },
  'folhagem-alfa': { ...PINCELADAS, fonte: 'folhagem', alfa: true, origem: [0.5, 1], movimento: 'balanca', tufos: 70 },
};

// ---------- tufos: agrupa os caminhos por proximidade sem mudar a ordem de pintura ----------
function rng(semente) { let a = semente >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function agrupar(svg, W, H, cfg) {
  const caminhos = [...svg.matchAll(/<path [^>]*\/>/g)].map(m => m[0]);
  const info = caminhos.map(p => {
    const d = p.match(/ d="([^"]+)"/)[1];
    const [x0, y0, x1, y1] = svgPathBbox(d);
    return { p, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, area: (x1 - x0) * (y1 - y0) };
  });
  const grande = W * H * 0.2; // camadas grandes = lavagem de base
  const pequenos = info.filter(i => i.area < grande);
  const k = Math.max(1, Math.min(cfg.tufos ?? 20, pequenos.length));
  const r = rng(7);
  // k-means nos centros (alguns passos bastam)
  let cs = Array.from({ length: k }, () => { const i = pequenos[Math.floor(r() * pequenos.length)]; return [i.cx, i.cy]; });
  for (let it = 0; it < 12; it++) {
    const soma = cs.map(() => [0, 0, 0]);
    for (const i of pequenos) {
      let m = 0, md = Infinity;
      cs.forEach((c, j) => { const dd = (c[0] - i.cx) ** 2 + (c[1] - i.cy) ** 2; if (dd < md) { md = dd; m = j; } });
      i.tufo = m; soma[m][0] += i.cx; soma[m][1] += i.cy; soma[m][2]++;
    }
    cs = cs.map((c, j) => (soma[j][2] ? [soma[j][0] / soma[j][2], soma[j][1] / soma[j][2]] : c));
  }
  const [ox, oy] = [cfg.origem[0] * W, cfg.origem[1] * H];
  const dmax = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - ox, y - oy)));
  const tufos = cs.map(([x, y]) => ({
    x, y,
    d: Math.min(0.85, (Math.hypot(x - ox, y - oy) / dmax) * 0.95 + r() * 0.08),
    amp: cfg.movimento === 'deriva' ? 6 + r() * 10 : 1 + r() * 2.2,
    dur: cfg.movimento === 'deriva' ? 12 + r() * 10 : 3.5 + r() * 3,
    atraso: -r() * 8,
    ang: r() * 6.283,
  }));
  const fmt = n => Math.round(n * 100) / 100;
  // uma regra por tufo (escopada pela ilustração); os caminhos só levam a classe
  const css = tufos.map((t, j) => `.il-${cfg.nome} .t${j}{--d:${fmt(t.d)};--cx:${Math.round(t.x)}px;--cy:${Math.round(t.y)}px}`).join('');
  // Cada caminho leva a classe do seu tufo — a ordem de pintura do vetorizador fica intacta
  // (a imagem vetorizada é uma pilha de camadas de cor; reagrupar mudaria o visual).
  let i = 0;
  const corpo = svg.replace(/<path [^>]*\/>/g, p => {
    const inf = info[i++];
    if (inf.area >= grande) return p.replace('<path ', '<path class="base" ');
    return p.replace('<path ', `<path class="tufo t${inf.tufo}" `);
  });
  return corpo.replace(/(<svg [^>]*>)/, `$1<style>${css}</style>`);
}
const PAPEL = [0xF3, 0xED, 0xE2];

for (const [nome, cfg] of Object.entries(process.argv[2] ? { [process.argv[2]]: IMAGENS[process.argv[2]] } : IMAGENS)) {
  const entrada = sharp(`public/aquarela/${cfg.fonte ?? nome}.webp`);
  // alfa: pixels quase transparentes viram fundo (chave); o resto mantém a cor da tinta
  const png = cfg.alfa
    ? await entrada.ensureAlpha().raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) data[i + 3] = data[i + 3] < 70 ? 0 : 255;
        return sharp(data, { raw: info }).png().toBuffer();
      })
    : await entrada.flatten({ background: '#F3EDE2' }).png().toBuffer();
  let svg = await vectorize(png, {
    ...cfg,
    colorMode: 0,      // colorido
    hierarchical: 0,   // camadas empilhadas
    mode: 2,           // curvas (spline)
    spliceThreshold: 45, cornerThreshold: 60, lengthThreshold: 4, maxIterations: 2, pathPrecision: 0,
  });
  // tira o fundo: a primeira camada (se próxima do papel) e qualquer camada da cor do papel
  let primeiro = !cfg.alfa;
  svg = svg.replace(/<path[^>]*fill="#([0-9A-Fa-f]{6})"[^>]*\/>/g, (m, hex) => {
    const c = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    const dist = Math.hypot(c[0] - PAPEL[0], c[1] - PAPEL[1], c[2] - PAPEL[2]);
    const eraPrimeiro = primeiro; primeiro = false;
    // soFundo: tons claros fazem parte da pincelada; só a camada de fundo sai
    return (!cfg.soFundo && dist < 14) || (eraPrimeiro && dist < 45) ? '' : m;
  });
  svg = optimize(svg, { multipass: true, floatPrecision: 0, plugins: [{ name: 'preset-default' }] }).data;
  // viewBox no lugar de width/height (o CSS da página dimensiona) + tufos animáveis
  const [, W, H] = svg.match(/width="(\d+)" height="(\d+)"/).map(Number);
  svg = svg.replace(/<svg ([^>]*)width="\d+" height="\d+"/, `<svg $1viewBox="0 0 ${W} ${H}" class="il il-${nome}" aria-hidden="true"`);
  // versão com transparência: camadas translúcidas se somam como veladura de aquarela
  if (cfg.alfa) svg = svg.replace(/(<svg [^>]*>)/, '$1<style>.il-alfa path{fill-opacity:.62}</style>').replace('class="il ', 'class="il il-alfa ');
  if (cfg.movimento) svg = agrupar(svg, W, H, { ...cfg, nome }).replace('class="il ', `class="il il-${cfg.movimento} `);
  fs.writeFileSync(`public/aquarela/svg/${nome}.svg`, svg);
  console.log(nome.padEnd(18), String((svg.match(/<path/g) || []).length).padStart(5), 'caminhos', String(Math.round(svg.length / 1024)).padStart(4), 'KB');
}
