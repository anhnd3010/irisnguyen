/* Page translation (EN <-> VN) for the header's language toggle.

   The pages are written in English (Kyarisuru's case study in Vietnamese).
   js/i18n-dict.js holds pairs [english, vietnamese] keyed by the markup of a
   "unit": the outermost element whose content is only text and inline tags
   (a <p>, a heading, a list item, a link…), plus loose text nodes and the
   alt / aria-label / title attributes, <title> and the description meta.
   Switching language swaps each unit's inner HTML for its pair, so links
   and inline tags inside a sentence move with it; anything without a pair
   (brand names, numbers) simply stays as it is.

   Mark an element data-no-i18n to leave it and everything inside alone.
   site.js fires 'languagechange' (detail: { lang: 'en' | 'vi' }). */
(function () {
  var PAIRS = window.I18N_PAIRS || [];
  var toVi = new Map(), toEn = new Map();
  PAIRS.forEach(function (p) { toVi.set(norm(p[0]), p[1]); toEn.set(norm(p[1]), p[0]); });

  var INLINE = /^(A|ABBR|B|BR|CODE|EM|I|IMG|MARK|Q|S|SMALL|SPAN|STRONG|SUB|SUP|TIME|U|WBR)$/;
  var SKIP = 'script,style,noscript,svg,video,template,[data-no-i18n]';
  var ATTRS = ['alt', 'aria-label', 'title', 'placeholder'];

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function inlineOnly(el) {
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (!INLINE.test(c.tagName) || !inlineOnly(c)) return false;
    }
    return true;
  }

  function ownText(el) {
    if (!el.firstElementChild) return true;
    for (var t = el.firstChild; t; t = t.nextSibling) if (t.nodeType === 3 && norm(t.nodeValue)) return true;
    return false;
  }

  /* units under root, in document order: { el } for elements, { node } for loose text */
  function collect(root, out) {
    for (var n = root.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (norm(n.nodeValue) && root !== document.body) out.push({ node: n });
        continue;
      }
      if (n.nodeType !== 1 || n.matches(SKIP)) continue;
      // a unit holds text of its own; a run of inline tags with no text between them
      // (a nav of links, a label + value) is split into its pieces instead
      if (norm(n.textContent) && inlineOnly(n) && ownText(n)) out.push({ el: n });
      else collect(n, out);
    }
    return out;
  }

  /* Every translatable spot becomes a slot that remembers the page's own
     wording, so switching back always restores exactly what was written. */
  var slots = null;
  function slot(get, set) {
    var raw = get(), key = norm(raw);
    var native = toVi.has(key) ? 'en' : toEn.has(key) ? 'vi' : null;
    if (native) slots.push({ set: set, raw: raw, native: native, other: native === 'en' ? toVi.get(key) : toEn.get(key) });
  }
  function scan() {
    slots = [];
    collect(document.body, []).forEach(function (u) {
      if (u.el) {
        slot(function () { return u.el.innerHTML; }, function (v) { u.el.innerHTML = v; });
      } else {
        var n = u.node, lead = n.nodeValue.match(/^\s*/)[0], tail = n.nodeValue.match(/\s*$/)[0];
        slot(function () { return n.nodeValue; }, function (v) { n.nodeValue = v === null ? '' : (/^\s/.test(v) ? v : lead + v + tail); });
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[' + ATTRS.join('],[') + ']'), function (el) {
      if (el.closest('[data-no-i18n]')) return;
      ATTRS.forEach(function (a) {
        if (el.hasAttribute(a)) slot(function () { return el.getAttribute(a); }, function (v) { el.setAttribute(a, v); });
      });
    });
    // labels inside inline SVG diagrams (user flows): each text run on its own
    Array.prototype.forEach.call(document.querySelectorAll('svg text, svg tspan, svg title, svg desc'), function (el) {
      if (el.closest('[data-no-i18n]')) return;
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3 && norm(n.nodeValue)) slot(function () { return n.nodeValue; }, function (v) { n.nodeValue = v; });
      });
    });
    slot(function () { return document.title; }, function (v) { document.title = v; });
    var meta = document.querySelector('meta[name="description"]');
    if (meta) slot(function () { return meta.content; }, function (v) { meta.content = v; });
    // sections written in a language of their own (Kyarisuru's case study is lang="vi")
    Array.prototype.forEach.call(document.querySelectorAll('body [lang="vi"], body [lang="en"]'), function (el) {
      if (!el.closest('.lang')) slots.push({ set: function (v) { el.setAttribute('lang', v); }, langAttr: true });
    });
  }

  function apply(lang) {
    if (!slots) scan();
    slots.forEach(function (s) {
      if (s.langAttr) s.set(lang);
      else s.set(lang === s.native ? s.raw : s.other);
    });
  }

  window.I18N = { apply: apply };

  document.addEventListener('languagechange', function (e) { apply(e.detail.lang); });
  // on load: show the stored language (Kyarisuru's Vietnamese copy turns English under EN)
  apply(document.documentElement.lang === 'vi' ? 'vi' : 'en');
})();
