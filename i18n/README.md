# Translations (EN ⇄ VN)

The header's EN / VN toggle swaps page text using `public/js/i18n-dict.js`, which is
generated from the JSON files in `translations/` (not deployed):

- `*.json` — `{ "English text": "Vietnamese text" }`
- `*-vi-en.json` — `{ "Vietnamese text": "English text" }` (the Kyarisuru case study is written in Vietnamese)

Keys are the exact inner HTML of each paragraph, heading, list item, link, `alt` /
`aria-label`, page title or description (inline tags such as `<strong>` stay inside).

To add or change a translation:
```
npm i linkedom@0.18.5
node i18n-extract.js ../public strings.json        # lists every string on every page
node i18n-build.js translations strings.json ../public/js/i18n-dict.js
```
`i18n-report.txt` (next to `translations/`) lists strings left untranslated — mostly names, colour codes and typefaces.
Put `data-no-i18n` on an element to keep it untranslated (the home hero and the toggle use it).
