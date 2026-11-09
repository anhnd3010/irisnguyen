// Lists every translation unit on every page, with the same rules as public/js/i18n.js,
// grouped by the first page each string appears on.
const { parseHTML } = require('linkedom');
const fs = require('fs');
const [P, OUT] = process.argv.slice(2);
const INLINE = /^(A|ABBR|B|BR|CODE|EM|I|IMG|MARK|Q|S|SMALL|SPAN|STRONG|SUB|SUP|TIME|U|WBR)$/;
const SKIP = 'script,style,noscript,svg,video,template,[data-no-i18n]';
const ATTRS = ['alt', 'aria-label', 'title', 'placeholder'];
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const inlineOnly = el => { for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (!INLINE.test(c.tagName) || !inlineOnly(c)) return false; return true; };
const ownText = el => { if (!el.firstElementChild) return true; for (let t = el.firstChild; t; t = t.nextSibling) if (t.nodeType === 3 && norm(t.nodeValue)) return true; return false; };
const collect = (root, body, out) => {
  for (let n = root.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 3) { if (norm(n.nodeValue) && root !== body) out.push(norm(n.nodeValue)); continue; }
    if (n.nodeType !== 1 || n.matches(SKIP)) continue;
    if (norm(n.textContent) && inlineOnly(n) && ownText(n)) out.push(norm(n.innerHTML)); else collect(n, body, out);
  }
  return out;
};
const order = ['index.html', 'about.html', 'project.html', '404.html'];
const pages = order.concat(fs.readdirSync(P).filter(f => /^project-detail-.*\.html$/.test(f)).sort());
const seen = new Set(), byPage = {};
let total = 0;
for (const f of pages) {
  const { document } = parseHTML(fs.readFileSync(P + '/' + f, 'utf8'));
  const list = collect(document.body, document.body, []);
  document.querySelectorAll(ATTRS.map(a => `[${a}]`).join(',')).forEach(el => { if (!el.closest('[data-no-i18n]')) ATTRS.forEach(a => { const v = el.getAttribute(a); if (v && norm(v)) list.push(norm(v)); }); });
  list.push(norm(document.title));
  const m = document.querySelector('meta[name="description"]'); if (m) list.push(norm(m.getAttribute('content')));
  byPage[f] = [];
  for (const s of list) {
    if (!/[A-Za-zÀ-ỹ]/.test(s) || seen.has(s)) continue;
    seen.add(s); byPage[f].push(s); total += s.length;
  }
}
fs.writeFileSync(OUT, JSON.stringify(byPage, null, 1));
for (const [f, l] of Object.entries(byPage)) console.log(f, l.length, l.reduce((a, s) => a + s.length, 0));
console.log('unique', seen.size, 'chars', total);
