/** Lotes: a coleção agrupada por série, com progresso de coleta. */

import { esc } from './dom.js';
import { urlMiniatura, gradeCarros, vazio } from './componentes.js';
import { listarLotes, obterLote, capaDoCarro } from '../store.js';

function cartaoLote(lote) {
  const capas = lote.carros.map(capaDoCarro).filter(Boolean).slice(0, 4);
  const progresso = lote.total ? Math.round((lote.tenho.size / lote.total) * 100) : 0;

  return `
    <article class="list-item" data-lote="${esc(lote.chave)}" tabindex="0">
      <div class="li-thumbs">
        ${capas.map((f) => `<img src="${urlMiniatura(f)}" alt="">`).join('') || '<div class="li-sub">📦</div>'}
      </div>
      <div class="li-main">
        <div class="li-title">${esc(lote.serie)} ${lote.ano ? `<span class="tag">${esc(lote.ano)}</span>` : ''}</div>
        <div class="li-sub">
          ${lote.carros.length} carrinho(s)${lote.total ? ` · ${lote.tenho.size} de ${lote.total}` : ''}
          ${lote.completo ? ' · <span style="color:var(--ok)">completo</span>' : ''}
        </div>
        ${lote.total ? `<div class="progress"><i style="width:${progresso}%"></i></div>` : ''}
      </div>
      <span style="color:var(--txt-faint)">›</span>
    </article>`;
}

export function render(container) {
  const desenhar = () => {
    const lotes = listarLotes();

    if (!lotes.length) {
      container.innerHTML = vazio({
        marca: '📦',
        titulo: 'Nenhum lote ainda',
        texto: 'Informe a série dos carrinhos (ex.: "HW Exotics 3/10") para vê-los agrupados por lote.',
        acao: '<a class="btn btn-primary" href="#/novo">Cadastrar carrinho</a>',
      });
      return;
    }

    container.innerHTML = `
      <div class="page-head">
        <h1>Lotes e séries</h1>
        <p>${lotes.length} lote(s) · ${lotes.filter((l) => l.completo).length} completo(s)</p>
      </div>
      <div class="list">${lotes.map(cartaoLote).join('')}</div>`;

    container.querySelectorAll('[data-lote]').forEach((item) => {
      const ir = () => { location.hash = `#/lote/${encodeURIComponent(item.dataset.lote)}`; };
      item.addEventListener('click', ir);
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
    });
  };

  desenhar();
  return desenhar;
}

export function renderDetalhe(container, { chave }) {
  const desenhar = () => {
    const lote = obterLote(chave);

    if (!lote) {
      container.innerHTML = vazio({
        marca: '📦',
        titulo: 'Lote não encontrado',
        texto: 'Talvez os carrinhos desse lote tenham sido removidos.',
        acao: '<a class="btn" href="#/lotes">Ver todos os lotes</a>',
      });
      return;
    }

    const progresso = lote.total ? Math.round((lote.tenho.size / lote.total) * 100) : 0;

    container.innerHTML = `
      <div class="row" style="margin-bottom:10px">
        <a class="btn btn-sm" href="#/lotes">← Lotes</a>
      </div>
      <div class="page-head">
        <h1>${esc(lote.serie)}</h1>
        <p>${lote.ano ? `Lote de ${esc(lote.ano)} · ` : ''}${lote.carros.length} na coleção${lote.total ? ` · ${lote.tenho.size} de ${lote.total}` : ''}</p>
      </div>
      ${lote.total ? `<div class="progress" style="margin-bottom:16px"><i style="width:${progresso}%"></i></div>` : ''}
      ${gradeCarros(lote.carros)}
      ${lote.faltantes.length ? `
        <h2 class="section-title">Faltam</h2>
        <div class="missing">${lote.faltantes.map((n) => `<span>${n}/${lote.total}</span>`).join('')}</div>` : ''}
      ${lote.completo ? '<p style="margin-top:16px;color:var(--ok)">Lote completo — parabéns! 🎉</p>' : ''}
    `;

    container.querySelectorAll('[data-carro]').forEach((card) => {
      card.addEventListener('click', () => { location.hash = `#/carro/${card.dataset.carro}`; });
    });
  };

  desenhar();
  return desenhar;
}
