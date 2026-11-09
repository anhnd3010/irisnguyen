/* Shared by every page: the menu sheet, the custom cursor, the inertia
   scroller and the scroll reveals. Page-specific scripts stay inline in
   each page. */

/* Menu — the burger opens the full-screen sheet and, while it is open,
   is its close button. The motion is all CSS, keyed off .menu-open on
   the root; this only flips the state and keeps it usable:
     - the section in view is marked current, underlined like the
       reference's active page
     - the page behind is inert, so Tab stays within the header and the
       sheet, and focus moves to the first link
     - a link, the burger or Escape closes it; Escape hands focus back */
(function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('site-menu');
  if (!burger || !menu) return;

  var root = document.documentElement;
  var links = Array.prototype.slice.call(menu.querySelectorAll('.menu__link'));
  var words = Array.prototype.slice.call(menu.querySelectorAll('.menu__word'));
  var behind = [document.getElementById('main'), document.querySelector('.footer')];

  function isOpen() {
    return root.classList.contains('menu-open');
  }

  /* A hovered ticker word plays the reel from the start, as the
     reference does by mounting a fresh video on hover. Mouse only, like
     the services rows, and not under reduced motion. */
  function stopWord(word) {
    word.classList.remove('is-playing');
    word.querySelector('video').pause();
  }

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var still = matchMedia('(prefers-reduced-motion: reduce)');
    words.forEach(function (word) {
      var video = word.querySelector('video');
      word.addEventListener('pointerenter', function () {
        if (still.matches) return;
        word.classList.add('is-playing');
        video.currentTime = 0;
        var played = video.play();
        if (played) played.catch(function () {});
      });
      word.addEventListener('pointerleave', function () { stopWord(word); });
    });
  }

  /* The link to this page, overridden by an in-page section once its top
     has passed the upper part of the screen — so the About page reads
     "About" until its footer, "Contact", scrolls up. A page that lives
     under another (a project under Projects) marks that link data-current. */
  function markCurrent() {
    var current = null;
    links.forEach(function (link) {
      link.removeAttribute('aria-current');
      var href = link.getAttribute('href');
      if (href.charAt(0) === '#') {
        var section = document.querySelector(href);
        if (section && section.getBoundingClientRect().top <= innerHeight * 0.4) current = link;
      } else if (!current && (link.hasAttribute('data-current') ||
                 (!link.hash && link.pathname === location.pathname))) {
        current = link;
      }
    });
    (current || links[0]).setAttribute('aria-current', 'location');
  }

  function setOpen(open) {
    if (open === isOpen()) return;
    if (open) markCurrent();

    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    behind.forEach(function (element) { if (element) element.inert = open; });

    if (open) links[0].focus({ preventScroll: true });
    // The sheet can close under a still pointer, with no leave event
    else words.forEach(stopWord);
  }

  burger.addEventListener('click', function () { setOpen(!isOpen()); });

  // The page's own click handler still glides to the section
  links.forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      burger.focus();
    }
  });
})();

/* Custom cursor — one dot that follows the pointer 1:1 and changes look
   with what it is over: [data-cursor="kv"] on the hero title, "button" on
   the links that ask for it, the plain dot everywhere else.

   The look swaps at once and only the size moves, on the reference's
   spring — Framer's default of 0.4s with 0.2 bounce, which works out to
   a damping ratio of 0.8 at 22.49 rad/s. The disc overshoots by about
   1.5% and settles in ~0.4s.

   What is under the pointer is looked up again on scroll: the inertia
   scroller moves the page while the mouse holds still, and no pointer
   event fires for that. */
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var SIZES = { normal: 32, button: 32, kv: 288 };
  var ZETA = 0.8;
  var OMEGA = 22.49;
  var DECAY = ZETA * OMEGA;
  var OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA);
  var still = matchMedia('(prefers-reduced-motion: reduce)');

  var root = document.documentElement;
  var dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  dot.dataset.variant = 'normal';
  document.body.appendChild(dot);
  root.classList.add('has-cursor');

  var x = null, y = null;
  var size = SIZES.normal, target = size, velocity = 0;
  var last = 0, springing = false, ticking = false;

  function variantAt(element) {
    // Nothing under the intro veil to react to yet
    if (root.classList.contains('intro-lock')) return 'normal';
    var zone = element && element.closest && element.closest('[data-cursor]');
    return zone ? zone.dataset.cursor : 'normal';
  }

  function setSize(value) {
    dot.style.width = dot.style.height = value + 'px';
  }

  /* Advanced with the closed-form solution of the damped spring rather
     than stepped numerically: exact for any frame length, and it keeps
     the overshoot a stepper would shave off. Starting from the current
     size and velocity, so a change of target mid-flight stays smooth. */
  function spring(now) {
    // A frame timestamp can predate the performance.now() that started
    // the spring, hence the floor at zero.
    var dt = Math.max(0, now - last) / 1000;
    last = now;

    var a = size - target;
    var b = (velocity + DECAY * a) / OMEGA_D;
    var envelope = Math.exp(-DECAY * dt);
    var cos = Math.cos(OMEGA_D * dt);
    var sin = Math.sin(OMEGA_D * dt);
    size = target + envelope * (a * cos + b * sin);
    velocity = envelope * ((b * OMEGA_D - DECAY * a) * cos - (a * OMEGA_D + DECAY * b) * sin);

    if (Math.abs(size - target) < 0.05 && Math.abs(velocity) < 1) {
      size = target;
      velocity = 0;
      springing = false;
    }
    setSize(size);
    if (springing) requestAnimationFrame(spring);
  }

  function setVariant(variant) {
    if (variant === dot.dataset.variant) return;
    dot.dataset.variant = variant;
    target = SIZES[variant] || SIZES.normal;

    if (still.matches) {
      size = target;
      velocity = 0;
      setSize(size);
      return;
    }
    if (springing) return;   // already running; it just aims at the new size
    springing = true;
    last = performance.now();
    requestAnimationFrame(spring);
  }

  document.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') return;
    x = event.clientX;
    y = event.clientY;
    dot.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0) translate(-50%, -50%)';
    dot.classList.add('is-visible');
    setVariant(variantAt(event.target));
  }, { passive: true });

  // Out of the window altogether
  document.addEventListener('pointerout', function (event) {
    if (!event.relatedTarget) dot.classList.remove('is-visible');
  });
  addEventListener('blur', function () { dot.classList.remove('is-visible'); });

  addEventListener('scroll', function () {
    if (x === null || ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      setVariant(variantAt(document.elementFromPoint(x, y)));
    });
  }, { passive: true });
})();

/* Inertia scrolling.

   The wheel feeds a target offset and the page eases toward it a fraction
   at a time, so the viewport carries a little weight instead of tracking
   the wheel 1:1.

   Any scroll this did not cause — scrollbar drag, keyboard, the reload
   restore — resyncs the target instead of fighting it. Touch is untouched:
   wheel does not fire there, so phones keep native scrolling. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var EASE = 0.15;   // share of the remaining distance per frame
  var LINE = 16;     // px per line, for deltaMode 1 wheels
  var HEADER = 120;  // the fixed header would cover a linked section's top

  var target = window.scrollY;
  var current = target;
  var animating = false;

  function limit() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  function clamp(value) {
    return Math.min(Math.max(value, 0), limit());
  }

  function frame() {
    var distance = target - current;

    // Under half a pixel there is nothing left to see — land exactly
    if (Math.abs(distance) < 0.5) {
      current = target;
      window.scrollTo(0, current);
      animating = false;
      return;
    }

    current += distance * EASE;
    window.scrollTo(0, current);
    requestAnimationFrame(frame);
  }

  function glideTo(value) {
    target = clamp(value);
    if (animating) return;
    animating = true;
    current = window.scrollY;
    requestAnimationFrame(frame);
  }

  addEventListener('wheel', function (event) {
    if (event.ctrlKey || event.defaultPrevented) return;   // pinch-zoom
    // The page is locked under the open menu; a tall-content menu on a
    // short screen scrolls natively instead.
    if (document.documentElement.classList.contains('menu-open')) return;

    var delta = event.deltaY;
    if (event.deltaMode === 1) delta *= LINE;
    else if (event.deltaMode === 2) delta *= window.innerHeight;

    event.preventDefault();
    glideTo(target + delta);
  }, { passive: false });

  // CSS scroll-behavior is off, so in-page links are eased here instead.
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link) return;

    var id = link.getAttribute('href');
    if (id === '#') return;

    var destination = document.querySelector(id);
    if (!destination) return;

    event.preventDefault();
    glideTo(destination.getBoundingClientRect().top + window.scrollY - HEADER);
  });

  addEventListener('scroll', function () {
    if (animating) return;
    target = current = window.scrollY;
  }, { passive: true });

  addEventListener('resize', function () { target = clamp(target); }, { passive: true });
})();

/* Scroll reveals — a [data-reveal] element gets .is-revealed once the share
   of it named by data-reveal-amount (default 0.1) is on screen, and is then
   left alone: the reference plays each only once. The motion itself is CSS.

   data-reveal-by="#id" watches that element instead. The footer needs it:
   its parts start pushed down inside a box that clips them, so the page
   does not grow by the offset, and a part pushed fully out of view could
   never be seen to cross a threshold of its own. */
(function () {
  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  function reveal(item) { item.classList.add('is-revealed'); }

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(items, reveal);
    return;
  }

  // Items that share a watched element and an amount share an observer
  var groups = [];
  Array.prototype.forEach.call(items, function (item) {
    var amount = parseFloat(item.getAttribute('data-reveal-amount')) || 0.1;
    var by = item.getAttribute('data-reveal-by');
    var target = (by && document.querySelector(by)) || item;
    var group = groups.filter(function (g) { return g.target === target && g.amount === amount; })[0];
    if (!group) groups.push(group = { target: target, amount: amount, items: [] });
    group.items.push(item);
  });

  groups.forEach(function (group) {
    new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        // isIntersecting is true for any overlap, so check the share too
        if (!entry.isIntersecting || entry.intersectionRatio < group.amount) return;
        group.items.forEach(reveal);
        observer.disconnect();
      });
    }, { threshold: group.amount }).observe(group.target);
  });
})();

/* Language switch (EN / VI) in the header. The choice is remembered per
   browser and set on <html lang>; a 'languagechange' event on document
   (detail: { lang }) lets translated copy follow once it exists. Only the
   switch itself is wired so far — the pages are still in English. */
(function () {
  var groups = document.querySelectorAll('.lang');
  if (!groups.length) return;

  var KEY = 'iris-lang';
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function set(lang, announce) {
    root.setAttribute('lang', lang);
    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    if (announce) document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: lang } }));
  }

  var saved = read();
  if (saved === 'en' || saved === 'vi') set(saved, true);

  Array.prototype.forEach.call(groups, function (group) {
    group.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-lang]');
      if (button) set(button.dataset.lang, true);
    });
  });
})();
