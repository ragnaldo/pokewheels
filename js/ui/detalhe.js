/** Ficha do carrinho: fotos, dados técnicos e o resto do lote. */

import { esc, formatarData, formatarDataHora, formatarDinheiro, confirmar, aviso } from './dom.js';
import { selo, legendaLote, urlMiniatura, urlGrande, cartaoCarro, vazio } from './componentes.js';
import {
  obterCarro, fotosDoCarro, blobDaFoto, irmaosDeLote,
  alternarFavorito, removerCarro, adicionarFoto, removerFoto,
} from '../store.js';
import { MAPA_RARIDADE } from '../data/catalogo.js';
import { capturar } from '../camera.js';
import { modelosDaSerie } from '../catalogo.js';
import { cartaoModelo, tenhoEsse, meusModelos } from './catalogoView.js';

const SVG_ESTRELA = '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';

function ficha(rotulo, valor) {
  if (valor === '' || valor === null || valor === undefined) return '';
  return `<div class="fact"><dt>${esc(rotulo)}</dt><dd>${valor}</dd></div>`;
}

/**
 * Busca no catálogo real quais modelos formam este lote e mostra, pelo nome,
 * os que ainda faltam — em vez de só os números.
 */
async function completarComCatalogo(container, carro) {
  const alvo = container.querySelector('#faltam-lote');
  if (!alvo || !carro.serie || !carro.serieAno) return;

  const doLote = await modelosDaSerie(carro.serieAno, carro.serie);
  if (!doLote.length) return;

  const meus = meusModelos();

  const faltando = doLote.filter((m) => !tenhoEsse(meus, m));
  const tenho = doLote.length - faltando.length;

  // O card pode declarar um lote maior do que a wiki já listou; nesse caso
  // avisamos em vez de dar o lote como fechado.
  const declarado = Number(carro.serieTotal) || 0;
  const incompleto = declarado > doLote.length;
  const posicoes = new Set(doLote.map((m) => m.serieNumero).filter(Boolean)).size;
  const comVariacoes = doLote.length > posicoes;

  alvo.innerHTML = `
    <h3 class="section-title">O lote no catálogo — ${tenho} de ${doLote.length}</h3>
    <div class="progress" style="margin-bottom:12px"><i style="width:${(tenho / doLote.length) * 100}%"></i></div>
    <div class="cat-lista">${doLote.map((m) => cartaoModelo(m, tenhoEsse(meus, m))).join('')}</div>
    <p class="field-hint" style="margin-top:10px">
      Lista real da série, vinda do catálogo.
      ${comVariacoes ? 'As variações de cor aparecem como registros separados.' : ''}
      ${incompleto
        ? `O card informa ${declarado} carrinhos, mas o catálogo só tem ${doLote.length} dessa série — pode faltar registro na wiki.`
        : ''}
    </p>`;
}

export function render(container, { id }) {
  let fotoAtiva = 0;

  const desenhar = async () => {
    const carro = obterCarro(id);
    if (!carro) {
      container.innerHTML = vazio({
        marca: '🤷',
        titulo: 'Carrinho não encontrado',
        texto: 'Ele pode ter sido removido da coleção.',
        acao: '<a class="btn" href="#/galeria">Voltar para a galeria</a>',
      });
      return;
    }

    const fotos = fotosDoCarro(carro);
    fotoAtiva = Math.min(fotoAtiva, Math.max(0, fotos.length - 1));
    const { lote, irmaos } = irmaosDeLote(carro);
    const r = MAPA_RARIDADE[carro.raridade];

    const subtitulo = [carro.fabricante, carro.anoModelo && `modelo ${carro.anoModelo}`]
      .filter(Boolean).join(' · ');

    container.innerHTML = `
      <div class="row" style="margin-bottom:10px">
        <a class="btn btn-sm" href="#/galeria">← Voltar</a>
        <div class="spacer"></div>
        <button class="btn btn-sm" id="btn-fav" aria-pressed="${carro.favorito}" title="Favorito"
          style="${carro.favorito ? 'color:var(--accent-2)' : ''}">${SVG_ESTRELA}</button>
        <a class="btn btn-sm" href="#/editar/${esc(carro.id)}">Editar</a>
      </div>

      <div class="hero">
        <div class="hero-img" id="foto-grande">
          ${fotos.length
            ? `<img src="${urlMiniatura(fotos[fotoAtiva])}" alt="${esc(carro.nome)}">`
            : (carro.fotoOficial
              ? `<img src="${esc(carro.fotoOficial)}" alt="${esc(carro.nome)}" referrerpolicy="no-referrer" onerror="this.closest('.cat-foto, .cat-escolhido, .hero-img, .cat-sugestao')?.classList.add('sem-foto'); this.remove()">`
              : '<div class="hero-empty"><span style="font-size:34px">📷</span><span>Sem foto ainda</span></div>')}
        </div>
        ${!fotos.length && carro.fotoOficial ? '<span class="card-flag flag-catalogo">foto do catálogo</span>' : ''}
        <div class="thumbstrip">
          ${fotos.map((f, i) => `
            <img src="${urlMiniatura(f)}" alt="Foto ${i + 1}" data-foto="${i}" aria-current="${i === fotoAtiva}">
          `).join('')}
          <button type="button" data-acao="nova-foto" title="Adicionar foto">＋</button>
          ${fotos.length ? '<button type="button" data-acao="apagar-foto" title="Remover foto atual">🗑</button>' : ''}
        </div>
      </div>

      <h1 class="detail-title">${esc(carro.nome)}</h1>
      <div class="detail-sub">${esc(subtitulo)}</div>
      <div style="margin-top:8px">${selo(carro.raridade)}</div>
      ${r ? `<p class="field-hint" style="margin:6px 0 0">${esc(r.dica)}</p>` : ''}

      <dl class="facts">
        ${ficha('Ano de fabricação', esc(carro.anoFabricacao))}
        ${ficha('Ano do modelo', esc(carro.anoModelo))}
        ${ficha('Série / lote', lote ? `<a href="#/lote/${encodeURIComponent(lote.chave)}">${esc(legendaLote(carro))}</a>` : esc(legendaLote(carro)))}
        ${ficha('Toy number', esc(carro.toyNumber))}
        ${ficha('Nº de coleção', esc(carro.colNumero))}
        ${ficha('Cor', esc(carro.cor))}
        ${ficha('Rodas', esc(carro.tipoRoda))}
        ${ficha('Escala', esc(carro.escala))}
        ${ficha('País de fabricação', esc(carro.pais))}
        ${ficha('Condição', esc(carro.condicao))}
        ${ficha('Embalagem', esc(carro.embalagem))}
        ${ficha('Quantidade', carro.quantidade > 1 ? `${carro.quantidade} unidades` : '')}
        ${ficha('Valor pago', esc(formatarDinheiro(carro.valorPago, carro.moeda)))}
        ${ficha('Data de aquisição', esc(formatarData(carro.dataAquisicao)))}
        ${ficha('Onde comprei', esc(carro.local))}
        ${ficha('Tags', (carro.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(' '))}
        ${ficha('Cadastrado em', esc(formatarDataHora(carro.criadoEm)))}
        ${ficha('Catálogo', carro.wikiUrl
          ? `<a href="${esc(carro.wikiUrl)}" target="_blank" rel="noopener">ver lista na wiki ↗</a>` : '')}
      </dl>

      ${carro.notas ? `<div class="notes">${esc(carro.notas)}</div>` : ''}

      ${lote ? `
        <h2 class="section-title">Outros carrinhos do lote</h2>
        <div class="row" style="margin-bottom:10px">
          <span class="tag">${esc(lote.chave)}</span>
          <span class="tag">${lote.carros.length}${lote.total ? ` de ${lote.total}` : ''} no lote</span>
          ${lote.completo ? '<span class="tag" style="color:var(--ok)">Lote completo 🎉</span>' : ''}
        </div>
        ${irmaos.length
          ? `<div class="grid">${irmaos.map(cartaoCarro).join('')}</div>`
          : '<p class="field-hint">Este é o único carrinho desse lote na sua coleção — por enquanto.</p>'}
        <div id="faltam-lote">
          ${lote.faltantes.length ? `
            <h3 class="section-title">Faltam nesse lote</h3>
            <div class="missing">${lote.faltantes.map((n) => `<span>${n}/${lote.total}</span>`).join('')}</div>` : ''}
        </div>
      ` : `
        <h2 class="section-title">Lote</h2>
        <p class="field-hint">Sem série informada. Edite o carrinho e preencha a série para ver os companheiros de lote.</p>
      `}

      <div class="row" style="margin:26px 0 10px">
        <button class="btn btn-danger btn-block" id="btn-excluir" type="button">Excluir carrinho</button>
      </div>
    `;

    // foto em tamanho cheio (carregada só quando a tela já está montada)
    if (fotos.length) {
      const alvo = fotos[fotoAtiva];
      blobDaFoto(alvo.id).then((blob) => {
        const img = container.querySelector('#foto-grande img');
        if (img && blob) img.src = urlGrande(alvo, blob);
      });
    }

    container.querySelectorAll('[data-foto]').forEach((img) => {
      img.addEventListener('click', () => { fotoAtiva = Number(img.dataset.foto); desenhar(); });
    });

    container.querySelector('[data-acao="nova-foto"]')?.addEventListener('click', async () => {
      const arquivos = await capturar();
      if (!arquivos.length) return;
      for (const arquivo of arquivos) await adicionarFoto(carro.id, arquivo);
      aviso(`${arquivos.length} foto(s) adicionada(s).`);
      desenhar();
    });

    container.querySelector('[data-acao="apagar-foto"]')?.addEventListener('click', async () => {
      const alvo = fotos[fotoAtiva];
      if (!alvo) return;
      const ok = await confirmar({ titulo: 'Remover esta foto?', rotulo: 'Remover', perigo: true });
      if (!ok) return;
      await removerFoto(alvo.id);
      fotoAtiva = 0;
      desenhar();
    });

    container.querySelector('#btn-fav').addEventListener('click', async () => {
      await alternarFavorito(carro.id);
      desenhar();
    });

    container.querySelector('#btn-excluir').addEventListener('click', async () => {
      const ok = await confirmar({
        titulo: `Excluir "${carro.nome}"?`,
        texto: 'As fotos deste carrinho também serão apagadas. Não dá para desfazer.',
        rotulo: 'Excluir',
        perigo: true,
      });
      if (!ok) return;
      await removerCarro(carro.id);
      aviso('Carrinho excluído.');
      location.hash = '#/galeria';
    });

    container.querySelectorAll('[data-carro]').forEach((card) => {
      card.addEventListener('click', () => { location.hash = `#/carro/${card.dataset.carro}`; });
    });

    completarComCatalogo(container, carro);
  };

  desenhar();
  return desenhar;
}
