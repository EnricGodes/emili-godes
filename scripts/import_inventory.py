"""Importa la obra de Emili Godes desde el inventario Excel curado a mano y genera
todo lo que consume la web (imágenes + JSON de datos + textos ES/CA para i18n).

Fuente:
  _resources/archivo/inventario_maestro_consolidado_traduccion.xlsx
  + fotos en _resources/archivo/{Filmoteca/imagenes, IEFC/_procesadas,
    IEFC/Fotos familiares/_procesada, MNAC, Museo Reina Sofia,
    Museo Universidad de Navarra/imagenes, Arxiu Fotogràfic de Barcelona}

Hace, en un solo paso (idempotente, re-ejecutable):
  1. Lee el Excel y colapsa duplicados por nombre de archivo (columna `original`).
     - Duplicado = MISMO valor exacto en `original`. Nombre distinto = foto distinta, nunca se fusiona.
     - En conflicto gana la ÚLTIMA pasada, prefiriendo la fila con descripción no vacía.
     - `destacado` = OR de todas las copias.
  2. Resuelve la década (año más temprano de `fecha_estimada`) y la categoría.
  3. Localiza el archivo físico (exacto → stem), lo reescala a lado largo 1000 px JPEG q60 en
     public/photos/obra/ y genera la miniatura (480 px, q70) en public/photos/obra/thumbs/.
  4. Genera src/data/catalog.json (estructura, sin textos) y src/data/destacadas.json.
  5. Genera los textos por idioma en src/i18n/{es,ca}/catalog-meta.json (proyectos, lugares,
     categorías, fondos) y catalog-photos.json (descripciones únicas, clave = hash del texto ES).
     Las claves son estables (hash del texto ES): al reimportar, solo las descripciones nuevas o
     cambiadas quedan sin traducir en src/i18n/{en,fr,de,it}/ y caen al castellano hasta traducirlas.
  6. Avisa (no aborta) de archivos físicos SIN ficha en el Excel (quedarían sin publicar).

Uso:  python3 scripts/import_inventory.py [--force]
      --force  reescala también las imágenes ya existentes en el destino.
"""
import hashlib
import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Falta Pillow: pip3 install Pillow")
try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl: pip3 install openpyxl")

BASE = Path(__file__).parent.parent
ARCHIVE = BASE / "_resources" / "archivo"
XLSX = ARCHIVE / "inventario_maestro_consolidado_traduccion.xlsx"
OUT_IMG_DIR = BASE / "public" / "photos" / "obra"
OUT_THUMB_DIR = OUT_IMG_DIR / "thumbs"
OUT_IMG_URL = "/photos/obra"
DATA_DIR = BASE / "src" / "data"
I18N_DIR = BASE / "src" / "i18n"

MAX_SIDE = 1000
JPEG_Q = 60
THUMB_SIDE = 480
THUMB_Q = 70

# fondo (columna del Excel) → carpetas relativas dentro de ARCHIVE (se indexan todas juntas)
FOLDER = {
    "IEFC": ["IEFC/_procesadas", "IEFC/Fotos familiares/_procesada"],
    "Filmoteca de Catalunya": ["Filmoteca/imagenes"],
    "MNAC": ["MNAC"],
    "Museo Reina Sofia": ["Museo Reina Sofia"],
    "Museo Universidad de Navarra": ["Museo Universidad de Navarra/imagenes"],
    "Arxiu Fotogràfic de Barcelona": ["Arxiu Fotogràfic de Barcelona"],
}

# categoría (ES, tal cual en el Excel) → (slug de ámbito, ES, CA)
CATS = {
    "Fotografía y cine": ("foto_fija_cine", "Fotografía y cine", "Fotografia i cinema"),
    "Fotografía industrial": ("fotografia_industrial", "Fotografía industrial", "Fotografia industrial"),
    "Ciencia y medicina": ("ciencia_medicina", "Ciencia y medicina", "Ciència i medicina"),
    "Arquitectura e instalaciones": ("arquitectura_instalaciones", "Arquitectura e instalaciones", "Arquitectura i instal·lacions"),
    "Reportajes urbanos y documentales": ("reportajes_urbanos_documentales", "Reportajes urbanos y documentales", "Reportatges urbans i documentals"),
    "Fotografía artística": ("fotografia_artistica", "Fotografía artística", "Fotografia artística"),
    "Publicidad y encargo": ("publicidad", "Publicidad y encargo", "Publicitat i encàrrec"),
    "Reproducción de obras de arte": ("reproduccion_arte", "Reproducción de obras de arte", "Reproducció d'obres d'art"),
    "Experimentación fotográfica": ("experimentacion_fotografica", "Experimentación fotográfica", "Experimentació fotogràfica"),
    "Fotografía familiar": ("fotografia_familiar", "Fotografía familiar", "Fotografia familiar"),
}
CAT_FALLBACK = ("sin_categoria", "Sin categoría", "Sense categoria")
IMG_EXT = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ""}


def s(v):
    """Normaliza a str limpiando; preserva saltos de línea internos."""
    if v is None:
        return ""
    return str(v).strip()


def slugify(text):
    t = unicodedata.normalize("NFD", text or "").encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()
    return t or "sin-titulo"


def h12(text):
    """Clave estable para un texto: 12 hex del sha1 del texto ES normalizado."""
    return hashlib.sha1((text or "").strip().encode("utf-8")).hexdigest()[:12]


def decade_of(fecha):
    """Década de inicio (año más temprano que aparezca en la cadena)."""
    yrs = [int(y) for y in re.findall(r"(1[89]\d\d|20\d\d)", fecha or "")]
    if not yrs:
        return None
    return (min(yrs) // 10) * 10


def build_folder_index():
    """Indexa, por fondo, TODAS sus carpetas juntas. Los valores son (carpeta, nombre_real)."""
    idx, collisions = {}, []
    for fondo, rels in FOLDER.items():
        byfull, bystem = {}, defaultdict(list)
        for rel in rels:
            d = ARCHIVE / rel
            if not d.is_dir():
                continue
            for fn in os.listdir(d):
                if fn.startswith("."):
                    continue
                fp = d / fn
                if not fp.is_file() or fp.suffix.lower() not in IMG_EXT:
                    continue
                key = fn.lower()
                if key in byfull:
                    collisions.append((fondo, fn, byfull[key][0], d))
                byfull[key] = (d, fn)
                bystem[os.path.splitext(fn)[0].lower()].append((d, fn))
        idx[fondo] = (byfull, bystem)
    if collisions:
        print(f"\n⚠️  {len(collisions)} nombres DUPLICADOS entre carpetas del mismo fondo "
              f"(gana la última carpeta; renombra para desambiguar):")
        for fondo, fn, d1, d2 in collisions:
            print(f"     [{fondo}] {fn}: {d1.name} ↔ {d2.name}")
        print()
    return idx


def locate_file(idx, fondo, orig):
    """Emparejamiento ESTRICTO: nombre exacto (ci) o, si al Excel le falta la extensión,
    stem exacto (ci) si es inequívoco. Nunca fuzzy."""
    if fondo not in idx:
        return None
    byfull, bystem = idx[fondo]
    o = orig.lower()
    if o in byfull:
        return byfull[o]
    cands = bystem.get(os.path.splitext(o)[0])
    if cands and len(cands) == 1:
        return cands[0]
    return None


def rescale(src, dst, side, quality, force=False):
    if dst.exists() and not force:
        return "skip"
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")
    im.thumbnail((side, side))  # no amplía
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)
    return "done"


# ── 1. Leer Excel + colapsar duplicados ───────────────────────────────────────
def read_and_resolve():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Inventario"]
    rows = list(ws.iter_rows(values_only=True))
    hdr = list(rows[0])
    col = {h: i for i, h in enumerate(hdr)}

    def g(r, name):
        return r[col[name]] if col.get(name) is not None else None

    groups = defaultdict(list)
    for i, r in enumerate(rows[1:], start=2):
        orig = s(g(r, "original"))
        if orig:
            groups[orig].append((i, r))

    records = []
    for orig, items in groups.items():
        with_desc = [(i, r) for i, r in items if s(g(r, "descripcion_es"))]
        pool = with_desc if with_desc else items
        _, win = max(pool, key=lambda t: t[0])

        cat = g(win, "categoría")
        if cat is None:
            for _, r in sorted(items, key=lambda t: -t[0]):
                if g(r, "categoría") is not None:
                    cat = g(r, "categoría")
                    break
        cat_slug, cat_es, cat_ca = CATS.get(cat, CAT_FALLBACK)

        destacado = 1 if any(g(r, "Destacado") == 1 for _, r in items) else 0
        fecha = s(g(win, "fecha_estimada"))
        records.append({
            "orig": orig,
            "fondo": s(g(win, "fondo")),
            "categoria_slug": cat_slug,
            "categoria_es": cat_es,
            "categoria_ca": cat_ca,
            "proyecto_es": s(g(win, "proyecto_es")) or "(sin proyecto)",
            "proyecto_ca": s(g(win, "proyecto_ca")) or s(g(win, "proyecto_es")) or "(sense projecte)",
            "descripcion_es": s(g(win, "descripcion_es")),
            "descripcion_ca": s(g(win, "descripcion_ca")),
            "lugar_es": s(g(win, "lugar_es")),
            "lugar_ca": s(g(win, "lugar_ca")),
            "fecha": fecha,
            "decada": decade_of(fecha),
            "destacado": destacado,
        })
    return records


# ── 2. Imágenes ───────────────────────────────────────────────────────────────
def process_images(records, idx, force=False):
    stats = Counter()
    used_real = defaultdict(set)
    kept = []
    for rec in records:
        loc = locate_file(idx, rec["fondo"], rec["orig"])
        if not loc:
            stats["sin_archivo"] += 1
            print(f"  [SIN ARCHIVO] {rec['fondo']}: {rec['orig']}")
            continue
        d, realname = loc
        used_real[rec["fondo"]].add((d, realname))
        out_name = os.path.splitext(rec["orig"])[0] + ".jpg"
        try:
            res = rescale(d / realname, OUT_IMG_DIR / out_name, MAX_SIDE, JPEG_Q, force=force)
            stats[res] += 1
            # la miniatura sale de la imagen ya reducida (rápido y consistente)
            rescale(OUT_IMG_DIR / out_name, OUT_THUMB_DIR / out_name, THUMB_SIDE, THUMB_Q, force=force)
            with Image.open(OUT_IMG_DIR / out_name) as im:
                rec["w"], rec["h"] = im.size
        except Exception as exc:
            stats["error"] += 1
            print(f"  [ERROR imagen] {rec['orig']}: {exc}")
            continue
        rec["file"] = out_name
        kept.append(rec)
    return kept, stats, used_real


def reverse_coverage(idx, used_real):
    """Archivos físicos que NO tienen ficha en el Excel (quedarían sin publicar)."""
    orphans = []
    for fondo, (byfull, _bystem) in idx.items():
        used = used_real.get(fondo, set())
        for d, realname in byfull.values():
            if (d, realname) not in used:
                orphans.append((fondo, str(d.relative_to(ARCHIVE)), realname))
    return sorted(set(orphans))


# ── 3. Catálogo (estructura) + textos por idioma ─────────────────────────────
def most_common(values):
    vals = [v for v in values if v]
    return Counter(vals).most_common(1)[0][0] if vals else ""


class Texts:
    """Acumula textos ES y CA con claves estables."""

    def __init__(self):
        self.meta = {"es": {}, "ca": {}}
        self.photos = {"es": {}, "ca": {}}

    def add(self, bucket, key, es, ca):
        if not es:
            return ""
        store = self.meta if bucket == "meta" else self.photos
        store["es"][key] = es
        if ca and ca != es:
            store["ca"][key] = ca
        return key

    def place(self, es, ca):
        return self.add("meta", "place." + h12(es), es, ca) if es else ""

    def desc(self, es, ca):
        return self.add("photos", h12(es), es, ca) if es else ""


def photo_obj(r, tx):
    return {
        "orig": r["orig"],
        "file": r["file"],
        "w": r["w"], "h": r["h"],
        "desc": tx.desc(r["descripcion_es"], r["descripcion_ca"]),
        "fecha": r["fecha"],
        "lugar": tx.place(r["lugar_es"], r["lugar_ca"]),
        "categoria": r["categoria_slug"],
        "fondo": slugify(r["fondo"]),
        "decada": str(r["decada"]) if r["decada"] is not None else "sf",
    }


def build_catalog(records, tx):
    for slug, es, ca in CATS.values():
        tx.add("meta", "category." + slug, es, ca)
    fondo_slugs = {}
    for r in records:
        if r["fondo"]:
            fondo_slugs[slugify(r["fondo"])] = r["fondo"]
    for fs, name in fondo_slugs.items():
        tx.add("meta", "fondo." + fs, name, name)

    by_proj = defaultdict(list)
    for r in records:
        by_proj[r["proyecto_es"]].append(r)

    ambitos = defaultdict(lambda: {"projects": [], "_slugs": set()})
    for proj_name, works in by_proj.items():
        amb = Counter(w["categoria_slug"] for w in works).most_common(1)[0][0]
        works_sorted = sorted(works, key=lambda w: w["orig"])
        base_slug = slugify(proj_name)
        slug, n = base_slug, 2
        while slug in ambitos[amb]["_slugs"]:
            slug = f"{base_slug}-{n}"; n += 1
        ambitos[amb]["_slugs"].add(slug)
        decs = sorted({str(w["decada"]) for w in works if w["decada"] is not None})
        earliest = min(works, key=lambda w: (w["decada"] is None, w["decada"] or 0))
        yrs = [y for w in works for y in re.findall(r"(1[89]\d\d|20\d\d)", w["fecha"] or "")]
        year = min(int(y) for y in yrs) if yrs else (earliest["decada"] or 9999)
        pkey = f"project.{amb}.{slug}"
        tx.add("meta", pkey, proj_name, most_common([w["proyecto_ca"] for w in works]))
        ambitos[amb]["projects"].append({
            "slug": slug,
            "name": pkey,
            "lugar": tx.place(most_common([w["lugar_es"] for w in works]),
                              most_common([w["lugar_ca"] for w in works])),
            "fecha": earliest["fecha"],
            "year": year,
            "decada": decs[0] if decs else "sf",
            "count": len(works),
            "cover": works_sorted[0]["file"],
            "fondos": sorted({slugify(w["fondo"]) for w in works if w["fondo"]}),
            "photos": [photo_obj(w, tx) for w in works_sorted],
        })

    out_ambitos = {}
    for amb, data in ambitos.items():
        projs = sorted(data["projects"], key=lambda p: -p["count"])
        photos_total = sum(p["count"] for p in projs)
        decs = sorted({ph["decada"] for p in projs for ph in p["photos"] if ph["decada"] != "sf"})
        fondos = sorted({f for p in projs for f in p["fondos"]})
        out_ambitos[amb] = {"count": photos_total, "decades": decs, "fondos": fondos, "projects": projs}

    ambito_order = [a for a, _ in sorted(out_ambitos.items(), key=lambda kv: -kv[1]["count"])]
    decades = sorted({str(r["decada"]) for r in records if r["decada"] is not None})
    fondos_order = [slugify(f) for f, _ in Counter(r["fondo"] for r in records if r["fondo"]).most_common()]

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "ambito_order": ambito_order,
        "ambitos": out_ambitos,
        "decades": decades,
        "fondos": fondos_order,
        "total": len(records),
    }


def build_destacadas(records, catalog):
    # localizar (ámbito, proyecto) de cada foto destacada para enlazar con la ficha
    where = {}
    for amb, a in catalog["ambitos"].items():
        for p in a["projects"]:
            for ph in p["photos"]:
                where[ph["orig"]] = (amb, p["slug"], p["name"], ph)
    dest = [r for r in records if r["destacado"]]
    dest.sort(key=lambda r: (r["fondo"], r["orig"]))
    out = []
    for i, r in enumerate(dest, start=1):
        amb, pslug, pname, ph = where[r["orig"]]
        obj = dict(ph)
        obj.update({"ambito": amb, "project": pslug, "name": pname, "orden": i})
        out.append(obj)
    return out


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main():
    force = "--force" in sys.argv
    if not XLSX.exists():
        sys.exit(f"No existe el Excel: {XLSX}")
    print(f"Leyendo {XLSX.name} …")
    records = read_and_resolve()
    print(f"  {len(records)} fotos únicas tras colapsar duplicados por nombre de archivo.")

    idx = build_folder_index()
    print(f"Reescalando imágenes (lado largo {MAX_SIDE} px q{JPEG_Q}; miniaturas {THUMB_SIDE} px) …")
    kept, stats, used_real = process_images(records, idx, force=force)
    print(f"  imágenes: {stats['done']} nuevas, {stats['skip']} ya existían, "
          f"{stats['sin_archivo']} sin archivo, {stats['error']} con error.")

    orphans = reverse_coverage(idx, used_real)
    if orphans:
        print(f"\n⚠️  COBERTURA INVERSA: {len(orphans)} archivos físicos SIN ficha en el Excel:")
        for fondo, rel, fn in orphans:
            print(f"     [{fondo}] {rel}/{fn}")
        print("   → catalógalos en el Excel y relanza esta importación.\n")
    else:
        print("  cobertura inversa: OK, todos los archivos físicos tienen ficha.")

    print("Generando catálogo y textos …")
    tx = Texts()
    catalog = build_catalog(kept, tx)
    dest = build_destacadas(kept, catalog)
    write_json(DATA_DIR / "catalog.json", catalog)
    write_json(DATA_DIR / "destacadas.json", dest)
    for lang in ("es", "ca"):
        write_json(I18N_DIR / lang / "catalog-meta.json", dict(sorted(tx.meta[lang].items())))
        write_json(I18N_DIR / lang / "catalog-photos.json", dict(sorted(tx.photos[lang].items())))

    # limpieza: imágenes en public/photos/obra que ya no están en el catálogo
    valid = {r["file"] for r in kept}
    stale = [p for p in OUT_IMG_DIR.glob("*.jpg") if p.name not in valid]
    stale += [p for p in OUT_THUMB_DIR.glob("*.jpg") if p.name not in valid]
    for p in stale:
        p.unlink()
    if stale:
        print(f"  {len(stale)} imágenes huérfanas eliminadas de {OUT_IMG_DIR.relative_to(BASE)}")

    print(f"\nHecho. {len(kept)} fotos · {len(catalog['ambito_order'])} temáticas · "
          f"{sum(len(a['projects']) for a in catalog['ambitos'].values())} proyectos · "
          f"{len(catalog['fondos'])} fondos · {len(dest)} destacadas · "
          f"{len(tx.photos['es'])} descripciones únicas (ES), {len(tx.photos['ca'])} con CA.")


if __name__ == "__main__":
    main()
