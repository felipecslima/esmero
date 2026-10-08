# Handoff: ESMERO por Juliana Corrêa — site (versão "Aquarela")

## Overview
Site de página única da ESMERO, projeto de Juliana Corrêa (advogada e designer de interiores) em Belém do Pará. Duas frentes: arranjos florais autorais (coleção semanal, sob demanda, três linhas: Dia a Dia, Essencial, Unique) e consultoria de interiores 100% online. Inclui a série "Lições de uma flor" (10 cartões).

**Objetivo único de conversão:** o visitante pede o arranjo da semana por WhatsApp (hoje cai no Instagram enquanto o número não é definido). Não há carrinho nem pagamento. O tom é de revista de bem-viver, nunca de loja.

**Direção visual:** caderno de esboços em aquarela e nanquim — papel creme texturizado, traço de tinta com leve tremor de mão, manchas de aquarela (buganvília magenta, lavanda, turquesa, verde-limão, mostarda), fotos reais "pintadas" no papel por máscaras de aquarela. Sem vídeo.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** — um protótipo que mostra aparência e comportamento pretendidos, não código de produção para copiar. A tarefa é **recriar este design no ambiente do projeto**. Como ainda não existe codebase, recomendamos:
- **Astro** (ou Next.js estático) + CSS Modules/vanilla CSS, deploy estático (Vercel/Netlify).
- Animação de rolagem: implementação própria com `requestAnimationFrame` (como no protótipo) ou **GSAP + ScrollTrigger** (recomendado para robustez: pin, scrub e suavização prontos). Lenis opcional para rolagem suave.
- Imagens otimizadas (AVIF/WebP, `srcset`), fontes self-hosted.

O protótipo é um "Design Component" (`ESMERO Aquarela.dc.html` + `support.js`, runtime React próprio). Abra `ESMERO Aquarela.dc.html` num servidor local (`npx serve .`) para ver o comportamento. Toda a lógica está na classe `Component` no `<script>` do arquivo; estilos são inline.

## Fidelity
**High-fidelity.** Cores, tipografia, espaçamentos, textos e interações são finais. Recriar fielmente.

**Textos:** todos são da Juliana e devem ser usados **exatamente** como estão no protótipo. Não reescrever, resumir, nem inventar preços, tamanhos, prazos ou depoimentos.

## Design Tokens

### Cores
| Token | Hex | Uso |
|---|---|---|
| papel | `#F3EDE2` + textura `assets/aquarela/papel.png` (repeat) | fundo geral |
| tinta | `#1F1A17` | texto, traços de nanquim |
| tinta-suave | `#5A514A` | textos secundários, anotações |
| magenta-texto | `#B8195A` | destaques em texto (contraste AA) |
| buganvília | `#D6246E` | manchas, círculos desenhados, indicador ativo |
| lavanda | `#8E79D6` | acento secundário |
| verde-limão | `#B5C42F` | acento (bullet) |
| mostarda | `#E7B422` | horizonte do fecho |
| turquesa-tinta | `#123C4A` | traço sobre a porta turquesa |
| ferragem | `#9A6A33` | dobradiças da porta |
| petróleo | `#1F4E57` | fundo **apenas** da seção Juliana |
| pêssego | `#F2C6B4` | rótulo/itálico sobre petróleo |
| sombra cartão | `0 24px 50px rgba(31,26,23,.22)` | cartões de papel |

### Tipografia (Google Fonts)
- **Cormorant Garamond** (300/400/500/600/700, itálicos) — títulos e corpo. Corpo: `clamp(18px,1.25vw,21px)`, line-height 1.55.
- **Ms Madi** — assinatura "Por Juliana Corrêa" e números manuscritos (01, 02, 03), frases sussurradas. *A fonte original da marca é uma script fina não identificada; Ms Madi é a mais próxima. Se a Juliana tiver o arquivo da fonte original, substituir.*
- **Architects Daughter** — rótulos, menu, botões, anotações de croqui. 13–15px, uppercase, letter-spacing .12–.16em.

Escala de títulos (todos `clamp`):
- H1 abertura: `clamp(40px,7.2vw,122px)`, lh .94, ls -.022em; 3ª linha itálico 300 magenta.
- H2 seção: `clamp(58px,10vw,168px)`, lh .88.
- Linhas de arranjo (crescem): Dia a Dia `clamp(56px,7vw,104px)` → Essencial `clamp(64px,9vw,144px)` → Unique `clamp(76px,12vw,200px)` (itálico 300 magenta).
- Pergunta manifesto: `clamp(56px,9.6vw,172px)` itálico.
- Frase de fecho: `clamp(46px,7.4vw,124px)`.

### Marca
"Por Juliana Corrêa" (Ms Madi, tinta) + fio vertical 1.5px + "ESMERO" (Cormorant 700). Header: 26–36px / 18–24px. Rodapé: 40–64px / 28–44px.

### Espaçamento
Gutter lateral `clamp(20px,5vw,72px)`; padding vertical de seção `clamp(90px,12vw,180px)`; largura máx. de conteúdo 1300–1360px.

## Assets
- `site/assets/` — fotos reais da Juliana (arranjos, interiores, retrato, 10 macros das lições, `colecao-mesa.jpg`). Vídeos não são usados nesta versão.
- `assets/aquarela/` — texturas **geradas proceduralmente** (PNG transparente): `buganvilia`, `buganvilia-2`, `folhagem`, `copa`, `coral`, `ceu`, `turquesa`, `lavanda`, `terracota`, `pedra`, `agua`, `pincelada`, `pincelada-lavanda`, `mascara-1/2/3` (máscaras alfa em forma de mancha), `papel` (tile 512px). Podem ser substituídas por aquarelas reais pintadas/escaneadas — recomendado se houver orçamento para ilustrador.
- Filtros SVG globais: `#ink` (feTurbulence fractalNoise baseFrequency .045, 2 oitavas, seed 4 + feDisplacementMap scale 3.2) dá o tremor do nanquim; `#rough` (baseFrequency "0.012 0.09", scale 14) para bordas de seção irregulares. Usar `filterUnits="userSpaceOnUse"` com região ampla (linhas horizontais têm bbox de altura zero).

## Screens / Seções (ordem)

1. **Cabeçalho fixo** — fundo papel 95%, linha de nanquim irregular embaixo. Links (Arranjos, Consultoria, Lições de uma flor, Juliana) só > 1180px; botão "Arranjo da semana" > 560px.
2. **Abertura (cena fixa, 430vh desktop / 380 tablet / 320 celular)** — esquerda: assinatura magenta + "Belém do Pará" + H1 de 3 linhas. Direita: desenho de fachada (viewBox 700×900): céu lavanda, parede com telhado em escamas, janela com venezianas turquesa, vaso terracota + folhagem, degraus de pedra, **porta em arco turquesa de duas folhas**, buganvília sobre o arco, anotação "primeira coleção · 22.09.2026" acima do arco. Porta: left 35.714%, top 42.222%, w 28.571%, h 48.889% do desenho; centro de zoom 50% / 66.667%.
3. **Arranjos** — rótulo "[ Edições por temporada ]", selo "Primeira coleção · 22.09.2026" circulado à mão, H2 "Arranjos florais *autorais*" (mancha lavanda atrás), texto + CTA. "do pequeno gesto à criação singular" entre dois traços. Três linhas que crescem: **Dia a Dia** em janela pequena de nanquim (com caixilho em cruz, peitoril, vaso+folhagem), **Essencial** em janela em arco com sacada de ferro e flores coral, **Unique** em foto grande com borda de aquarela + buganvília + cotas de arquiteto. Cada uma com seu botão. Três passos (Acompanhe/Escolha/Peça) como pedras sobre água, em degrau.
4. **Manifesto (cena fixa 280vh)** — sacada desenhada que se traça com a rolagem e floresce; "O que cabe no nosso *bem-viver?*" acende palavra por palavra e é circulado à mão. Depois: dois parágrafos, "Que vida queremos tornar *possível?*", sussurros manuscritos "O que nos faz bem? / O que é essencial?", bloco 01 com lista e arco pontilhado.
5. **Faixa 02 (cena fixa 220vh)** — pinceladas rosa e lavanda atravessam a tela; "02" manuscrito, "Sentir o mundo & criar com ESMERO", "maneiras mais belas de estar aqui."
6. **Consultoria** — colagem: sala (moldura de croqui), cozinha (borda de aquarela), quarto (arco); texto fixo à direita com "03", títulos, "Atendimento 100% online." circulado, botão "Quero saber mais".
7. **Lições de uma flor** — introdução em duas colunas; depois **carrossel horizontal guiado pela rolagem vertical** (cena 640vh): 10 cartões (foto macro com borda de aquarela + bilhete de papel com contorno de nanquim, levemente rotacionado). Contador "Número 01–10", indicadores (ativo vira pílula magenta 26px), setas que levam ao cartão anterior/seguinte. Cartão 10 sem título, com assinatura.
8. **Quem está por trás** — fundo petróleo com bordas irregulares; retrato em arco com contorno claro e folhagem; nome em script que se escreve; texto; "ABD 39-093".
9. **Fecho** — frase gigante que acende palavra por palavra; copa mostarda que cresce sobre linha de horizonte com reflexo; CTA + e-mail + Instagram; rodapé com marca e "Projeto experimental em construção".

## Interactions & Behavior

### Motor de rolagem
- Cada cena fixa (`data-scene`) calcula `p = clamp(-rect.top / (rect.height - vh), 0, 1)` e expõe `--p` e quatro fases suavizadas `--p1..--p4` (smoothstep de cada quarto).
- Elementos com revelação (`data-r`) recebem `--r` = smoothstep de `clamp((vh - top)/(vh*0.75))`.
- **Suavização:** todo valor faz lerp em direção ao alvo a cada frame (k = .1 "fluido" / .055 "sereno"); saltos > .35 são cortados pela metade imediatamente para não "perder referências" em rolagem rápida.
- Traços de nanquim (`data-sd`) se desenham com `pathLength=1` + `stroke-dashoffset`, escalonados por índice.

### Abertura (sequência)
- **Ao carregar (único momento orquestrado):** traços se desenham (1500ms cada, +90ms por traço), céu/turquesa/pedras se **pintam** (máscara de aquarela, 3200ms), buganvília floresce (escala .55→1 + blur 16→0, 2600ms), título sobe com blur (1700ms, delays 0/250/520/790ms). Easing de saída cúbica.
- **Ao rolar:** p 0–.14 texto some; 0–.3 aproximação leve (escala 1→1.35); .16–.38 folhas da porta se recolhem (scaleX 1→.1 + skewY ±9°, dobradiças nas bordas); a foto `colecao-mesa.jpg` aparece pelo vão da porta **com efeito de aquarela** (máscara, p .2–.54) — a foto é fixa no viewport e o vão é uma janela recortada em arco; .36–.76 zoom para dentro da porta. O desenho para de ampliar em 3.4× e se dissolve (opacidade) entre 2× e 3.4× — **não ampliar além disso** (estoura a textura da GPU e o desenho some). .78–.92 cartão de papel sobe girando; .88–.98 nota "Um projeto experimental em construção (…)".

### Efeito "pintar" (assinatura do site)
- Imagens: 3 máscaras de mancha (`mascara-1/2/3`) em posições 22% 28% / 78% 52% / 40% 88%, `mask-size` crescendo de 0 a 230–240% em tempos escalonados; ao mesmo tempo saturação .35→1 e blur 5px→0 (blur desligado em touch/aparelhos fracos).
- Água dos passos e pedras: 3 manchas varrendo da esquerda para a direita.
- Cartões das lições: pintam ao se aproximar do centro.

### Botões (hover = pintura)
Contorno desenhado com `#ink`. No hover, três pinceladas entram em sequência: rosa da esquerda (`background-size` 0→108%), rosa da direita (atraso .28), lavanda (atraso .55); progresso por lerp (~0.045/frame) para soar orgânico. Ao sair, a tinta desbota (opacidade) em vez de recolher. **Em touch** os botões se pintam ao entrar em 90% na tela e no toque. Letter-spacing .12em → .16em.

### Pétalas
7 pétalas (formas de folha CSS, magenta/rosa/lavanda/verde) caem devagar pela tela inteira, ligadas ao tempo e à rolagem. Tweak `petalas` liga/desliga.

### Responsivo
- Breakpoints: celular ≤ 560px, tablet 561–1100px, desktop > 1100px; links do menu > 1180px.
- Retrato: fachada centralizada, altura `min(vh*.56, vw*1.12)` (celular) / `vh*.6` (tablet).
- Cenas mais curtas no celular (abertura 320vh, manifesto 200vh, faixa 160vh, lições 520vh).
- Celular: botão fixo "Quero meu arranjo da semana" no rodapé da tela após 2.6 viewports, some perto do fim; nota da abertura sobe para cima do cartão.
- Usar `100svh` nas cenas fixas.
- `prefers-reduced-motion`: sem intro, valores vão direto ao alvo.

### Pedidos (WhatsApp)
Prop `whatsapp` (só dígitos, com 55 + DDD). Se preenchido, links viram `https://wa.me/<n>?text=` com mensagem por linha:
- semana: "Olá, Juliana! Quero meu arranjo da semana da ESMERO."
- linha: "Olá, Juliana! Quero um arranjo {Dia a Dia|Essencial|Unique} da ESMERO."
Sem número: `https://ig.me/m/porjulianacorrea`. Consultoria sempre Instagram por enquanto.

## State Management
- Largura da janela (breakpoints), `ready` (montagem), progresso suavizado por cena/elemento, estado de pintura por botão (`p`, `fade`, alvo), índice ativo do carrossel.
- Props/configuração: `whatsapp` (string), `petalas` (bool), `movimento` ("fluido" | "sereno").
- Sem fetch de dados. Considerar CMS leve (ex.: JSON/Markdown) para a coleção semanal e as lições.

## Contato (exato)
- quantoesmero@gmail.com
- @porjulianacorrea (https://www.instagram.com/porjulianacorrea)

## Pendências conhecidas
- Número de WhatsApp a definir.
- Confirmar a fonte original da assinatura.
- Lições: em produção, conteúdo literal no HTML (o publicador não segue caminhos gerados em JS).
- Testar em aparelhos reais (iOS Safari, Android Chrome) desempenho dos filtros SVG e máscaras.

## Files
- `ESMERO Aquarela.dc.html` — protótipo completo (template + lógica na classe `Component`).
- `support.js` — runtime do protótipo (só para visualizar; não portar).
- `assets/aquarela/` — texturas de aquarela e máscaras.
- `site/assets/` — fotos da Juliana.
