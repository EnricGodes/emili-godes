/**
 * Galerías estáticas (ficha de proyecto, destacadas): las fotos ya están en el HTML;
 * el JSON #eg-photos alimenta el visor. Soporta #foto-N en la URL para abrir una foto directamente.
 */
import { openViewer, initViewer, readUI, type ViewerPhoto } from './viewer';

const data = document.getElementById('eg-photos');
if (data) {
  initViewer(readUI());
  const photos: ViewerPhoto[] = JSON.parse(data.textContent || '[]');
  document.querySelectorAll<HTMLElement>('[data-photo-index]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); openViewer(photos, parseInt(el.dataset.photoIndex!, 10)); });
  });
  const m = location.hash.match(/^#foto-(\d+)$/);
  if (m) { const i = parseInt(m[1], 10) - 1; if (photos[i]) openViewer(photos, i); }
}
