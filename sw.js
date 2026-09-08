/* Service worker: deixa o app abrir offline. Os dados ficam no IndexedDB. */

const CACHE = 'pokewheels-v2';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/main.js',
  './js/db.js',
  './js/store.js',
  './js/estado.js',
  './js/imagens.js',
  './js/camera.js',
  './js/data/catalogo.js',
  './js/catalogo.js',
  './js/lib/wikitabela.js',
  './js/ui/catalogoView.js',
  './js/ui/dom.js',
  './js/ui/componentes.js',
  './js/ui/galeria.js',
  './js/ui/detalhe.js',
  './js/ui/formulario.js',
  './js/ui/lotes.js',
  './js/ui/estatisticas.js',
  './js/ui/ajustes.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

// Os arquivos de data/catalogo/ não entram no pré-cache (podem ainda não existir);
// o fetch abaixo guarda cada um assim que é usado pela primeira vez.
self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // rede primeiro (para pegar atualizações), cache como reserva
  evento.respondWith(
    fetch(req)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copia)).catch(() => {});
        return resposta;
      })
      .catch(() => caches.match(req).then((cacheada) => cacheada || caches.match('./index.html'))),
  );
});
