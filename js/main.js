/** Ponto de entrada: roteador por hash, busca global e ciclo de vida das telas. */

import { carregar, aoMudar } from './store.js';
import { aviso, adiar } from './ui/dom.js';
import { filtros } from './estado.js';

import * as galeria from './ui/galeria.js';
import * as detalhe from './ui/detalhe.js';
import * as formulario from './ui/formulario.js';
import * as lotes from './ui/lotes.js';
import * as estatisticas from './ui/estatisticas.js';
import * as catalogoView from './ui/catalogoView.js';
import * as ajustes from './ui/ajustes.js';

const app = document.getElementById('app');

const ROTAS = [
  { padrao: /^#?\/?$/,               tela: galeria, aba: 'galeria' },
  { padrao: /^#\/galeria$/,          tela: galeria, aba: 'galeria' },
  { padrao: /^#\/lotes$/,            tela: lotes, aba: 'lotes' },
  { padrao: /^#\/lote\/(.+)$/,       tela: { render: lotes.renderDetalhe }, aba: 'lotes', chaves: ['chave'] },
  { padrao: /^#\/carro\/(.+)$/,      tela: detalhe, aba: 'galeria', chaves: ['id'] },
  { padrao: /^#\/novo(?:\?(.*))?$/,   tela: formulario, aba: 'novo', chaves: ['consulta'] },
  { padrao: /^#\/catalogo$/,         tela: catalogoView, aba: 'catalogo' },
  { padrao: /^#\/editar\/(.+)$/,     tela: formulario, aba: 'galeria', chaves: ['id'] },
  { padrao: /^#\/estatisticas$/,     tela: estatisticas, aba: 'estatisticas' },
  { padrao: /^#\/ajustes$/,          tela: ajustes, aba: 'ajustes' },
];

let atual = null;

function resolver(hash) {
  for (const rota of ROTAS) {
    const achou = hash.match(rota.padrao);
    if (!achou) continue;
    const params = {};
    (rota.chaves || []).forEach((chave, i) => {
      const bruto = achou[i + 1];
      if (bruto === undefined) return;
      params[chave] = chave === 'consulta' ? bruto : decodeURIComponent(bruto);
    });
    return { rota, params };
  }
  return { rota: ROTAS[0], params: {} };
}

function marcarAba(aba) {
  document.querySelectorAll('.tabbar a').forEach((link) => {
    if (link.dataset.tab === aba) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function navegar() {
  if (atual?.aoSair) {
    try { atual.aoSair(); } catch { /* ignora falha de limpeza */ }
  }

  const { rota, params } = resolver(location.hash);
  marcarAba(rota.aba);

  const retorno = rota.tela.render(app, params);
  atual = typeof retorno === 'function' ? { atualizar: retorno } : (retorno || {});

  window.scrollTo({ top: 0 });
  app.focus({ preventScroll: true });
}

function ligarBusca() {
  const botao = document.getElementById('btn-busca');
  const barra = document.getElementById('barra-busca');
  const campo = document.getElementById('input-busca');
  const limpar = document.getElementById('btn-limpar-busca');

  botao.addEventListener('click', () => {
    barra.hidden = !barra.hidden;
    if (!barra.hidden) campo.focus();
  });

  campo.addEventListener('input', adiar(() => {
    filtros.busca = campo.value;
    if (!location.hash.startsWith('#/galeria')) location.hash = '#/galeria';
    else atual?.atualizar?.();
  }, 200));

  limpar.addEventListener('click', () => {
    campo.value = '';
    filtros.busca = '';
    barra.hidden = true;
    if (location.hash.startsWith('#/galeria')) atual?.atualizar?.();
  });
}

async function iniciar() {
  try {
    await carregar();
  } catch (erro) {
    app.innerHTML = `
      <div class="empty">
        <div class="em-mark">💾</div>
        <h2>Não consegui abrir o banco local</h2>
        <p>Verifique se o navegador permite armazenamento para este site
           (janela anônima costuma bloquear).</p>
      </div>`;
    return;
  }

  ligarBusca();
  aoMudar(() => atual?.atualizar?.());
  window.addEventListener('hashchange', navegar);
  navegar();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* app segue funcionando sem cache offline */
    });
  }
}

window.addEventListener('error', (e) => {
  if (e.message) aviso(e.message, 'err');
});

iniciar();
