/**
 * Explorador de La obra: panel lateral (temáticas / décadas / fondos), vista de proyectos,
 * vista transversal (filtros por década o fondo cruzan temáticas), proyecto y visor.
 * Estado en el hash: #ambito[/proyecto[/indiceFoto]]. Datos de /data/catalog.<lang>.json.
 */
import { openViewer, esc, readUI, initViewer, type ViewerPhoto } from './viewer';

interface Photo { orig: string; image: string; thumb: string; w: number; h: number; title: string; desc: string; fecha: string; lugar: string; categoria: string; fondo: string; decada: string }
interface Project { slug: string; uslug: string; name: string; lugar: string; fecha: string; year: number; decada: string; count: number; cover: string; fondos: string[]; url: string; photos: Photo[] }
interface Ambito { label: string; uslug: string; intro: string; url: string; count: number; decades: string[]; fondos: string[]; projects: Project[] }
interface Data { lang: string; total: number; ambito_order: string[]; decades: string[]; fondos_order: string[]; fondos: Record<string, string>; ambitos: Record<string, Ambito> }
interface UI { themes: string; allThemes: string; decades: string; funds: string; all: string; search: string; sortCount: string; sortName: string; sortDate: string; photos: string; pick: string; noresults: string; backAll: string; sf: string; loadError: string; projectPage: string; themePage: string }

const root = document.getElementById('eg-obra');
const side = document.getElementById('eg-obra-side')!;
const main = document.getElementById('eg-obra-main')!;
const uiAll = JSON.parse(document.getElementById('eg-ui')?.textContent || '{}');
const UI: UI = uiAll.obra;
initViewer(readUI());

const st = {
  data: null as Data | null,
  ambito: null as string | null | undefined, // undefined = nada elegido; null = transversal
  project: null as string | null,
  decade: 'all', fondo: 'all', q: '', sort: 'date',
  photos: [] as Photo[], pendingPhoto: null as number | null,
};

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fondoLabel = (f: string) => st.data?.fondos[f] || f;

function toViewer(ph: Photo, p: Project | null, amb: string | null, idx?: number): ViewerPhoto {
  return {
    image: ph.image, title: p ? p.name : ph.title, desc: ph.desc, fecha: ph.fecha, lugar: ph.lugar,
    categoria: ph.categoria, fondo: fondoLabel(ph.fondo), decada: ph.decada !== 'sf' ? ph.decada + 's' : '',
    orig: ph.orig, theme: amb && st.data ? st.data.ambitos[amb].label : ph.categoria,
    project: p ? { name: p.name, url: p.url } : undefined,
    shareUrl: p && idx != null ? `${p.url}#foto-${idx + 1}` : undefined,
  };
}

async function init() {
  if (!root) return;
  try {
    const r = await fetch(root.dataset.src!);
    if (!r.ok) throw new Error(String(r.status));
    st.data = await r.json();
  } catch {
    main.innerHTML = `<p class="eg-empty">${esc(UI.loadError)}</p>`;
    return;
  }
  st.ambito = st.data!.ambito_order[0];
  fromHash();
  window.addEventListener('hashchange', () => { fromHash(); render(); });
  render();
}

function fromHash() {
  const h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if (!h) return;
  const parts = h.split('/');
  const d = st.data!;
  const amb = Object.keys(d.ambitos).find((k) => d.ambitos[k].uslug === parts[0] || k === parts[0]);
  if (amb) {
    st.ambito = amb;
    const pr = parts[1] ? d.ambitos[amb].projects.find((p) => p.uslug === parts[1] || p.slug === parts[1]) : null;
    st.project = pr ? pr.slug : null;
    st.pendingPhoto = pr && parts[2] != null && parts[2] !== '' ? parseInt(parts[2], 10) : null;
  }
}
function hashFor(amb: string | null | undefined, slug: string | null, idx?: number) {
  if (!amb || !st.data) return '';
  const a = st.data.ambitos[amb];
  const p = slug ? a.projects.find((x) => x.slug === slug) : null;
  return a.uslug + (p ? '/' + p.uslug + (idx != null ? '/' + idx : '') : '');
}
function setHash() {
  const h = hashFor(st.ambito, st.project);
  if (decodeURIComponent((location.hash || '').replace(/^#/, '')) !== h) history.replaceState(null, '', h ? '#' + h : location.pathname);
}

function render() {
  if (!st.data) return;
  setHash(); renderSide(); renderMain();
  if (st.pendingPhoto != null && st.photos[st.pendingPhoto]) {
    const i = st.pendingPhoto; st.pendingPhoto = null;
    openPhotos(i);
  } else st.pendingPhoto = null;
}

function renderSide() {
  const d = st.data!;
  const themes = `<button class="eg-side-link${st.ambito === null ? ' is-active' : ''}" data-act="all"><span>${esc(UI.allThemes)}</span><span class="eg-side-count">${d.total}</span></button>` +
    d.ambito_order.map((k) => {
      const a = d.ambitos[k];
      return `<button class="eg-side-link${k === st.ambito ? ' is-active' : ''}" data-act="theme" data-k="${k}"><span>${esc(a.label)}</span><span class="eg-side-count">${a.count}</span></button>`;
    }).join('');
  const decs = [`<button class="eg-chip${st.decade === 'all' ? ' is-active' : ''}" data-act="decade" data-k="all">${esc(UI.all)}</button>`]
    .concat(d.decades.map((dc) => `<button class="eg-chip${st.decade === dc ? ' is-active' : ''}" data-act="decade" data-k="${dc}">${dc}s</button>`)).join('');
  const fonds = [`<button class="eg-chip${st.fondo === 'all' ? ' is-active' : ''}" data-act="fondo" data-k="all">${esc(UI.all)}</button>`]
    .concat(d.fondos_order.map((f) => `<button class="eg-chip${st.fondo === f ? ' is-active' : ''}" data-act="fondo" data-k="${f}">${esc(fondoLabel(f))}</button>`)).join('');
  side.innerHTML = `<h4>${esc(UI.themes)}</h4>${themes}<h4 style="margin-top:20px">${esc(UI.decades)}</h4><div class="eg-side-decades">${decs}</div><h4 style="margin-top:20px">${esc(UI.funds)}</h4><div class="eg-side-decades">${fonds}</div>`;
}

const matchDecade = (photos: Photo[]) => st.decade === 'all' || photos.some((p) => p.decada === st.decade);
const matchFondo = (photos: Photo[]) => st.fondo === 'all' || photos.some((p) => p.fondo === st.fondo);

function toolbar(withSort: boolean) {
  return `<div class="eg-obra-toolbar"><input type="search" value="${esc(st.q)}" placeholder="${esc(UI.search)}" data-act="search" aria-label="${esc(UI.search)}">` +
    (withSort ? `<select data-act="sort" aria-label="${esc(UI.sortDate)}"><option value="count"${st.sort === 'count' ? ' selected' : ''}>${esc(UI.sortCount)}</option><option value="name"${st.sort === 'name' ? ' selected' : ''}>${esc(UI.sortName)}</option><option value="date"${st.sort === 'date' ? ' selected' : ''}>${esc(UI.sortDate)}</option></select>` : '') + '</div>';
}

function renderMain() {
  if (st.ambito === null) { main.innerHTML = renderFlat(); return; }
  if (!st.ambito) { main.innerHTML = `<p class="eg-empty">${esc(UI.pick)}</p>`; return; }
  const a = st.data!.ambitos[st.ambito];
  if (st.project) { main.innerHTML = renderProjectPhotos(a); return; }
  const header = `<p class="eg-kicker">${esc(a.label)}</p><div class="eg-prose" style="max-width:760px">${a.intro.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>` +
    `<div class="eg-obra-links"><a href="${esc(a.url)}">${esc(UI.themePage)} →</a></div>`;
  main.innerHTML = header + toolbar(true) + renderProjects(a);
}

function syncCrossTheme() { if (st.decade !== 'all' || st.fondo !== 'all') { st.ambito = null; st.project = null; } }
const filterLabel = () => [st.decade !== 'all' ? st.decade + 's' : '', st.fondo !== 'all' ? fondoLabel(st.fondo) : ''].filter(Boolean).join(' · ');

function renderFlat() {
  const q = norm(st.q); const photos: Photo[] = [];
  const d = st.data!;
  d.ambito_order.forEach((k) => d.ambitos[k].projects.forEach((p) => p.photos.forEach((ph) => {
    if (st.decade !== 'all' && ph.decada !== st.decade) return;
    if (st.fondo !== 'all' && ph.fondo !== st.fondo) return;
    if (q && !norm(ph.desc + ' ' + ph.lugar + ' ' + p.name).includes(q)) return;
    photos.push(ph);
  })));
  photos.sort((x, y) => {
    const dx = x.decada === 'sf' ? '9999' : x.decada, dy = y.decada === 'sf' ? '9999' : y.decada;
    return dx === dy ? x.orig.localeCompare(y.orig) : dx < dy ? -1 : 1;
  });
  const label = filterLabel();
  const head = `<p class="eg-kicker">${esc(UI.allThemes)}</p>${label ? `<h2 style="font-size:1.5rem;margin:.2rem 0 .1rem">${esc(label)}</h2>` : ''}<p class="eg-projcard__meta" style="margin-bottom:.6rem">${photos.length} ${esc(UI.photos)}</p>` + toolbar(false);
  st.photos = photos;
  if (!photos.length) return head + `<p class="eg-empty">${esc(UI.noresults)}</p>`;
  return head + `<div class="eg-photogrid">${photos.map((ph, i) =>
    `<button class="eg-photocell" data-act="photo" data-i="${i}" aria-label="${esc(ph.title)}"><img loading="lazy" src="${esc(ph.thumb)}" width="${ph.w}" height="${ph.h}" alt="${esc(ph.title)}"></button>`).join('')}</div>`;
}

function renderProjects(a: Ambito) {
  const q = norm(st.q);
  let list = a.projects.filter((p) => matchDecade(p.photos) && matchFondo(p.photos) && (!q || norm(p.name + ' ' + p.lugar).includes(q)));
  list = list.slice().sort((x, y) => st.sort === 'name' ? x.name.localeCompare(y.name) : st.sort === 'date' ? (x.year || 9999) - (y.year || 9999) : y.count - x.count);
  if (!list.length) return `<p class="eg-empty">${esc(UI.noresults)}</p>`;
  return `<div class="eg-projgrid">${list.map((p) => {
    const meta = [p.lugar, p.decada !== 'sf' ? p.decada + 's' : ''].filter(Boolean).join(' · ');
    const act = p.count === 1 ? 'single' : 'open';
    return `<button class="eg-projcard" data-act="${act}" data-k="${p.slug}"><div class="eg-projcard__cover"><img loading="lazy" src="${esc(p.cover)}" alt="" width="480" height="360"></div><div class="eg-projcard__body"><div class="eg-projcard__name">${esc(p.name)}</div>${meta ? `<div class="eg-projcard__meta">${esc(meta)}</div>` : ''}<div class="eg-projcard__count">${p.count} ${esc(UI.photos)}</div></div></button>`;
  }).join('')}</div>`;
}

const currentProject = () => st.data?.ambitos[st.ambito!]?.projects.find((p) => p.slug === st.project) || null;

function renderProjectPhotos(a: Ambito) {
  const p = currentProject();
  if (!p) { st.project = null; return renderProjects(a); }
  const q = norm(st.q);
  const photos = p.photos.filter((ph) => (st.decade === 'all' || ph.decada === st.decade) && (st.fondo === 'all' || ph.fondo === st.fondo) && (!q || norm(ph.desc + ' ' + ph.lugar).includes(q)));
  const crumbs = `<div class="eg-crumbs"><a data-act="back" href="#${a.uslug}">${esc(a.label)}</a> ▸ <span>${esc(p.name)}</span></div>`;
  const meta = [p.lugar, p.fecha, p.count + ' ' + UI.photos].filter(Boolean).join(' · ');
  const head = `<h2 style="font-size:1.5rem;margin:.2rem 0 0">${esc(p.name)}</h2>${meta ? `<p class="eg-projcard__meta" style="margin-bottom:.5rem">${esc(meta)}</p>` : ''}` +
    `<div class="eg-obra-links"><a href="${esc(p.url)}">${esc(UI.projectPage)} →</a></div>` +
    `<div class="eg-obra-toolbar"><button class="eg-chip" data-act="back">← ${esc(UI.backAll)}</button><input type="search" value="${esc(st.q)}" placeholder="${esc(UI.search)}" data-act="search" aria-label="${esc(UI.search)}"></div>`;
  st.photos = photos;
  if (!photos.length) return crumbs + head + `<p class="eg-empty">${esc(UI.noresults)}</p>`;
  return crumbs + head + `<div class="eg-photogrid">${photos.map((ph, i) =>
    `<button class="eg-photocell" data-act="photo" data-i="${i}" aria-label="${esc(ph.title)}"><img loading="lazy" src="${esc(ph.thumb)}" width="${ph.w}" height="${ph.h}" alt="${esc(ph.title)}"></button>`).join('')}</div>`;
}

function openPhotos(i: number) {
  const p = st.ambito ? currentProject() : null;
  const amb = st.ambito || null;
  const list = st.photos.map((ph) => toViewer(ph, p, amb, p ? p.photos.indexOf(ph) : undefined));
  if (p) { // el hash apunta a la foto abierta mientras el visor está activo
    const upd = (idx: number) => history.replaceState(null, '', '#' + hashFor(st.ambito, p.slug, idx));
    upd(i);
    const onNav = (e: Event) => upd((e as CustomEvent).detail.index);
    const onClose = () => { document.removeEventListener('eg:viewer-nav', onNav); document.removeEventListener('eg:viewer-close', onClose); setHash(); };
    document.addEventListener('eg:viewer-nav', onNav); document.addEventListener('eg:viewer-close', onClose);
  }
  openViewer(list, i);
}

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
root?.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el || !st.data) return;
  const act = el.dataset.act, k = el.dataset.k!;
  switch (act) {
    case 'all': st.ambito = null; st.project = null; st.q = ''; render(); scrollTop(); break;
    case 'theme': st.ambito = k; st.project = null; st.q = ''; render(); scrollTop(); break;
    case 'decade': st.decade = k; syncCrossTheme(); render(); break;
    case 'fondo': st.fondo = k; syncCrossTheme(); render(); break;
    case 'open': st.project = k; render(); scrollTop(); break;
    case 'single': {
      const p = st.data.ambitos[st.ambito!]?.projects.find((x) => x.slug === k);
      if (p?.photos.length) openViewer([toViewer(p.photos[0], p, st.ambito!, 0)], 0);
      break;
    }
    case 'back': e.preventDefault(); st.project = null; render(); break;
    case 'photo': openPhotos(parseInt(el.dataset.i!, 10)); break;
  }
});
root?.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.act === 'search') { st.q = el.value; const pos = el.selectionStart; renderMain(); const n = main.querySelector<HTMLInputElement>('[data-act="search"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
});
root?.addEventListener('change', (e) => {
  const el = e.target as HTMLSelectElement;
  if (el.dataset.act === 'sort') { st.sort = el.value; renderMain(); }
});

init();
