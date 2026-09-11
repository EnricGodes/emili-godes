"""Exporta las cadenas en castellano (idioma fuente) a ficheros JSON agrupados para traducirlos
con ChatGPT. Ver translations/README.md para el flujo completo.

Uso:
  python3 scripts/i18n_export.py                 # todo, en translations/source/
  python3 scripts/i18n_export.py --only-missing en   # solo las claves que aún no tiene 'en'
  python3 scripts/i18n_export.py --words 16000   # ficheros de fotos más grandes (menos ficheros)

Ficheros generados (translations/source/):
  01-ui.json                     interfaz, SEO, formulario, cookies, 404
  02-pages-a.json                prosa: portada, biografía, obra, destacadas, investigación, créditos
  02-pages-b-mirada-moderna.json prosa: una mirada moderna
  02-pages-c-legado-legal.json   prosa: reconocimiento y legado + textos legales
  03-catalog-meta.json           nombres de proyecto, lugares, categorías, fondos
  04-catalog-photos-NN.json      descripciones de foto (únicas), troceadas por nº de palabras
Formato: {"_meta": {...}, "strings": {clave: texto}}. Se devuelve el MISMO fichero traducido
en translations/incoming/<lang>/ y se aplica con scripts/i18n_apply.py <lang>.
"""
import argparse
import json
import re
from pathlib import Path

BASE = Path(__file__).parent.parent
I18N = BASE / "src" / "i18n"
SRC_DIR = BASE / "translations" / "source"

GROUPS = [
    ("01-ui", ["ui"], None),
    ("02-pages-a", ["pages"], lambda k: k.split(".")[0] in ("index", "biografia", "obra", "destacadas", "investigacion", "creditos")),
    ("02-pages-b-mirada-moderna", ["pages"], lambda k: k.startswith("mirada_moderna.")),
    ("02-pages-c-legado-legal", ["pages", "legal"], lambda k: k.startswith("legado.") or k.startswith("legal.")),
    ("03-catalog-meta", ["catalog-meta"], None),
]
PHOTOS_FILE = "catalog-photos"

INSTRUCTIONS = (
    "Translate every value from Spanish (es) into the target language. Keep the keys exactly as they are, "
    "keep inline HTML tags, {placeholders} and {{base}} untouched, do not translate proper names, "
    "institution names or catalogue signatures. Return the complete JSON file with the same structure. "
    "See PROMPT.md and glossary.md."
)


def load(lang, name):
    p = I18N / lang / f"{name}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def words(s):
    return len(re.findall(r"\S+", s))


def write(name, strings, note=""):
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    data = {
        "_meta": {"file": name + ".json", "source_lang": "es", "target_lang": "", "count": len(strings),
                  "words": sum(words(v) for v in strings.values()), "instructions": INSTRUCTIONS, "note": note},
        "strings": strings,
    }
    (SRC_DIR / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"  {name}.json: {len(strings)} cadenas, {data['_meta']['words']} palabras")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only-missing", metavar="LANG", help="exportar solo claves que faltan en ese idioma")
    ap.add_argument("--words", type=int, default=8000, help="palabras por fichero de fotos (defecto 8000)")
    args = ap.parse_args()

    # limpiar exportación anterior
    if SRC_DIR.exists():
        for p in SRC_DIR.glob("*.json"):
            p.unlink()

    def keep(name, key):
        if not args.only_missing:
            return True
        return key not in load(args.only_missing, name)

    print("Exportando a translations/source/ …")
    for gname, files, pred in GROUPS:
        strings = {}
        for f in files:
            for k, v in load("es", f).items():
                if (pred is None or pred(k)) and keep(f, k):
                    strings[k] = v
        if strings:
            write(gname, strings)

    photos = {k: v for k, v in load("es", PHOTOS_FILE).items() if keep(PHOTOS_FILE, k)}
    chunk, n, acc = {}, 1, 0
    for k, v in photos.items():
        chunk[k] = v; acc += words(v)
        if acc >= args.words:
            write(f"04-catalog-photos-{n:02d}", chunk, "Photo descriptions; multi-line values keep their line breaks (\\n).")
            chunk, n, acc = {}, n + 1, 0
    if chunk:
        write(f"04-catalog-photos-{n:02d}", chunk, "Photo descriptions; multi-line values keep their line breaks (\\n).")
    print("Hecho.")


if __name__ == "__main__":
    main()
