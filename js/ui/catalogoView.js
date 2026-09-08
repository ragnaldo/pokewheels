/** Explorar o catálogo real: busca, anos, séries e o que você já tem. */

import { esc, aviso, adiar } from './dom.js';
import { vazio } from './componentes.js';
import { indice, buscar, anoDoCatalogo, seriesDoAno, CREDITO } from '../catalogo.js';
import { listarCarros } from '../store.js';

/**
 * Índice do que já está na coleção, para marcar "tenho".
 * O toy number é o identificador forte; o nome só vale junto com o ano
 * (senão o mesmo casting apareceria como "tenho" em todos os anos).
 */
export function meusModelos() {
  const mapa = new Map();
  for (const carro of listarCarros()) {
    const nome = (carro.nome || '').toLowerCase().trim();
    if (carro.toyNumber) mapa.set(`toy:${carro.toyNumber.toUpperCase()}`, carro);
    if (nome && carro.serieAno) mapa.set(`nome:${nome}|${carro.serieAno}`, carro);
    if (nome && !carro.serieAno) mapa.set(`nome:${nome}`, carro);
  }
  return mapa;
}

export function tenhoEsse(mapa, modelo) {
  const nome = (modelo.modelo || '').toLowerCase().trim();
  return (modelo.toy && mapa.get(`toy:${modelo.toy.toUpperCase()}`))
    || (modelo.ano && mapa.get(`nome:${nome}|${modelo.ano}`))
    || mapa.get(`nome:${nome}`)
    || null;
}

export function linkAdicionar(modelo) {
  const dados = new URLSearchParams({
    nome: modelo.modelo || '',
    toy: modelo.toy || '',
    col: modelo.col || '',
    serie: modelo.serie || '',
    serieAno: String(modelo.ano || ''),
    serieNumero: String(modelo.serieNumero || ''),
    serieTotal: String(modelo.serieTotal || ''),
    foto: modelo.foto || '',
  });
  return `#/novo?${dados.toString()}`;
}

export function cartaoModelo(modelo, meu) {
  const numero = modelo.serieNumero
    ? `${modelo.serieNumero}${modelo.serieTotal ? `/${modelo.serieTotal}` : ''}`
    : '';
  const legenda = [modelo.serie, numero, modelo.ano].filter(Boolean).join(' · ');

  return `
    <article class="cat-item ${meu ? 'tenho' : ''}">
      <div class="cat-foto">
        ${modelo.foto
          ? `<img src="${esc(modelo.foto)}" alt="${esc(modelo.modelo)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.cat-foto, .cat-escolhido, .hero-img, .cat-sugestao')?.classList.add('sem-foto'); this.remove()">`
          : '<span class="ph">🏁</span>'}
      </div>
      <div class="cat-info">
        <div class="cat-nome">${esc(modelo.modelo)}</div>
        <div class="cat-sub">${esc(legenda)}</div>
        ${modelo.toy ? `<div class="cat-toy">${esc(modelo.toy)}</div>` : ''}
      </div>
      ${meu
        ? `<a class="btn btn-sm cat-acao" href="#/carro/${esc(meu.id)}">Tenho ✓</a>`
        : `<a class="btn btn-sm btn-primary cat-acao" href="${linkAdicionar(modelo)}">+ Add</a>`}
    </article>`;
}

export function render(container) {
  let termo = '';
  let anoAtivo = '';
  let serieAtiva = '';
  let resultados = [];
  let carregando = false;

  const meus = () => meusModelos();

  const cabecalho = (meta) => `
    <div class="page-head">
      <h1>Catálogo Hot Wheels</h1>
      <p>${meta.indisponivel
        ? 'Catálogo ainda não publicado — o app tenta a wiki ao vivo.'
        : `${meta.totalModelos.toLocaleString('pt-BR')} modelos reais de ${meta.anos.length} ano(s).`}</p>
    </div>
    <div class="field" style="margin-bottom:14px">
      <input id="cat-busca" type="search" value="${esc(termo)}"
             placeholder="Buscar modelo ou toy number (ex.: Skyline, HKG38)" autocomplete="off">
    </div>`;

  const desenhar = async () => {
    const meta = await indice();
    const mapa = meus();

    let corpo = '';

    if (termo.trim().length >= 2) {
      corpo = carregando
        ? '<p class="field-hint">Procurando…</p>'
        : (resultados.length
          ? `<div class="cat-lista">${resultados.map((m) => cartaoModelo(m, tenhoEsse(mapa, m))).join('')}</div>`
          : '<p class="field-hint">Nenhum modelo com esse nome no catálogo.</p>');
    } else if (anoAtivo && serieAtiva) {
      const modelos = (await anoDoCatalogo(anoAtivo))?.modelos || [];
      const doLote = modelos.filter((m) => m.serie === serieAtiva)
        .sort((a, b) => (Number(a.serieNumero) || 99) - (Number(b.serieNumero) || 99));
      const tenho = doLote.filter((m) => tenhoEsse(mapa, m)).length;

      corpo = `
        <div class="row" style="margin-bottom:12px">
          <button class="chip" data-voltar-serie>← ${esc(String(anoAtivo))}</button>
          <span class="tag">${tenho} de ${doLote.length}</span>
        </div>
        <h2 class="section-title">${esc(serieAtiva)}</h2>
        <div class="progress" style="margin-bottom:14px"><i style="width:${doLote.length ? (tenho / doLote.length) * 100 : 0}%"></i></div>
        <div class="cat-lista">${doLote.map((m) => cartaoModelo(m, tenhoEsse(mapa, m))).join('')}</div>`;
    } else if (anoAtivo) {
      const dados = await anoDoCatalogo(anoAtivo);
      if (!dados) {
        corpo = `<p class="field-hint">Não consegui carregar a lista de ${esc(String(anoAtivo))}.</p>`;
      } else {
        const series = dados.series?.length ? dados.series : resumir(dados.modelos);
        corpo = `
          <div class="row" style="margin-bottom:12px">
            <button class="chip" data-voltar-ano>← Anos</button>
            <span class="tag">${dados.modelos.length} modelos em ${esc(String(anoAtivo))}</span>
            ${dados.aoVivo ? '<span class="tag">direto da wiki</span>' : ''}
          </div>
          <div class="list">
            ${series.map((s) => {
              const doLote = dados.modelos.filter((m) => m.serie === s.nome);
              const tenho = doLote.filter((m) => tenhoEsse(mapa, m)).length;
              return `
                <article class="list-item" data-serie="${esc(s.nome)}" tabindex="0">
                  <div class="li-main">
                    <div class="li-title">${esc(s.nome)}</div>
                    <div class="li-sub">${tenho} de ${doLote.length} na sua coleção</div>
                    <div class="progress"><i style="width:${doLote.length ? (tenho / doLote.length) * 100 : 0}%"></i></div>
                  </div>
                  <span style="color:var(--txt-faint)">›</span>
                </article>`;
            }).join('')}
          </div>`;
      }
    } else {
      const anos = meta.anos?.length
        ? meta.anos
        : anosDeReserva().map((ano) => ({ ano, modelos: 0 }));

      corpo = `
        <h2 class="section-title">Escolha o ano</h2>
        <div class="anos">
          ${anos.map((a) => `
            <button class="ano-btn" data-ano="${a.ano}">
              <b>${a.ano}</b>
              <span>${a.modelos ? `${a.modelos} modelos` : 'ver na wiki'}</span>
            </button>`).join('')}
        </div>`;
    }

    container.innerHTML = `
      ${cabecalho(meta)}
      ${corpo}
      <p class="credito">
        Dados de <a href="${CREDITO.url}" target="_blank" rel="noopener">${esc(CREDITO.nome)}</a>,
        sob ${esc(CREDITO.licenca)}. Hot Wheels é marca da Mattel; este app não tem ligação com a empresa.
      </p>`;

    const campo = container.querySelector('#cat-busca');
    campo.addEventListener('input', adiar(async () => {
      termo = campo.value;
      if (termo.trim().length < 2) { resultados = []; await desenhar(); return; }
      carregando = true;
      const alvo = termo;
      resultados = await buscar(termo, { limite: 40 });
      if (alvo !== termo) return;
      carregando = false;
      await desenhar();
      const novo = container.querySelector('#cat-busca');
      novo.focus();
      novo.setSelectionRange(novo.value.length, novo.value.length);
    }, 320));

    container.querySelectorAll('[data-ano]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        anoAtivo = Number(btn.dataset.ano);
        serieAtiva = '';
        container.innerHTML = '<p class="field-hint">Carregando o ano…</p>';
        await desenhar();
      });
    });

    container.querySelectorAll('[data-serie]').forEach((item) => {
      const abrir = async () => { serieAtiva = item.dataset.serie; await desenhar(); };
      item.addEventListener('click', abrir);
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir(); });
    });

    container.querySelector('[data-voltar-ano]')?.addEventListener('click', async () => {
      anoAtivo = '';
      await desenhar();
    });
    container.querySelector('[data-voltar-serie]')?.addEventListener('click', async () => {
      serieAtiva = '';
      await desenhar();
    });
  };

  desenhar().catch((erro) => {
    aviso(erro.message || 'Não consegui abrir o catálogo.', 'err');
    container.innerHTML = vazio({
      marca: '📚',
      titulo: 'Catálogo indisponível',
      texto: 'Não deu para carregar os dados agora. Você ainda pode cadastrar os carrinhos na mão.',
      acao: '<a class="btn btn-primary" href="#/novo">Cadastrar carrinho</a>',
    });
  });

  return () => desenhar();
}

function resumir(modelos) {
  const mapa = new Map();
  for (const m of modelos) {
    if (!m.serie) continue;
    mapa.set(m.serie, (mapa.get(m.serie) || 0) + 1);
  }
  return [...mapa.entries()]
    .map(([nome, modelos_]) => ({ nome, modelos: modelos_ }))
    .sort((a, b) => b.modelos - a.modelos);
}

function anosDeReserva() {
  const atual = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => atual + 1 - i);
}
