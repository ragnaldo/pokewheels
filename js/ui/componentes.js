/** Pedaços de HTML reaproveitados entre as telas. */

import { esc } from './dom.js';
import { urlDe } from '../imagens.js';
import { capaDoCarro } from '../store.js';
import { MAPA_RARIDADE } from '../data/catalogo.js';

const SVG_ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';

export function urlMiniatura(foto) {
  return foto ? urlDe(`min:${foto.id}`, foto.miniatura) : '';
}

export function urlGrande(foto, blob) {
  return blob ? urlDe(`big:${foto.id}`, blob) : urlMiniatura(foto);
}

export function selo(raridade) {
  const r = MAPA_RARIDADE[raridade];
  if (!r) return '';
  return `<span class="rar ${r.classe}">${esc(r.nome)}</span>`;
}

export function legendaLote(carro) {
  if (!carro.serie) return '';
  const numero = carro.serieNumero
    ? ` ${carro.serieNumero}${carro.serieTotal ? `/${carro.serieTotal}` : ''}`
    : '';
  return `${carro.serie}${numero}`;
}

export function cartaoCarro(carro) {
  const foto = capaDoCarro(carro);
  const thumb = foto
    ? `<img src="${urlMiniatura(foto)}" alt="${esc(carro.nome)}" loading="lazy">`
    : '<div class="ph">📷</div>';

  const bandeira = carro.raridade === 'sth' ? 'SUPER TH'
    : carro.raridade === 'th' ? 'TH'
      : '';

  const linha2 = [legendaLote(carro), carro.anoFabricacao].filter(Boolean).join(' · ');

  return `
    <article class="card" data-carro="${esc(carro.id)}" tabindex="0">
      <div class="card-thumb">${thumb}</div>
      ${bandeira ? `<span class="card-flag">${bandeira}</span>` : ''}
      ${carro.favorito ? `<span class="card-star">${SVG_ESTRELA}</span>` : ''}
      <div class="card-body">
        <div class="card-title">${esc(carro.nome)}</div>
        ${linha2 ? `<div class="card-sub">${esc(linha2)}</div>` : ''}
        ${selo(carro.raridade)}
      </div>
    </article>`;
}

export function gradeCarros(carros) {
  return `<div class="grid">${carros.map(cartaoCarro).join('')}</div>`;
}

export function vazio({ marca = '🏎️', titulo, texto, acao = '' }) {
  return `
    <div class="empty">
      <div class="em-mark">${marca}</div>
      <h2>${esc(titulo)}</h2>
      <p>${esc(texto)}</p>
      ${acao}
    </div>`;
}
