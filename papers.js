/* Full publication list (publications.html), built from the JSON files in papers/
   (listed in papers/index.json). Author names matching a lab member link to their page.
   See papers/README.md for the file format. */
(function () {
  'use strict';

  var list = document.getElementById('paper-list');
  var message = document.getElementById('papers-message');
  var filters = document.getElementById('paper-filters');
  if (!list || !message) return;

  var PI = 'Dimitris Chatzopoulos';
  var TYPE_LABELS = {
    journal: 'Journal', conference: 'Conference', workshop: 'Workshop',
    preprint: 'Preprint', 'book chapter': 'Book chapter', thesis: 'Thesis', other: 'Other'
  };

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    });
  }
  function loadAll(dir) {
    return getJSON(dir + '/index.json').then(function (files) {
      if (!Array.isArray(files)) throw new Error(dir + '/index.json must be a list of file names');
      return Promise.all(files.map(function (f) {
        return getJSON(dir + '/' + encodeURIComponent(f)).then(
          function (data) { return { file: f, data: data }; },
          function (err) { console.warn('Could not read', dir + '/' + f, err); return null; }
        );
      }));
    }).then(function (rs) { return rs.filter(Boolean); });
  }

  /* --- DOM helpers: file contents only ever go in as text --- */
  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null && text !== '') e.textContent = text;
    return e;
  }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function isWebUrl(u) { return /^https?:\/\/[^\s]+$/i.test(u); }
  function link(href, text, className) {
    var a = el('a', className || '', text);
    a.href = href;
    if (/^https?:/i.test(href)) a.rel = 'noopener';
    return a;
  }

  // The paper's main link: DOI, else publisher URL, else arXiv.
  function mainUrl(p) {
    if (/^10\.\S+$/.test(str(p.doi))) return 'https://doi.org/' + str(p.doi);
    if (isWebUrl(str(p.url))) return str(p.url);
    if (/^[\w.\/-]+$/.test(str(p.arxiv))) return 'https://arxiv.org/abs/' + str(p.arxiv);
    return '';
  }

  function entry(p, memberPages) {
    var li = el('li', 'paper');
    li.dataset.type = str(p.type);

    var url = mainUrl(p);
    var h = el('h3', 'paper-title');
    h.appendChild(url ? link(url, str(p.title)) : document.createTextNode(str(p.title)));
    li.appendChild(h);

    // Authors: you in bold, lab members linked to their pages.
    var authors = el('p', 'pub-authors');
    (Array.isArray(p.authors) ? p.authors : []).map(str).filter(Boolean).forEach(function (name, i, all) {
      if (i) authors.appendChild(document.createTextNode(i === all.length - 1 ? ' and ' : ', '));
      if (name === PI) authors.appendChild(el('b', '', name));
      else if (memberPages[name]) authors.appendChild(link(memberPages[name], name, 'paper-member'));
      else authors.appendChild(document.createTextNode(name));
    });
    li.appendChild(authors);

    var venue = el('p', 'pub-venue');
    if (str(p.venue)) venue.appendChild(el('span', '', str(p.venue)));
    if (TYPE_LABELS[str(p.type)]) venue.appendChild(el('span', 'paper-type', TYPE_LABELS[str(p.type)]));
    li.appendChild(venue);
    if (str(p.note)) li.appendChild(el('p', 'paper-note', str(p.note)));

    var chips = el('p', 'pub-links');
    if (/^10\.\S+$/.test(str(p.doi))) chips.appendChild(link('https://doi.org/' + str(p.doi), 'DOI'));
    if (/^[\w.\/-]+$/.test(str(p.arxiv))) chips.appendChild(link('https://arxiv.org/abs/' + str(p.arxiv), 'arXiv'));
    [['eprint', 'ePrint'], ['pdf', 'PDF'], ['code', 'Code'], ['slides', 'Slides']].forEach(function (k) {
      if (isWebUrl(str(p[k[0]]))) chips.appendChild(link(str(p[k[0]]), k[1]));
    });
    if (chips.childNodes.length) li.appendChild(chips);

    if (str(p.abstract)) {
      var d = el('details', 'paper-abstract');
      d.appendChild(el('summary', '', 'Abstract'));
      d.appendChild(el('p', '', str(p.abstract)));
      li.appendChild(d);
    }
    return li;
  }

  function render(papers, members) {
    // Lab members' pages, by name (hidden members aren't linked).
    var memberPages = {};
    members.forEach(function (r) {
      var m = r.data;
      if (m && str(m.name) && m.show_on_website !== false) {
        memberPages[str(m.name)] = 'member.html?id=' + encodeURIComponent(r.file.replace(/\.json$/i, ''));
      }
    });

    var ps = papers.map(function (r) { return r.data; })
      .filter(function (p) { return p && str(p.title) && p.year; })
      .sort(function (a, b) { return b.year - a.year || str(a.title).localeCompare(str(b.title)); });
    if (!ps.length) { message.textContent = 'No publications are listed yet.'; return; }

    var years = {};
    ps.forEach(function (p) { (years[p.year] = years[p.year] || []).push(p); });
    Object.keys(years).sort(function (a, b) { return b - a; }).forEach(function (y) {
      var sec = el('section', 'paper-year');
      sec.appendChild(el('h2', '', y));
      var ol = el('ol', 'paper-list');
      years[y].forEach(function (p) { ol.appendChild(entry(p, memberPages)); });
      sec.appendChild(ol);
      list.appendChild(sec);
    });

    message.textContent = ps.length + (ps.length === 1 ? ' paper' : ' papers');
    message.classList.add('papers-count');
    buildFilters(ps);
  }

  // Type filter buttons (only for types that occur).
  function buildFilters(ps) {
    if (!filters) return;
    var present = Object.keys(TYPE_LABELS).filter(function (t) {
      return ps.some(function (p) { return str(p.type) === t; });
    });
    if (present.length < 2) return;
    function button(type, label) {
      var b = el('button', 'paper-filter', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', type === '' ? 'true' : 'false');
      b.addEventListener('click', function () {
        filters.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        list.querySelectorAll('.paper').forEach(function (li) { li.hidden = type !== '' && li.dataset.type !== type; });
        list.querySelectorAll('.paper-year').forEach(function (s) { s.hidden = !s.querySelector('.paper:not([hidden])'); });
      });
      return b;
    }
    filters.appendChild(button('', 'All'));
    present.forEach(function (t) { filters.appendChild(button(t, TYPE_LABELS[t])); });
    filters.hidden = false;
  }

  function showError() {
    message.textContent = location.protocol === 'file:'
      ? 'The publication list can’t load when this page is opened straight from disk. ' +
        'To preview it, run "python3 -m http.server" in the site folder and open http://localhost:8000/publications.html.'
      : 'The publication list couldn’t be loaded right now. Please try again later.';
    message.classList.add('members-error');
  }

  Promise.all([
    loadAll('papers'),
    loadAll('members').catch(function () { return []; })   // author links are a bonus; never block the list
  ])
    .then(function (r) { render(r[0], r[1]); })
    .catch(function (err) { console.warn(err); showError(); });
})();
