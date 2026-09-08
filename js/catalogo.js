/**
 * Catálogo real de Hot Wheels.
 *
 * Os dados vêm da Hot Wheels Fandom Wiki (CC BY-SA). Um workflow do GitHub
 * Actions roda `scripts/construir-catalogo.mjs` e publica os arquivos em
 * `data/catalogo/`, então o app lê tudo da própria origem — rápido, sem CORS
 * e disponível offline depois da primeira visita.
 *
 * Se um ano ainda não tiver sido gerado, o app tenta a API da wiki ao vivo
 * usando o mesmo parser do CI.
 */

import { extrairModelos, semRepetidos } from './lib/wikitabela.mjs';

const BASE = 'data/catalogo';
const API_WIKI = 'https://hotwheels.fandom.com/api.php';
export const CREDITO = {
  nome: 'Hot Wheels Wiki (Fandom)',
  url: 'https://hotwheels.fandom.com/',
  licenca: 'CC BY-SA 3.0',
};

const cache = {
  indice: null,
  busca: null,
  anos: new Map(),
  tentouBusca: false,
};

async function pegarJSON(caminho) {
  const resposta = await fetch(caminho, { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${caminho}`);
  return resposta.json();
}

/** Metadados: anos disponíveis e total de modelos. */
export async function indice() {
  if (cache.indice) return cache.indice;
  try {
    cache.indice = await pegarJSON(`${BASE}/index.json`);
  } catch {
    cache.indice = { anos: [], totalModelos: 0, geradoEm: '', indisponivel: true };
  }
  return cache.indice;
}

export function estaDisponivel() {
  return Boolean(cache.indice && !cache.indice.indisponivel && cache.indice.anos.length);
}

/* ------------------------------- busca -------------------------------- */

function expandir(item) {
  const [modelo, ano, toy, serie, serieNumero, serieTotal, foto] = item;
  return {
    modelo,
    ano,
    toy,
    serie,
    serieNumero: serieNumero || '',
    serieTotal: serieTotal || '',
    foto: foto || '',
    wiki: `https://hotwheels.fandom.com/wiki/List_of_${ano}_Hot_Wheels`,
  };
}

async function indiceDeBusca() {
  if (cache.busca || cache.tentouBusca) return cache.busca;
  cache.tentouBusca = true;
  try {
    const dados = await pegarJSON(`${BASE}/busca.json`);
    cache.busca = dados.itens || [];
  } catch {
    cache.busca = null;
  }
  return cache.busca;
}

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca por nome do modelo ou toy number.
 * Ordena por: começa com o termo > contém o termo, e ano mais novo primeiro.
 */
export async function buscar(termo, { limite = 30, ano = '' } = {}) {
  const alvo = normalizar(termo).trim();
  if (alvo.length < 2) return [];

  const itens = await indiceDeBusca();
  if (!itens) return buscarNaWiki(termo, { limite });

  const achados = [];
  for (const item of itens) {
    if (ano && item[1] !== Number(ano)) continue;
    const nome = normalizar(item[0]);
    const toy = normalizar(item[2]);
    let peso = 0;
    if (nome === alvo || toy === alvo) peso = 4;
    else if (nome.startsWith(alvo)) peso = 3;
    else if (nome.includes(alvo)) peso = 2;
    else if (toy.includes(alvo)) peso = 1;
    if (peso) achados.push({ peso, item });
  }

  return achados
    .sort((a, b) => b.peso - a.peso || b.item[1] - a.item[1] || a.item[0].localeCompare(b.item[0]))
    .slice(0, limite)
    .map((a) => expandir(a.item));
}

/* --------------------------- listas por ano ---------------------------- */

export async function anoDoCatalogo(ano) {
  const chave = Number(ano);
  if (cache.anos.has(chave)) return cache.anos.get(chave);

  let dados = null;
  try {
    dados = await pegarJSON(`${BASE}/${chave}.json`);
  } catch {
    dados = await lerAnoNaWiki(chave);
  }

  cache.anos.set(chave, dados);
  return dados;
}

/** Modelos de uma série específica daquele ano (a "lista do lote"). */
export async function modelosDaSerie(ano, serie) {
  const dados = await anoDoCatalogo(ano);
  if (!dados?.modelos) return [];
  const alvo = normalizar(serie);
  return dados.modelos
    .filter((m) => normalizar(m.serie) === alvo || m.seriesTodas?.some((s) => normalizar(s) === alvo))
    .sort((a, b) => (Number(a.serieNumero) || 99) - (Number(b.serieNumero) || 99));
}

export async function seriesDoAno(ano) {
  const dados = await anoDoCatalogo(ano);
  return dados?.series || [];
}

export async function anosDisponiveis() {
  const meta = await indice();
  return (meta.anos || []).map((a) => a.ano);
}

/* ------------------------- consulta ao vivo ---------------------------- */

/** Reserva: lê a página da wiki direto do navegador (mesmo parser do CI). */
async function lerAnoNaWiki(ano) {
  const url = `${API_WIKI}?action=parse&page=${encodeURIComponent(`List of ${ano} Hot Wheels`)}`
    + '&prop=text&format=json&formatversion=2&redirects=1&origin=*';
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const corpo = await resposta.json();
    const modelos = semRepetidos(extrairModelos(corpo.parse?.text || '', ano));
    if (!modelos.length) return null;
    return { ano, modelos, series: [], aoVivo: true, fonte: `https://hotwheels.fandom.com/wiki/List_of_${ano}_Hot_Wheels` };
  } catch {
    return null;
  }
}

/** Reserva para a busca: pesquisa de texto na própria wiki. */
async function buscarNaWiki(termo, { limite = 20 } = {}) {
  const url = `${API_WIKI}?action=query&list=search&srsearch=${encodeURIComponent(termo)}`
    + `&srlimit=${limite}&format=json&formatversion=2&origin=*`;
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const corpo = await resposta.json();
    return (corpo.query?.search || []).map((r) => ({
      modelo: r.title,
      ano: '',
      toy: '',
      serie: '',
      serieNumero: '',
      serieTotal: '',
      foto: '',
      aoVivo: true,
      wiki: `https://hotwheels.fandom.com/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
    }));
  } catch {
    return [];
  }
}
