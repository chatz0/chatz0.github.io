(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var coarsePointer = window.matchMedia('(pointer: coarse)');

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Theme toggle ---------- */
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : darkQuery.matches;
  }

  document.querySelector('.theme-toggle').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    graph.redraw();
  });
  darkQuery.addEventListener('change', function () { graph.redraw(); });

  /* ---------- Header state & active section ---------- */
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 40); }
  // The landing screen fills the viewport below the sticky header.
  function measureHeader() { root.style.setProperty('--header-h', header.offsetHeight + 'px'); }
  measureHeader();
  window.addEventListener('resize', measureHeader);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = {};
  document.querySelectorAll('.site-nav a').forEach(function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Object.keys(navLinks).forEach(function (id) {
          navLinks[id].classList.toggle('active', id === entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navLinks).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  /* Group page: members without a photo get their initials instead. */
  document.querySelectorAll('.member').forEach(function (el) {
    if (el.querySelector('.member-photo')) return;
    var name = (el.querySelector('h3') || {}).textContent || '';
    var initials = name.trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    var div = document.createElement('div');
    div.className = 'member-initials'; div.setAttribute('aria-hidden', 'true'); div.textContent = initials;
    el.insertBefore(div, el.firstChild);
  });

  /* Scroll to an element and briefly highlight it. */
  function reveal(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('flash');
  }

  /* ---------- Interactive graph ----------
     Built from the page itself: research themes and publications are read
     from the DOM, so adding a paper to the list also adds it to the graph. */
  var graph = (function () {
    var panel = document.querySelector('.graph-panel');
    var card = document.querySelector('.intro-card');
    var container = document.getElementById('graph');
    if (!container || typeof window.ForceGraph !== 'function') {
      root.classList.add('no-graph');
      return { redraw: function () {} };
    }
    root.classList.add('has-graph');

    var PALETTE = {
      light: { accent: '#0f6b5c', text: '#1b1f1d', muted: '#7a837e', link: '27, 31, 29', halo: 'rgba(255,255,255,0.85)',
               learning: '#0f6b5c', ledgers: '#b4532a', incentives: '#6b4fa0', mobile: '#2563a8', place: '#8a8f8c' },
      dark:  { accent: '#5fd1b3', text: '#e7ebe8', muted: '#8f9994', link: '231, 235, 232', halo: 'rgba(18,22,20,0.85)',
               learning: '#5fd1b3', ledgers: '#f0a072', incentives: '#b9a2f0', mobile: '#7fb2f0', place: '#9aa49f' }
    };
    function pal() { return isDark() ? PALETTE.dark : PALETTE.light; }

    /* --- Build nodes and links --- */
    var nodes = [], links = [];
    function node(id, label, kind, extra) {
      var n = { id: id, label: label, kind: kind };
      for (var k in extra) n[k] = extra[k];
      nodes.push(n);
      return n;
    }
    function link(a, b, dist) { links.push({ source: a, target: b, dist: dist }); }

    var me = node('me', 'Dimitris Chatzopoulos', 'me', { tip: 'That’s me. Click to tidy up and re-centre' });
    me.fx = 0; me.fy = 0; // keep the centre node pinned

    var sections = [
      ['research', 'Research'], ['publications', 'Publications'], ['background', 'Background'],
      ['teaching', 'Teaching'], ['contact', 'Contact']
    ];
    sections.forEach(function (s) {
      node('s:' + s[0], s[1], 'section', { target: '#' + s[0], tip: 'Go to ' + s[1] });
      link('me', 's:' + s[0], 70);
    });

    document.querySelectorAll('.theme[data-theme-id]').forEach(function (el) {
      var id = el.getAttribute('data-theme-id');
      var title = el.querySelector('h3').textContent.trim();
      node('t:' + id, title, 'theme', { group: id, el: el, tip: title });
      link('s:research', 't:' + id, 55);
    });

    document.querySelectorAll('.pub[data-short]').forEach(function (el, i) {
      var id = 'p:' + i;
      var themes = (el.getAttribute('data-themes') || '').split(/\s+/).filter(Boolean);
      var year = el.querySelector('.pub-year');
      var venue = el.querySelector('.pub-venue');
      node(id, el.getAttribute('data-short'), 'paper', {
        group: themes[0], el: el,
        tip: el.querySelector('.pub-title').textContent.trim() +
             (venue ? ' · ' + venue.textContent.trim() : '') +
             (year ? ' (' + year.textContent.trim() + ')' : '')
      });
      var linked = false;
      themes.forEach(function (t) {
        if (document.querySelector('[data-theme-id="' + t + '"]')) { link('t:' + t, id, 42); linked = true; }
      });
      if (!linked) link('s:publications', id, 60); // a paper without a theme hangs off Publications
    });

    [['UCD', 'University College Dublin'], ['HKUST', 'Hong Kong University of Science and Technology'],
     ['Thessaly', 'University of Thessaly'], ['EPFL', 'EPFL (visit, 2014)'],
     ['Tsinghua', 'Tsinghua University (visit, 2016)'], ['Cambridge', 'University of Cambridge (visit, 2016)']
    ].forEach(function (p) {
      node('i:' + p[0], p[0], 'place', { target: '#background', tip: p[1] });
      link('s:background', 'i:' + p[0], 50);
    });
    // The PhD thesis was on incentive and reputation mechanisms.
    if (document.querySelector('[data-theme-id="incentives"]')) link('t:incentives', 'i:HKUST', 80);

    [['Cloud Computing'], ['Distributed Systems']].forEach(function (c) {
      node('c:' + c[0], c[0], 'place', { target: '#teaching', tip: 'Course: ' + c[0] });
      link('s:teaching', 'c:' + c[0], 40);
    });

    [['Scholar', 'https://scholar.google.com/citations?user=vXz1bl4AAAAJ&hl=en', 'Google Scholar'],
     ['DBLP', 'https://dblp.org/pid/135/6249.html', 'DBLP'],
     ['LinkedIn', 'https://www.linkedin.com/in/dimhatzo/', 'LinkedIn'],
     ['Email', 'mailto:dimitris.chatzopoulos@ucd.ie', 'dimitris.chatzopoulos@ucd.ie']
    ].forEach(function (p) {
      node('x:' + p[0], p[0], 'profile', { href: p[1], tip: 'Open ' + p[2] });
      link(p[0] === 'Email' ? 's:contact' : 'me', 'x:' + p[0], p[0] === 'Email' ? 40 : 95);
    });

    // The research group (DAIS Lab): a cloud linked only to the centre photo; opens its own page.
    node('s:group', 'DAIS Lab', 'section', { cloud: true, page: 'group.html', tip: 'DAIS Lab: meet the research group' });
    link('me', 's:group', 85);

    /* --- Neighbourhoods for hover highlighting --- */
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; n.neighbors = new Set([n]); n.links = new Set(); });
    links.forEach(function (l) {
      var a = byId[l.source], b = byId[l.target];
      a.neighbors.add(b); b.neighbors.add(a);
      a.links.add(l); b.links.add(l);
    });

    var hoverNode = null;
    var hlNodes = new Set(), hlLinks = new Set();
    function setHover(n) {
      hoverNode = n || null;
      hlNodes = n ? n.neighbors : new Set();
      hlLinks = n ? n.links : new Set();
    }

    /* --- Drawing --- */
    var photo = new Image();
    photo.src = 'assets/me.png';
    photo.onload = function () { redraw(); };

    var MIN_ZOOM = 0.3, MAX_ZOOM = 6;
    var CLOUD = new Path2D('M7 18.5h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z');
    var RADIUS = { me: 22, section: 8, theme: 6.5, paper: 4.2, place: 4.2, profile: 4.6 };

    function colorOf(n, p) {
      if (n.kind === 'section') return p.accent;
      if (n.kind === 'theme' || n.kind === 'paper') return p[n.group] || p.accent;
      if (n.kind === 'profile') return p.accent;
      return p.place;
    }

    function drawNode(n, ctx, scale) {
      var p = pal();
      var r = RADIUS[n.kind];
      var dim = hoverNode && !hlNodes.has(n);
      ctx.globalAlpha = dim ? 0.18 : 1;

      if (n.kind === 'me') {
        ctx.save();
        if (isDark()) { ctx.shadowColor = p.accent; ctx.shadowBlur = 18; }
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.accent; ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.clip();
        if (photo.complete && photo.naturalWidth) ctx.drawImage(photo, n.x - r, n.y - r, r * 2, r * 2);
        else { ctx.fillStyle = p.halo; ctx.fill(); }
        ctx.restore();
      } else {
        var c = colorOf(n, p);
        ctx.save();
        if (isDark() && (n === hoverNode || n.kind === 'section')) { ctx.shadowColor = c; ctx.shadowBlur = n === hoverNode ? 16 : 8; }
        if (n.cloud) {
          // cloud glyph: the same path as the group page's icon (24x24 viewBox)
          var sc = (n === hoverNode ? 1.2 : 1) * r * 2.9 / 19.3;
          ctx.translate(n.x, n.y); ctx.scale(sc, sc); ctx.translate(-12.1, -13.3);
          ctx.fillStyle = c; ctx.fill(CLOUD);
        } else {
          ctx.beginPath(); ctx.arc(n.x, n.y, n === hoverNode ? r * 1.25 : r, 0, Math.PI * 2);
        }
        if (n.cloud) { /* drawn above */ }
        else if (n.kind === 'profile') {
          ctx.fillStyle = isDark() ? '#1a1f1d' : '#ffffff'; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = c; ctx.stroke();
        } else {
          ctx.fillStyle = c; ctx.fill();
        }
        ctx.restore();
      }

      // Labels: always for the main structure; for leaves when zoomed in or highlighted.
      var showLabel = n.kind === 'me' || n.kind === 'section' || n.kind === 'theme' ||
                      scale > 2.2 || (hoverNode && hlNodes.has(n));
      if (showLabel && n.kind !== 'me') {
        var size = (n.kind === 'section' ? 12.5 : n.kind === 'theme' ? 11 : 10) / Math.min(scale, 1.6);
        ctx.font = (n.kind === 'section' ? '600 ' : '500 ') + size + 'px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var y = n.y + r + 3 / scale;
        ctx.lineWidth = 3 / scale; ctx.strokeStyle = p.halo; ctx.lineJoin = 'round';
        ctx.strokeText(n.label, n.x, y);
        ctx.fillStyle = n.kind === 'section' ? p.text : p.muted;
        if (n === hoverNode) ctx.fillStyle = p.text;
        ctx.fillText(n.label, n.x, y);
      }
      ctx.globalAlpha = 1;
    }

    // Collision force on rectangles: a node plus the label under it.
    function box(n) {
      var r = RADIUS[n.kind];
      if (n.kind === 'me') return { hw: r + 8, top: r + 8, bottom: r + 8 };
      if (n.kind === 'section' || n.kind === 'theme') {
        var px = n.kind === 'section' ? 12.5 : 11;
        return { hw: Math.max(r, n.label.length * px * 0.3) + 4, top: r + 3, bottom: r + px * 1.4 + 4 };
      }
      return { hw: r + 4, top: r + 4, bottom: r + 4 };
    }
    function collide(alpha) {
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j], A = box(a), B = box(b);
          var dx = b.x - a.x, dy = b.y - a.y;
          var ox = A.hw + B.hw - Math.abs(dx);                        // horizontal overlap
          var oy = (dy >= 0 ? A.bottom + B.top : A.top + B.bottom) - Math.abs(dy); // vertical overlap
          if (ox <= 0 || oy <= 0) continue;
          var wa = a.fx == null ? (b.fx == null ? 0.5 : 1) : 0, wb = 1 - wa;
          if (a.fx != null && b.fx != null) continue;
          var k = 3 + 4 * alpha;                                      // stays firm as the layout cools
          if (ox < oy) {                                               // separate along the cheaper axis
            var sx = (dx >= 0 ? 1 : -1) * ox * k * 0.1;
            a.vx -= sx * wa; b.vx += sx * wb;
          } else {
            var sy = (dy >= 0 ? 1 : -1) * oy * k * 0.1;
            a.vy -= sy * wa; b.vy += sy * wb;
          }
        }
      }
    }

    // Hit area for hover and drag: never smaller than ~11px on screen, and it
    // includes the label, which is what people naturally reach for.
    function paintArea(n, color, ctx, scale) {
      // Circle and label box go into ONE path and are filled once: force-graph
      // identifies nodes by exact pixel colour, and two overlapping fills leave
      // an anti-aliased seam whose colour is off by one, i.e. matches no node.
      var r = RADIUS[n.kind];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, Math.max(r + 3, 11 / scale), 0, Math.PI * 2);
      if (n.kind === 'section' || n.kind === 'theme' || (n.kind !== 'me' && scale > 2.2)) {
        var size = (n.kind === 'section' ? 12.5 : n.kind === 'theme' ? 11 : 10) / Math.min(scale, 1.6);
        ctx.font = '600 ' + size + 'px Inter, system-ui, sans-serif';
        var w = ctx.measureText(n.label).width + 6 / scale;
        ctx.rect(n.x - w / 2, n.y + r, w, 3 / scale + size * 1.35);
      }
      ctx.fill();
    }

    /* --- Create the graph --- */
    var g = new window.ForceGraph(container)
      .backgroundColor('rgba(0,0,0,0)')
      .graphData({ nodes: nodes, links: links })
      .nodeLabel(function (n) { return escapeHtml(n.tip || n.label); })
      .nodeCanvasObject(drawNode)
      .nodePointerAreaPaint(paintArea)
      .linkColor(function (l) {
        var p = pal();
        if (hlLinks.has(l)) return p.accent;
        return 'rgba(' + p.link + ',' + (hoverNode ? 0.05 : 0.16) + ')';
      })
      .linkWidth(function (l) { return hlLinks.has(l) ? 1.8 : 1; })
      .linkDirectionalParticles(function (l) { return hlLinks.has(l) && !reduceMotion.matches ? 2 : 0; })
      .linkDirectionalParticleWidth(3)
      .linkDirectionalParticleSpeed(0.008)
      .linkDirectionalParticleColor(function () { return pal().accent; })
      .onNodeHover(function (n) { setHover(n); })
      .onNodeClick(function (n) { openNode(n); })
      .onBackgroundClick(function () { setHover(null); })
      // Node dragging is handled by our own pointer code below, not the library's.
      .enableNodeDrag(false)
      .minZoom(MIN_ZOOM)
      .maxZoom(MAX_ZOOM)
      .cooldownTime(3000)
      .d3AlphaDecay(0.03)
      .d3VelocityDecay(0.3);

    g.d3Force('charge').strength(function (n) { return n.kind === 'me' ? -500 : n.kind === 'section' ? -260 : n.kind === 'theme' ? -170 : -70; });
    g.d3Force('link').distance(function (l) { return l.dist; }).strength(0.7);

    // Keep nodes (and the labels under them) from piling on top of each other.
    g.d3Force('collide', collide);

    // Pre-compute most of the layout before the first frame, so nodes barely
    // drift (a moving node is harder to grab); reduced motion gets a still layout.
    if (reduceMotion.matches) g.warmupTicks(200).cooldownTicks(0);
    else g.warmupTicks(160);

    // The graph fills the screen, so a plain scroll must scroll the page, not
    // zoom the graph. Zoom needs Ctrl/Cmd + scroll (trackpad pinch sends ctrlKey).
    // We handle that zoom ourselves: the library treats every Ctrl+wheel as a
    // trackpad pinch and amplifies it, which makes a mouse wheel jump wildly.
    container.addEventListener('wheel', function (e) {
      e.stopPropagation();
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); // also stops the browser's own page zoom
      interacted();
      var delta = e.deltaY * (e.deltaMode === 1 ? 20 : 1);
      delta = Math.max(-20, Math.min(20, delta)); // one mouse notch ~ 1.3x; pinches stay smooth
      var k0 = g.zoom();
      var k1 = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k0 * Math.pow(2, -delta * 0.02)));
      if (k1 === k0) return;
      // keep the point under the cursor fixed
      var r = container.getBoundingClientRect();
      var pt = g.screen2GraphCoords(e.clientX - r.left, e.clientY - r.top);
      var c = g.centerAt();
      g.zoom(k1);
      g.centerAt(pt.x - (pt.x - c.x) * (k0 / k1), pt.y - (pt.y - c.y) * (k0 / k1));
    }, { capture: true, passive: false });

    // On touch screens, keep page scrolling natural: no pinch/drag-to-pan on the canvas.
    if (coarsePointer.matches) g.enableZoomInteraction(false).enablePanInteraction(false);

    // Once the layout settles, fit it to the screen, unless the visitor has
    // already started interacting: moving the view under their cursor would
    // make them miss the node they're reaching for.
    var fitted = false, touched = false;
    function interacted() { touched = true; }
    container.addEventListener('pointerdown', interacted);
    g.onEngineStop(function () {
      if (!fitted) { fitted = true; if (!touched) fit(reduceMotion.matches ? 0 : 400); }
    });
    // Fit early too, so the first frames already look composed.
    setTimeout(function () { if (!fitted) fit(0); }, 350);

    // Like zoomToFit, but counts the labels hanging off the outer nodes, and
    // keeps clear of the hint line at the bottom and the zoom buttons on the right.
    function fit(ms) {
      var W = container.clientWidth, H = container.clientHeight;
      var padX = 24, padTop = 24, padBottom = 56, padRight = 72;
      // Keep the graph clear of the floating name card: beside it on wide
      // screens, below it on narrow ones.
      if (card) {
        var cr = card.getBoundingClientRect(), pr = container.getBoundingClientRect();
        if (cr.width < W * 0.45) padX = cr.right - pr.left + 24;
        else padTop = cr.bottom - pr.top + 16;
      }
      if (W < 640) { padX = Math.min(padX, 20); padRight = 56; }
      var k = g.zoom() || 1, box;
      for (var iter = 0; iter < 3; iter++) {
        box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        nodes.forEach(function (n) {
          if (n.x == null) return;
          var r = RADIUS[n.kind], hw = r, below = r;
          if (n.kind === 'section' || n.kind === 'theme') {
            var px = n.kind === 'section' ? 12.5 : 11;          // label size on screen (scale <= 1.6)
            var f = Math.min(k, 1.6) / k;                       // screen px -> graph units
            hw = Math.max(r, n.label.length * px * 0.3 * f);
            below = r + (3 + px * 1.25) * f;
          }
          box.x0 = Math.min(box.x0, n.x - hw); box.x1 = Math.max(box.x1, n.x + hw);
          box.y0 = Math.min(box.y0, n.y - r);  box.y1 = Math.max(box.y1, n.y + below);
        });
        k = Math.min((W - padX - padRight) / (box.x1 - box.x0), (H - padTop - padBottom) / (box.y1 - box.y0), 1.9);
      }
      // centre of the box, shifted so the free area (not the whole panel) is centred
      var cx = (box.x0 + box.x1) / 2 + (padRight - padX) / 2 / k;
      var cy = (box.y0 + box.y1) / 2 + (padBottom - padTop) / 2 / k;
      g.centerAt(cx, cy, ms);
      g.zoom(k, ms);
    }

    function size() {
      g.width(container.clientWidth).height(container.clientHeight);
    }
    size();
    if ('ResizeObserver' in window) {
      var t;
      new ResizeObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () { size(); fit(300); }, 100);
      }).observe(container);
    }

    document.querySelectorAll('[data-zoom]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-zoom');
        interacted();
        if (mode === 'fit') fit(400);
        else g.zoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, g.zoom() * (mode === 'in' ? 1.4 : 1 / 1.4))), 300);
      });
    });

    // Pause the canvas when it's off-screen to save battery.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) g.resumeAnimation(); else g.pauseAnimation();
      }).observe(panel);
    }

    container._graph = g; // handy for debugging from the console

    /* --- Node dragging ---
       Done with plain geometry rather than force-graph's colour-picking hit
       canvas, which proved unreliable in some browsers (a press on a node
       could start a pan of the whole graph instead). A press that lands on a
       node never reaches force-graph, so it can't turn into a pan. */
    var measureCtx = document.createElement('canvas').getContext('2d');

    function nodeAt(clientX, clientY) {
      var rect = container.getBoundingClientRect();
      var px = clientX - rect.left, py = clientY - rect.top;
      var k = g.zoom(), best = null, bestD = Infinity, labelHit = null;
      for (var i = nodes.length - 1; i >= 0; i--) {
        var n = nodes[i];
        if (n.x == null) continue;
        var s = g.graph2ScreenCoords(n.x, n.y);
        var r = RADIUS[n.kind] * k;
        var d = Math.hypot(px - s.x, py - s.y);
        if (d <= Math.max(r + 5, 13) && d < bestD) { best = n; bestD = d; }
        if (!labelHit && n.kind !== 'me' &&
            (n.kind === 'section' || n.kind === 'theme' || k > 2.2)) {
          var base = n.kind === 'section' ? 12.5 : n.kind === 'theme' ? 11 : 10;
          var fs = base * k / Math.min(k, 1.6);                     // label size on screen
          measureCtx.font = '600 ' + fs + 'px Inter, system-ui, sans-serif';
          var w = measureCtx.measureText(n.label).width + 8;
          var top = s.y + r, bottom = top + 4 + fs * 1.35;
          if (px >= s.x - w / 2 && px <= s.x + w / 2 && py >= top && py <= bottom) labelHit = n;
        }
      }
      return best || labelHit;
    }

    var drag = null;
    var canvasEl = function () { return container.querySelector('canvas'); };

    container.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !e.isPrimary) return;
      var n = nodeAt(e.clientX, e.clientY);
      if (!n) return;                          // background: let force-graph pan
      e.stopImmediatePropagation();
      if (e.pointerType === 'mouse') e.preventDefault(); // no mousedown -> no pan
      interacted();
      var rect = container.getBoundingClientRect();
      var p = g.screen2GraphCoords(e.clientX - rect.left, e.clientY - rect.top);
      drag = { node: n, id: e.pointerId, x0: e.clientX, y0: e.clientY,
               dx: n.x - p.x, dy: n.y - p.y, moved: false };
      try { container.setPointerCapture(e.pointerId); } catch (err) {}
    }, { capture: true });

    // Belt and braces: while a node drag is active, the library gets no
    // mouse/touch presses at all.
    ['mousedown', 'touchstart'].forEach(function (type) {
      container.addEventListener(type, function (e) { if (drag) e.stopImmediatePropagation(); }, { capture: true });
    });

    container.addEventListener('pointermove', function (e) {
      if (!drag) {
        if (e.pointerType === 'mouse') {
          var c = canvasEl();
          if (c) c.style.cursor = nodeAt(e.clientX, e.clientY) ? 'grab' : '';
        }
        return;
      }
      if (e.pointerId !== drag.id) return;
      e.stopImmediatePropagation();
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
      drag.moved = true;
      var c2 = canvasEl(); if (c2) c2.style.cursor = 'grabbing';
      var rect = container.getBoundingClientRect();
      var p = g.screen2GraphCoords(e.clientX - rect.left, e.clientY - rect.top);
      var n = drag.node;
      n.fx = n.x = p.x + drag.dx;
      n.fy = n.y = p.y + drag.dy;
      n.vx = n.vy = 0;
      redraw();
    }, { capture: true });

    function endDrag(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopImmediatePropagation();
      var d = drag; drag = null;
      try { container.releasePointerCapture(e.pointerId); } catch (err) {}
      var c = canvasEl(); if (c) c.style.cursor = 'grab';
      if (d.moved) { if (d.node.kind !== 'me') d.node.pinned = true; }  // stays where dropped
      else if (!cancelled) openNode(d.node);                            // a press without movement is a click
    }
    container.addEventListener('pointerup', function (e) { endDrag(e, false); }, { capture: true });
    container.addEventListener('pointercancel', function (e) { endDrag(e, true); }, { capture: true });

    function openNode(n) {
      if (n.kind === 'me') { releaseAll(); return; }
      if (n.page) { window.location.href = n.page; return; }
      if (n.href) {
        if (n.href.indexOf('mailto:') === 0) window.location.href = n.href;
        else window.open(n.href, '_blank', 'noopener');
        return;
      }
      reveal(n.el || document.querySelector(n.target));
    }

    function releaseAll() {
      var any = false;
      nodes.forEach(function (n) {
        if (n.pinned) { n.fx = undefined; n.fy = undefined; n.pinned = false; any = true; }
      });
      if (me.fx !== 0 || me.fy !== 0) { me.fx = 0; me.fy = 0; any = true; }
      if (any) { fitted = false; touched = false; g.d3ReheatSimulation(); }
      else fit(500);
    }

    function redraw() {
      // Re-setting an accessor makes force-graph repaint with the current palette.
      g.nodeCanvasObject(drawNode);
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    return { redraw: redraw };
  })();
})();
