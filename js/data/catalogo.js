/**
 * Dados de referência usados nos formulários e nos filtros.
 * Serve como sugestão: qualquer campo aceita texto livre.
 */

export const RARIDADES = [
  { id: 'comum',      nome: 'Comum',              classe: 'rar-comum',      peso: 1, dica: 'Mainline padrão, fácil de achar no mercado.' },
  { id: 'incomum',    nome: 'Incomum',            classe: 'rar-incomum',    peso: 2, dica: 'Série curta, edição de loja ou já fora de linha.' },
  { id: 'raro',       nome: 'Raro',               classe: 'rar-raro',       peso: 3, dica: 'Premium, RLC, edição limitada ou casting descontinuado.' },
  { id: 'muito-raro', nome: 'Muito raro',         classe: 'rar-muito-raro', peso: 4, dica: 'Erro de fábrica, protótipo ou tiragem muito baixa.' },
  { id: 'th',         nome: 'Treasure Hunt',      classe: 'rar-th',         peso: 4, dica: 'Chama verde no card, símbolo de círculo com chama na base.' },
  { id: 'sth',        nome: 'Super Treasure Hunt', classe: 'rar-sth',       peso: 5, dica: 'Pintura Spectraflame, rodas Real Riders e selo TH dourado.' },
];

export const MAPA_RARIDADE = Object.fromEntries(RARIDADES.map((r) => [r.id, r]));

export const CONDICOES = [
  'Lacrado (mint on card)',
  'Card amassado',
  'Aberto — como novo',
  'Aberto — usado',
  'Restaurado',
  'Danificado',
];

export const EMBALAGENS = ['No blister', 'Solto (loose)', 'Caixa', 'Sem embalagem'];

export const ESCALAS = ['1:64', '1:50', '1:43', '1:24', '1:18', 'Outra'];

export const TIPOS_RODA = [
  '5SP — 5 Spoke',
  '10SP — 10 Spoke',
  'PR5 — Pro 5',
  'MC5 — Muscle Car 5',
  'OH5 — Open Hole 5',
  'RR — Real Riders',
  'BLING',
  'Outra',
];

export const PAISES = ['Malásia', 'Tailândia', 'Indonésia', 'China', 'Índia', 'Vietnã', 'Brasil', 'Outro'];

/** Linhas/séries mais comuns — usadas como sugestão de "lote". */
export const SERIES_SUGERIDAS = [
  'HW Exotics', 'HW Race Day', 'HW Turbo', 'HW Drag Strip', 'HW Rescue', 'HW Art Cars',
  'HW Green Speed', 'HW J-Imports', 'HW Hot Trucks', 'HW Screen Time', 'HW Dream Garage',
  'HW Wagons', 'HW Muscle Mania', 'HW Speed Graphics', 'HW Off-Road', 'HW Rod Squad',
  'Baja Blazers', 'Fast & Furious', 'Boulevard', 'Car Culture', 'Team Transport',
  'Pop Culture', 'Red Line Club (RLC)', 'Monster Trucks', 'Mario Kart', 'Super Mario',
  'Track Stars', 'Nightburnerz', 'Tooned', 'Retro Racers', 'Then and Now',
];

export const MOEDAS = ['BRL', 'USD', 'EUR', 'ARS'];

export const CAMPOS_BUSCA = [
  'nome', 'modelo', 'fabricante', 'serie', 'cor', 'toyNumber', 'notas', 'local', 'tipoRoda',
];
