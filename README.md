# PokeWheels — catálogo de Hot Wheels

Aplicativo web (PWA) para catalogar miniaturas: você fotografa o carrinho, ele salva
na galeria e, ao tocar na foto, mostra a ficha completa — ano de fabricação, série,
nível de raridade, os outros carrinhos do mesmo lote e o que ainda falta para fechar
a coleção.

Funciona no celular e no computador, **offline**, e tudo fica guardado no próprio
aparelho (IndexedDB). Não existe servidor, cadastro ou envio de dados para fora.

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

## Como rodar

O app é feito de arquivos estáticos e usa módulos ES, então precisa ser servido por
HTTP (abrir o `index.html` direto pelo `file://` não funciona):

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

Qualquer servidor estático serve (`npx serve`, nginx, GitHub Pages, Netlify…).

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
js/ui/                  telas: galeria, detalhe, formulário, lotes, números, ajustes
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
