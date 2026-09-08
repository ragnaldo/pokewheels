/**
 * Gera o catálogo real do PokeWheels a partir da Hot Wheels Fandom Wiki.
 *
 *   node scripts/construir-catalogo.mjs --de=2010 --ate=2026
 *
 * Escreve data/catalogo/<ano>.json (lista completa do ano), data/catalogo/busca.json
 * (índice compacto para a busca do app) e data/catalogo/index.json (metadados).
 * O conteúdo da wiki é CC BY-SA; a atribuição vai junto nos arquivos.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { extrairModelos, semRepetidos } from '../js/lib/wikitabela.js';


const FONTE = 'https://hotwheels.fandom.com/wiki/List_of_%s_Hot_Wheels';
const LICENCA = 'CC BY-SA 3.0 — Hot Wheels Wiki (Fandom)';
const AGENTE = 'PokeWheels/1.0 (catálogo pessoal de miniaturas; https://github.com/ragnaldo/pokewheels)';

function argumento(nome, padrao) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.split('=')[1] : padrao;
}

// Dá para apontar para outro espelho da wiki (ou para um servidor de teste).
const API = argumento('api', 'https://hotwheels.fandom.com/api.php');

const anoAtual = new Date().getFullYear();
const de = Number(argumento('de', 2005));
const ate = Number(argumento('ate', anoAtual + 1));
const saida = argumento('saida', 'data/catalogo');
const pausa = Number(argumento('pausa', 400));

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscarPagina(titulo, tentativa = 1) {
  const url = `${API}?action=parse&page=${encodeURIComponent(titulo)}`
    + '&prop=text&format=json&formatversion=2&redirects=1&origin=*';

  try {
    const resposta = await fetch(url, {
      headers: { 'User-Agent': AGENTE, Accept: 'application/json' },
      signal: AbortSignal.timeout(45000),
    });

    if (resposta.status === 404) return { faltando: true };
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const corpo = await resposta.json();
    if (corpo.error) {
      if (corpo.error.code === 'missingtitle') return { faltando: true };
      throw new Error(`${corpo.error.code}: ${corpo.error.info}`);
    }
    return { html: corpo.parse?.text || '' };
  } catch (erro) {
    if (tentativa >= 3) throw erro;
    await esperar(1500 * tentativa);
    return buscarPagina(titulo, tentativa + 1);
  }
}

function lerExistente(caminho) {
  if (!existsSync(caminho)) return null;
  try {
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch {
    return null;
  }
}

async function construir() {
  mkdirSync(saida, { recursive: true });

  const anos = [];
  const busca = [];
  let falhas = 0;

  for (let ano = de; ano <= ate; ano += 1) {
    const titulo = `List of ${ano} Hot Wheels`;
    const caminho = join(saida, `${ano}.json`);
    process.stdout.write(`${ano}… `);

    let modelos = [];
    try {
      const { html, faltando } = await buscarPagina(titulo);
      if (faltando) {
        console.log('página ainda não existe, pulando');
        continue;
      }
      modelos = semRepetidos(extrairModelos(html, ano));
    } catch (erro) {
      falhas += 1;
      console.log(`ERRO (${erro.message})`);
      const anterior = lerExistente(caminho);
      if (anterior?.modelos?.length) {
        console.log(`      mantendo o arquivo anterior com ${anterior.modelos.length} modelos`);
        anos.push({ ano, modelos: anterior.modelos.length, series: anterior.series?.length || 0 });
        busca.push(...anterior.modelos.map((m) => compactar(m)));
      }
      await esperar(pausa);
      continue;
    }

    if (!modelos.length) {
      console.log('nenhuma linha reconhecida (estrutura da página mudou?)');
      falhas += 1;
      await esperar(pausa);
      continue;
    }

    const series = resumirSeries(modelos);
    const arquivo = {
      ano,
      geradoEm: new Date().toISOString(),
      fonte: FONTE.replace('%s', ano),
      licenca: LICENCA,
      series,
      modelos,
    };

    writeFileSync(caminho, JSON.stringify(arquivo));
    busca.push(...modelos.map((m) => compactar(m)));
    anos.push({ ano, modelos: modelos.length, series: series.length });
    console.log(`${modelos.length} modelos, ${series.length} séries`);
    await esperar(pausa);
  }

  if (!anos.length) {
    console.error('\nNenhum ano foi lido — nada foi gravado.');
    process.exit(1);
  }

  writeFileSync(join(saida, 'busca.json'), JSON.stringify({
    geradoEm: new Date().toISOString(),
    campos: ['modelo', 'ano', 'toy', 'serie', 'serieNumero', 'serieTotal', 'foto'],
    itens: busca,
  }));

  writeFileSync(join(saida, 'index.json'), JSON.stringify({
    geradoEm: new Date().toISOString(),
    licenca: LICENCA,
    fonte: 'https://hotwheels.fandom.com/',
    totalModelos: busca.length,
    anos: anos.sort((a, b) => b.ano - a.ano),
  }, null, 2));

  console.log(`\n${busca.length} modelos em ${anos.length} ano(s) gravados em ${saida}/`);
  if (falhas) console.log(`${falhas} ano(s) com problema.`);
}

/** Registro compacto (array) para o índice de busca não ficar gigante. */
function compactar(m) {
  return [m.modelo, m.ano, m.toy || '', m.serie || '', m.serieNumero || '', m.serieTotal || '', m.foto || ''];
}

function resumirSeries(modelos) {
  const mapa = new Map();
  for (const m of modelos) {
    if (!m.serie) continue;
    if (!mapa.has(m.serie)) mapa.set(m.serie, { nome: m.serie, total: 0, modelos: 0 });
    const s = mapa.get(m.serie);
    s.modelos += 1;
    s.total = Math.max(s.total, Number(m.serieTotal) || 0);
  }
  return [...mapa.values()].sort((a, b) => b.modelos - a.modelos);
}

construir().catch((erro) => {
  console.error('Falhou:', erro);
  process.exit(1);
});
