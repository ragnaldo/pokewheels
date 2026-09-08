/**
 * Leitura das tabelas da Hot Wheels Fandom Wiki.
 *
 * As páginas "List of <ano> Hot Wheels" trazem uma ou mais `wikitable` com as
 * colunas Toy #, Col #, Model, Series, Series # e Photo. Este módulo converte
 * esse HTML em registros limpos — sem dependências, para rodar no CI e ser
 * testado com fixture.
 */

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', deg: '°', trade: '™', reg: '®',
};

export function decodificar(texto) {
  return texto
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (inteiro, nome) => ENTIDADES[nome.toLowerCase()] ?? inteiro);
}

/** Texto visível de uma célula: sem tags, sem caracteres invisíveis, sem espaço sobrando. */
export function textoDaCelula(html) {
  const semTags = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<\/(td|th|tr|li|p|div)>/gi, ' ')
    .replace(/<[^>]+>/g, '');

  return decodificar(semTags)
    .replace(/[\u00ad\u200b-\u200f\u2060\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*,\s*/g, ', ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim();
}

function celulas(linhaHtml) {
  const achados = [];
  const re = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(linhaHtml))) {
    achados.push({ tipo: m[1].toLowerCase(), atributos: m[2], html: m[3] });
  }
  return achados;
}

function linhas(tabelaHtml) {
  const achados = [];
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = re.exec(tabelaHtml))) achados.push(m[1]);
  return achados;
}

function tabelas(html) {
  const achados = [];
  const re = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/wikitable|article-table|sortable/i.test(m[1])) achados.push(m[2]);
  }
  return achados;
}

const APELIDOS = {
  toy: ['toy #', 'toy#', 'toy number', 'toy no', 'toy num', 'toy id', 'toyid'],
  col: ['col #', 'col.#', 'col#', 'col. #', 'collector #', 'collector number', '#'],
  modelo: ['model', 'model name', 'casting', 'car', 'name'],
  serie: ['series', 'segment', 'series name'],
  serieNumero: ['series #', 'series#', 'series number', 'series no', '# in series'],
  foto: ['photo', 'image', 'picture'],
};

function mapearColunas(cabecalhos) {
  const mapa = {};
  cabecalhos.forEach((titulo, indice) => {
    const limpo = titulo.toLowerCase().replace(/\s+/g, ' ').trim();
    for (const [campo, nomes] of Object.entries(APELIDOS)) {
      if (mapa[campo] !== undefined) continue;
      if (nomes.includes(limpo)) mapa[campo] = indice;
    }
  });
  return mapa;
}

const RE_IMAGEM = /https:\/\/static\.wikia\.nocookie\.net\/[^\s"'<>\\]+/i;

/** Tira o sufixo de redimensionamento da Wikia para pegar a imagem original. */
export function normalizarImagem(url) {
  if (!url) return '';
  return decodificar(url)
    .replace(/\/revision\/latest\/scale-to-width-down\/\d+/, '/revision/latest')
    .replace(/&amp;/g, '&');
}

export function separarSerieNumero(texto) {
  const m = String(texto || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return { numero: '', total: '' };
  return { numero: Number(m[1]), total: Number(m[2]) };
}

/**
 * Converte o HTML de uma página de lista em registros do catálogo.
 * @param {string} html  HTML devolvido por action=parse
 * @param {number} ano   ano da lista
 */
export function extrairModelos(html, ano) {
  const modelos = [];

  for (const tabela of tabelas(html)) {
    const todasLinhas = linhas(tabela);
    if (!todasLinhas.length) continue;

    // O cabeçalho é a primeira linha só com <th>.
    const primeira = celulas(todasLinhas[0]);
    const ehCabecalho = primeira.length > 1 && primeira.every((c) => c.tipo === 'th');
    if (!ehCabecalho) continue;

    const colunas = mapearColunas(primeira.map((c) => textoDaCelula(c.html)));
    if (colunas.modelo === undefined) continue;

    for (const linha of todasLinhas.slice(1)) {
      const cs = celulas(linha);
      if (cs.length < 2) continue;

      const pega = (campo) => (colunas[campo] === undefined ? '' : textoDaCelula(cs[colunas[campo]]?.html || ''));

      const modelo = pega('modelo');
      if (!modelo || /^model$/i.test(modelo)) continue;

      const serieBruta = pega('serie');
      const { numero, total } = separarSerieNumero(pega('serieNumero'));
      const celulaFoto = colunas.foto === undefined ? '' : (cs[colunas.foto]?.html || '');
      const foto = normalizarImagem((celulaFoto.match(RE_IMAGEM) || [''])[0]);

      modelos.push({
        ano,
        toy: pega('toy'),
        col: pega('col'),
        modelo,
        serie: serieBruta.split(',')[0].trim(),
        seriesTodas: serieBruta ? serieBruta.split(',').map((s) => s.trim()).filter(Boolean) : [],
        serieNumero: numero,
        serieTotal: total,
        foto,
      });
    }
  }

  return modelos;
}

/** Remove repetições (o mesmo modelo pode aparecer em duas tabelas da página). */
export function semRepetidos(modelos) {
  const vistos = new Map();
  for (const m of modelos) {
    const chave = `${m.ano}|${m.toy || ''}|${m.modelo}|${m.serie}|${m.serieNumero}`.toLowerCase();
    const anterior = vistos.get(chave);
    // Mantém o registro mais completo (com foto, com toy #).
    if (!anterior || (!anterior.foto && m.foto) || (!anterior.toy && m.toy)) vistos.set(chave, m);
  }
  return [...vistos.values()];
}
