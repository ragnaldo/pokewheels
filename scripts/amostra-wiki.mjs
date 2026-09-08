/**
 * Ferramenta de diagnóstico: mostra o HTML cru das primeiras linhas de uma
 * lista da wiki, para conferir a estrutura real da tabela.
 *
 *   node scripts/amostra-wiki.mjs --ano=2024 --linhas=6
 */

const arg = (nome, padrao) => {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.split('=')[1] : padrao;
};

const ano = arg('ano', new Date().getFullYear());
const linhas = Number(arg('linhas', 6));

const url = `https://hotwheels.fandom.com/api.php?action=parse&page=${
  encodeURIComponent(`List of ${ano} Hot Wheels`)}&prop=text&format=json&formatversion=2&origin=*`;

const resposta = await fetch(url, { headers: { 'User-Agent': 'PokeWheels/diagnostico' } });
const html = (await resposta.json()).parse?.text || '';

const tabela = html.match(/<table\b[^>]*(?:wikitable|article-table)[^>]*>([\s\S]*?)<\/table>/i);
if (!tabela) {
  console.log('Nenhuma wikitable encontrada.');
  process.exit(0);
}

const trs = [...tabela[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].slice(0, linhas);
console.log(`=== ${trs.length} primeiras linhas da lista de ${ano} ===\n`);

trs.forEach((tr, i) => {
  const celulas = [...tr[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
  console.log(`--- linha ${i} (${celulas.length} células) ---`);
  celulas.forEach((c, j) => {
    const atributos = c[2].trim().replace(/\s+/g, ' ');
    const texto = c[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
    const imagem = (c[3].match(/static\.wikia\.nocookie\.net\/[^\s"'<>]{0,70}/) || [''])[0];
    console.log(`  [${j}] attrs="${atributos}" texto="${texto}" img="${imagem}"`);
  });
  console.log('');
});
