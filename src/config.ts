// Configuração do site (equivale às props do protótipo).

export const config = {
  // Só dígitos, com 55 + DDD (ex.: 5591999999999). Vazio = pedidos caem no Direct do Instagram.
  // Pode vir da variável de ambiente PUBLIC_WHATSAPP no deploy.
  whatsapp: String(import.meta.env.PUBLIC_WHATSAPP ?? '').replace(/\D/g, ''),
  // Pétalas caindo pela tela.
  petalas: true,
  // Suavização da rolagem: "fluido" (k = .1) ou "sereno" (k = .055).
  movimento: 'fluido' as 'fluido' | 'sereno',
};

const direct = 'https://ig.me/m/porjulianacorrea';

function pedido(linha?: 'Dia a Dia' | 'Essencial' | 'Unique') {
  if (!config.whatsapp) return direct;
  const msg = linha
    ? `Olá, Juliana! Quero um arranjo ${linha} da ESMERO.`
    : 'Olá, Juliana! Quero meu arranjo da semana da ESMERO.';
  return `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`;
}

export const links = {
  semana: pedido(),
  dia: pedido('Dia a Dia'),
  essencial: pedido('Essencial'),
  unique: pedido('Unique'),
  // Consultoria segue pelo Instagram por enquanto.
  consultoria: direct,
};
