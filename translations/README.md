# Traducciones (pipeline con ChatGPT)

El idioma fuente es el **castellano** (`src/i18n/es/*.json`). El catalán existe ya en gran parte
(viene del Excel del catálogo y de los textos originales). EN, FR, DE e IT se traducen con ChatGPT
subiendo ficheros JSON y devolviendo el mismo fichero traducido.

## Flujo

1. **Exportar** los ficheros fuente (se regeneran enteros en `translations/source/`):
   ```bash
   python3 scripts/i18n_export.py                # todo
   python3 scripts/i18n_export.py --only-missing ca   # solo lo que falta en un idioma
   ```
   Ficheros (ordenados por prioridad; los `04-*` son las 2.548 descripciones de foto):
   - `01-ui.json` · `02-pages-a.json` · `02-pages-b-mirada-moderna.json` · `02-pages-c-legado-legal.json`
   - `03-catalog-meta.json` (nombres de proyecto, lugares, categorías, fondos)
   - `04-catalog-photos-01..20.json` (~8.000 palabras cada uno; `--words 16000` para hacer la mitad de ficheros)

2. **Traducir con ChatGPT**: abre un chat nuevo, pega el contenido de `PROMPT.md` (indicando el idioma
   de destino), adjunta **un** fichero y pide el fichero completo traducido. Guarda la respuesta con el
   **mismo nombre** en `translations/incoming/<lang>/`, p. ej. `translations/incoming/en/02-pages-a.json`.
   - Si ChatGPT corta la respuesta, pídele «continúa desde la clave X» y pega las partes; el validador
     comprobará que no falte ninguna clave.
   - Puedes hacerlo por tandas: no hace falta tener todos los ficheros para aplicar.

3. **Validar y aplicar**:
   ```bash
   python3 scripts/i18n_apply.py en --check   # solo valida
   python3 scripts/i18n_apply.py en           # valida y escribe en src/i18n/en/
   python3 scripts/i18n_apply.py --status     # cobertura por idioma
   ```
   El validador exige: JSON válido, mismas claves que el fichero fuente, sin vacíos, mismos tags HTML y
   marcadores `{x}`/`{{base}}`; avisa si un valor quedó idéntico al castellano.

4. `npm run build` → todo lo que falte en un idioma **cae al castellano** automáticamente, así que se
   puede desplegar con traducciones parciales. Commit de `src/i18n/<lang>/` (y opcionalmente de
   `translations/incoming/` como copia de trabajo).

## Cuando cambia el contenido

- Cambia el Excel del catálogo → `python3 scripts/import_inventory.py` regenera `src/i18n/{es,ca}/catalog-*.json`
  con claves estables (hash del texto ES): solo las descripciones nuevas o modificadas saldrán en
  `i18n_export.py --only-missing <lang>`.
- Cambia un texto de la web → edita `src/i18n/es/pages.json` (o `ui.json`, `legal.json`) y borra la clave
  en los otros idiomas si el cambio de sentido lo requiere; `--only-missing` los volverá a exportar.
