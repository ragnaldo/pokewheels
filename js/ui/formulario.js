/** Cadastro e edição de carrinho. */

import { esc, aviso, opcoes, confirmar } from './dom.js';
import { urlMiniatura } from './componentes.js';
import {
  carroVazio, obterCarro, salvarCarro, adicionarFoto, obterFoto,
  removerFoto, vincularFotos, limparFotosSoltas, seriesConhecidas,
} from '../store.js';
import {
  RARIDADES, CONDICOES, EMBALAGENS, ESCALAS, TIPOS_RODA, PAISES, MOEDAS, SERIES_SUGERIDAS,
} from '../data/catalogo.js';
import { capturar, escolherArquivos } from '../camera.js';

const SVG_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function render(container, { id } = {}) {
  const original = id ? obterCarro(id) : null;
  const editando = Boolean(original);
  const rascunho = { ...carroVazio(), ...(original || {}) };
  let fotos = [...(rascunho.fotos || [])];
  let salvo = false;

  const anoAtual = new Date().getFullYear();
  const series = [...new Set([...seriesConhecidas(), ...SERIES_SUGERIDAS])]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const desenhar = () => {
    container.innerHTML = `
      <div class="page-head">
        <h1>${editando ? 'Editar carrinho' : 'Novo carrinho'}</h1>
        <p>${editando ? 'Ajuste os dados e salve.' : 'Fotografe o carrinho e preencha o que souber — dá para completar depois.'}</p>
      </div>

      <form class="form" id="form-carro" novalidate>
        <fieldset class="group">
          <legend>Fotos</legend>
          <div class="photo-tray" id="bandeja">
            ${fotos.map((fid) => {
              const foto = obterFoto(fid);
              if (!foto) return '';
              return `
                <div class="photo-slot">
                  <img src="${urlMiniatura(foto)}" alt="Foto do carrinho">
                  <button type="button" data-remover="${esc(fid)}" aria-label="Remover foto">${SVG_X}</button>
                </div>`;
            }).join('')}
            <button type="button" class="photo-add" data-acao="camera">📷<span>Câmera</span></button>
            <button type="button" class="photo-add" data-acao="galeria">🖼<span>Galeria</span></button>
          </div>
          <p class="field-hint">A primeira foto vira a capa do carrinho na galeria.</p>
        </fieldset>

        <fieldset class="group">
          <legend>Identificação</legend>
          <div class="field">
            <label for="f-nome">Modelo *</label>
            <input id="f-nome" name="nome" value="${esc(rascunho.nome)}" placeholder="Ex.: '67 Camaro" required>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="f-fabricante">Fabricante</label>
              <input id="f-fabricante" name="fabricante" value="${esc(rascunho.fabricante)}" list="lista-fabricantes">
              <datalist id="lista-fabricantes">
                <option value="Hot Wheels"></option><option value="Matchbox"></option>
                <option value="Majorette"></option><option value="Tomica"></option>
                <option value="Mini GT"></option><option value="Maisto"></option>
              </datalist>
            </div>
            <div class="field">
              <label for="f-cor">Cor</label>
              <input id="f-cor" name="cor" value="${esc(rascunho.cor)}" placeholder="Ex.: Spectraflame azul">
            </div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="f-anoFabricacao">Ano de fabricação</label>
              <input id="f-anoFabricacao" name="anoFabricacao" type="number" inputmode="numeric"
                     min="1968" max="${anoAtual + 1}" value="${esc(rascunho.anoFabricacao)}" placeholder="${anoAtual}">
              <span class="field-hint">Ano impresso na base do carrinho.</span>
            </div>
            <div class="field">
              <label for="f-anoModelo">Ano do modelo real</label>
              <input id="f-anoModelo" name="anoModelo" type="number" inputmode="numeric"
                     min="1900" max="${anoAtual + 2}" value="${esc(rascunho.anoModelo)}" placeholder="1967">
            </div>
          </div>
          <div class="field">
            <label for="f-toyNumber">Toy number / código</label>
            <input id="f-toyNumber" name="toyNumber" value="${esc(rascunho.toyNumber)}" placeholder="Ex.: HKG38">
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Lote / série</legend>
          <div class="field">
            <label for="f-serie">Série</label>
            <input id="f-serie" name="serie" value="${esc(rascunho.serie)}" list="lista-series" placeholder="Ex.: HW Exotics">
            <datalist id="lista-series">${series.map((s) => `<option value="${esc(s)}"></option>`).join('')}</datalist>
            <span class="field-hint">Carrinhos com a mesma série (e ano) aparecem juntos como um lote.</span>
          </div>
          <div class="grid-3">
            <div class="field">
              <label for="f-serieAno">Ano do lote</label>
              <input id="f-serieAno" name="serieAno" type="number" inputmode="numeric"
                     min="1968" max="${anoAtual + 1}" value="${esc(rascunho.serieAno)}">
            </div>
            <div class="field">
              <label for="f-serieNumero">Nº no lote</label>
              <input id="f-serieNumero" name="serieNumero" type="number" inputmode="numeric" min="1"
                     value="${esc(rascunho.serieNumero)}" placeholder="3">
            </div>
            <div class="field">
              <label for="f-serieTotal">Total do lote</label>
              <input id="f-serieTotal" name="serieTotal" type="number" inputmode="numeric" min="1"
                     value="${esc(rascunho.serieTotal)}" placeholder="10">
            </div>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Raridade e estado</legend>
          <div class="field">
            <label for="f-raridade">Nível de raridade</label>
            <select id="f-raridade" name="raridade">
              ${RARIDADES.map((r) => `<option value="${r.id}"${rascunho.raridade === r.id ? ' selected' : ''}>${esc(r.nome)}</option>`).join('')}
            </select>
            <span class="field-hint" id="dica-raridade"></span>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="f-condicao">Condição</label>
              <select id="f-condicao" name="condicao">${opcoes(CONDICOES, rascunho.condicao)}</select>
            </div>
            <div class="field">
              <label for="f-embalagem">Embalagem</label>
              <select id="f-embalagem" name="embalagem">${opcoes(EMBALAGENS, rascunho.embalagem)}</select>
            </div>
          </div>
          <div class="grid-3">
            <div class="field">
              <label for="f-escala">Escala</label>
              <select id="f-escala" name="escala">${opcoes(ESCALAS, rascunho.escala)}</select>
            </div>
            <div class="field">
              <label for="f-tipoRoda">Rodas</label>
              <select id="f-tipoRoda" name="tipoRoda">${opcoes(TIPOS_RODA, rascunho.tipoRoda)}</select>
            </div>
            <div class="field">
              <label for="f-pais">País</label>
              <select id="f-pais" name="pais">${opcoes(PAISES, rascunho.pais)}</select>
            </div>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Aquisição</legend>
          <div class="grid-3">
            <div class="field">
              <label for="f-quantidade">Quantidade</label>
              <input id="f-quantidade" name="quantidade" type="number" inputmode="numeric" min="1" value="${esc(rascunho.quantidade)}">
            </div>
            <div class="field">
              <label for="f-valorPago">Valor pago</label>
              <input id="f-valorPago" name="valorPago" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(rascunho.valorPago)}">
            </div>
            <div class="field">
              <label for="f-moeda">Moeda</label>
              <select id="f-moeda" name="moeda">
                ${MOEDAS.map((m) => `<option value="${m}"${rascunho.moeda === m ? ' selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="f-dataAquisicao">Data da compra</label>
              <input id="f-dataAquisicao" name="dataAquisicao" type="date" value="${esc(rascunho.dataAquisicao)}">
            </div>
            <div class="field">
              <label for="f-local">Onde comprei</label>
              <input id="f-local" name="local" value="${esc(rascunho.local)}" placeholder="Ex.: Mercado do bairro">
            </div>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Extras</legend>
          <div class="field">
            <label for="f-tags">Tags</label>
            <input id="f-tags" name="tags" value="${esc((rascunho.tags || []).join(', '))}" placeholder="separe por vírgula: japonês, corrida, duplicado">
          </div>
          <div class="field">
            <label for="f-notas">Anotações</label>
            <textarea id="f-notas" name="notas" placeholder="Detalhes, defeitos, história do achado…">${esc(rascunho.notas)}</textarea>
          </div>
          <div class="switch">
            <label for="f-favorito">Marcar como favorito</label>
            <input id="f-favorito" name="favorito" type="checkbox" ${rascunho.favorito ? 'checked' : ''}>
          </div>
        </fieldset>

        <div class="form-actions">
          <a class="btn" href="${editando ? `#/carro/${esc(id)}` : '#/galeria'}" id="btn-cancelar">Cancelar</a>
          <button class="btn btn-primary" type="submit" style="flex:1">${editando ? 'Salvar alterações' : 'Adicionar à coleção'}</button>
        </div>
      </form>
    `;

    const form = container.querySelector('#form-carro');
    const selRaridade = form.querySelector('#f-raridade');
    const dica = form.querySelector('#dica-raridade');

    const atualizarDica = () => {
      const r = RARIDADES.find((x) => x.id === selRaridade.value);
      dica.textContent = r ? r.dica : '';
    };
    selRaridade.addEventListener('change', atualizarDica);
    atualizarDica();

    const anexar = async (arquivos) => {
      if (!arquivos.length) return;
      for (const arquivo of arquivos) {
        try {
          const meta = await adicionarFoto(editando ? id : '', arquivo);
          if (!editando) fotos.push(meta.id);
          else fotos = [...(obterCarro(id)?.fotos || [])];
        } catch (erro) {
          aviso(erro.message || 'Não consegui processar essa foto.', 'err');
        }
      }
      guardarCampos();
      desenhar();
    };

    form.querySelector('[data-acao="camera"]').addEventListener('click', async () => {
      anexar(await capturar());
    });
    form.querySelector('[data-acao="galeria"]').addEventListener('click', async () => {
      anexar(await escolherArquivos());
    });

    form.querySelectorAll('[data-remover]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const fid = btn.dataset.remover;
        await removerFoto(fid);
        fotos = fotos.filter((x) => x !== fid);
        guardarCampos();
        desenhar();
      });
    });

    /** Mantém o que já foi digitado quando a tela é redesenhada. */
    function guardarCampos() {
      const dados = new FormData(form);
      for (const [chave, valor] of dados.entries()) rascunho[chave] = valor;
      rascunho.favorito = form.querySelector('#f-favorito').checked;
    }

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      guardarCampos();

      if (!rascunho.nome.trim()) {
        aviso('Dê um nome ao modelo antes de salvar.', 'err');
        form.querySelector('#f-nome').focus();
        return;
      }

      const carro = await salvarCarro({
        ...rascunho,
        id: id || '',
        tags: rascunho.tags,
        fotos,
        fotoCapa: fotos.includes(rascunho.fotoCapa) ? rascunho.fotoCapa : (fotos[0] || ''),
      });

      await vincularFotos(carro.id, fotos);
      salvo = true;
      aviso(editando ? 'Alterações salvas.' : `"${carro.nome}" entrou para a coleção!`);
      location.hash = `#/carro/${carro.id}`;
    });

    form.querySelector('#btn-cancelar').addEventListener('click', async (evento) => {
      if (editando || !fotos.length) return;
      evento.preventDefault();
      const ok = await confirmar({
        titulo: 'Descartar este cadastro?',
        texto: 'As fotos tiradas agora serão apagadas.',
        rotulo: 'Descartar',
        perigo: true,
      });
      if (!ok) return;
      await limparFotosSoltas(fotos);
      fotos = [];
      location.hash = '#/galeria';
    });
  };

  desenhar();

  // ao sair sem salvar, não deixa fotos órfãs no banco
  return { atualizar: () => {}, aoSair: () => { if (!salvo && !editando) limparFotosSoltas(fotos); } };
}
