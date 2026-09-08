/** Tela inicial: a coleção em grade, com busca e filtros. */

import { esc } from './dom.js';
import { gradeCarros, vazio } from './componentes.js';
import { listarCarros, seriesConhecidas, totalCarros } from '../store.js';
import { filtros, filtrosAtivos, limparFiltros } from '../estado.js';
import { RARIDADES } from '../data/catalogo.js';

const ORDENS = [
  { id: 'recentes', nome: 'Mais recentes' },
  { id: 'antigos', nome: 'Mais antigos' },
  { id: 'nome', nome: 'Nome (A–Z)' },
  { id: 'raridade', nome: 'Raridade' },
  { id: 'serie', nome: 'Série / lote' },
];

export function render(container) {
  const desenhar = () => {
    const carros = listarCarros(filtros);
    const series = seriesConhecidas();

    if (!totalCarros()) {
      container.innerHTML = vazio({
        titulo: 'Sua garagem está vazia',
        texto: 'Bata uma foto do primeiro carrinho — ou procure o modelo no catálogo real e adicione de lá.',
        acao: '<div class="row" style="justify-content:center">'
          + '<a class="btn btn-primary" href="#/novo">Fotografar carrinho</a>'
          + '<a class="btn" href="#/catalogo">Ver o catálogo</a></div>',
      });
      return;
    }

    container.innerHTML = `
      <div class="page-head">
        <h1>Minha coleção</h1>
        <p>${carros.length} de ${totalCarros()} carrinho(s)${filtrosAtivos() ? ' — filtro ativo' : ''}
           · <a href="#/estatisticas" style="color:var(--azul-hw)">ver números</a></p>
      </div>

      <div class="chips" role="group" aria-label="Filtros">
        <button class="chip" data-filtro="favoritos" aria-pressed="${filtros.favoritos}">★ Favoritos</button>
        ${RARIDADES.map((r) => `
          <button class="chip" data-raridade="${r.id}" aria-pressed="${filtros.raridade === r.id}">${esc(r.nome)}</button>
        `).join('')}
      </div>

      <div class="row" style="margin:12px 0 14px">
        ${series.length ? `
          <select id="sel-serie" class="chip" style="padding:8px 10px">
            <option value="">Todas as séries</option>
            ${series.map((s) => `<option value="${esc(s)}"${filtros.serie === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}
          </select>` : ''}
        <select id="sel-ordem" class="chip" style="padding:8px 10px">
          ${ORDENS.map((o) => `<option value="${o.id}"${filtros.ordem === o.id ? ' selected' : ''}>${esc(o.nome)}</option>`).join('')}
        </select>
        ${filtrosAtivos() ? '<button class="chip" id="btn-limpar-filtros">Limpar filtros</button>' : ''}
      </div>

      ${carros.length
        ? gradeCarros(carros)
        : vazio({
          marca: '🔎',
          titulo: 'Nada por aqui',
          texto: 'Nenhum carrinho bate com esse filtro.',
          acao: '<button class="btn" id="btn-limpar-vazio">Limpar filtros</button>',
        })}
    `;

    container.querySelectorAll('[data-raridade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filtros.raridade = filtros.raridade === btn.dataset.raridade ? '' : btn.dataset.raridade;
        desenhar();
      });
    });

    container.querySelector('[data-filtro="favoritos"]')?.addEventListener('click', () => {
      filtros.favoritos = !filtros.favoritos;
      desenhar();
    });

    container.querySelector('#sel-serie')?.addEventListener('change', (e) => {
      filtros.serie = e.target.value;
      desenhar();
    });

    container.querySelector('#sel-ordem')?.addEventListener('change', (e) => {
      filtros.ordem = e.target.value;
      desenhar();
    });

    for (const id of ['#btn-limpar-filtros', '#btn-limpar-vazio']) {
      container.querySelector(id)?.addEventListener('click', () => {
        limparFiltros();
        document.getElementById('input-busca').value = '';
        desenhar();
      });
    }

    container.querySelectorAll('[data-carro]').forEach((card) => {
      const ir = () => { location.hash = `#/carro/${card.dataset.carro}`; };
      card.addEventListener('click', ir);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
    });
  };

  desenhar();
  return desenhar;
}
