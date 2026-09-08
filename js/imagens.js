/**
 * Processamento de fotos: redimensiona antes de guardar para que a coleção
 * caiba no armazenamento do navegador, e gera a miniatura da galeria.
 */

const LADO_MAX = 1440;
const LADO_MINIATURA = 360;
const QUALIDADE = 0.82;

const urls = new Map();

async function paraBitmap(origem) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(origem);
    } catch { /* cai no caminho com <img> */ }
  }

  const url = URL.createObjectURL(origem);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function desenhar(fonte, ladoMax) {
  const larguraOrig = fonte.width || fonte.naturalWidth;
  const alturaOrig = fonte.height || fonte.naturalHeight;
  const escala = Math.min(1, ladoMax / Math.max(larguraOrig, alturaOrig));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(larguraOrig * escala));
  canvas.height = Math.max(1, Math.round(alturaOrig * escala));

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function paraBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao converter a foto.'))),
      'image/jpeg',
      QUALIDADE,
    );
  });
}

/** Recebe File/Blob da câmera ou da galeria e devolve { blob, miniatura, largura, altura }. */
export async function prepararFoto(arquivo) {
  const bitmap = await paraBitmap(arquivo);
  const grande = desenhar(bitmap, LADO_MAX);
  const pequena = desenhar(bitmap, LADO_MINIATURA);
  const [blob, miniatura] = await Promise.all([paraBlob(grande), paraBlob(pequena)]);
  if (typeof bitmap.close === 'function') bitmap.close();

  return { blob, miniatura, largura: grande.width, altura: grande.height, bytes: blob.size };
}

/** URL estável (e reaproveitada) para exibir um Blob guardado. */
export function urlDe(chave, blob) {
  if (!blob) return '';
  const existente = urls.get(chave);
  if (existente) return existente;
  const url = URL.createObjectURL(blob);
  urls.set(chave, url);
  return url;
}

export function esquecerUrl(chave) {
  const url = urls.get(chave);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(chave);
  }
}

export function formatarBytes(bytes) {
  if (!bytes) return '0 KB';
  const unidades = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(unidades.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
}

/** Blob → data URL (usado no backup em JSON). */
export function paraDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

/** data URL → Blob (usado na restauração do backup). */
export async function deDataUrl(dataUrl) {
  const resposta = await fetch(dataUrl);
  return resposta.blob();
}
