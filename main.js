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

  /* Scroll to an element and briefly highlight it. */
  function reveal(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('flash');
  }

  /* ---------- Selected publications (homepage) ----------
     Built from the files in papers/ marked "selected": true, newest first.
     The graph starts once this list is in place, because it reads its paper
     nodes from it. */
  function loadSelectedPapers() {
    var list = document.getElementById('selected-pubs');
    if (!list) return Promise.resolve();
    var note = document.getElementById('pubs-message');
    function getJSON(url) {
      return fetch(url, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
        return r.json();
      });
    }
    function el(tag, className, text) {
      var e = document.createElement(tag);
      if (className) e.className = className;
      if (text != null && text !== '') e.textContent = text;
      return e;
    }
    function str(v) { return typeof v === 'string' ? v.trim() : ''; }
    function chip(href, text) {
      var a = el('a', '', text); a.href = href; a.rel = 'noopener'; return a;
    }
    function entry(p) {
      var li = el('li', 'pub');
      var themes = (Array.isArray(p.themes) ? p.themes : []).map(str).filter(function (t) { return /^[a-z]+$/.test(t); });
      li.setAttribute('data-themes', themes.join(' '));
      li.setAttribute('data-short', str(p.short_title) || str(p.title).split(':')[0]);
      li.appendChild(el('span', 'pub-year', String(p.year)));
      var body = el('div');
      body.appendChild(el('p', 'pub-title', str(p.title)));
      var authors = el('p', 'pub-authors');
      (Array.isArray(p.authors) ? p.authors : []).map(str).filter(Boolean).forEach(function (name, i) {
        if (i) authors.appendChild(document.createTextNode(', '));
        authors.appendChild(name === 'Dimitris Chatzopoulos' ? el('b', '', name) : document.createTextNode(name));
      });
      body.appendChild(authors);
      if (str(p.venue)) body.appendChild(el('p', 'pub-venue', str(p.venue)));
      var links = el('p', 'pub-links');
      if (/^10\.\S+$/.test(str(p.doi))) links.appendChild(chip('https://doi.org/' + str(p.doi), 'DOI'));
      if (/^[\w.\/-]+$/.test(str(p.arxiv))) links.appendChild(chip('https://arxiv.org/abs/' + str(p.arxiv), str(p.arxiv_label) || 'arXiv'));
      [['eprint', 'ePrint'], ['pdf', 'PDF'], ['code', 'Code'], ['slides', 'Slides']].forEach(function (k) {
        var u = str(p[k[0]]);
        if (/^https?:\/\/\S+$/i.test(u)) links.appendChild(chip(u, k[1]));
      });
      if (links.childNodes.length) body.appendChild(links);
      li.appendChild(body);
      return li;
    }
    return getJSON('papers/index.json')
      .then(function (files) {
        return Promise.all(files.map(function (f) {
          return getJSON('papers/' + encodeURIComponent(f)).catch(function (e) { console.warn(e); return null; });
        }));
      })
      .then(function (papers) {
        papers.filter(function (p) { return p && p.selected === true && str(p.title) && p.year; })
          .sort(function (a, b) { return b.year - a.year || str(a.title).localeCompare(str(b.title)); })
          .forEach(function (p) { list.appendChild(entry(p)); });
      })
      .catch(function (err) {
        console.warn(err);
        note.textContent = location.protocol === 'file:'
          ? 'The paper list can\u2019t load when this page is opened straight from disk. To preview it, run ' +
            '"python3 -m http.server" in the site folder and open http://localhost:8000/.'
          : 'The paper list couldn\u2019t be loaded right now. See the full list on DBLP or Google Scholar.';
        note.hidden = false;
      });
  }

  /* ---------- Interactive graph ----------
     Built from the page itself: research themes, the selected papers and the
     courses are read from the DOM, so changing those lists changes the graph. */
  var graph = { redraw: function () {} };
  loadSelectedPapers().then(startGraph, startGraph);

  function startGraph() { graph = (function () {
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
      ['teaching', 'Teaching'], ['service', 'Service'], ['contact', 'Contact']
    ];
    // Research, Publications and Background fold out (+/-): Research to its themes
    // and papers, Publications to the paper list, Scholar and DBLP, Background to
    // the universities.
    var FOLDS = {
      research: 'Interests and projects (click to show or hide)',
      publications: 'Full list, selected papers, Google Scholar and DBLP (click to show or hide)',
      background: 'Universities and research visits (click to show or hide)',
      service: 'Research and academic service (click to show or hide)'
    };
    sections.forEach(function (s) {
      node('s:' + s[0], s[1], 'section', FOLDS[s[0]]
        ? { target: '#' + s[0], toggle: true, tip: FOLDS[s[0]] }
        : { target: '#' + s[0], tip: 'Go to ' + s[1] });
      link('me', 's:' + s[0], 70);
    });

    // Service opens Research (programme committees, reviewing: details to come)
    // and Academic (roles at UCD).
    node('sv:research', 'Research', 'theme', { under: 's:service', tip: 'Research service: programme committees, reviewing (details to come)' });
    link('s:service', 'sv:research', 45);
    node('sv:academic', 'Academic', 'theme', { toggle: true, under: 's:service', tip: 'Academic service (click to show or hide)' });
    link('s:service', 'sv:academic', 45);
    node('sv:director', 'Programme Director', 'place', { under: 'sv:academic', target: '#teaching',
      tip: 'Programme Director, Higher Diploma in Computer Science, UCD' });
    link('sv:academic', 'sv:director', 40);

    // Research opens Interests (the research themes, each with its papers) and
    // Projects (by funding source; details still to come).
    node('r:interests', 'Interests', 'theme', { toggle: true, under: 's:research', tip: 'Research interests and their papers (click to show or hide)' });
    link('s:research', 'r:interests', 45);
    node('r:projects', 'Projects', 'theme', { toggle: true, under: 's:research', tip: 'Research projects (click to show or hide)' });
    link('s:research', 'r:projects', 45);
    ['European', 'Industrial', 'Irish'].forEach(function (kind) {
      node('r:' + kind.toLowerCase(), kind, 'theme', { under: 'r:projects', tip: kind + ' projects (details to come)' });
      link('r:projects', 'r:' + kind.toLowerCase(), 40);
    });

    document.querySelectorAll('.theme[data-theme-id]').forEach(function (el) {
      var id = el.getAttribute('data-theme-id');
      var title = el.querySelector('h3').textContent.trim();
      node('t:' + id, title, 'theme', { group: id, el: el, tip: title, under: 'r:interests' });
      link('r:interests', 't:' + id, 55);
    });

    document.querySelectorAll('.pub[data-short]').forEach(function (el, i) {
      var id = 'p:' + i;
      var themes = (el.getAttribute('data-themes') || '').split(/\s+/).filter(Boolean);
      var year = el.querySelector('.pub-year');
      var venue = el.querySelector('.pub-venue');
      node(id, el.getAttribute('data-short'), 'paper', {
        group: themes[0], el: el,
        under: themes.some(function (t) { return document.querySelector('[data-theme-id="' + t + '"]'); }) ? 'r:interests' : 's:publications',
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
      node('i:' + p[0], p[0], 'place', { target: '#background', tip: p[1], under: 's:background' });
      link('s:background', 'i:' + p[0], 50);
    });
    // The PhD thesis was on incentive and reputation mechanisms.
    if (document.querySelector('[data-theme-id="incentives"]')) link('t:incentives', 'i:HKUST', 80);

    // Courses come from the Teaching list; clicking one opens its UCD module page.
    // Past courses hang off a "Past" node and stay hidden until it's clicked.
    if (document.querySelector('#teaching .course[data-past]')) {
      node('c:past', 'Past', 'theme', { toggle: true, tip: 'Previously taught modules (click to show or hide)' });
      link('s:teaching', 'c:past', 45);
    }
    document.querySelectorAll('#teaching .course[data-short]').forEach(function (el, i) {
      var a = el.querySelector('a');
      var meta = el.querySelector('.course-meta');
      var past = el.hasAttribute('data-past');
      node('c:' + i, el.getAttribute('data-short'), 'place', {
        href: a ? a.href : null, target: '#teaching', under: past ? 'c:past' : null,
        tip: (a ? a.textContent.trim() : '') + (meta ? ' \u00b7 ' + meta.textContent.trim() : '')
          + (past ? ' (previously taught)' : '')
      });
      link(past ? 'c:past' : 's:teaching', 'c:' + i, past ? 35 : 40);
    });

    // Publications opens: the full list page, the selected papers below, Google Scholar and DBLP.
    node('x:full', 'Full list', 'theme', { page: 'publications.html', tip: 'All publications, by year', under: 's:publications' });
    link('s:publications', 'x:full', 50);
    node('x:papers', 'Selected', 'theme', { target: '#publications', tip: 'Go to the selected publications below', under: 's:publications' });
    link('s:publications', 'x:papers', 50);
    [['Google Scholar', 'https://scholar.google.com/citations?user=vXz1bl4AAAAJ&hl=en'],
     ['DBLP', 'https://dblp.org/pid/135/6249.html']
    ].forEach(function (p) {
      node('x:' + p[0], p[0], 'theme', { href: p[1], tip: 'Open ' + p[0], under: 's:publications' });
      link('s:publications', 'x:' + p[0], 50);
    });

    node('x:LinkedIn', 'LinkedIn', 'profile', { href: 'https://www.linkedin.com/in/dimhatzo/', tip: 'Open LinkedIn' });
    link('me', 'x:LinkedIn', 95);

    // Email shows the address pattern, like the Contact section, and scrolls there:
    // the full address isn't written anywhere in this script.
    node('x:Email', 'Email', 'profile', { target: '#contact', tip: 'Email: first_name.last_name@ucd.ie' });
    link('s:contact', 'x:Email', 40);

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

    // Fold-out groups: a node `under` a toggle shows only while that toggle (and
    // any toggle above it) is open. The graph is only given the visible nodes and
    // links, so hidden ones take no part in the layout.
    var allNodes = nodes, allLinks = links;
    allNodes.forEach(function (n) {
      if (n.toggle) n.childCount = allNodes.filter(function (c) { return c.under === n.id; }).length;
    });
    function idOf(x) { return typeof x === 'object' ? x.id : x; }
    function isVisible(n) {
      for (var u = n.under; u; u = byId[u].under) if (!byId[u].open) return false;
      return true;
    }
    function shown() {
      nodes = allNodes.filter(isVisible);
      links = allLinks.filter(function (l) { return isVisible(byId[idOf(l.source)]) && isVisible(byId[idOf(l.target)]); });
      return { nodes: nodes, links: links };
    }
    function isUnder(n, t) {
      for (var u = n.under; u; u = byId[u].under) if (u === t.id) return true;
      return false;
    }

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

    // Fold-out nodes: while folded, small "satellite" dots orbit them, one per
    // hidden child (up to four); once open, a faint ring says they fold back.
    function drawToggleMark(n, ctx, r, c) {
      ctx.shadowBlur = 0;
      if (!n.open) {
        var k = Math.min(n.childCount || 1, 4);
        var dist = r * 1.75, dot = Math.max(r * 0.22, 1.2), step = 0.5;
        var base = -Math.PI / 4 - (k - 1) * step / 2;           // a tight arc at the top right
        ctx.fillStyle = c;
        for (var i = 0; i < k; i++) {
          var a = base + i * step;
          ctx.beginPath(); ctx.arc(n.x + Math.cos(a) * dist, n.y + Math.sin(a) * dist, dot, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.strokeStyle = c; ctx.globalAlpha *= 0.45; ctx.lineWidth = r * 0.18;
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 1.6, 0, Math.PI * 2); ctx.stroke();
      }
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
          if (n.toggle) drawToggleMark(n, ctx, r, c);
        }
        ctx.restore();
      }

      // Labels: always for the main structure; for leaves when zoomed in or highlighted.
      var showLabel = n.kind === 'me' || n.kind === 'section' || n.kind === 'theme' ||
                      scale > 2.2 || (hoverNode && hlNodes.has(n));
      if (showLabel && n.kind !== 'me') {
        var size = (n.kind === 'section' ? 12.5 : n.kind === 'theme' ? 11 : 10) / Math.min(scale, 1.6);
        ctx.font = (n.kind === 'section' ? '600 ' : '500 ') + size + 'px "Courier New", Courier, monospace';
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
        ctx.font = '600 ' + size + 'px "Courier New", Courier, monospace';
        var w = ctx.measureText(n.label).width + 6 / scale;
        ctx.rect(n.x - w / 2, n.y + r, w, 3 / scale + size * 1.35);
      }
      ctx.fill();
    }

    /* --- Create the graph --- */
    var g = new window.ForceGraph(container)
      .backgroundColor('rgba(0,0,0,0)')
      .graphData(shown())
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
    var refitWhenSettled = null;
    // Shortly after load, folded nodes give off three soft pulses so first-time
    // visitors notice them (skipped when the visitor prefers reduced motion).
    if (!reduceMotion.matches) {
      var pulseStart = performance.now() + 900, PULSES = 3, PERIOD = 1500;
      g.autoPauseRedraw(false);
      g.onRenderFramePost(function (ctx, scale) {
        var t = performance.now() - pulseStart;
        if (t < 0) return;
        if (t > PULSES * PERIOD) { g.onRenderFramePost(null); g.autoPauseRedraw(true); return; }
        var phase = (t % PERIOD) / PERIOD;
        nodes.forEach(function (n) {
          if (!n.toggle || n.open) return;
          ctx.save();
          ctx.globalAlpha = 0.55 * (1 - phase);
          ctx.strokeStyle = colorOf(n, pal()); ctx.lineWidth = 2 / scale;
          ctx.beginPath(); ctx.arc(n.x, n.y, RADIUS[n.kind] * (1.2 + 2.2 * phase), 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        });
      });
    }

    g.onEngineStop(function () {
      if (!fitted) { fitted = true; if (!touched) fit(reduceMotion.matches ? 0 : 400); }
      // After a group opens or closes, the layout keeps relaxing for a moment.
      // Once it's at rest, re-fit if needed: always on phones, where it's tight.
      if (refitWhenSettled) {
        refitWhenSettled = false;
        if (container.clientWidth < 640 || !allInView(nodes)) fit(400);
      }
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
            var f = 1 / Math.min(k, 1.6);                       // label size in graph units, as drawn
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
          measureCtx.font = '600 ' + fs + 'px "Courier New", Courier, monospace';
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
      if (n.toggle) { toggleGroup(n); return; }
      if (n.page) { window.location.href = n.page; return; }
      if (n.href) {
        if (n.href.indexOf('mailto:') === 0) window.location.href = n.href;
        else window.open(n.href, '_blank', 'noopener');
        return;
      }
      if (n.el || n.target) reveal(n.el || document.querySelector(n.target));   // e.g. project leaves have neither yet
    }

    // Open or close a toggle node: its children grow out of it, on the side away
    // from its parent, while the rest of the graph is held still.
    function toggleGroup(t) {
      var before = new Set(nodes);
      t.open = !t.open;
      shown();
      if (hoverNode && !isVisible(hoverNode)) setHover(null);
      var added = nodes.filter(function (n) { return !before.has(n); });

      if (added.length) {
        var parent = nodes.filter(function (n) { return t.neighbors.has(n) && !isUnder(n, t) && n !== t; })[0];
        var dx = parent ? t.x - parent.x : 1, dy = parent ? t.y - parent.y : 0;
        var len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
        var placed = new Set([t]);
        // Direct children fan out from the toggle...
        var direct = added.filter(function (n) { return n.neighbors.has(t); });
        direct.forEach(function (n, i) {
          var spread = (i - (direct.length - 1) / 2) * 16;
          n.x = t.x + dx * 30 - dy * spread; n.y = t.y + dy * 30 + dx * spread;
          placed.add(n);
        });
        // ...and their own children start next to them.
        added.forEach(function (n) {
          if (placed.has(n)) return;
          var p = Array.from(n.neighbors).filter(function (q) { return placed.has(q) && q !== n; })[0] || t;
          n.x = p.x + dx * 18 + (Math.random() - 0.5) * 12; n.y = p.y + dy * 18 + (Math.random() - 0.5) * 12;
          placed.add(n);
        });
        added.forEach(function (n) { n.vx = n.vy = 0; n.fx = n.fy = undefined; n.pinned = false; });
      }

      // Hold everything else in place while the new nodes settle. The centring
      // force is paused too: with the rest held, it would drag only the new nodes.
      var addedSet = new Set(added);
      var held = nodes.filter(function (n) { return !addedSet.has(n) && n.fx == null; });
      held.forEach(function (n) { n.fx = n.x; n.fy = n.y; });
      var centre = g.d3Force('center');
      g.d3Force('center', null);
      g.graphData({ nodes: nodes, links: links });
      // Do the new nodes also link to nodes outside the group (themes to papers)?
      // Then let the whole graph re-settle afterwards, so those links can untangle.
      var crossLinks = added.some(function (n) {
        return Array.from(n.neighbors).some(function (q) {
          return q !== t && !addedSet.has(q) && isVisible(q) && !isUnder(q, t);
        });
      });
      setTimeout(function () {
        held.forEach(function (n) { if (!n.pinned) { n.fx = undefined; n.fy = undefined; } });
        g.d3Force('center', centre);
        if (crossLinks) g.d3ReheatSimulation();
        else if (!allInView(nodes)) fit(500);
        refitWhenSettled = true;
      }, 1200);
    }

    // Are all these (visible) nodes inside the graph's view?
    function allInView(list) {
      var W = container.clientWidth, H = container.clientHeight;
      return list.every(function (n) {
        if (!isVisible(n)) return true;
        var s = g.graph2ScreenCoords(n.x, n.y);
        return s.x > 30 && s.x < W - 70 && s.y > 30 && s.y < H - 50;
      });
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
  })(); }
})();
