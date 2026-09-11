"""Valida y aplica las traducciones devueltas por ChatGPT.

Uso:
  python3 scripts/i18n_apply.py en            # valida translations/incoming/en/*.json y las aplica a src/i18n/en/
  python3 scripts/i18n_apply.py en --check    # solo valida, no escribe
  python3 scripts/i18n_apply.py --status      # cobertura de cada idioma respecto al castellano

Validaciones por fichero: JSON válido, mismas claves que el fichero fuente (translations/source/
o, si ya no existe, src/i18n/es), sin valores vacíos, mismos tags HTML y mismos marcadores
{x}/{{base}}, y aviso (no error) si un valor es idéntico al castellano.
Las claves se reparten al fichero de destino (ui/pages/legal/catalog-meta/catalog-photos) según
el fichero fuente en que viven en castellano.
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

BASE = Path(__file__).parent.parent
I18N = BASE / "src" / "i18n"
INCOMING = BASE / "translations" / "incoming"
LANGS = ["ca", "en", "fr", "de", "it"]
FILES = ["ui", "pages", "legal", "catalog-meta", "catalog-photos"]
TAG = re.compile(r"<[^>]+>")
PH = re.compile(r"\{\{?[a-zA-Z_]+\}?\}")
# valores que legítimamente pueden quedar iguales (nombres propios, códigos, cifras…)
SAME_OK = re.compile(r"^[\d\s\W]*$|^[A-ZÀ-Ý][^a-zà-ÿ]*$")


def load(p):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def es_index():
    """clave → (fichero, texto ES)"""
    idx = {}
    for f in FILES:
        for k, v in load(I18N / "es" / f"{f}.json").items():
            idx[k] = (f, v)
    return idx


def status():
    idx = es_index()
    total = Counter(f for f, _ in idx.values())
    print(f"Castellano (fuente): {len(idx)} claves " + ", ".join(f"{f}={n}" for f, n in total.items()))
    for lang in LANGS:
        have = Counter()
        for f in FILES:
            d = load(I18N / lang / f"{f}.json")
            have[f] = sum(1 for k in d if k in idx)
        missing = sum(total[f] - have[f] for f in FILES)
        parts = ", ".join(f"{f} {have[f]}/{total[f]}" for f in FILES)
        print(f"  {lang}: faltan {missing:5d}  ({parts})")


def validate(lang, data, name, idx):
    errors, warns = [], []
    if not isinstance(data, dict) or "strings" not in data or not isinstance(data["strings"], dict):
        return [f"{name}: falta el objeto 'strings'"], [], {}
    strings = data["strings"]
    meta = data.get("_meta", {})
    tl = meta.get("target_lang", "")
    if tl and tl != lang:
        warns.append(f"{name}: _meta.target_lang='{tl}' pero se aplica como '{lang}'")
    src_file = BASE / "translations" / "source" / name
    src = load(src_file).get("strings") if src_file.exists() else None
    expected = set(src.keys()) if src else None
    out = {}
    for k, v in strings.items():
        if k not in idx:
            errors.append(f"{name}: clave desconocida '{k}'"); continue
        es = idx[k][1]
        if not isinstance(v, str) or not v.strip():
            errors.append(f"{name}: valor vacío en '{k}'"); continue
        if sorted(TAG.findall(v)) != sorted(TAG.findall(es)):
            errors.append(f"{name}: tags HTML distintos en '{k}'"); continue
        if sorted(PH.findall(v)) != sorted(PH.findall(es)):
            errors.append(f"{name}: marcadores distintos en '{k}' ({PH.findall(es)} vs {PH.findall(v)})"); continue
        if v.strip() == es.strip() and not SAME_OK.match(es.strip()) and len(es) > 12:
            warns.append(f"{name}: '{k}' idéntico al castellano")
        out[k] = v
    if expected is not None:
        missing = expected - set(strings)
        if missing:
            errors.append(f"{name}: faltan {len(missing)} claves respecto al fichero fuente (p. ej. {sorted(missing)[:3]})")
    return errors, warns, out


def apply(lang, check=False):
    if lang not in LANGS:
        sys.exit(f"Idioma no soportado: {lang} (usa {', '.join(LANGS)})")
    d = INCOMING / lang
    files = sorted(d.glob("*.json")) if d.exists() else []
    if not files:
        sys.exit(f"No hay ficheros en {d}")
    idx = es_index()
    merged = {f: {} for f in FILES}
    all_errors, all_warns, n = [], [], 0
    for p in files:
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            all_errors.append(f"{p.name}: JSON inválido ({e})"); continue
        errors, warns, out = validate(lang, data, p.name, idx)
        all_errors += errors; all_warns += warns
        for k, v in out.items():
            merged[idx[k][0]][k] = v
        n += len(out)
        print(f"  {p.name}: {len(out)} cadenas válidas, {len(errors)} errores, {len(warns)} avisos")
    for w in all_warns[:40]:
        print("  aviso:", w)
    if len(all_warns) > 40:
        print(f"  … y {len(all_warns) - 40} avisos más")
    for e in all_errors:
        print("  ERROR:", e)
    if all_errors:
        sys.exit(f"\n{len(all_errors)} errores: corrige los ficheros en {d} y vuelve a ejecutar.")
    if check:
        print(f"\nOK: {n} cadenas válidas (no se ha escrito nada).")
        return
    for f in FILES:
        if not merged[f]:
            continue
        target = I18N / lang / f"{f}.json"
        cur = load(target)
        cur.update(merged[f])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(dict(sorted(cur.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"  → {target.relative_to(BASE)}: {len(cur)} claves")
    print(f"\nAplicadas {n} cadenas a src/i18n/{lang}/.")
    status()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lang", nargs="?")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--status", action="store_true")
    a = ap.parse_args()
    if a.status or not a.lang:
        status(); return
    apply(a.lang, check=a.check)


if __name__ == "__main__":
    main()
