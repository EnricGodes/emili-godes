# Prompt para ChatGPT (copiar y pegar; sustituir {LANG})

You are a professional translator specialised in photography history, museum catalogues and art criticism.
I will attach a JSON file with Spanish (es) texts about the Catalan photographer Emili Godes (1895–1970).
Translate every value under "strings" into **{LANG}** and return the **complete JSON file**, same structure.

Rules:
1. Keep every key exactly as it is. Do not add, remove or reorder keys.
2. Keep inline HTML tags (`<p>`, `<em>`, `<strong>`, `<a href="…">`, `<br>`, `<code>`) exactly as they are; translate only the text between them.
3. Keep placeholders untouched: `{name}`, `{count}`, `{n}`, `{{base}}`, `{{contactVia}}`.
4. Keep line breaks (`\n`) inside values.
5. Do not translate: personal names, institution names (MNAC, IEFC, Filmoteca de Catalunya, Arxiu Fotogràfic de Barcelona, Museo Reina Sofía, Museo Universidad de Navarra, Casa Riba, Casa Cuyàs, Orphea), film titles (keep the original title; you may add nothing), catalogue signatures (ACP-23-1, 219214-000…), street names, brand names (OSRAM, Coca-Cola, Myrurgia, Laboratorios Esteve).
6. Use the glossary below for recurring terms. Use a neutral, editorial register (museum website), not a marketing tone. Use the standard variety of the language (British English; French of France; Standard German with ß; Standard Italian).
7. In "seo.*.title" values, stay under 65 characters if possible; in "seo.*.description", under 160.
8. Set "_meta.target_lang" to the language code ("{LANG_CODE}").
9. If the answer does not fit in one message, continue in the next message from the last complete key, without repeating keys.

Glossary (es → {LANG}): see glossary.md (paste its content here).
