/** Backup, restauração e informações do app. */

import { esc, aviso, confirmar } from './dom.js';
import { exportarJSON, importarJSON, apagarTudo, estatisticas } from '../store.js';
import { formatarBytes } from '../imagens.js';

function baixar(nome, conteudo) {
  const blob = new Blob([conteudo], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function estimativaDeEspaco() {
  if (!navigator.storage?.estimate) return null;
  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
}

export function render(container) {
  const desenhar = async () => {
    const e = estatisticas();
    const espaco = await estimativaDeEspaco();

    container.innerHTML = `
      <div class="page-head">
        <h1>Ajustes</h1>
        <p>Seus dados ficam só neste aparelho, dentro do navegador.</p>
      </div>

      <fieldset class="group">
        <legend>Backup</legend>
        <p class="field-hint">
          Guarde uma cópia da coleção — inclusive as fotos — em um arquivo JSON.
          Serve para trocar de aparelho ou para não perder nada se limpar o navegador.
        </p>
        <button class="btn btn-primary btn-block" id="btn-exportar" type="button">Exportar coleção (com fotos)</button>
        <button class="btn btn-block" id="btn-exportar-leve" type="button">Exportar só os dados (leve)</button>
      </fieldset>

      <fieldset class="group">
        <legend>Restaurar</legend>
        <p class="field-hint">Escolha um arquivo exportado antes. Você decide se junta ou substitui a coleção atual.</p>
        <button class="btn btn-block" id="btn-importar" type="button">Importar backup</button>
      </fieldset>

      <fieldset class="group">
        <legend>Armazenamento</legend>
        <dl class="facts" style="margin:0">
          <div class="fact"><dt>Carrinhos</dt><dd>${e.modelos}</dd></div>
          <div class="fact"><dt>Fotos</dt><dd>${e.fotos} · ${esc(formatarBytes(e.bytesFotos))}</dd></div>
          ${espaco ? `<div class="fact"><dt>Uso do navegador</dt><dd>${esc(formatarBytes(espaco.usage || 0))} de ${esc(formatarBytes(espaco.quota || 0))}</dd></div>` : ''}
        </dl>
        <button class="btn btn-block" id="btn-persistir" type="button">Pedir armazenamento permanente</button>
        <span class="field-hint">Evita que o navegador descarte as fotos para liberar espaço.</span>
      </fieldset>

      <fieldset class="group">
        <legend>Zona de risco</legend>
        <button class="btn btn-danger btn-block" id="btn-apagar" type="button">Apagar toda a coleção</button>
      </fieldset>

      <p class="field-hint" style="margin-top:24px;text-align:center">
        PokeWheels — catálogo pessoal de miniaturas. Funciona offline.
      </p>
    `;

    container.querySelector('#btn-exportar').addEventListener('click', async () => {
      aviso('Preparando o backup…');
      const dados = await exportarJSON({ comFotos: true });
      baixar(`pokewheels-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dados));
    });

    container.querySelector('#btn-exportar-leve').addEventListener('click', async () => {
      const dados = await exportarJSON({ comFotos: false });
      baixar(`pokewheels-dados-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dados, null, 2));
    });

    container.querySelector('#btn-importar').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.addEventListener('change', async () => {
        const arquivo = input.files?.[0];
        if (!arquivo) return;
        try {
          const conteudo = JSON.parse(await arquivo.text());
          const substituir = await confirmar({
            titulo: 'Substituir a coleção atual?',
            texto: 'Confirmar apaga o que existe hoje e deixa só o backup. Cancelar junta os dois.',
            rotulo: 'Substituir',
            perigo: true,
          });
          aviso('Importando…');
          const r = await importarJSON(conteudo, { substituir });
          aviso(`${r.carros} carrinho(s) e ${r.fotos} foto(s) importados.`);
          desenhar();
        } catch (erro) {
          aviso(erro.message || 'Não consegui ler esse arquivo.', 'err');
        }
      }, { once: true });
      input.click();
    });

    container.querySelector('#btn-persistir').addEventListener('click', async () => {
      if (!navigator.storage?.persist) {
        aviso('Este navegador não oferece essa opção.', 'err');
        return;
      }
      const ok = await navigator.storage.persist();
      aviso(ok ? 'Armazenamento permanente concedido.' : 'O navegador não concedeu — faça backups.', ok ? 'ok' : 'err');
    });

    container.querySelector('#btn-apagar').addEventListener('click', async () => {
      const ok = await confirmar({
        titulo: 'Apagar tudo?',
        texto: 'Todos os carrinhos e fotos serão removidos deste aparelho. Não dá para desfazer.',
        rotulo: 'Apagar tudo',
        perigo: true,
      });
      if (!ok) return;
      await apagarTudo();
      aviso('Coleção apagada.');
      desenhar();
    });
  };

  desenhar();
  return desenhar;
}
