# PokeWheels — catálogo de Hot Wheels

Aplicativo web (PWA) para catalogar miniaturas: você fotografa o carrinho, ele salva
na galeria e, ao tocar na foto, mostra a ficha completa — ano de fabricação, série,
nível de raridade, os outros carrinhos do mesmo lote e o que ainda falta para fechar
a coleção.

**Abra em:** https://ragnaldo.github.io/pokewheels/ — dá para instalar na tela
inicial e usar como app. Não precisa rodar nada na sua máquina.

Funciona no celular e no computador, **offline**, e a sua coleção fica guardada no
próprio aparelho (IndexedDB). Não existe cadastro nem envio dos seus dados para
fora.

## Catálogo real

Os modelos vêm da [Hot Wheels Wiki (Fandom)](https://hotwheels.fandom.com/), que é
a base mantida pela comunidade — a mesma fonte usada por outros projetos de
catalogação. O `scripts/construir-catalogo.mjs` lê as páginas
*List of &lt;ano&gt; Hot Wheels*, extrai as tabelas (toy number, nº de coleção,
modelo, série, posição no lote e foto) e grava JSONs estáticos; o GitHub Actions
roda isso a cada publicação e toda segunda-feira, commita o resultado em
`data/catalogo/` e publica — ou seja, o app funciona mesmo sem rodar a CI de novo.
Na primeira execução vieram **9.089 modelos de 23 anos**.

No app isso vira:

- **busca no catálogo** ao cadastrar: escolheu o modelo, ele preenche nome, toy
  number, série, número no lote, ano e ainda guarda a foto oficial;
- **aba Catálogo**: navegue por ano → série → modelos, com marcação do que você
  já tem e botão para adicionar o que falta;
- **lote de verdade**: na ficha do carrinho, a lista completa da série pelo nome,
  não só os números que faltam.

Se um ano ainda não estiver gerado, o app consulta a API da wiki ao vivo, no
navegador, usando o mesmo parser. O índice de busca (1,6 MB, ~290 KB comprimido)
é baixado uma vez e fica no cache do service worker.

Duas ressalvas honestas sobre a fonte: a wiki é mantida por voluntários, então
existem linhas com foto trocada ou campo em branco (o parser copia o que está
lá, sem inventar), e cada **variação de cor** vira um registro separado — por
isso uma série "de 10" pode listar 22 itens.

## O que dá para fazer

- **Fotografar** com a câmera do aparelho (várias fotos por carrinho) ou escolher da galeria.
  As imagens são redimensionadas antes de salvar para não estourar o armazenamento.
- **Ficha do carrinho**: modelo, fabricante, ano de fabricação, ano do modelo real,
  toy number, cor, tipo de roda, escala, país, condição, embalagem, quantidade,
  valor pago, data e local da compra, tags e anotações.
- **Nível de raridade**: Comum, Incomum, Raro, Muito raro, Treasure Hunt e Super
  Treasure Hunt — cada um com uma dica de como identificar.
- **Lotes / séries**: informe a série (ex.: `HW Exotics 3/10`) e o app agrupa os
  carrinhos, mostra a barra de progresso do lote e lista **os números que faltam**.
- **Busca e filtros** por texto, raridade, série e favoritos; ordenação por data,
  nome, raridade ou série.
- **Números da coleção**: totais, unidades, tesouros, lotes completos, valor
  investido e distribuição por raridade e por ano.
- **Backup**: exporta tudo (inclusive as fotos) em um JSON e importa de volta,
  juntando ou substituindo a coleção.
- **Instalável**: dá para adicionar à tela inicial e usar como app, sem internet.

## Publicação

O deploy é automático pelo workflow `.github/workflows/publicar.yml`:

1. roda o teste do parser (`node scripts/testar-parser.mjs`);
2. monta o catálogo a partir da wiki (`node scripts/construir-catalogo.mjs`);
3. sobe tudo para o GitHub Pages.

**Um passo manual, uma vez só:** o token do Actions não tem permissão para criar o
site do Pages, então abra **Settings → Pages** do repositório e escolha
*Source: **GitHub Actions***. O workflow detecta isso sozinho — enquanto estiver
desligado ele só monta o catálogo e avisa; assim que ligar, o deploy sai no push
seguinte (ou rode o workflow à mão em Actions → *Catálogo e publicação* →
*Run workflow*).

Para rodar o app na sua máquina (opcional, só para desenvolver):

```bash
node scripts/testar-parser.mjs                             # testa o parser
node scripts/construir-catalogo.mjs --de=2020 --ate=2026   # atualiza o catálogo
python3 -m http.server 8000                                # abre em localhost:8000
```

Para usar a **câmera ao vivo** e o **modo offline**, a página precisa estar em
`https://` ou em `localhost` — exigência dos navegadores. Fora desse contexto o app
cai automaticamente no seletor de arquivos do sistema, que também abre a câmera no
celular.

### No celular, na mesma rede

```bash
python3 -m http.server 8000 --bind 0.0.0.0
# acesse http://SEU-IP:8000 pelo celular
```

Nesse caso o navegador pode bloquear a câmera ao vivo (origem não segura); use o
botão **Galeria**, que aciona a câmera nativa do aparelho.

## Organização do código

```
index.html              estrutura, barra superior e navegação inferior
.github/workflows/      build do catálogo + deploy no GitHub Pages
scripts/                gerador do catálogo e teste do parser
js/lib/wikitabela.mjs   parser das tabelas da wiki (usado no CI e no navegador)
js/catalogo.js          leitura do catálogo no app (arquivos locais + wiki ao vivo)
manifest.webmanifest    dados de instalação do PWA
sw.js                   service worker (cache para uso offline)
css/styles.css          folha de estilo única, mobile-first
js/main.js              roteador por hash, busca global, inicialização
js/db.js                acesso ao IndexedDB
js/store.js             regras do catálogo: carrinhos, fotos, lotes, estatísticas
js/imagens.js           redimensionamento, miniaturas e conversões
js/camera.js            câmera em tela cheia + seletor de arquivos
js/estado.js            filtros da galeria
js/data/catalogo.js     listas de referência (raridades, séries, rodas, países…)
js/ui/                  telas: galeria, catálogo, detalhe, formulário, lotes, números, ajustes
```

O `store.js` é a única porta de entrada para os dados: as telas nunca falam com o
IndexedDB direto.

## Onde ficam os dados

Tudo no navegador do aparelho:

- `carros` — a ficha de cada miniatura;
- `fotos` — as imagens (Blob) e suas miniaturas;
- nada é enviado para nenhum servidor.

Limpar os dados do site apaga a coleção. Em **Ajustes** há o botão de backup e o
pedido de *armazenamento permanente*, que reduz a chance de o navegador descartar
as fotos para liberar espaço.

## Créditos e marcas

Os dados dos modelos vêm da Hot Wheels Wiki (Fandom), sob licença
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), com as fotos
hospedadas pela própria wiki. *Hot Wheels* é marca registrada da Mattel; este é um
projeto pessoal, independente, sem qualquer ligação com a empresa.
