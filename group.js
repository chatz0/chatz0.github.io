/* DAIS Lab page: builds the member cards from the JSON files in members/.
   members/index.json lists the files to load; see members/README.md. */
(function () {
  'use strict';

  var message = document.getElementById('members-message');
  if (!message) return;
  var statusSection = message.closest('section');

  // Which section each role goes in (alumni always go to "alumni").
  var SECTION_OF_ROLE = {
    'Postdoctoral researcher': 'postdocs',
    'PhD student': 'phd',
    'Research assistant': 'ra',
    'MSc student': 'ra',
    'Intern': 'ra',
    'Visiting researcher': 'visitors'
  };

  var LINK_LABELS = [
    ['website', 'Website'], ['google_scholar', 'Scholar'], ['dblp', 'DBLP'],
    ['orcid', 'ORCID'], ['github', 'GitHub'], ['linkedin', 'LinkedIn']
  ];

  function getJSON(url) {
    // no-cache: revalidate, so an updated file shows up without waiting for GitHub Pages' 10-minute cache
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    });
  }

  /* --- Small DOM helpers. Text from the files only ever goes in via textContent. --- */
  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null && text !== '') e.textContent = text;
    return e;
  }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function isWebUrl(u) { return /^https?:\/\/[^\s]+$/i.test(u); }
  function isEmail(e) { return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e); }
  function link(href, text) {
    var a = el('a', '', text);
    a.href = href;
    if (/^https?:/i.test(href)) a.rel = 'noopener';
    return a;
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).map(function (w) { return w[0]; })
      .join('').slice(0, 2).toUpperCase();
  }
  function initialsEl(name) {
    var d = el('div', 'member-initials', initials(name));
    d.setAttribute('aria-hidden', 'true');
    return d;
  }

  function roleLine(m) {
    var role = str(m.role), start = m.start_year, end = m.end_year;
    if (m.status === 'alumni') {
      if (start && end) return role + ', ' + start + '–' + end;
      if (end) return role + ', until ' + end;
      return role;
    }
    return start ? role + ', ' + start + '–' : role;
  }

  /* The "More" panel: bio, education, thesis, funding, co-supervisors, papers. */
  function details(m) {
    var body = el('div', 'member-more');

    if (str(m.bio)) body.appendChild(el('p', '', str(m.bio)));

    var edu = (Array.isArray(m.education) ? m.education : []).filter(function (e) {
      return e && (str(e.degree) || str(e.institution));
    });
    if (edu.length) {
      body.appendChild(el('h4', '', 'Education'));
      var ul = el('ul');
      edu.forEach(function (e) {
        var t = [str(e.degree), str(e.field)].filter(Boolean).join(' in ');
        if (str(e.institution)) t += (t ? ', ' : '') + str(e.institution);
        if (e.year) t += ' (' + e.year + ')';
        ul.appendChild(el('li', '', t));
      });
      body.appendChild(ul);
    }

    if (str(m.thesis_title)) {
      var th = el('p', '', 'Thesis: ');
      th.appendChild(el('i', '', str(m.thesis_title)));
      body.appendChild(th);
    }

    var cosup = (Array.isArray(m.supervisors) ? m.supervisors : []).map(str)
      .filter(function (s) { return s && s !== 'Dimitris Chatzopoulos'; });
    if (cosup.length) body.appendChild(el('p', '', 'Co-supervised by ' + cosup.join(', ')));

    if (str(m.funding)) body.appendChild(el('p', '', 'Funding: ' + str(m.funding)));

    var pubs = (Array.isArray(m.selected_publications) ? m.selected_publications : []).filter(function (p) {
      return p && str(p.title);
    });
    if (pubs.length) {
      body.appendChild(el('h4', '', 'Selected publications'));
      var pl = el('ul');
      pubs.forEach(function (p) {
        var li = el('li');
        var url = str(p.url);
        li.appendChild(isWebUrl(url) ? link(url, str(p.title)) : el('span', '', str(p.title)));
        var meta = [str(p.venue), p.year ? String(p.year) : ''].filter(Boolean).join(', ');
        if (meta) li.appendChild(document.createTextNode(' · ' + meta));
        pl.appendChild(li);
      });
      body.appendChild(pl);
    }

    if (!body.childNodes.length) return null;
    var d = el('details', 'member-details');
    d.appendChild(el('summary', '', 'More'));
    d.appendChild(body);
    return d;
  }

  function card(m) {
    var name = str(m.name);
    var li = el('li', 'member');

    // Photo from assets/people/, or initials. A plain file name only: no paths.
    var photo = str(m.photo);
    if (/^[\w.-]+\.(jpe?g|png|webp|avif)$/i.test(photo)) {
      var img = el('img', 'member-photo');
      img.src = 'assets/people/' + encodeURIComponent(photo);
      img.alt = '';
      img.width = 96; img.height = 96;
      img.loading = 'lazy';
      img.addEventListener('error', function () { img.replaceWith(initialsEl(name)); });
      li.appendChild(img);
    } else {
      li.appendChild(initialsEl(name));
    }

    var info = el('div', 'member-info');
    info.appendChild(el('h3', '', name));
    info.appendChild(el('p', 'member-role', roleLine(m)));
    if (str(m.research_topic)) info.appendChild(el('p', 'member-topic', str(m.research_topic)));
    if (m.status === 'alumni' && str(m.now_at)) info.appendChild(el('p', 'member-now', 'Now: ' + str(m.now_at)));

    var links = el('p', 'member-links');
    if (isEmail(str(m.email))) links.appendChild(link('mailto:' + str(m.email), 'Email'));
    var L = m.links || {};
    LINK_LABELS.forEach(function (pair) {
      var u = str(L[pair[0]]);
      if (isWebUrl(u)) links.appendChild(link(u, pair[1]));
    });
    if (links.childNodes.length) info.appendChild(links);

    var more = details(m);
    if (more) info.appendChild(more);

    li.appendChild(info);
    return li;
  }

  function sectionFor(m) {
    if (m.status === 'alumni') return 'alumni';
    return SECTION_OF_ROLE[str(m.role)] || null;
  }

  function render(results) {
    var shown = 0, failed = 0;
    var groups = {};
    results.forEach(function (r) {
      if (r.error) { failed++; console.warn('Could not read member file', r.file, r.error); return; }
      var m = r.data;
      if (!m || !str(m.name) || m.show_on_website === false) return;
      var key = sectionFor(m);
      if (!key) { console.warn('Unknown role in', r.file, '-', m.role); return; }
      (groups[key] = groups[key] || []).push(m);
    });

    Object.keys(groups).forEach(function (key) {
      var list = document.querySelector('.member-grid[data-group="' + key + '"]');
      if (!list) return;
      // longest-standing first, then by name
      groups[key].sort(function (a, b) {
        var ya = a.start_year || 9999, yb = b.start_year || 9999;
        return ya - yb || str(a.name).localeCompare(str(b.name));
      }).forEach(function (m) { list.appendChild(card(m)); shown++; });
    });

    if (shown) statusSection.hidden = true;
    else if (failed) showError();
    else message.textContent = 'No members are listed yet.';
  }

  function showError() {
    message.textContent = location.protocol === 'file:'
      ? 'The member list can’t load when this page is opened straight from disk. ' +
        'To preview it, run "python3 -m http.server" in the site folder and open http://localhost:8000/group.html.'
      : 'The member list couldn’t be loaded right now. Please try again later.';
    message.classList.add('members-error');
  }

  getJSON('members/index.json')
    .then(function (files) {
      if (!Array.isArray(files)) throw new Error('members/index.json must be a list of file names');
      return Promise.all(files.map(function (f) {
        return getJSON('members/' + encodeURIComponent(f)).then(
          function (data) { return { file: f, data: data }; },
          function (err) { return { file: f, error: err }; }
        );
      }));
    })
    .then(render)
    .catch(function (err) { console.warn(err); showError(); });
})();
