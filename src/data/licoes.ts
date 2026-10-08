// Série "Lições de uma flor" — textos da Juliana, usar exatamente como estão.
// O HTML é gerado no build (conteúdo literal na página).
export interface Licao {
  n: string;
  title: string;
  img: string;
  alt: string;
  html: string;
  rot: number;
  assinatura?: boolean;
}

export const licoes: Licao[] = [
  {
    n: "01",
    title: "Sobre corpo",
    img: "licao-01.jpg",
    alt: "Anthuriums rosados em close",
    rot: -1.2,
    html: "Talvez as flores nos lembrem de algo simples: <b>o corpo percebe antes mesmo de encontrarmos palavras para o que sentimos.</b> Cores, formas e fragrâncias estimulam nossos sentidos, e o contato com as flores pode favorecer estados de relaxamento, apoiar a recuperação da atenção e contribuir para a regulação e redução do estresse.",
  },
  {
    n: "02",
    title: "Sobre atenção",
    img: "licao-02.jpg",
    alt: "Íris roxas em close",
    rot: 0.8,
    html: "Talvez então nos dissessem: <i>“preste atenção”</i>. Porque uma flor pode interromper, ainda que por um instante, o fluxo automático do cotidiano. Ao nos demorarmos diante delas, abrimos espaço para a contemplação e a apreciação. E aquilo que recebe nossa atenção passa a ocupar outro lugar em nossa experiência.",
  },
  {
    n: "03",
    title: "Sobre emoções",
    img: "licao-03.jpg",
    alt: "Orquídeas magenta em close",
    rot: -0.6,
    html: "Talvez nos lembrem também que não sentimos as coisas do mesmo jeito. Uma flor pode provocar diferentes respostas emocionais e afetivas: despertar alegria em alguém, nostalgia, tranquilidade ou estranhamento em outro. <b>Porque aquilo que encontramos fora também encontra algo que existe apenas dentro da gente.</b>",
  },
  {
    n: "04",
    title: "Sobre memória",
    img: "licao-04.jpg",
    alt: "Estrelítzias laranja em close",
    rot: 1.1,
    html: "E talvez perguntassem: <i>“O que você associa a mim?”</i> Uma espécie. Uma cor. Um perfume. Podem se tornar pistas para a memória, trazendo à tona pessoas, lugares e momentos já vividos. Às vezes, basta um simples aroma para nos transportar de volta a outro tempo.",
  },
  {
    n: "05",
    title: "Sobre simbolismos",
    img: "licao-05.jpg",
    alt: "Hortênsias azuis em close",
    rot: -0.9,
    html: "Flores atravessam culturas e épocas como símbolos de amor, celebração, boa sorte, renovação. Nós damos sentidos ao mundo e esses sentidos também participam da maneira como nos relacionamos com esse mundo.",
  },
  {
    n: "06",
    title: "Sobre cuidado",
    img: "licao-06.jpg",
    alt: "Margaridas amarelas em close",
    rot: 0.7,
    html: "Talvez dissessem: <i>“Olhe para o que me faz florescer.”</i> Luz. Água. Espaço. Tempo. Cuidado. E então a pergunta poderia voltar para nós: <b>de que condições precisamos para viver bem?</b>",
  },
  {
    n: "07",
    title: "Sobre impermanência",
    img: "licao-07.jpg",
    alt: "Tulipas laranja em close",
    rot: -1.1,
    html: "Mas uma flor também poderia nos dizer: <i>“Eu não vou permanecer assim para sempre.”</i> Ela muda. Abre-se, transforma-se, murcha. E talvez nos ensine que <b>a beleza de alguma coisa não depende de sua permanência.</b>",
  },
  {
    n: "08",
    title: "Sobre encantamento",
    img: "licao-08.jpg",
    alt: "Gardênias brancas em close",
    rot: 0.9,
    html: "E há ainda aquilo que talvez seja mais difícil de explicar: <b>o encantamento.</b> Por que uma flor pode nos maravilhar? Por que paramos para olhar algo que não precisa fazer nada por nós? Será porque ainda exista em nós uma capacidade preciosa de nos deixar tocar pela beleza que nos cerca?",
  },
  {
    n: "09",
    title: "Sobre interioridade",
    img: "licao-09.jpg",
    alt: "Dálias vinho em close",
    rot: -0.7,
    html: "E então talvez a pergunta inicial volte: <b>o que as flores têm a ver com a nossa própria interioridade?</b> Talvez tudo aquilo que sentimos diante delas, diga um pouco sobre quem somos. Sobre o que nos toca. Sobre onde está nossa atenção. Sobre o que lembramos. Sobre o que valorizamos. Sobre o que escolhemos cuidar.",
  },
  {
    n: "10",
    title: "",
    img: "licao-10.jpg",
    alt: "Mistura de rosas, lírios, orquídeas, íris e hortênsias",
    rot: 1,
    assinatura: true,
    html: "Talvez as flores nos recordem, sobretudo, que não precisamos escolher entre compreender e sentir. Acolher todas as nossas partes e permitir que o mundo nos veja por inteiro também faz parte das lições de uma flor. <i>Talvez seja por isso</i> que valha tanto a pena parar para ouvi-las de vez em quando.",
  },
];
