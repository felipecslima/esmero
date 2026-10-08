// Motor de rolagem e animações da ESMERO (porte da classe Component do protótipo).
//
// - [data-scene]  cena fixa: expõe --p e as fases suavizadas --p1..--p4
// - [data-r]      revelação ao entrar na tela: --r
// - [data-sd]     traços de nanquim que se desenham (stroke-dashoffset)
// - [data-words]  frases que acendem palavra por palavra ([data-w])
// - [data-par]    paralaxe: --c (-1 … 1, relativo ao centro da tela)
// - [data-paint]  botões que se pintam no hover / ao entrar na tela (touch)
// - [data-intro]  sequência orquestrada da abertura ao carregar
// - [data-petal]  pétalas que caem (Web Animations, no compositor)
//
// Todo valor faz lerp em direção ao alvo a cada quadro; saltos > .35 são cortados
// pela metade na hora para não "perder referências" em rolagem rápida.
// O laço de quadros só roda enquanto há algo mudando; parada, a página não gasta CPU.

type Sd = { paths: SVGPathElement[]; a: number; b: number };
type Scene = { el: HTMLElement; words: HTMLElement[]; sd: Sd[] };
type IntroItem = { el: HTMLElement | SVGElement; k: string; d: number; dur: number };
type PaintState = { p: number; f: number; t: number };
type El = HTMLElement & { _p?: number; _w?: number; _on?: boolean; _s?: HTMLElement[]; _ps?: PaintState };

const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (t: number) => t * t * (3 - 2 * t);
const out = (t: number) => 1 - Math.pow(1 - t, 3);

export function iniciar(root: HTMLElement) {
  (window as Window & { __esmero?: boolean }).__esmero = true; // ver garantia em Base.astro
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Versão leve (toque): aquarelas em imagem em vez de SVG, sem filtros de nanquim (ver Base.astro).
  const leve = document.documentElement.classList.contains('leve');
  const touch = matchMedia('(hover: none)').matches;
  const k = reduce ? 1 : root.dataset.movimento === 'sereno' ? 0.055 : 0.1;
  const cur = new WeakMap<Element, number>();
  const curC = new WeakMap<Element, number>();
  const painting = new Set<El>();

  const q = <T extends Element = El>(s: string, el: ParentNode = root) => Array.from(el.querySelectorAll<T>(s as any)) as T[];

  // ---------- Layout (alturas das cenas, fachada em retrato, aparelhos fracos) ----------
  function layout() {
    const vw = innerWidth, vh = innerHeight, portrait = vh > vw * 1.05, phone = vw <= 560, tablet = vw > 560 && vw <= 1100;
    const set = (k: string, v: string) => root.style.setProperty(k, v);
    set('--h-hero', phone ? '320vh' : tablet ? '380vh' : '430vh');
    set('--h-perg', phone ? '200vh' : '260vh');
    set('--h-banda', phone ? '160vh' : '200vh');
    set('--h-track', phone ? '520vh' : tablet ? '560vh' : '640vh');
    if (portrait) {
      const dh = Math.min(vh * (phone ? 0.56 : 0.6), vw * 1.12), dw = (dh * 7) / 9;
      set('--dh', dh + 'px'); set('--dr', (vw - dw) / 2 + (phone ? 0 : vw * 0.04) + 'px'); set('--db', '0px');
    } else {
      set('--dh', Math.min(vh, vw * 1.18) + 'px'); set('--dr', 'clamp(-30px,2vw,60px)'); set('--db', '0px');
    }
    set('--balc-o', portrait ? '.55' : '.95');
    set('--agua-h', vw < 820 ? 'calc(100% - 30px)' : '220px');
    const nav = navigator as Navigator & { hardwareConcurrency?: number };
    const low = touch || vw < 820 || (!!nav.hardwareConcurrency && nav.hardwareConcurrency <= 4);
    set('--bk', low ? '0' : '1');
  }

  // ---------- Coleta dos elementos animados ----------
  const sdOf = (el: ParentNode): Sd[] =>
    q('[data-sd]', el).map(g => ({ paths: q<SVGPathElement>('path', g), a: +(g.dataset.a || 0), b: +(g.dataset.b || 1) }));
  const scenes: Scene[] = q('[data-scene]').map(el => ({ el, words: q('[data-words]', el), sd: sdOf(el) }));
  const reveals = q('[data-r]').map(el => ({ el, sd: sdOf(el) }));
  const pars = q('[data-par]');
  const petals = q('[data-petal]');
  const cards = q('[data-card]');
  const inds = q('[data-ind]');
  const fab = root.querySelector<El>('[data-fab]');
  const cartao = root.querySelector<HTMLElement>('[data-cartao]');
  const hero = {
    draw: root.querySelector<HTMLElement>('[data-draw]'),
    front: root.querySelector<HTMLElement>('[data-front]'),
    photo: root.querySelector<HTMLElement>('[data-photo]'),
    L: root.querySelector<HTMLElement>('[data-pan="l"]'),
    R: root.querySelector<HTMLElement>('[data-pan="r"]'),
  };
  const trackScene = root.querySelector<El>('[data-scene="track"]');
  const trackEl = trackScene?.querySelector<HTMLElement>('[data-track]') ?? null;

  let dirty = true;  // algo mudou (rolagem, resize, imagem carregada)
  let moving = true; // algum valor suavizado ainda não chegou ao alvo
  let tx = 0;        // deslocamento atual do trilho das lições

  // Laço sob demanda: cada mudança pede um quadro; o quadro pede o próximo enquanto houver movimento.
  let agendado = false;
  const pedir = () => { if (!agendado) { agendado = true; requestAnimationFrame(loop); } };
  const sujar = () => { dirty = true; pedir(); };

  // ---------- Medidas que não mudam com a rolagem (refeitas em resize / fontes / imagens) ----------
  const m = { ox: 0, oy: 0, dw: 0, dh: 0, noteB: NaN, trackMax: 0, cardC: [] as number[] };
  function measure() {
    const d = hero.draw;
    if (d) {
      const cw = d.offsetWidth, ch = d.offsetHeight;
      m.ox = d.offsetLeft + 0.5 * cw; m.oy = d.offsetTop + 0.66667 * ch; m.dw = 0.28571 * cw; m.dh = 0.48889 * ch;
    }
    const card = cartao;
    m.noteB = card ? parseFloat(getComputedStyle(card).bottom) + card.offsetHeight + 16 : NaN;
    if (trackEl) {
      m.trackMax = Math.max(0, trackEl.scrollWidth - innerWidth);
      m.cardC = cards.map(c => { const b = c.getBoundingClientRect(); return b.left + b.width / 2 - tx; });
    }
    sujar();
  }

  // ---------- Abertura: único momento orquestrado ----------
  const introItems: IntroItem[] = [];
  q('[data-drawgroup]').forEach(g => {
    const base = +(g.dataset.delay || 0);
    q<SVGPathElement>('path', g).forEach((p, i) => introItems.push({ el: p, k: 'draw', d: base + i * 90, dur: 1500 }));
  });
  q('[data-intro]').forEach(el => {
    const kind = el.dataset.intro!;
    introItems.push({ el, k: kind, d: +(el.dataset.delay || 0), dur: kind === 'bloom' ? 2600 : kind === 'paint' ? 3200 : 1700 });
  });
  // A entrada só começa quando as fontes da abertura chegaram (ou após 1,5 s), para o título
  // surgir já na fonte certa em vez de trocar de fonte e "pular" no meio da animação.
  let t0 = Infinity;
  const comecar = () => { if (t0 === Infinity) t0 = performance.now(); };
  Promise.all(['400 1em "Cormorant Garamond"', 'italic 300 1em "Cormorant Garamond"', '1em "Ms Madi"', '1em "Architects Daughter"']
    .map(f => document.fonts?.load(f))).then(comecar, comecar);
  setTimeout(comecar, 1500);
  let introDone = false;

  function introTick(elapsed: number) {
    let done = true;
    introItems.forEach(it => {
      const t = cl((elapsed - it.d) / it.dur); if (t < 1) done = false;
      const e = out(t), s = it.el.style;
      if (it.k === 'draw') { s.strokeDashoffset = (1 - e).toFixed(4); return; }
      if (it.k === 'paint') { s.setProperty('--w', (1 - Math.pow(1 - t, 2.2)).toFixed(4)); return; }
      if (it.k === 'bloom' && it.el.classList.contains('il-caixa')) {
        // ilustração em SVG: os tufos crescem sozinhos a partir do progresso
        s.setProperty('--w', (1 - Math.pow(1 - t, 1.6)).toFixed(4));
        s.opacity = cl(t * 6).toFixed(3);
        s.filter = ''; s.scale = '';
        return;
      }
      if (it.k === 'bloom') {
        // Flores e folhas: a tinta se espalha (máscara), ainda molhada (leve desfoque), e assenta.
        s.setProperty('--w', (1 - Math.pow(1 - t, 2.2)).toFixed(4));
        s.opacity = cl(e * 3).toFixed(3);
        s.filter = e < 1 ? `blur(${((1 - e) * 5).toFixed(1)}px)` : '';
        s.scale = (0.86 + 0.14 * e).toFixed(4);
        return;
      }
      s.opacity = e.toFixed(3);
      s.filter = e < 1 ? `blur(${((1 - e) * 10).toFixed(1)}px)` : '';
      s.translate = `0 ${((1 - e) * 0.45).toFixed(3)}em`;
    });
    if (done) introDone = true;
  }

  // ---------- Botões que se pintam ----------
  function paintTo(b: El, t: number) {
    if (!b._ps) b._ps = { p: 0, f: 1, t: 0 };
    b._ps.t = t; if (t === 1) b._ps.f = Math.max(b._ps.f, 0.001);
    painting.add(b);
    pedir();
  }
  // Contorno que "ferve": alterna entre três versões do traço (~8 quadros/s) enquanto a tinta
  // está sendo aplicada ou o cursor está em cima; ao sair, volta ao traço de repouso.
  const tracos = ['url(#ink)', 'url(#ink-2)', 'url(#ink-3)'];
  let quadro = 0;
  function ferver(b: El, ligado: boolean) {
    if (leve) return; // sem filtro de nanquim, não há o que ferver
    const c = b.querySelector<SVGPathElement>('[data-contorno]'); if (!c) return;
    const i = ligado && !reduce ? Math.floor(quadro / 7) % 3 : 0;
    if (c.getAttribute('filter') !== tracos[i]) c.setAttribute('filter', tracos[i]);
  }
  function paintTick() {
    if (!painting.size) return;
    quadro++;
    painting.forEach(b => {
      const s = b._ps!;
      // Gesto de pincel: encosta devagar, acelera no meio do traço e assenta no fim (~0,8 s).
      if (s.t === 1) { s.p = Math.min(1, s.p + 0.01 + 0.032 * Math.sin(Math.PI * Math.min(s.p, 0.98))); s.f += (1 - s.f) * 0.25; }
      else { s.f -= 0.035; if (s.f <= 0) { s.f = 1; s.p = 0; painting.delete(b); } }
      const quente = s.t === 1 && (s.p < 0.995 || b.matches(':hover'));
      // pintado, seco e sem cursor em cima: assenta e para de ser reescrito a cada quadro
      const assentou = s.t === 1 && !quente && s.f > 0.999;
      if (assentou) s.f = 1;
      b.style.setProperty('--paint', s.p.toFixed(4));
      b.style.setProperty('--fade', Math.max(0, s.f).toFixed(4));
      ferver(b, quente);
      if (assentou) painting.delete(b);
    });
  }
  root.addEventListener('pointerover', e => {
    const b = (e.target as Element).closest?.<El>('[data-paint]'); if (b) paintTo(b, 1);
  });
  root.addEventListener('pointerout', e => {
    const b = (e.target as Element).closest?.<El>('[data-paint]');
    if (b && !b.contains(e.relatedTarget as Node)) paintTo(b, 0);
  });
  if (touch && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => paintTo(e.target as El, e.isIntersecting ? 1 : 0)), { threshold: 0.9 });
    q('[data-paint]:not([data-fab])').forEach(b => io.observe(b));
  }

  // ---------- Suavização ----------
  const lerp = (map: WeakMap<Element, number>, el: Element, t: number) => {
    let c = map.get(el);
    c = c === undefined ? t : c + (t - c) * k;
    if (Math.abs(t - c) > 0.35) c = t + (c - t) * 0.5;
    if (Math.abs(t - c) < 0.0004) c = t; else moving = true;
    map.set(el, c); return c;
  };
  const drawSd = (list: Sd[], p: number) => list.forEach(g => {
    const gp = cl((p - g.a) / (g.b - g.a)), n = g.paths.length || 1;
    g.paths.forEach((pa, i) => { const l = cl((gp - (i / n) * 0.6) / 0.4); pa.style.strokeDashoffset = (1 - l).toFixed(4); });
  });
  function words(w: El, p: number) {
    const s = w._s || (w._s = q('[data-w]', w));
    const n = s.length;
    s.forEach((sp, i) => { sp.style.opacity = (0.16 + 0.84 * cl(p * n - i)).toFixed(3); });
  }

  // ---------- Abertura ao rolar: porta abre, foto aparece, zoom para dentro ----------
  function heroTick(el: HTMLElement, p: number, vw: number, vh: number) {
    const h = hero; if (!h.draw || !h.photo) return;
    const d = h.draw, { ox, oy, dw, dh } = m;
    const z1 = ss(cl(p / 0.3)), open = ss(cl((p - 0.16) / 0.22)), z2 = Math.pow(cl((p - 0.36) / 0.4), 2.2);
    const cover = Math.max((2 * Math.max(ox, vw - ox)) / dw, (2 * Math.max(oy, vh - oy)) / dh) * 1.6;
    const s1 = 1 + 0.35 * z1, s = s1 + z2 * (cover - s1);
    // Não ampliar o desenho além de 3.4× (estoura a textura da GPU e o desenho some).
    const tr = `scale(${Math.min(s, 3.4).toFixed(4)})`;
    const fadeD = 1 - cl((s - 2) / 1.4);
    for (const layer of [d, h.front]) {
      if (!layer) continue;
      layer.style.transform = tr; layer.style.opacity = fadeD.toFixed(3); layer.style.visibility = fadeD <= 0 ? 'hidden' : 'visible';
    }
    const sx = (1 - open * 0.9).toFixed(4), sk = (open * 9).toFixed(2);
    if (h.L) h.L.style.transform = `scaleX(${sx}) skewY(${-sk}deg)`;
    if (h.R) h.R.style.transform = `scaleX(${sx}) skewY(${sk}deg)`;
    const W = dw * s - 2, H = dh * s - 2, Lx = ox - W / 2, T = oy - H / 2;
    const ph = h.photo;
    ph.style.left = Lx + 'px'; ph.style.top = T + 'px'; ph.style.width = W + 'px'; ph.style.height = H + 'px';
    ph.style.borderRadius = `${W / 2}px ${W / 2}px 0 0`;
    ph.style.opacity = cl(open * 4).toFixed(3);
    ph.style.visibility = open <= 0 ? 'hidden' : 'visible';
    ph.style.setProperty('--w', ss(cl((p - 0.2) / 0.34)).toFixed(4));
    const img = ph.firstElementChild as HTMLElement | null;
    if (img) {
      img.style.left = -Lx + 'px'; img.style.top = -T + 'px'; img.style.width = vw + 'px'; img.style.height = vh + 'px';
      img.style.transform = `scale(${(1.25 - 0.25 * z2).toFixed(4)})`;
    }
    el.style.setProperty('--t', cl(p / 0.14).toFixed(4));
    const cardV = ss(cl((p - 0.78) / 0.14));
    el.style.setProperty('--card', cardV.toFixed(4));
    // Enquanto o cartão está escondido, seu botão não recebe foco nem clique.
    if (cartao) cartao.inert = cardV < 0.5;
    el.style.setProperty('--note', ss(cl((p - 0.88) / 0.1)).toFixed(4));
    if (vw <= 760 && !isNaN(m.noteB)) el.style.setProperty('--note-b', m.noteB + 'px');
    else el.style.removeProperty('--note-b');
  }

  // ---------- Lições: carrossel horizontal guiado pela rolagem ----------
  let licaoAtual = -1;
  function track(el: HTMLElement, p: number, vw: number) {
    const tr = trackEl; if (!tr) return;
    tx = -p * m.trackMax;
    tr.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;
    const n = cards.length || 10;
    cards.forEach((c, k) => {
      // Centro do cartão = centro medido sem deslocamento + deslocamento atual do trilho
      // (a rotação e o translateY do cartão não mudam o centro horizontal).
      const d = Math.max(-1.3, Math.min(1.3, (m.cardC[k] + tx - vw / 2) / vw));
      c.style.transform = `translateY(${(Math.sin(d * Math.PI * 0.9) * -34 + Math.abs(d) * 18).toFixed(1)}px) rotate(${(d * 3).toFixed(2)}deg)`;
      const wv = cl(1.35 - (d > 0 ? d : -d * 0.3) * 1.25);
      let lw = c._w === undefined ? wv : c._w + (wv - c._w) * 0.06;
      if (Math.abs(wv - lw) < 0.0004) lw = wv; else moving = true;
      c._w = lw;
      c.style.setProperty('--w', lw.toFixed(4));
      const im = c.firstElementChild?.firstElementChild?.firstElementChild as HTMLElement | null | undefined;
      if (im) im.style.transform = `scale(1.16) translateX(${(d * -6).toFixed(2)}%)`;
    });
    const idx = Math.round(p * (n - 1));
    if (idx === licaoAtual) return; // texto e largura dos indicadores mexem no layout: só quando a lição muda
    licaoAtual = idx;
    const cnt = el.querySelector('[data-count]'); if (cnt) cnt.textContent = String(idx + 1).padStart(2, '0');
    inds.forEach((d, i) => {
      const on = i === idx;
      d.style.width = on ? '26px' : '8px'; d.style.opacity = on ? '1' : '.25'; d.style.background = on ? '#D6246E' : '#1F1A17';
    });
  }
  function go(dir: number) {
    const el = trackScene; if (!el) return;
    const n = cards.length || 10, vh = innerHeight;
    const now = Math.round((el._p || 0) * (n - 1));
    const i = Math.max(0, Math.min(n - 1, now + dir));
    const top = el.getBoundingClientRect().top + scrollY + (i / (n - 1)) * (el.offsetHeight - vh);
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
  q('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go!)));

  // ---------- Quadro a quadro ----------
  // Só recalcula cenas/revelações quando algo mudou (rolagem, resize, imagem carregada)
  // ou enquanto algum valor ainda está se aproximando do alvo.
  let vivoTick = () => {};
  function tick() {
    const vh = innerHeight, vw = innerWidth;
    // Leituras antes de qualquer escrita do quadro: ler depois de escrever forçava o navegador
    // a recalcular estilo e layout no meio do script.
    const lido = dirty || moving ? ler() : null;
    if (!introDone) introTick(performance.now() - t0);
    paintTick();
    if (lido) {
      dirty = false; moving = false;
      frame(vw, vh, lido);
    }
    vivoTick();
  }

  function ler() {
    return {
      sy: scrollY, docH: document.documentElement.scrollHeight,
      sceneR: scenes.map(s => s.el.getBoundingClientRect()),
      revealTop: reveals.map(r => r.el.getBoundingClientRect().top),
      parMid: pars.map(el => { const b = el.getBoundingClientRect(); return b.top + b.height / 2; }),
    };
  }

  function frame(vw: number, vh: number, { sy, docH, sceneR, revealTop, parMid }: ReturnType<typeof ler>) {

    if (fab) {
      const nearEnd = sy + vh > docH - vh * 0.9;
      const on = sy > vh * 2.6 && !nearEnd;
      if (fab._on !== on) {
        fab._on = on;
        fab.style.opacity = on ? '1' : '0';
        fab.style.transform = on ? 'translate(-50%,0)' : 'translate(-50%,140%)';
        fab.style.pointerEvents = on ? 'auto' : 'none';
        fab.inert = !on;
        paintTo(fab, on ? 1 : 0); // o botão se pinta ao chegar
      }
    }

    scenes.forEach(({ el, words: ws, sd }, si) => {
      const b = sceneR[si];
      const p = lerp(cur, el, cl(-b.top / Math.max(1, b.height - vh)));
      const name = el.dataset.scene;
      const e = el as El;
      if (e._p === p && name !== 'hero') return;
      e._p = p;
      el.style.setProperty('--p', p.toFixed(4));
      for (let i = 0; i < 4; i++) el.style.setProperty('--p' + (i + 1), ss(cl(p * 4 - i)).toFixed(4));
      ws.forEach(w => { const a = +(w.dataset.a || 0), z = +(w.dataset.b || 1); words(w, cl((p - a) / (z - a))); });
      drawSd(sd, p);
      if (name === 'hero') heroTick(el, p, vw, vh);
      if (name === 'track') track(el, p, vw);
    });

    reveals.forEach(({ el, sd }, ri) => {
      const p = lerp(cur, el, cl((vh - revealTop[ri]) / (vh * 0.75)));
      if (el._p === p) return; el._p = p;
      const e = ss(p);
      el.style.setProperty('--r', e.toFixed(4));
      if (sd.length) drawSd(sd, e);
      if (el.hasAttribute('data-words')) words(el, cl((p - 0.1) / 0.8));
    });

    pars.forEach((el, pi) => {
      const c = lerp(curC, el, Math.max(-1, Math.min(1, (parMid[pi] - vh / 2) / vh)));
      el.style.setProperty('--c', c.toFixed(4));
    });
  }

  // ---------- Ilustrações em SVG vivas ----------
  // Cada <img data-svg> é trocada pelo SVG vetorizado (carregado uma vez, perto de entrar na tela),
  // dentro de uma caixa HTML (.il-caixa) que herda posição, transformação e progresso da imagem.
  // Plantas balançam e lavagens derivam só enquanto o SVG está visível (.vivo). O balanço fica no
  // <svg>, em transform: com rotate/translate num SVG a animação não ia para o compositor e
  // redesenhava os milhares de caminhos a cada quadro.
  const svgs = new Map<string, Promise<string>>();
  // Só balança depois de terminar de crescer: girar enquanto os tufos ainda mudam obriga a
  // redesenhar centenas de caminhos por quadro.
  const ilVisiveis = new Set<SVGSVGElement>();
  vivoTick = () => {
    if (reduce) return;
    ilVisiveis.forEach(el => {
      const pronta = progresso(el) >= 0.999;
      if (pronta && !el.classList.contains('anima')) el.classList.add('anima'); // uma vez: depois só pausa/retoma
      el.classList.toggle('vivo', pronta);
    });
  };
  // Progresso da ilustração lido do estilo inline de quem o define (ela mesma ou um ancestral):
  // getComputedStyle a cada quadro forçava o recálculo de estilo da página.
  const progresso = (el: SVGSVGElement) => {
    const v = el.dataset.prog || '--w';
    for (let a: Element | null = el; a && a !== root; a = a.parentElement) {
      const x = (a as HTMLElement).style?.getPropertyValue(v);
      if (x) return parseFloat(x);
    }
    return 1;
  };
  const pegaSvg = (n: string) => {
    let p = svgs.get(n);
    if (!p) { p = fetch(`/aquarela/svg/${n}.svg`).then(r => (r.ok ? r.text() : Promise.reject(r.status))); svgs.set(n, p); }
    return p;
  };
  const vivas = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { ilVisiveis.add(e.target as SVGSVGElement); pedir(); } else { ilVisiveis.delete(e.target as SVGSVGElement); e.target.classList.remove('vivo'); } }), { rootMargin: '10% 0px' })
    : null;
  const trocar = (img: HTMLImageElement) => pegaSvg(img.dataset.svg!).then(txt => {
    const t = document.createElement('template'); t.innerHTML = txt.trim();
    const svg = t.content.querySelector('svg'); if (!svg || !img.isConnected) return;
    // a caixa herda posição/tamanho da imagem, mas não o desfoque/zoom da entrada (o SVG cresce por tufos)
    const caixa = document.createElement('div');
    caixa.className = 'il-caixa';
    caixa.setAttribute('style', (img.getAttribute('style') || '').replace(/(^|;)\s*(filter|scale|translate)\s*:[^;]*/g, ''));
    svg.setAttribute('style', `--m:var(${img.dataset.prog || '--w'},1)`);
    if (getComputedStyle(img).objectFit === 'fill') svg.setAttribute('preserveAspectRatio', 'none');
    svg.dataset.prog = img.dataset.prog || '--w';
    // Miolo isolado das variáveis de rolagem (.il-corpo em global.css): quando a cena em volta muda
    // --p/--r a cada quadro, só o <svg> recalcula — os centenas de caminhos, só quando --m muda.
    const corpo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    corpo.setAttribute('class', 'il-corpo');
    corpo.append(...svg.childNodes);
    svg.append(corpo);
    for (const a of ['data-intro', 'data-delay']) { const v = img.getAttribute(a); if (v !== null) caixa.setAttribute(a, v); }
    // água/pedras: em vez de crescer por tufos, a aguada é arrastada como pincel (máscara .wc-varre)
    if (img.classList.contains('wc-varre')) svg.classList.add('wc', 'wc-varre', 'il-varre');
    caixa.append(svg);
    img.replaceWith(caixa);
    introItems.forEach(it => { if (it.el === img) it.el = caixa; });
    vivas?.observe(svg);
    sujar();
  }).catch(() => raster(img)); // fica a imagem
  // Aquarela em imagem (versão leve, ou se o SVG não carregar): a máscara .wc revela a tinta.
  const raster = (img: HTMLImageElement) => { img.src = `/aquarela/${img.dataset.svg!.replace(/-alfa$/, '')}.webp`; };
  const imgsSvg = q<HTMLImageElement>('img[data-svg]');
  // Uma troca por vez, quando o navegador está ocioso (inserir centenas de caminhos de uma vez,
  // no meio da rolagem, fazia a página travar por um instante).
  const fila: HTMLImageElement[] = [];
  const ocioso = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 16));
  const proxima = () => { const img = fila.shift(); if (!img) return; trocar(img).finally(() => { if (fila.length) ocioso(proxima); }); };
  const enfileirar = (img: HTMLImageElement) => { fila.push(img); if (fila.length === 1) ocioso(proxima); };
  if ('IntersectionObserver' in window) {
    const perto = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; perto.unobserve(e.target);
      const r = e.boundingClientRect, img = e.target as HTMLImageElement;
      if (leve) raster(img);
      else if (r.top < innerHeight && r.bottom > 0) trocar(img); else enfileirar(img); // já na tela: na hora
    }), { rootMargin: '150% 0px' });
    imgsSvg.forEach(i => perto.observe(i));
  } else imgsSvg.forEach(leve ? raster : trocar);

  // Fotos das lições ficam num trilho horizontal fora da tela: libera o carregamento
  // um pouco antes de a cena chegar, para não "estourarem" ao entrar.
  if (trackScene && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      q<HTMLImageElement>('img[loading="lazy"]', trackScene).forEach(i => { i.loading = 'eager'; });
      io.disconnect();
    }, { rootMargin: '150% 0px' });
    io.observe(trackScene);
  }

  // Libera as texturas adiadas (ver global.css) quando a abertura terminou de carregar.
  const tarde = () => document.documentElement.classList.add('tarde');
  if (document.readyState === 'complete') tarde(); else addEventListener('load', tarde);

  // ---------- Pétalas: no compositor (Web Animations) ----------
  // Queda, balanço e giro rodam fora da thread principal. A rolagem só adianta o relógio da queda
  // (a pétala desce 0,1 px por px rolado, além dos 18 px/s × velocidade).
  const quedas: Animation[] = [];
  let alturaPetalas = 0, syPetalas = 0;
  const queda = (H: number) => ({ translate: ['0 -80px', `0 ${H - 80}px`] });
  function petalasAltura() {
    const H = innerHeight + 160; if (!quedas.length || H === alturaPetalas) return;
    alturaPetalas = H;
    quedas.forEach((a, i) => {
      const ef = a.effect as KeyframeEffect, dur = (H / (18 * +petals[i].dataset.s!)) * 1000;
      const antes = +(ef.getTiming().duration || 1), t = +(a.currentTime || 0);
      ef.setKeyframes(queda(H));
      ef.updateTiming({ duration: dur });
      a.currentTime = ((t % antes) / antes) * dur; // mantém a pétala onde estava
    });
  }
  if (petals.length && !reduce && 'animate' in Element.prototype) {
    const H = (alturaPetalas = innerHeight + 160);
    syPetalas = scrollY;
    petals.forEach((el, i) => {
      const s = +el.dataset.s!, v = 18 * s, forma = el.firstElementChild!;
      const a = el.animate(queda(H), { duration: (H / v) * 1000, iterations: Infinity });
      a.currentTime = ((+el.dataset.y! * H + syPetalas * 0.1 * s) / v) * 1000;
      quedas.push(a);
      const balanco = (Math.PI / (0.35 * s)) * 1000, gira = (360 / (16 * s)) * 1000, vira = (Math.PI / 0.6) * 1000;
      forma.animate({ translate: ['-50px 0', '50px 0'] }, { duration: balanco, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: -balanco * ((i * 0.37) % 1) });
      forma.animate({ rotate: ['0deg', '360deg'] }, { duration: gira, iterations: Infinity, delay: -gira * (((i * 47) % 360) / 360) });
      forma.animate({ transform: ['rotateX(-70deg)', 'rotateX(70deg)'] }, { duration: vira, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: -vira * ((i * 0.29) % 1) });
    });
    addEventListener('scroll', () => {
      const d = (((scrollY - syPetalas) * 0.1) / 18) * 1000; syPetalas = scrollY;
      if (d) quedas.forEach(a => {
        const dur = +((a.effect as KeyframeEffect).getTiming().duration || 1);
        a.currentTime = (((+(a.currentTime || 0) + d) % dur) + dur) % dur; // nunca negativo
      });
    }, { passive: true });
  }

  const relayout = () => { layout(); measure(); petalasAltura(); };
  relayout();
  addEventListener('resize', relayout);
  addEventListener('orientationchange', relayout);
  addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  addEventListener('scroll', sujar, { passive: true });
  root.addEventListener('load', sujar, true); // imagens adiadas mudam alturas
  introTick(reduce ? 1e9 : 0);
  function loop() {
    agendado = false;
    try { tick(); } catch (e) { console.error(e); }
    if (dirty || moving || !introDone || painting.size) pedir();
  }
  pedir();
}
