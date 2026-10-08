// Aquarela viva em WebGL.
//
// Cada elemento .wc (imagem pintada) ganha um <canvas> no lugar da imagem. Um único contexto
// WebGL, fora da tela, pinta cada imagem e o resultado é copiado para o canvas dela — assim as
// camadas do DOM (nanquim por cima, zoom da porta, opacidades) continuam valendo.
//
// O shader simula a aquarela de forma contínua:
//   - a tinta chega por um "mapa de chegada" (ruído fractal com distorção de domínio, gerado
//     uma vez por imagem em baixa resolução);
//   - borda molhada: o pigmento se acumula e escurece na frente que avança;
//   - enquanto molhada, a cor escorre (campo de fluxo) e fica mais saturada; ao parar, seca;
//   - granulação do papel no nível do pixel;
//   - o cursor é uma gota d'água: empurra o pigmento, clareia o centro e deixa um anel escuro.
//
// Progresso: a variável CSS --m do elemento (registrada como <number> em global.css), a mesma
// que a versão em CSS usa. Sem WebGL, ou com movimento reduzido, nada disto roda e as máscaras
// quadro a quadro em CSS continuam.

type Item = {
  alvo: HTMLElement;            // elemento .wc (de onde vem --m)
  img: HTMLImageElement | null; // imagem substituída (null quando a fonte é um background)
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fonte: string;
  srcset: string;
  sizes: string;
  recorte: [number, number, number, number]; // x, y, largura, altura em UV da textura
  ajuste: 'cover' | 'fill';
  modo: number;                 // 0 florescer, 1 varredura (pincel)
  semente: number;
  tex: WebGLTexture | null;
  chegada: WebGLTexture | null;
  aspecto: number;              // largura/altura do conteúdo (já recortado)
  pronto: boolean;
  visivel: boolean;
  carregando: boolean;
  m: number;
  molhado: number;
  w: number; h: number;         // tamanho do buffer do canvas
  desenhado: boolean;
  estilo: string;
};

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Passo único por imagem: mapa de chegada (R), campo de fluxo (G, B).
const FRAG_CHEGADA = `
precision highp float;
varying vec2 vUv;
uniform vec2 uAsp;     // aspecto normalizado (maior lado = 1)
uniform float uSem;
uniform float uModo;
vec2 h2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
float rn(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(h2(i), f), dot(h2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(h2(i + vec2(0, 1)), f - vec2(0, 1)), dot(h2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float t = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { t += a * rn(p); p = p * 2.03 + 1.7; a *= 0.5; } return t; }
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 p = uv * uAsp + uSem;
  float chegada;
  if (uModo < 0.5) {
    vec2 w = vec2(fbm(p * 1.8), fbm(p * 1.8 + 7.3));
    vec2 pw = uv * uAsp + 0.34 * w + 0.08 * vec2(fbm(p * 6.0 + w), fbm(p * 6.0 - w));
    float t = 1e3;
    t = min(t, 0.00 + length(pw - vec2(0.22, 0.28) * uAsp) * (1.0 + 0.25 * fbm(p * 3.0)));
    t = min(t, 0.16 + length(pw - vec2(0.78, 0.52) * uAsp) * (1.0 + 0.25 * fbm(p * 3.0 + 2.0)));
    t = min(t, 0.30 + length(pw - vec2(0.40, 0.88) * uAsp) * (1.0 + 0.25 * fbm(p * 3.0 + 4.0)));
    t += 0.1 * abs(fbm(p * 7.0 + 3.0));
    chegada = t / 1.35;
  } else {
    float cerdas = 0.16 * abs(fbm(vec2(uv.x * 1.2 + uSem, uv.y * 9.0))) + 0.05 * fbm(vec2(uv.x * 2.0, uv.y * 40.0));
    float pressao = 0.07 * pow((uv.y - 0.5) * 2.0, 2.0);
    chegada = (uv.x * 0.85 + 0.06 * fbm(vec2(uv.x * 3.0, uv.y * 4.0 + 7.0)) + cerdas + pressao) / 1.2;
  }
  vec2 fluxo = vec2(fbm(p * 2.4 + 11.0), fbm(p * 2.4 + 23.0));
  gl_FragColor = vec4(clamp(chegada, 0.0, 1.0), fluxo * 0.5 + 0.5, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImg, uArr, uGrao;
uniform vec4 uRec;       // recorte da textura
uniform vec2 uRes;       // tamanho do buffer em px
uniform vec2 uAsp;
uniform float uM, uMolhado, uTempo;
uniform vec3 uGota[16];  // gotas do cursor: xy em UV, z = força
uniform float uRaio;     // raio da gota em UV (≈ 40 px na tela)
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 a = texture2D(uArr, vUv);   // gerado com y invertido: lê na mesma orientação
  float chegada = a.r;
  vec2 fluxo = a.gb * 2.0 - 1.0;

  // Frente da tinta: limiar contínuo com granulação no nível do pixel.
  float limiar = uM * 1.15 - 0.06;
  float e = (limiar - chegada) / 0.05;
  float grao = texture2D(uGrao, gl_FragCoord.xy / 256.0).r;
  float rev = smoothstep(0.0, 1.0, e + (grao - 0.5) * 0.9 * (1.0 - clamp(e - 0.5, 0.0, 1.0)));
  if (uM >= 0.999) rev = 1.0;
  if (uM <= 0.001) rev = 0.0;

  // Molhado: mais forte perto da frente; faz a cor escorrer.
  float perto = 1.0 - smoothstep(0.0, 6.0, e);
  float mol = uMolhado * (0.35 + 0.65 * perto);

  // Gotas do cursor: as gotas se fundem numa poça só (campo contínuo). A água dilui o pigmento
  // no centro e o empurra para a borda, que fica mais concentrada — como um "backrun" de aquarela.
  vec2 empurra = vec2(0.0);
  float campo = 0.0;
  for (int i = 0; i < 16; i++) {
    vec3 g = uGota[i];
    if (g.z <= 0.0) continue;
    vec2 d = (uv - g.xy) * uAsp;
    float k = g.z * exp(-dot(d, d) / (uRaio * uRaio));
    campo += k;
    empurra += d * k;
  }
  // borda irregular: o campo de fluxo e a granulação deformam a poça ("couve-flor")
  campo *= 1.0 + 0.55 * (a.g - 0.5) * 2.0 + 0.3 * (grao - 0.5);
  float anel = exp(-pow((campo - 0.42) / 0.09, 2.0));
  float centro = smoothstep(0.42, 1.3, campo);
  mol = clamp(mol + 0.5 * clamp(campo, 0.0, 1.0), 0.0, 1.0);

  vec2 desl = fluxo * 0.012 * mol + empurra * 0.35;
  vec2 tuv = uRec.xy + clamp(uv - desl, 0.0, 1.0) * uRec.zw;
  vec4 c = texture2D(uImg, tuv);           // pré-multiplicada
  vec3 cor = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);

  // Borda molhada: pigmento acumulado na frente que avança.
  float borda = uMolhado * exp(-pow((e - 0.9) / 0.75, 2.0)) * step(uM, 0.998);
  float lum = dot(cor, vec3(0.299, 0.587, 0.114));
  cor = mix(vec3(lum), cor, 1.0 + 0.45 * mol + 0.35 * borda);   // mais saturada enquanto molhada
  cor *= 1.0 - 0.07 * mol - 0.28 * borda;
  cor = pow(max(cor, vec3(1e-3)), vec3(1.0 + 0.7 * anel));       // borda da poça: pigmento concentrado (mesma cor, mais densa)
  cor = mix(cor, pow(cor, vec3(0.55)), 0.75 * centro);           // centro: água dilui o pigmento
  cor *= mix(1.0, 0.86 + 0.28 * grao, 0.5 * mol);                 // pigmento granulando no papel

  float alfa = c.a * rev;
  gl_FragColor = vec4(clamp(cor, 0.0, 1.0) * alfa, alfa);
}`;

export function iniciarAquarela(root: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const glc = document.createElement('canvas');
  const opts = { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false };
  const glOu = (glc.getContext("webgl", opts) || glc.getContext("experimental-webgl", opts)) as WebGLRenderingContext | null;
  if (!glOu) return null;
  const gl: WebGLRenderingContext = glOu;

  // ---------- programas ----------
  const compila = (tipo: number, src: string) => {
    const s = gl.createShader(tipo)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const programa = (frag: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, compila(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compila(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    return p;
  };
  let pPinta: WebGLProgram, pChegada: WebGLProgram;
  try { pPinta = programa(FRAG); pChegada = programa(FRAG_CHEGADA); } catch (e) { console.warn('aquarela-gl:', e); return null; }
  const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
  const U = {
    img: u(pPinta, 'uImg'), arr: u(pPinta, 'uArr'), grao: u(pPinta, 'uGrao'), rec: u(pPinta, 'uRec'), res: u(pPinta, 'uRes'),
    asp: u(pPinta, 'uAsp'), m: u(pPinta, 'uM'), mol: u(pPinta, 'uMolhado'), tempo: u(pPinta, 'uTempo'), gota: u(pPinta, 'uGota'), raio: u(pPinta, 'uRaio'),
  };
  const UC = { asp: u(pChegada, 'uAsp'), sem: u(pChegada, 'uSem'), modo: u(pChegada, 'uModo') };

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const textura = (repetir = false) => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    const w = repetir ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  };

  // Granulação: ruído 256² repetível (pixel a pixel, suavizado).
  const grao = textura(true);
  {
    const N = 256, d = new Uint8Array(N * N);
    let s = 12345; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const raw = new Float32Array(N * N).map(() => r());
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let t = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) t += raw[((y + j + N) % N) * N + ((x + i + N) % N)] * (i === 0 && j === 0 ? 4 : 1);
      d[y * N + x] = Math.round((t / 12) * 255);
    }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, N, N, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, d);
  }

  const fbo = gl.createFramebuffer();
  function gerarChegada(it: Item) {
    const asp = it.aspecto;
    const W = asp >= 1 ? 256 : Math.max(32, Math.round(256 * asp)), H = asp >= 1 ? Math.max(32, Math.round(256 / asp)) : 256;
    const t = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, W, H);
    gl.useProgram(pChegada);
    const ax = asp >= 1 ? 1 : asp, ay = asp >= 1 ? 1 / asp : 1;
    gl.uniform2f(UC.asp, ax, ay); gl.uniform1f(UC.sem, it.semente); gl.uniform1f(UC.modo, it.modo);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    it.chegada = t;
  }

  // ---------- itens ----------
  const itens: Item[] = [];
  let semente = 0.37;
  root.querySelectorAll<HTMLElement>('.wc:not([data-svg])').forEach(alvo => {
    if (alvo.querySelector(':scope > img[data-svg]')) return; // contêiner de SVG vetorizado: a máscara CSS revela
    let img: HTMLImageElement | null = null, fonte = '', recorte: Item['recorte'] = [0, 0, 1, 1], ajuste: Item['ajuste'] = 'fill';
    if (alvo instanceof HTMLImageElement) img = alvo;
    else img = alvo.querySelector<HTMLImageElement>(':scope > img');
    if (img) {
      fonte = img.getAttribute('src') || '';
      ajuste = getComputedStyle(img).objectFit === 'cover' ? 'cover' : 'fill';
    } else {
      const cs = getComputedStyle(alvo);
      const m = cs.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/); if (!m) return;
      fonte = m[1];
      if (cs.backgroundSize.startsWith('200%')) recorte = cs.backgroundPosition.startsWith('100%') || cs.backgroundPosition.startsWith('right') ? [0.5, 0, 0.5, 1] : [0, 0, 0.5, 1];
      else ajuste = 'cover';
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const alt = img?.alt;
    if (alt) { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', alt); } else canvas.setAttribute('aria-hidden', 'true');
    semente = (semente * 9.73 + 0.61) % 13.7;
    itens.push({
      alvo, img, canvas, ctx: canvas.getContext('2d')!, fonte, srcset: img?.srcset || '', sizes: img?.sizes || '',
      recorte, ajuste, modo: alvo.classList.contains('wc-varre') ? 1 : 0, semente,
      tex: null, chegada: null, aspecto: 1, pronto: false, visivel: false, carregando: false,
      m: -1, molhado: 0, w: 1, h: 1, desenhado: false, estilo: '',
    });
  });
  if (!itens.length) return null;

  function carregar(it: Item) {
    if (it.carregando) return; it.carregando = true;
    const im = new Image();
    if (it.srcset) { im.sizes = it.sizes; im.srcset = it.srcset; }
    im.src = it.fonte;
    im.decode().then(() => {
      it.tex = textura();
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      it.aspecto = (im.naturalWidth * it.recorte[2]) / (im.naturalHeight * it.recorte[3]);
      gerarChegada(it);
      montar(it);
    }).catch(() => { /* fica no CSS */ });
  }

  // Coloca o canvas no lugar da imagem (ou dentro do elemento com fundo).
  function montar(it: Item) {
    const c = it.canvas;
    if (it.img) {
      c.className = it.img.className + ' aq';
      c.style.cssText = it.img.style.cssText;
      it.estilo = it.img.style.cssText;
      it.img.after(c);
      it.img.classList.add('aq-oculta');
    } else {
      c.className = 'aq aq-fundo';
      c.style.objectFit = it.ajuste;
      it.alvo.prepend(c);
      it.alvo.classList.add('aq-sem-fundo');
    }
    it.alvo.classList.add('aq-alvo');
    // a imagem original agora é display:none — quem diz se está na tela é o canvas
    if (it.img) { io.unobserve(it.alvo); io.observe(c); }
    it.pronto = true;
  }

  const io = new IntersectionObserver(es => es.forEach(e => {
    const it = itens.find(i => i.alvo === e.target || i.canvas === e.target); if (!it) return;
    it.visivel = e.isIntersecting;
    if (e.isIntersecting) carregar(it);
    else if (it.pronto) liberar(it);
  }), { rootMargin: '60% 0px' });
  itens.forEach(it => io.observe(it.alvo));

  // Fora da tela, o canvas encolhe (mantendo a proporção, para não mexer no layout) e libera memória;
  // ao voltar, é redesenhado no tamanho certo.
  function liberar(it: Item) {
    it.w = 16; it.h = Math.max(1, Math.round(16 / it.aspecto));
    it.canvas.width = it.w; it.canvas.height = it.h;
    it.desenhado = false;
  }

  // ---------- gotas do cursor ----------
  const gotas: { x: number; y: number; t: number }[] = [];
  let ultima = { x: -1e4, y: -1e4 };
  addEventListener('pointermove', e => {
    if (Math.hypot(e.clientX - ultima.x, e.clientY - ultima.y) < 10) return;
    ultima = { x: e.clientX, y: e.clientY };
    gotas.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (gotas.length > 32) gotas.shift();
  }, { passive: true });
  const VIDA = 1600;
  const gotaBuf = new Float32Array(48);

  // ---------- quadro ----------
  const toque = matchMedia('(pointer: coarse)').matches;
  const dpr = Math.min(devicePixelRatio || 1, toque ? 1.5 : 2);
  const LADO = toque ? 1600 : 2048;
  let antes = performance.now();
  let maxW = 1, maxH = 1;
  let perdido = false;
  glc.addEventListener('webglcontextlost', e => { e.preventDefault(); perdido = true; desfazer(); });

  function desfazer() {
    itens.forEach(it => {
      it.canvas.remove(); it.img?.classList.remove('aq-oculta');
      it.alvo.classList.remove('aq-alvo', 'aq-sem-fundo'); it.pronto = false;
    });
  }

  function desenhar(it: Item, rect: DOMRect, agora: number) {
    // gotas em UV do conteúdo (considerando object-fit)
    let n = 0;
    let dw = rect.width, dh = rect.height, ox = 0, oy = 0;
    if (it.ajuste === 'cover') { dw = Math.max(rect.width, rect.height * it.aspecto); dh = dw / it.aspecto; ox = (rect.width - dw) / 2; oy = (rect.height - dh) / 2; }
    gotaBuf.fill(0);
    for (let i = gotas.length - 1; i >= 0 && n < 16; i--) {
      const g = gotas[i], idade = agora - g.t; if (idade > VIDA) break;
      const gu = (g.x - rect.left - ox) / dw, gv = (g.y - rect.top - oy) / dh;
      if (gu < -0.15 || gu > 1.15 || gv < -0.15 || gv > 1.15) continue;
      const f = 1 - idade / VIDA;
      gotaBuf[n * 3] = gu; gotaBuf[n * 3 + 1] = gv; gotaBuf[n * 3 + 2] = f * f; n++;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, it.w, it.h);
    gl.useProgram(pPinta);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, it.tex); gl.uniform1i(U.img, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, it.chegada); gl.uniform1i(U.arr, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, grao); gl.uniform1i(U.grao, 2);
    gl.uniform4f(U.rec, it.recorte[0], it.recorte[1], it.recorte[2], it.recorte[3]);
    gl.uniform2f(U.res, it.w, it.h);
    const asp = it.aspecto;
    gl.uniform2f(U.asp, asp >= 1 ? 1 : asp, asp >= 1 ? 1 / asp : 1);
    gl.uniform1f(U.m, it.m); gl.uniform1f(U.mol, it.molhado); gl.uniform1f(U.tempo, agora / 1000);
    gl.uniform3fv(U.gota, gotaBuf);
    gl.uniform1f(U.raio, 34 / Math.max(dw, dh));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    it.ctx.globalCompositeOperation = 'copy';
    it.ctx.drawImage(glc, 0, glc.height - it.h, it.w, it.h, 0, 0, it.w, it.h);
    it.desenhado = true;
    return n > 0;
  }

  function render() {
    if (perdido) return;
    const agora = performance.now(), dt = Math.min(0.1, (agora - antes) / 1000); antes = agora;
    const ativos = itens.filter(it => it.pronto && it.visivel);
    if (!ativos.length) return;
    // leituras
    const leituras = ativos.map(it => {
      if (it.img && it.img.style.cssText !== it.estilo) { it.estilo = it.img.style.cssText; it.canvas.style.cssText = it.estilo; }
      return { m: parseFloat(getComputedStyle(it.alvo).getPropertyValue('--m')), rect: it.canvas.getBoundingClientRect() };
    });
    const temGotas = gotas.length > 0 && agora - gotas[gotas.length - 1].t < VIDA;
    // escritas
    ativos.forEach((it, i) => {
      const { m: mNovo, rect } = leituras[i];
      if (!rect.width || !rect.height) return;
      const m = isNaN(mNovo) ? 1 : mNovo;
      const dm = it.m < 0 ? 0 : Math.abs(m - it.m);
      it.molhado = Math.max(0, Math.min(1, it.molhado + dm * 5 - dt / 1.7));
      // buffer do tamanho exibido (com zoom), em degraus para não realocar a cada quadro
      const disp = Math.max(rect.width, rect.height * it.aspecto) * dpr;
      let w = Math.min(LADO, Math.ceil(disp / 64) * 64), h = Math.round(w / it.aspecto);
      if (h > LADO) { h = LADO; w = Math.round(h * it.aspecto); }
      const redimensiona = w > it.w * 1.12 || w < it.w * 0.6;
      if (redimensiona) { it.w = w; it.h = h; it.canvas.width = w; it.canvas.height = h; }
      if (it.w > maxW || it.h > maxH) { maxW = Math.max(maxW, it.w); maxH = Math.max(maxH, it.h); glc.width = maxW; glc.height = maxH; }
      const sobGota = temGotas && gotas.some(g => agora - g.t < VIDA && g.x > rect.left - 80 && g.x < rect.right + 80 && g.y > rect.top - 80 && g.y < rect.bottom + 80);
      const muda = dm > 0.0004 || it.molhado > 0 || sobGota || redimensiona || !it.desenhado || (it as Item & { _gota?: boolean })._gota;
      it.m = m;
      if (muda) (it as Item & { _gota?: boolean })._gota = desenhar(it, rect, agora);
    });
  }

  return { render };
}
