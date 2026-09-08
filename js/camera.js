/**
 * Captura de fotos. Tenta a câmera ao vivo (getUserMedia) e, quando o
 * navegador não permite, cai no seletor de arquivos com `capture`.
 */

import { criar, aviso } from './ui/dom.js';

const SVG_FECHAR = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const SVG_VIRAR = '<svg viewBox="0 0 24 24"><path d="M4 9a8 8 0 0113.6-4.6L20 7"/><path d="M20 4v3.5h-3.5"/><path d="M20 15a8 8 0 01-13.6 4.6L4 17"/><path d="M4 20v-3.5h3.5"/></svg>';

export function suportaCameraAoVivo() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;
}

/** Abre o seletor de arquivos e devolve os arquivos escolhidos. */
export function escolherArquivos({ camera = false, multiplo = true } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (multiplo) input.multiple = true;
    if (camera) input.capture = 'environment';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const arquivos = [...(input.files || [])];
      input.remove();
      resolve(arquivos);
    }, { once: true });

    // Se o usuário cancelar, o `change` não dispara em alguns navegadores;
    // o foco de volta na janela serve de dica para liberar a promessa.
    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (document.body.contains(input)) {
          input.remove();
          resolve([]);
        }
      }, 600);
    }, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Abre a câmera em tela cheia. Resolve com a lista de Blobs fotografados
 * (o usuário pode bater várias fotos antes de fechar).
 */
export function abrirCamera() {
  return new Promise((resolve) => {
    let stream = null;
    let usandoFrontal = false;
    const capturadas = [];

    const tela = criar(`
      <div class="cam-overlay">
        <video class="cam-video" playsinline autoplay muted></video>
        <div class="cam-bar">
          <button class="cam-side" data-acao="fechar" type="button" aria-label="Fechar">${SVG_FECHAR}</button>
          <button class="cam-shutter" data-acao="disparar" type="button" aria-label="Fotografar"></button>
          <button class="cam-side" data-acao="virar" type="button" aria-label="Virar câmera">${SVG_VIRAR}</button>
        </div>
      </div>`);

    const video = tela.querySelector('video');
    const contador = criar('<div style="position:absolute;top:14px;left:14px;color:#fff;font-size:13px"></div>');
    tela.appendChild(contador);

    const parar = () => {
      if (stream) for (const faixa of stream.getTracks()) faixa.stop();
      stream = null;
    };

    const encerrar = () => {
      parar();
      tela.remove();
      document.removeEventListener('keydown', aoTeclar);
      resolve(capturadas);
    };

    const aoTeclar = (e) => { if (e.key === 'Escape') encerrar(); };

    const ligar = async () => {
      parar();
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: usandoFrontal ? 'user' : { ideal: 'environment' }, width: { ideal: 1920 } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play().catch(() => {});
      } catch (erro) {
        aviso('Não consegui abrir a câmera. Use "Escolher da galeria".', 'err');
        encerrar();
      }
    };

    const disparar = async () => {
      if (!video.videoWidth) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
      if (blob) {
        capturadas.push(blob);
        contador.textContent = `${capturadas.length} foto(s)`;
        video.animate(
          [{ filter: 'brightness(3)' }, { filter: 'brightness(1)' }],
          { duration: 160 },
        );
      }
    };

    tela.addEventListener('click', (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'fechar') encerrar();
      if (acao === 'disparar') disparar();
      if (acao === 'virar') { usandoFrontal = !usandoFrontal; ligar(); }
    });

    document.addEventListener('keydown', aoTeclar);
    document.body.appendChild(tela);
    ligar();
  });
}

/** Caminho preferido: câmera ao vivo quando dá, seletor quando não dá. */
export async function capturar() {
  if (suportaCameraAoVivo()) {
    const blobs = await abrirCamera();
    if (blobs.length) return blobs;
    return [];
  }
  return escolherArquivos({ camera: true, multiplo: false });
}
