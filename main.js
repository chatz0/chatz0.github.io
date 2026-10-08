(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

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
    network.recolor();
  });
  darkQuery.addEventListener('change', function () { network.recolor(); });

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

  /* ---------- Hero network ----------
     A small drifting peer-to-peer graph: nodes link to nearby peers, and
     occasionally a "message" travels along a link. Pauses when off-screen
     or when the tab is hidden; renders one still frame for reduced motion. */
  var network = (function () {
    var canvas = document.querySelector('.hero-network');
    var ctx = canvas && canvas.getContext('2d');
    if (!ctx) return { recolor: function () {} };

    var hero = canvas.parentElement;
    var nodes = [], pulses = [];
    var w = 0, h = 0, dpr = 1, linkDist = 130;
    var rgb = '15, 107, 92';
    var running = false, visible = true, raf = 0, last = 0;

    function readColor() {
      rgb = getComputedStyle(root).getPropertyValue('--node').trim() || rgb;
    }

    function resize() {
      var rect = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      linkDist = w < 640 ? 95 : 130;

      var target = Math.round(Math.min(70, Math.max(24, (w * h) / 9000)));
      while (nodes.length < target) {
        nodes.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
          r: 1.4 + Math.random() * 1.6
        });
      }
      nodes.length = target;
      nodes.forEach(function (n) { n.x = Math.min(n.x, w); n.y = Math.min(n.y, h); });
      pulses = [];
      if (!running) draw();
    }

    function step(dt) {
      var k = dt / 16.7;
      nodes.forEach(function (n) {
        n.x += n.vx * k; n.y += n.vy * k;
        if (n.x < 0 || n.x > w) { n.vx *= -1; n.x = Math.max(0, Math.min(w, n.x)); }
        if (n.y < 0 || n.y > h) { n.vy *= -1; n.y = Math.max(0, Math.min(h, n.y)); }
      });
      for (var i = pulses.length - 1; i >= 0; i--) {
        pulses[i].t += 0.012 * k;
        if (pulses[i].t >= 1) pulses.splice(i, 1);
      }
      if (pulses.length < 4 && Math.random() < 0.02 * k) spawnPulse();
    }

    function spawnPulse() {
      var a = nodes[(Math.random() * nodes.length) | 0];
      var near = nodes.filter(function (b) {
        return b !== a && Math.hypot(a.x - b.x, a.y - b.y) < linkDist;
      });
      if (near.length) pulses.push({ a: a, b: near[(Math.random() * near.length) | 0], t: 0 });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j];
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.28 * (1 - d / linkDist)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = 'rgba(' + rgb + ',0.55)';
      nodes.forEach(function (n) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = 'rgba(' + rgb + ',0.9)';
      pulses.forEach(function (p) {
        var x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
      });
    }

    function frame(now) {
      var dt = Math.min(now - last, 50);
      last = now;
      step(dt); draw();
      raf = requestAnimationFrame(frame);
    }

    function update() {
      var should = visible && !document.hidden && !reduceMotion.matches;
      if (should && !running) {
        running = true; last = performance.now(); raf = requestAnimationFrame(frame);
      } else if (!should && running) {
        running = false; cancelAnimationFrame(raf); draw();
      }
    }

    readColor();
    resize();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    });
    document.addEventListener('visibilitychange', update);
    reduceMotion.addEventListener('change', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; update(); }).observe(hero);
    }
    update();

    return {
      recolor: function () { readColor(); if (!running) draw(); }
    };
  })();
})();
