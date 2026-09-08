/** Utilitários de interface compartilhados pelas telas. */

export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Monta um elemento a partir de HTML. */
export function criar(html) {
  const molde = document.createElement('template');
  molde.innerHTML = html.trim();
  return molde.content.firstElementChild;
}

export function aviso(mensagem, tipo = 'ok') {
  const caixa = document.getElementById('toasts');
  const item = criar(`<div class="toast ${tipo === 'err' ? 'err' : ''}">${esc(mensagem)}</div>`);
  caixa.appendChild(item);
  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transition = 'opacity .2s';
    setTimeout(() => item.remove(), 220);
  }, 2800);
}

export function confirmar({ titulo, texto = '', rotulo = 'Confirmar', perigo = false }) {
  return new Promise((resolve) => {
    const fundo = criar(`
      <div class="sheet-backdrop">
        <div class="sheet" role="dialog" aria-modal="true">
          <h3>${esc(titulo)}</h3>
          ${texto ? `<p>${esc(texto)}</p>` : ''}
          <div class="row">
            <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
            <div class="spacer"></div>
            <button class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-acao="ok" type="button">${esc(rotulo)}</button>
          </div>
        </div>
      </div>`);

    const fechar = (resposta) => {
      fundo.remove();
      document.removeEventListener('keydown', aoTeclar);
      resolve(resposta);
    };
    const aoTeclar = (e) => { if (e.key === 'Escape') fechar(false); };

    fundo.addEventListener('click', (e) => {
      if (e.target === fundo || e.target.dataset.acao === 'cancelar') fechar(false);
      if (e.target.dataset.acao === 'ok') fechar(true);
    });
    document.addEventListener('keydown', aoTeclar);
    document.body.appendChild(fundo);
    fundo.querySelector('[data-acao="ok"]').focus();
  });
}

export function formatarData(iso) {
  if (!iso) return '';
  const data = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleDateString('pt-BR');
}

export function formatarDataHora(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatarDinheiro(valor, moeda = 'BRL') {
  const numero = Number(valor);
  if (!numero) return '';
  try {
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: moeda });
  } catch {
    return `${moeda} ${numero.toFixed(2)}`;
  }
}

export function adiar(fn, ms = 220) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function opcoes(lista, selecionado, { vazio = '—' } = {}) {
  const itens = lista.map((item) => {
    const valor = typeof item === 'string' ? item : item.id;
    const rotulo = typeof item === 'string' ? item : item.nome;
    const sel = String(valor) === String(selecionado ?? '') ? ' selected' : '';
    return `<option value="${esc(valor)}"${sel}>${esc(rotulo)}</option>`;
  });
  return `<option value=""${!selecionado ? ' selected' : ''}>${esc(vazio)}</option>${itens.join('')}`;
}
