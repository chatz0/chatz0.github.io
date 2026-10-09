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
    var container = document.getElementById('graph');
    if (!container || typeof window.ForceGraph !== 'function') {
      if (panel) panel.classList.add('no-graph');
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

    var me = node('me', 'Dimitris Chatzopoulos', 'me', { tip: 'That’s me. Click to re-centre' });
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
      container.style.cursor = n ? 'pointer' : '';
    }

    /* --- Drawing --- */
    var photo = new Image();
    photo.src = 'assets/me.png';
    photo.onload = function () { redraw(); };

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
        ctx.beginPath(); ctx.arc(n.x, n.y, n === hoverNode ? r * 1.25 : r, 0, Math.PI * 2);
        if (n.kind === 'profile') {
          ctx.fillStyle = isDark() ? '#1a1f1d' : '#ffffff'; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = c; ctx.stroke();
        } else {
          ctx.fillStyle = c; ctx.fill();
        }
        ctx.restore();
      }

      // Labels: always for the main structure; for leaves when zoomed in or highlighted.
      var showLabel = n.kind === 'me' || n.kind === 'section' || n.kind === 'theme' ||
                      scale > 1.6 || (hoverNode && hlNodes.has(n));
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

    function paintArea(n, color, ctx) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(n.x, n.y, RADIUS[n.kind] + 4, 0, Math.PI * 2); ctx.fill();
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
      .onNodeClick(function (n) {
        if (n.kind === 'me') { fit(500); return; }
        if (n.href) {
          if (n.href.indexOf('mailto:') === 0) window.location.href = n.href;
          else window.open(n.href, '_blank', 'noopener');
          return;
        }
        reveal(n.el || document.querySelector(n.target));
      })
      .onBackgroundClick(function () { setHover(null); })
      .cooldownTime(6000)
      .d3AlphaDecay(0.03)
      .d3VelocityDecay(0.3);

    g.d3Force('charge').strength(function (n) { return n.kind === 'me' ? -500 : n.kind === 'section' ? -260 : n.kind === 'theme' ? -170 : -70; });
    g.d3Force('link').distance(function (l) { return l.dist; }).strength(0.7);

    // Keep nodes (and the labels under them) from piling on top of each other.
    g.d3Force('collide', collide);

    if (reduceMotion.matches) g.warmupTicks(200).cooldownTicks(0);

    // On touch screens, keep page scrolling natural: no pinch/drag-to-pan on the canvas.
    if (coarsePointer.matches) g.enableZoomInteraction(false).enablePanInteraction(false);

    var fitted = false;
    g.onEngineStop(function () {
      if (!fitted) { fitted = true; fit(reduceMotion.matches ? 0 : 600); }
    });
    // Fit early too, so the first frames already look composed.
    setTimeout(function () { if (!fitted) fit(0); }, 350);

    // Like zoomToFit, but counts the labels hanging off the outer nodes, and
    // keeps clear of the hint line at the bottom and the zoom buttons on the right.
    function fit(ms) {
      var W = container.clientWidth, H = container.clientHeight;
      var padX = W < 600 ? 26 : 20, padTop = 20, padBottom = 34, padRight = 52;
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
        k = Math.min((W - padX - padRight) / (box.x1 - box.x0), (H - padTop - padBottom) / (box.y1 - box.y0), 2.4);
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

    panel.querySelectorAll('[data-zoom]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-zoom');
        if (mode === 'fit') fit(400);
        else g.zoom(g.zoom() * (mode === 'in' ? 1.4 : 1 / 1.4), 300);
      });
    });

    // Pause the canvas when it's off-screen to save battery.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) g.resumeAnimation(); else g.pauseAnimation();
      }).observe(panel);
    }

    container._graph = g; // handy for debugging from the console

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
