/** Testes do parser das tabelas da wiki (node scripts/testar-parser.mjs). */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extrairModelos, semRepetidos, textoDaCelula, separarSerieNumero } from '../js/lib/wikitabela.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const falhas = [];

function conferir(condicao, descricao) {
  console.log(`${condicao ? 'PASS' : 'FALHA'}  ${descricao}`);
  if (!condicao) falhas.push(descricao);
}

const html = readFileSync(join(aqui, 'fixtures/lista-exemplo.html'), 'utf8');
const brutos = extrairModelos(html, 2014);
const modelos = semRepetidos(brutos);

conferir(brutos.length === 6, `6 linhas com modelo lidas (veio ${brutos.length})`);
conferir(modelos.length === 5, `5 modelos após remover repetidos (veio ${modelos.length})`);

const ferrari = modelos.find((m) => m.modelo === 'LaFerrari');
conferir(Boolean(ferrari), 'acha o LaFerrari');
conferir(ferrari?.toy === 'BDC80', 'lê o toy number');
conferir(ferrari?.col === '001', 'lê o número de coleção');
conferir(ferrari?.serie === 'Speed Team', 'primeira série vira a série principal');
conferir(ferrari?.seriesTodas.length === 2, 'guarda as duas séries da célula');
conferir(ferrari?.serieNumero === 8 && ferrari?.serieTotal === 10, 'separa 8/10 mesmo com caractere invisível');
conferir(ferrari?.foto.includes('LaFerarri_2014') && !ferrari.foto.includes('scale-to-width-down'),
  'pega a foto em tamanho original');
conferir(ferrari?.ano === 2014, 'guarda o ano da lista');

const camaro = modelos.find((m) => m.modelo === "'67 Camaro");
conferir(camaro?.serieNumero === 3 && camaro?.serieTotal === 10, 'aceita "3 / 10" com espaços');

const skyline = modelos.find((m) => m.modelo.startsWith('Nissan'));
conferir(Boolean(skyline), 'lê a segunda tabela, com colunas diferentes');
conferir(skyline?.col === '', 'tabela sem Col. # não inventa valor');
conferir(skyline?.foto === '', 'célula de foto sem imagem fica vazia');
conferir(!modelos.some((m) => m.modelo === 'ignorar'), 'tabela que não é wikitable é ignorada');
conferir(!modelos.some((m) => !m.modelo), 'linha vazia é descartada');

conferir(textoDaCelula('<td><b>Ford</b>&nbsp;GT<br/>Le Mans</td>') === 'Ford GT, Le Mans', 'texto da célula limpo');
conferir(separarSerieNumero('sem número').numero === '', 'série sem número não quebra');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nParser ok');
process.exit(falhas.length ? 1 : 0);
