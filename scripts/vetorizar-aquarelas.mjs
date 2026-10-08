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

const PINCELADAS = { colorPrecision: 6, filterSpeckle: 8, layerDifference: 16 };
const LAVAGENS = { colorPrecision: 8, filterSpeckle: 4, layerDifference: 6 };
const IMAGENS = {
  buganvilia: PINCELADAS, 'buganvilia-2': PINCELADAS, folhagem: PINCELADAS, copa: PINCELADAS, coral: PINCELADAS,
  ceu: LAVAGENS, agua: LAVAGENS, pedra: LAVAGENS, lavanda: LAVAGENS, terracota: LAVAGENS,
  pincelada: LAVAGENS, 'pincelada-lavanda': LAVAGENS, turquesa: LAVAGENS,
};
const PAPEL = [0xF3, 0xED, 0xE2];

for (const [nome, cfg] of Object.entries(process.argv[2] ? { [process.argv[2]]: IMAGENS[process.argv[2]] } : IMAGENS)) {
  const png = await sharp(`public/aquarela/${nome}.webp`).flatten({ background: '#F3EDE2' }).png().toBuffer();
  let svg = await vectorize(png, {
    ...cfg,
    colorMode: 0,      // colorido
    hierarchical: 0,   // camadas empilhadas
    mode: 2,           // curvas (spline)
    spliceThreshold: 45, cornerThreshold: 60, lengthThreshold: 4, maxIterations: 2, pathPrecision: 0,
  });
  // tira o fundo: a primeira camada (se próxima do papel) e qualquer camada da cor do papel
  let primeiro = true;
  svg = svg.replace(/<path[^>]*fill="#([0-9A-Fa-f]{6})"[^>]*\/>/g, (m, hex) => {
    const c = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    const dist = Math.hypot(c[0] - PAPEL[0], c[1] - PAPEL[1], c[2] - PAPEL[2]);
    const eraPrimeiro = primeiro; primeiro = false;
    return dist < 14 || (eraPrimeiro && dist < 45) ? '' : m;
  });
  svg = optimize(svg, { multipass: true, floatPrecision: 0, plugins: [{ name: 'preset-default' }] }).data;
  fs.writeFileSync(`public/aquarela/svg/${nome}.svg`, svg);
  console.log(nome.padEnd(18), String((svg.match(/<path/g) || []).length).padStart(5), 'caminhos', String(Math.round(svg.length / 1024)).padStart(4), 'KB');
}
