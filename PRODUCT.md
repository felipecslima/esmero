# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences with equal weight:

- **Arranjos (Belém do Pará):** people in Belém who want an authorial floral arrangement for their home or as a gift. Most arrive on a phone, often from Instagram (@porjulianacorrea), to see the week's collection and order.
- **Consultoria de interiores (Brasil):** people anywhere in the country who want help making their home better to live in. The service is 100% online, so location does not limit it.

Both share the same sensibility: they care about well-being at home ("bem-viver") more than about buying a product.

## Product Purpose

ESMERO is Juliana Corrêa's project (lawyer and interior designer, Belém do Pará), with two fronts:

1. **Arranjos florais autorais:** a weekly collection on demand, in three lines (Dia a Dia, Essencial, Unique). The first collection launched on 22.09.2026.
2. **Consultoria de interiores,** fully online.

Plus the editorial series **"Lições de uma flor"** (10 cards).

Success means a visitor starts a conversation to order the week's arrangement or to ask about the consultancy. There is no cart or payment on the site; orders happen in a direct conversation.

## Positioning

An authorial practice, not a shop: one person who brings an interior designer's eye to flowers and to the home, framed as reflection on well-being ("O que cabe no nosso bem-viver?"). The tone is a well-being magazine, never a store.

## Operating Context

- Orders: WhatsApp (`wa.me`) with a message prefilled per line, once the number is set. Until then they go to the Instagram Direct (`ig.me/m/porjulianacorrea`).
- Consultancy contact: Instagram Direct for now.
- The weekly collection is announced on social media ("ao menos três composições" per week), and orders are taken while the edition lasts.
- Contact: quantoesmero@gmail.com · @porjulianacorrea.
- Static single-page site (Astro). No data fetching. A lightweight CMS (JSON/Markdown) for the weekly collection and the Lições is under consideration.

## Capabilities and Constraints

- Single page, sections in the order defined in `docs/handoff-design.md`.
- Three arrangement lines, each with its own order link. Copy is defined, but prices, sizes, and deadlines are **not** defined and must not be invented.
- **Open:** WhatsApp number. Consultancy has equal priority, but its call to action currently only goes to Instagram, and a stronger contact path is undecided. Domain. Favicon. The original signature font (Ms Madi is a stand-in).
- Must stay fast and usable on mid-range phones. Watercolour masks and SVG ink filters are the main performance risk.

## Brand Commitments

- Name: **ESMERO**, signed "Por Juliana Corrêa" (script) + vertical rule + "ESMERO".
- **All copy is Juliana's and must be used verbatim.** Do not rewrite, summarise, or add claims.
- The visual direction is final and high fidelity: a watercolour and ink sketchbook. Source of truth: `docs/handoff-design.md` and the implementation in `src/`. The prototype is archived in `material/prototipos/`.
- Registration shown on site: ABD 39-093.

## Evidence on Hand

- Real photos by Juliana: arrangements, interiors, portrait, 10 flower macros, collection table (`public/fotos/`). More raw material is in `material/`.
- Procedurally generated watercolour textures (`public/aquarela/`). These could be replaced by real scanned watercolours.
- **Absent, must not be fabricated:** testimonials, client list, press, prices, delivery areas/times, sizes.

## Product Principles

1. Invitation, not sale: every call to action is a conversation with Juliana, never a checkout.
2. Juliana's words are the product's voice. Design serves them and never edits them.
3. Two fronts, one sensibility: flowers and interiors are presented as the same practice of bem-viver.
4. Slowness is intentional, but ordering must always stay one tap away (especially on phones).
5. Honest by omission: when a fact is undecided, leave it out rather than fill it.

## Accessibility & Inclusion

WCAG 2.2 AA as the baseline: text contrast (magenta text #B8195A chosen for AA), full `prefers-reduced-motion` support, keyboard and screen-reader access to the scroll-driven scenes and the Lições carousel, Portuguese (`pt-BR`) content and alt text.
