/**
 * Visor de fotos a pantalla completa: ficha lateral, flechas, zoom con pan, compartir y descargar.
 * Independiente del idioma: recibe los textos ya resueltos (ViewerPhoto) y las etiquetas de UI (initViewer).
 */
export interface ViewerPhoto {
  image: string;
  title: string;
  desc?: string;
  fecha?: string;
  lugar?: string;
  categoria?: string;
  fondo?: string;
  decada?: string;
  orig?: string;
  /** Álbum/proyecto al que pertenece (enlace a la ficha estática). */
  project?: { name: string; url: string };
  theme?: string;
  /** URL compartible de la foto (ficha del proyecto con índice); si no, se comparte la imagen. */
  shareUrl?: string;
}
export interface ViewerUI {
  category: string; date: string; place: string; decade: string; fondo: string; signature: string;
  album: string; description: string; prev: string; next: string; panel: string; share: string;
  download: string; zoom: string; close: string; downloadError: string; linkCopied: string;
}

let UI: ViewerUI | null = null;
const state = { photos: [] as ViewerPhoto[], i: 0, sidebar: true };

export function initViewer(ui: ViewerUI) { UI = ui; }

export function readUI(): ViewerUI {
  const el = document.getElementById('eg-ui');
  return JSON.parse(el?.textContent || '{}').viewer;
}

export function esc(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function toast(msg: string) {
  const t = document.createElement('div'); t.className = 'eg-toast'; t.textContent = msg;
  document.body.appendChild(t); requestAnimationFrame(() => { t.style.opacity = '1'; });
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2200);
}

function filename(ph: ViewerPhoto) {
  const parts: string[] = [];
  if (ph.title) parts.push(ph.title);
  const ym = (ph.fecha || '').match(/\d{4}/); if (ym) parts.push(ym[0]);
  if (ph.lugar) parts.push(ph.lugar);
  const base = parts.join('_').replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'emili-godes';
  const ext = (ph.image || '').match(/\.[a-zA-Z0-9]+$/);
  return base + (ext ? ext[0] : '.jpg');
}

export function openViewer(photos: ViewerPhoto[], i = 0) {
  if (!UI) UI = readUI();
  state.photos = photos; state.i = i;
  if (!document.getElementById('eg-viewer')) {
    const ov = document.createElement('div'); ov.id = 'eg-viewer'; document.body.appendChild(ov);
    ov.addEventListener('click', onClick);
  }
  render();
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
}

export function closeViewer() {
  zoomExit();
  document.removeEventListener('keydown', onKey);
  const el = document.getElementById('eg-viewer');
  if (el) { el.classList.remove('open'); el.innerHTML = ''; }
  document.body.style.overflow = '';
  document.dispatchEvent(new CustomEvent('eg:viewer-close'));
}

function nav(d: number) {
  const n = state.photos.length; if (!n) return;
  state.i = (state.i + d + n) % n;
  render();
  document.dispatchEvent(new CustomEvent('eg:viewer-nav', { detail: { index: state.i } }));
}

function onKey(e: KeyboardEvent) {
  if (document.getElementById('eg-zoom')) { if (e.key === 'Escape') zoomExit(); return; }
  if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
  else if (e.key === 'ArrowLeft') nav(-1);
  else if (e.key === 'ArrowRight') nav(1);
}

function onClick(e: Event) {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-vw]');
  if (!btn) return;
  const a = btn.dataset.vw;
  if (a === 'close') closeViewer();
  else if (a === 'prev') nav(-1);
  else if (a === 'next') nav(1);
  else if (a === 'panel') { state.sidebar = !state.sidebar; render(); }
  else if (a === 'zoom') zoomEnter();
  else if (a === 'download') download();
  else if (a === 'share') share();
}

function render() {
  const u = UI!; const ph = state.photos[state.i]; if (!ph) return;
  const many = state.photos.length > 1;
  const rows: [string, string | undefined][] = [
    [u.category, ph.categoria], [u.date, ph.fecha], [u.place, ph.lugar], [u.decade, ph.decada],
    [u.fondo, ph.fondo], [u.signature, ph.orig],
  ];
  const ficha = rows.filter((r) => r[1]).map((r) =>
    `<div class="eg-vw-row"><span>${esc(r[0])}</span><span>${esc(r[1]!)}</span></div>`).join('');
  const album = ph.project ? `<div class="eg-vw-block"><h3>${esc(u.album)}</h3>
      <a href="${esc(ph.project.url)}" class="eg-vw-album">${esc(ph.project.name)}</a></div>` : '';
  const desc = ph.desc ? `<div class="eg-vw-block"><h3>${esc(u.description)}</h3><p>${esc(ph.desc)}</p></div>` : '';
  const sidebar = `${ph.theme ? `<div class="eg-vw-theme">${esc(ph.theme)}</div>` : ''}
    <h2>${esc(ph.title)}</h2><div class="eg-vw-ficha">${ficha}</div>${desc}${album}
    ${many ? `<div class="eg-vw-count">${state.i + 1} / ${state.photos.length}</div>` : ''}`;
  const ic = {
    dl: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 19h16"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    zoom: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  };
  const btn = (a: string, title: string, right: number, svg: string) =>
    `<button data-vw="${a}" title="${esc(title)}" aria-label="${esc(title)}" class="eg-vw-btn" style="position:absolute;top:16px;right:${right}px;z-index:50">${svg}</button>`;
  const arrows = many
    ? `<button data-vw="prev" title="${esc(u.prev)}" aria-label="${esc(u.prev)}" class="eg-vw-arrow" style="left:16px">‹</button>
       <button data-vw="next" title="${esc(u.next)}" aria-label="${esc(u.next)}" class="eg-vw-arrow" style="right:16px">›</button>` : '';
  const el = document.getElementById('eg-viewer')!;
  el.innerHTML = `<div class="eg-vw-flex" role="dialog" aria-modal="true" aria-label="${esc(ph.title)}">
      <aside class="eg-vw-side" id="eg-vw-side"${state.sidebar ? '' : ' style="display:none"'}>${sidebar}</aside>
      <div class="eg-vw-area">
        <button data-vw="panel" title="${esc(u.panel)}" aria-label="${esc(u.panel)}" class="eg-vw-btn eg-vw-toggle" style="position:absolute;top:16px;left:16px;z-index:50">${state.sidebar ? '←' : '→'}</button>
        ${btn('share', u.share, 166, ic.share)}${btn('download', u.download, 116, ic.dl)}${btn('zoom', u.zoom, 66, ic.zoom)}${btn('close', u.close, 16, '✕')}
        ${arrows}
        <div class="eg-vw-photo"><img id="eg-vw-img" src="${esc(ph.image)}" alt="${esc(ph.title)}"></div>
      </div></div>`;
  el.classList.add('open');
  // precarga de la siguiente
  const nx = state.photos[(state.i + 1) % state.photos.length];
  if (nx && nx !== ph) { const im = new Image(); im.src = nx.image; }
}

// ── Zoom (x4, pan, +/-) ───────────────────────────────────────────────────────
let zL = 4, pX = 0, pY = 0, drag = false, dsX = 0, dsY = 0, psX = 0, psY = 0;
const zApply = () => { const im = document.getElementById('eg-zoom-img'); if (im) im.style.transform = `scale(${zL}) translate(${pX}px,${pY}px)`; };
const zClamp = () => {
  const mx = (zL - 1) / (2 * zL) * window.innerWidth, my = (zL - 1) / (2 * zL) * window.innerHeight;
  pX = Math.max(-mx, Math.min(mx, pX)); pY = Math.max(-my, Math.min(my, pY));
};
const zMove = (e: PointerEvent) => { if (!drag) return; pX = psX + (e.clientX - dsX) / zL; pY = psY + (e.clientY - dsY) / zL; zClamp(); zApply(); };
const zUp = () => { drag = false; document.removeEventListener('pointermove', zMove); document.removeEventListener('pointerup', zUp); };
const zDown = (e: PointerEvent) => { drag = true; dsX = e.clientX; dsY = e.clientY; psX = pX; psY = pY;
  document.addEventListener('pointermove', zMove); document.addEventListener('pointerup', zUp); e.preventDefault(); };
const zStep = (d: number) => { zL = Math.max(1, Math.min(10, zL + d)); const l = document.getElementById('eg-zoom-lbl'); if (l) l.textContent = zL + '×'; pX = 0; pY = 0; zApply(); };
function zoomEnter() {
  const ph = state.photos[state.i]; if (!ph || document.getElementById('eg-zoom')) return;
  zL = 4; pX = 0; pY = 0;
  const ov = document.createElement('div'); ov.id = 'eg-zoom';
  ov.innerHTML = `<img id="eg-zoom-img" src="${esc(ph.image)}" alt="">
    <button id="eg-zoom-x" title="Esc" aria-label="${esc(UI!.close)}">✕</button>
    <div id="eg-zoom-ctrls"><button data-z="-1" aria-label="−">−</button><span id="eg-zoom-lbl">4×</span><button data-z="1" aria-label="+">+</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#eg-zoom-x')!.addEventListener('click', zoomExit);
  ov.querySelectorAll<HTMLElement>('[data-z]').forEach((b) => b.addEventListener('click', () => zStep(parseInt(b.dataset.z!, 10))));
  ov.addEventListener('pointerdown', zDown);
}
function zoomExit() {
  const ov = document.getElementById('eg-zoom'); if (!ov) return;
  document.removeEventListener('pointermove', zMove); document.removeEventListener('pointerup', zUp); drag = false; ov.remove();
}

function download() {
  const ph = state.photos[state.i]; if (!ph?.image) return;
  fetch(ph.image).then((r) => r.blob()).then((b) => {
    const u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = filename(ph); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
  }).catch(() => toast(UI!.downloadError));
}

function share() {
  const ph = state.photos[state.i]; if (!ph) return;
  const url = ph.shareUrl ? location.origin + ph.shareUrl : location.origin + ph.image;
  const title = ph.title || 'Emili Godes';
  const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (n.share) {
    let data: ShareData = { title, text: title, url };
    if (n.canShare) {
      fetch(ph.image).then((r) => r.blob()).then((b) => {
        const f = new File([b], filename(ph), { type: b.type || 'image/jpeg' });
        if (n.canShare!({ files: [f] })) data = { files: [f], title, text: url };
        n.share!(data).catch(() => {});
      }).catch(() => { n.share!(data).catch(() => {}); });
    } else n.share(data).catch(() => {});
    return;
  }
  navigator.clipboard?.writeText(url).then(() => toast(UI!.linkCopied)).catch(() => prompt('URL:', url));
}
