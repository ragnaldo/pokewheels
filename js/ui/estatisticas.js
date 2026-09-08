/** Panorama da coleção em números. */

import { esc, formatarDinheiro } from './dom.js';
import { vazio } from './componentes.js';
import { estatisticas } from '../store.js';
import { RARIDADES } from '../data/catalogo.js';
import { formatarBytes } from '../imagens.js';

const CORES_RARIDADE = {
  comum: '#8b93a7',
  incomum: '#4fb3ff',
  raro: '#a97bff',
  'muito-raro': '#ff5fa2',
  th: '#37d399',
  sth: '#ffcf2d',
};

export function render(container) {
  const desenhar = () => {
    const e = estatisticas();

    if (!e.modelos) {
      container.innerHTML = vazio({
        marca: '📊',
        titulo: 'Sem números ainda',
        texto: 'Cadastre alguns carrinhos e os totais aparecem aqui.',
        acao: '<a class="btn btn-primary" href="#/novo">Cadastrar carrinho</a>',
      });
      return;
    }

    const maiorRaridade = Math.max(1, ...RARIDADES.map((r) => e.porRaridade.get(r.id) || 0));
    const maiorAno = Math.max(1, ...e.porAno.map(([, n]) => n));

    container.innerHTML = `
      <div class="page-head">
        <h1>Números da coleção</h1>
        <p>Atualizado a cada carrinho que você cadastra.</p>
      </div>

      <div class="stats">
        <div class="stat"><b>${e.modelos}</b><span>modelos diferentes</span></div>
        <div class="stat"><b>${e.unidades}</b><span>unidades no total</span></div>
        <div class="stat"><b>${e.tesouros}</b><span>Treasure Hunts</span></div>
        <div class="stat"><b>${e.lotes}</b><span>lotes acompanhados</span></div>
        <div class="stat"><b>${e.lotesCompletos}</b><span>lotes completos</span></div>
        <div class="stat"><b>${e.favoritos}</b><span>favoritos</span></div>
        ${e.investido ? `<div class="stat"><b style="font-size:20px">${esc(formatarDinheiro(e.investido))}</b><span>investido (informado)</span></div>` : ''}
        <div class="stat"><b style="font-size:20px">${esc(formatarBytes(e.bytesFotos))}</b><span>${e.fotos} foto(s) guardadas</span></div>
      </div>

      <h2 class="section-title">Por raridade</h2>
      <div class="bars">
        ${RARIDADES.map((r) => {
          const n = e.porRaridade.get(r.id) || 0;
          return `
            <div class="bar-row">
              <span>${esc(r.nome)}</span>
              <div class="bar"><i style="width:${(n / maiorRaridade) * 100}%;--c:${CORES_RARIDADE[r.id]}"></i></div>
              <span>${n}</span>
            </div>`;
        }).join('')}
      </div>

      ${e.porAno.length ? `
        <h2 class="section-title">Por ano de fabricação</h2>
        <div class="bars">
          ${e.porAno.map(([ano, n]) => `
            <div class="bar-row">
              <span>${esc(ano)}</span>
              <div class="bar"><i style="width:${(n / maiorAno) * 100}%"></i></div>
              <span>${n}</span>
            </div>`).join('')}
        </div>` : ''}

      <p class="field-hint" style="margin-top:22px">
        ${e.comFoto} de ${e.modelos} carrinho(s) já têm foto.
      </p>
    `;
  };

  desenhar();
  return desenhar;
}
