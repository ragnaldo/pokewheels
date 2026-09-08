/**
 * Regras de negócio do catálogo: carrinhos, fotos, lotes e estatísticas.
 * As telas só falam com este módulo — nunca com o IndexedDB direto.
 */

import { db, novoId } from './db.js';
import { prepararFoto, paraDataUrl, deDataUrl } from './imagens.js';
import { MAPA_RARIDADE } from './data/catalogo.js';

const ouvintes = new Set();

const cache = {
  carros: new Map(),
  /** metadados + miniatura; o blob grande é buscado sob demanda */
  fotos: new Map(),
  pronto: false,
};

function avisar() {
  for (const fn of ouvintes) fn();
}

export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function carroVazio() {
  return {
    id: '',
    nome: '',
    fabricante: 'Hot Wheels',
    anoModelo: '',
    anoFabricacao: '',
    toyNumber: '',
    colNumero: '',
    cor: '',
    tipoRoda: '',
    escala: '1:64',
    pais: '',
    serie: '',
    serieAno: '',
    serieNumero: '',
    serieTotal: '',
    raridade: 'comum',
    condicao: '',
    embalagem: '',
    quantidade: 1,
    valorPago: '',
    moeda: 'BRL',
    dataAquisicao: '',
    local: '',
    tags: [],
    notas: '',
    favorito: false,
    fotoCapa: '',
    fotos: [],
    // preenchido quando o carrinho vem do catálogo real da wiki
    fotoOficial: '',
    wikiUrl: '',
  };
}

export async function carregar() {
  if (cache.pronto) return;

  const [carros, fotos] = await Promise.all([db.todos('carros'), db.todos('fotos')]);
  for (const carro of carros) cache.carros.set(carro.id, carro);
  for (const foto of fotos) {
    const { blob, ...resto } = foto;
    cache.fotos.set(foto.id, resto);
  }
  cache.pronto = true;
}

/* ------------------------------ carrinhos ------------------------------ */

export function obterCarro(id) {
  return cache.carros.get(id) || null;
}

export function totalCarros() {
  return cache.carros.size;
}

function textoDeBusca(carro) {
  return [
    carro.nome, carro.fabricante, carro.serie, carro.cor, carro.toyNumber, carro.colNumero,
    carro.tipoRoda, carro.local, carro.notas, (carro.tags || []).join(' '),
    carro.anoFabricacao, carro.anoModelo,
  ].filter(Boolean).join(' ').toLowerCase();
}

const ORDENADORES = {
  recentes: (a, b) => b.criadoEm - a.criadoEm,
  antigos: (a, b) => a.criadoEm - b.criadoEm,
  nome: (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'),
  raridade: (a, b) => (MAPA_RARIDADE[b.raridade]?.peso || 0) - (MAPA_RARIDADE[a.raridade]?.peso || 0),
  serie: (a, b) => (a.serie || '~').localeCompare(b.serie || '~', 'pt-BR')
    || (Number(a.serieNumero) || 99) - (Number(b.serieNumero) || 99),
};

export function listarCarros(filtros = {}) {
  const { busca = '', raridade = '', serie = '', favoritos = false, ordem = 'recentes' } = filtros;
  const termo = busca.trim().toLowerCase();

  let itens = [...cache.carros.values()];

  if (termo) itens = itens.filter((c) => textoDeBusca(c).includes(termo));
  if (raridade) itens = itens.filter((c) => c.raridade === raridade);
  if (serie) itens = itens.filter((c) => (c.serie || '') === serie);
  if (favoritos) itens = itens.filter((c) => c.favorito);

  return itens.sort(ORDENADORES[ordem] || ORDENADORES.recentes);
}

export async function salvarCarro(dados) {
  const agora = Date.now();
  const existente = dados.id ? cache.carros.get(dados.id) : null;

  const carro = {
    ...carroVazio(),
    ...existente,
    ...dados,
    id: dados.id || novoId('carro'),
    quantidade: Math.max(1, Number(dados.quantidade) || 1),
    tags: normalizarTags(dados.tags),
    criadoEm: existente?.criadoEm || agora,
    atualizadoEm: agora,
  };

  if (!carro.nome.trim()) carro.nome = 'Sem nome';
  if (!carro.fotoCapa && carro.fotos.length) carro.fotoCapa = carro.fotos[0];

  await db.salvar('carros', carro);
  cache.carros.set(carro.id, carro);
  avisar();
  return carro;
}

export async function alternarFavorito(id) {
  const carro = cache.carros.get(id);
  if (!carro) return null;
  return salvarCarro({ ...carro, favorito: !carro.favorito });
}

export async function removerCarro(id) {
  const carro = cache.carros.get(id);
  if (!carro) return;

  await db.removerVarios('fotos', carro.fotos || []);
  for (const fotoId of carro.fotos || []) cache.fotos.delete(fotoId);

  await db.remover('carros', id);
  cache.carros.delete(id);
  avisar();
}

function normalizarTags(tags) {
  const lista = Array.isArray(tags)
    ? tags
    : String(tags || '').split(',');
  return [...new Set(lista.map((t) => t.trim()).filter(Boolean))];
}

/* -------------------------------- fotos -------------------------------- */

export function obterFoto(id) {
  return cache.fotos.get(id) || null;
}

export function fotosDoCarro(carro) {
  if (!carro) return [];
  return (carro.fotos || []).map((id) => cache.fotos.get(id)).filter(Boolean);
}

export function capaDoCarro(carro) {
  if (!carro) return null;
  return cache.fotos.get(carro.fotoCapa) || fotosDoCarro(carro)[0] || null;
}

/** Guarda a foto já processada e devolve seus metadados. */
export async function adicionarFoto(carroId, arquivo) {
  const preparada = await prepararFoto(arquivo);
  const registro = {
    id: novoId('foto'),
    carroId: carroId || '',
    criadoEm: Date.now(),
    ...preparada,
  };

  await db.salvar('fotos', registro);
  const { blob, ...meta } = registro;
  cache.fotos.set(registro.id, meta);

  if (carroId) {
    const carro = cache.carros.get(carroId);
    if (carro) {
      const atualizado = {
        ...carro,
        fotos: [...carro.fotos, registro.id],
        fotoCapa: carro.fotoCapa || registro.id,
        atualizadoEm: Date.now(),
      };
      await db.salvar('carros', atualizado);
      cache.carros.set(carro.id, atualizado);
    }
  }

  avisar();
  return meta;
}

/** Blob em tamanho cheio (não fica em memória junto com o resto). */
export async function blobDaFoto(id) {
  const registro = await db.obter('fotos', id);
  return registro?.blob || null;
}

export async function vincularFotos(carroId, fotoIds) {
  const registros = await Promise.all(fotoIds.map((id) => db.obter('fotos', id)));
  const atualizados = registros.filter(Boolean).map((r) => ({ ...r, carroId }));
  if (atualizados.length) await db.salvarVarios('fotos', atualizados);
  for (const r of atualizados) {
    const meta = cache.fotos.get(r.id);
    if (meta) meta.carroId = carroId;
  }
}

export async function removerFoto(fotoId) {
  const meta = cache.fotos.get(fotoId);
  await db.remover('fotos', fotoId);
  cache.fotos.delete(fotoId);

  if (meta?.carroId) {
    const carro = cache.carros.get(meta.carroId);
    if (carro) {
      const fotos = carro.fotos.filter((id) => id !== fotoId);
      const atualizado = {
        ...carro,
        fotos,
        fotoCapa: carro.fotoCapa === fotoId ? (fotos[0] || '') : carro.fotoCapa,
        atualizadoEm: Date.now(),
      };
      await db.salvar('carros', atualizado);
      cache.carros.set(carro.id, atualizado);
    }
  }

  avisar();
}

/** Remove fotos que ficaram órfãs (ex.: cadastro abandonado no meio). */
export async function limparFotosSoltas(ids) {
  const soltas = ids.filter((id) => {
    const meta = cache.fotos.get(id);
    return meta && !meta.carroId;
  });
  if (!soltas.length) return;
  await db.removerVarios('fotos', soltas);
  for (const id of soltas) cache.fotos.delete(id);
}

/* -------------------------------- lotes -------------------------------- */

export function chaveDoLote(carro) {
  const serie = (carro.serie || '').trim();
  if (!serie) return '';
  return carro.serieAno ? `${serie} (${carro.serieAno})` : serie;
}

/** Agrupa a coleção por série/lote, com progresso e números faltantes. */
export function listarLotes() {
  const mapa = new Map();

  for (const carro of cache.carros.values()) {
    const chave = chaveDoLote(carro);
    if (!chave) continue;

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        serie: (carro.serie || '').trim(),
        ano: carro.serieAno || '',
        carros: [],
        total: 0,
      });
    }

    const lote = mapa.get(chave);
    lote.carros.push(carro);
    lote.total = Math.max(lote.total, Number(carro.serieTotal) || 0);
  }

  const lotes = [...mapa.values()];

  for (const lote of lotes) {
    lote.carros.sort((a, b) => (Number(a.serieNumero) || 99) - (Number(b.serieNumero) || 99));
    const tenho = new Set(lote.carros.map((c) => Number(c.serieNumero)).filter(Boolean));
    lote.tenho = tenho;
    lote.faltantes = lote.total
      ? Array.from({ length: lote.total }, (_, i) => i + 1).filter((n) => !tenho.has(n))
      : [];
    lote.completo = Boolean(lote.total) && lote.faltantes.length === 0;
  }

  return lotes.sort((a, b) => b.carros.length - a.carros.length || a.chave.localeCompare(b.chave, 'pt-BR'));
}

export function obterLote(chave) {
  return listarLotes().find((l) => l.chave === chave) || null;
}

/** Os outros carrinhos que vieram no mesmo lote (exclui o próprio). */
export function irmaosDeLote(carro) {
  const chave = chaveDoLote(carro);
  if (!chave) return { lote: null, irmaos: [] };
  const lote = obterLote(chave);
  if (!lote) return { lote: null, irmaos: [] };
  return { lote, irmaos: lote.carros.filter((c) => c.id !== carro.id) };
}

export function seriesConhecidas() {
  const nomes = new Set();
  for (const carro of cache.carros.values()) {
    if (carro.serie) nomes.add(carro.serie.trim());
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/* ---------------------------- estatísticas ----------------------------- */

export function estatisticas() {
  const carros = [...cache.carros.values()];
  const porRaridade = new Map();
  const porAno = new Map();
  let unidades = 0;
  let investido = 0;
  let comFoto = 0;

  for (const carro of carros) {
    const qtd = Number(carro.quantidade) || 1;
    unidades += qtd;
    investido += (Number(carro.valorPago) || 0) * qtd;
    if (carro.fotos.length) comFoto += 1;

    porRaridade.set(carro.raridade, (porRaridade.get(carro.raridade) || 0) + 1);
    if (carro.anoFabricacao) porAno.set(carro.anoFabricacao, (porAno.get(carro.anoFabricacao) || 0) + 1);
  }

  const lotes = listarLotes();

  return {
    modelos: carros.length,
    unidades,
    investido,
    comFoto,
    favoritos: carros.filter((c) => c.favorito).length,
    tesouros: carros.filter((c) => c.raridade === 'th' || c.raridade === 'sth').length,
    lotes: lotes.length,
    lotesCompletos: lotes.filter((l) => l.completo).length,
    porRaridade,
    porAno: [...porAno.entries()].sort((a, b) => b[0].localeCompare(a[0])),
    fotos: cache.fotos.size,
    bytesFotos: [...cache.fotos.values()].reduce((s, f) => s + (f.bytes || 0), 0),
  };
}

/* ------------------------- backup e restauração ------------------------- */

export async function exportarJSON({ comFotos = true } = {}) {
  const carros = [...cache.carros.values()];
  const fotos = [];

  if (comFotos) {
    for (const meta of cache.fotos.values()) {
      const blob = await blobDaFoto(meta.id);
      if (!blob) continue;
      fotos.push({
        id: meta.id,
        carroId: meta.carroId,
        criadoEm: meta.criadoEm,
        largura: meta.largura,
        altura: meta.altura,
        bytes: meta.bytes,
        dados: await paraDataUrl(blob),
      });
    }
  }

  return {
    app: 'pokewheels',
    versao: 1,
    exportadoEm: new Date().toISOString(),
    carros: comFotos ? carros : carros.map((c) => ({ ...c, fotos: [], fotoCapa: '' })),
    fotos,
  };
}

export async function importarJSON(conteudo, { substituir = false } = {}) {
  if (!conteudo || conteudo.app !== 'pokewheels' || !Array.isArray(conteudo.carros)) {
    throw new Error('Arquivo de backup inválido.');
  }

  if (substituir) {
    await db.limpar(['carros', 'fotos']);
    cache.carros.clear();
    cache.fotos.clear();
  }

  const fotos = [];
  for (const foto of conteudo.fotos || []) {
    if (!foto.dados) continue;
    const blob = await deDataUrl(foto.dados);
    const preparada = await prepararFoto(blob);
    fotos.push({
      id: foto.id,
      carroId: foto.carroId || '',
      criadoEm: foto.criadoEm || Date.now(),
      ...preparada,
    });
  }

  const carros = conteudo.carros.map((c) => ({ ...carroVazio(), ...c, tags: normalizarTags(c.tags) }));

  if (fotos.length) await db.salvarVarios('fotos', fotos);
  if (carros.length) await db.salvarVarios('carros', carros);

  for (const f of fotos) {
    const { blob, ...meta } = f;
    cache.fotos.set(f.id, meta);
  }
  for (const c of carros) cache.carros.set(c.id, c);

  avisar();
  return { carros: carros.length, fotos: fotos.length };
}

export async function apagarTudo() {
  await db.limpar(['carros', 'fotos']);
  cache.carros.clear();
  cache.fotos.clear();
  avisar();
}
