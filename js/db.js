/**
 * Camada de persistência (IndexedDB).
 * Tudo fica no aparelho: nenhum dado sai daqui.
 */

const NOME_BANCO = 'pokewheels';
const VERSAO = 1;

let promessaBanco = null;

function abrir() {
  if (promessaBanco) return promessaBanco;

  promessaBanco = new Promise((resolve, reject) => {
    const req = indexedDB.open(NOME_BANCO, VERSAO);

    req.onupgradeneeded = () => {
      const bd = req.result;

      if (!bd.objectStoreNames.contains('carros')) {
        const carros = bd.createObjectStore('carros', { keyPath: 'id' });
        carros.createIndex('criadoEm', 'criadoEm');
        carros.createIndex('serie', 'serie');
      }

      if (!bd.objectStoreNames.contains('fotos')) {
        const fotos = bd.createObjectStore('fotos', { keyPath: 'id' });
        fotos.createIndex('carroId', 'carroId');
      }

      if (!bd.objectStoreNames.contains('config')) {
        bd.createObjectStore('config', { keyPath: 'chave' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return promessaBanco;
}

async function transacao(lojas, modo, tarefa) {
  const bd = await abrir();
  return new Promise((resolve, reject) => {
    const tx = bd.transaction(lojas, modo);
    let resultado;
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    Promise.resolve(tarefa(tx)).then((v) => { resultado = v; }).catch((e) => {
      reject(e);
      try { tx.abort(); } catch { /* já encerrada */ }
    });
  });
}

function pedido(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const db = {
  async todos(loja) {
    return transacao(loja, 'readonly', (tx) => pedido(tx.objectStore(loja).getAll()));
  },

  async obter(loja, id) {
    return transacao(loja, 'readonly', (tx) => pedido(tx.objectStore(loja).get(id)));
  },

  async porIndice(loja, indice, valor) {
    return transacao(loja, 'readonly', (tx) =>
      pedido(tx.objectStore(loja).index(indice).getAll(valor)));
  },

  async salvar(loja, registro) {
    await transacao(loja, 'readwrite', (tx) => pedido(tx.objectStore(loja).put(registro)));
    return registro;
  },

  async salvarVarios(loja, registros) {
    await transacao(loja, 'readwrite', (tx) => {
      const os = tx.objectStore(loja);
      return Promise.all(registros.map((r) => pedido(os.put(r))));
    });
    return registros;
  },

  async remover(loja, id) {
    return transacao(loja, 'readwrite', (tx) => pedido(tx.objectStore(loja).delete(id)));
  },

  async removerVarios(loja, ids) {
    return transacao(loja, 'readwrite', (tx) => {
      const os = tx.objectStore(loja);
      return Promise.all(ids.map((id) => pedido(os.delete(id))));
    });
  },

  async limpar(lojas) {
    return transacao(lojas, 'readwrite', (tx) =>
      Promise.all(lojas.map((l) => pedido(tx.objectStore(l).clear()))));
  },

  async contar(loja) {
    return transacao(loja, 'readonly', (tx) => pedido(tx.objectStore(loja).count()));
  },
};

export function novoId(prefixo = 'c') {
  const aleatorio = crypto.getRandomValues(new Uint32Array(2));
  return `${prefixo}_${Date.now().toString(36)}_${aleatorio[0].toString(36)}${aleatorio[1].toString(36)}`;
}
