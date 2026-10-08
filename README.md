# ESMERO por Juliana Corrêa — site

Site de página única da ESMERO (versão "Aquarela"). Feito em [Astro](https://astro.build), gera HTML estático.
A especificação completa de design (cores, tipografia, comportamento) está em [`docs/handoff-design.md`](docs/handoff-design.md).

## Comandos

```sh
npm install      # primeira vez
npm run dev      # desenvolvimento em http://localhost:4321
npm run build    # gera o site em dist/
npm run preview  # serve o dist/ localmente
```

## Estrutura

```
src/
  config.ts            WhatsApp, pétalas, ritmo do movimento; links de pedido
  pages/index.astro    a página (ordem das seções)
  layouts/Base.astro   <head>, fontes, filtros SVG de nanquim, carrega o motor
  components/          uma seção por arquivo (Abertura, Arranjos, Pergunta, Manifesto,
                       Faixa, Consultoria, Licoes, Juliana, Fecho) + Cabecalho, Petalas…
  components/ui/       Contorno (borda de nanquim dos botões), Seta
  data/licoes.ts       textos das 10 "Lições de uma flor"
  scripts/motion.ts    motor de rolagem: cenas fixas, revelações, pintura, carrossel
  styles/global.css    base, efeito "pintar" (.wc), tinta dos botões, breakpoints
public/
  aquarela/            texturas e máscaras de aquarela (WebP; originais PNG em material/)
  fotos/               fotos da Juliana (WebP; JPG só da prévia de compartilhamento)
material/              tudo que não entra no site: protótipos originais (prototipos/),
                       pacote de handoff, zip, fotos e vídeos soltos do Instagram
```

## Pedidos por WhatsApp

Enquanto não houver número, todos os botões levam ao Direct do Instagram.
Para ativar, defina o número (só dígitos, com 55 + DDD) no deploy:

```sh
PUBLIC_WHATSAPP=5591999999999 npm run build
```

ou direto em `src/config.ts`.

## Regras

- **Textos são da Juliana**: usar exatamente como estão. Não reescrever, resumir nem inventar preços, prazos ou depoimentos.
- O efeito de aquarela das imagens é a classe `.wc` (progresso `--m`: `--w`, `--r` ou `--p1…4`). A tinta se espalha pelas máscaras quadro a quadro de `global.css` (geradas por `node scripts/gerar-mascaras.mjs`).
- Atributos `data-*` nos componentes são lidos por `scripts/motion.ts` — ver o cabeçalho do arquivo.

## Pendências

- Número de WhatsApp (aceita qualquer formato; sem o 55 ele é adicionado).
- Domínio: definir `site` em `astro.config.mjs` — sem isso a prévia de compartilhamento (og:image) não aparece no WhatsApp/Instagram.
- Favicon é provisório (o "E" do logotipo); trocar se houver uma marca reduzida.
- Foto da abertura (`colecao-mesa`): o original é 800×600; a versão no site foi ampliada 4× por IA (Real-ESRGAN, mestra em `material/`). Se a Juliana tiver o original em alta, substituir.
- Confirmar a fonte original da assinatura (hoje Ms Madi).
- Testar em aparelhos reais (iOS Safari, Android Chrome).
