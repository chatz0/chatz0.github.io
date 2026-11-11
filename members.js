/* DAIS Lab members, built from the JSON files in members/ (listed in members/index.json).
   - group.html:  one card per member, sorted into sections; names link to their page.
   - member.html: one member's full profile, chosen by ?id=firstname-lastname.
   See members/README.md for the file format. */
(function () {
  'use strict';

  var message = document.getElementById('members-message');
  if (!message) return;

  // Which section of the lab page each role goes in (alumni always go to "alumni").
  var SECTION_OF_ROLE = {
    'Postdoctoral researcher': 'postdocs',
    'PhD student': 'phd',
    'Research assistant': 'ra',
    'MSc student': 'ra',
    'Intern': 'ra',
    'Visiting researcher': 'visitors'
  };

  var LINK_LABELS = [
    ['website', 'Website'], ['google_scholar', 'Google Scholar'], ['dblp', 'DBLP'],
    ['orcid', 'ORCID'], ['github', 'GitHub'], ['linkedin', 'LinkedIn']
  ];

  var PI = 'Dimitris Chatzopoulos';

  /* --- Loading --- */
  function getJSON(url) {
    // no-cache: revalidate, so an updated file shows up without waiting for GitHub Pages' 10-minute cache
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    });
  }
  function getIndex() {
    return getJSON('members/index.json').then(function (files) {
      if (!Array.isArray(files)) throw new Error('members/index.json must be a list of file names');
      return files;
    });
  }
  function slugOf(file) { return String(file).replace(/\.json$/i, ''); }
  function profileUrl(file) { return 'member.html?id=' + encodeURIComponent(slugOf(file)); }

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
  function link(href, text, className) {
    var a = el('a', className || '', text);
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
  // Photo from assets/people/, or initials. A plain file name only: no paths.
  function avatar(m, size) {
    var name = str(m.name), photo = str(m.photo);
    if (!/^[\w.-]+\.(jpe?g|png|webp|avif)$/i.test(photo)) return initialsEl(name);
    var img = el('img', 'member-photo');
    img.src = 'assets/people/' + encodeURIComponent(photo);
    img.alt = '';
    img.width = size; img.height = size;
    img.loading = 'lazy';
    img.addEventListener('error', function () { img.replaceWith(initialsEl(name)); });
    return img;
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

  function linksEl(m, className) {
    var p = el('p', className);
    if (isEmail(str(m.email))) p.appendChild(link('mailto:' + str(m.email), 'Email'));
    var L = m.links || {};
    LINK_LABELS.forEach(function (pair) {
      var u = str(L[pair[0]]);
      if (isWebUrl(u)) p.appendChild(link(u, pair[1]));
    });
    return p.childNodes.length ? p : null;
  }

  function visible(m) { return m && str(m.name) && m.show_on_website !== false; }

  function showError(target) {
    target.textContent = location.protocol === 'file:'
      ? 'Member details can’t load when this page is opened straight from disk. ' +
        'To preview it, run "python3 -m http.server" in the site folder and open http://localhost:8000/group.html.'
      : 'Member details couldn’t be loaded right now. Please try again later.';
    target.classList.add('members-error');
  }

  /* ================= Lab page: cards ================= */
  function card(m, file) {
    var name = str(m.name);
    var li = el('li', 'member member-linked');
    li.id = slugOf(file).replace(/[^\w-]/g, '');   // group.html#firstname-lastname
    li.appendChild(avatar(m, 96));

    var info = el('div', 'member-info');
    var h3 = el('h3');
    h3.appendChild(link(profileUrl(file), name, 'member-name'));
    info.appendChild(h3);
    info.appendChild(el('p', 'member-role', roleLine(m)));
    if (str(m.research_topic)) info.appendChild(el('p', 'member-topic', str(m.research_topic)));
    if (m.status === 'alumni' && str(m.now_at)) info.appendChild(el('p', 'member-now', 'Now: ' + str(m.now_at)));
    var links = linksEl(m, 'member-links');
    if (links) info.appendChild(links);
    li.appendChild(info);

    // The whole card opens the profile, except clicks on its own links.
    li.addEventListener('click', function (e) {
      if (e.target.closest('a') || window.getSelection().toString()) return;
      window.location.href = profileUrl(file);
    });
    return li;
  }

  function renderGroup(results) {
    var statusSection = message.closest('section');
    var shown = 0, failed = 0, groups = {};
    results.forEach(function (r) {
      if (r.error) { failed++; console.warn('Could not read member file', r.file, r.error); return; }
      var m = r.data;
      if (!visible(m)) return;
      var key = m.status === 'alumni' ? 'alumni' : SECTION_OF_ROLE[str(m.role)];
      if (!key) { console.warn('Unknown role in', r.file, '-', m.role); return; }
      (groups[key] = groups[key] || []).push(r);
    });

    Object.keys(groups).forEach(function (key) {
      var list = document.querySelector('.member-grid[data-group="' + key + '"]');
      if (!list) return;
      // longest-standing first, then by name
      groups[key].sort(function (a, b) {
        var ya = a.data.start_year || 9999, yb = b.data.start_year || 9999;
        return ya - yb || str(a.data.name).localeCompare(str(b.data.name));
      }).forEach(function (r) { list.appendChild(card(r.data, r.file)); shown++; });
    });

    if (shown) statusSection.hidden = true;

    // group.html#phd or group.html#firstname-lastname: the cards exist only now, so jump here.
    var target = /^#[\w-]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
    }
    else if (failed) showError(message);
    else message.textContent = 'No members are listed yet.';
  }

  /* ================= Member page: profile ================= */
  function section(title) {
    var s = el('section', 'profile-block');
    s.appendChild(el('h2', '', title));
    return s;
  }

  function renderProfile(m, container) {
    var name = str(m.name);
    document.title = name + ' · DAIS Lab';
    container.textContent = '';

    // Head: photo, name, role, topic, links
    var head = el('header', 'profile-head');
    head.appendChild(avatar(m, 160));
    var info = el('div', 'profile-info');
    info.appendChild(el('h1', '', name));
    if (str(m.preferred_name) && str(m.preferred_name) !== name) {
      info.appendChild(el('p', 'profile-preferred', 'Goes by ' + str(m.preferred_name)));
    }
    info.appendChild(el('p', 'member-role profile-role', roleLine(m) + (m.status === 'alumni' ? ' · DAIS Lab alumni' : ' · DAIS Lab')));
    if (str(m.research_topic)) info.appendChild(el('p', 'profile-topic', str(m.research_topic)));
    if (m.status === 'alumni' && str(m.now_at)) info.appendChild(el('p', 'member-now', 'Now: ' + str(m.now_at)));
    var links = linksEl(m, 'profile-links');
    if (links) info.appendChild(links);
    head.appendChild(info);
    container.appendChild(head);

    var body = el('div', 'profile-body');

    if (str(m.bio)) {
      var about = section('About');
      about.appendChild(el('p', 'profile-bio', str(m.bio)));
      body.appendChild(about);
    }

    var pubs = (Array.isArray(m.selected_publications) ? m.selected_publications : []).filter(function (p) {
      return p && str(p.title);
    });
    if (pubs.length) {
      var ps = section('Selected publications');
      var pl = el('ol', 'profile-pubs');
      pubs.forEach(function (p) {
        var li = el('li');
        var url = str(p.url);
        li.appendChild(isWebUrl(url) ? link(url, str(p.title), 'pub-title-link') : el('span', 'pub-title-link', str(p.title)));
        var meta = [str(p.venue), p.year ? String(p.year) : ''].filter(Boolean).join(', ');
        if (meta) li.appendChild(el('span', 'profile-pub-meta', meta));
        pl.appendChild(li);
      });
      ps.appendChild(pl);
      body.appendChild(ps);
    }

    var edu = (Array.isArray(m.education) ? m.education : []).filter(function (e) {
      return e && (str(e.degree) || str(e.institution));
    });
    if (edu.length) {
      var es = section('Education');
      var ul = el('ul', 'profile-list');
      edu.forEach(function (e) {
        var li = el('li');
        li.appendChild(el('span', 'profile-list-main', [str(e.degree), str(e.field)].filter(Boolean).join(' in ')));
        var sub = [str(e.institution), e.year ? String(e.year) : ''].filter(Boolean).join(', ');
        if (sub) li.appendChild(el('span', 'profile-list-sub', sub));
        ul.appendChild(li);
      });
      es.appendChild(ul);
      body.appendChild(es);
    }

    // Research details: thesis, supervisors, funding
    var facts = [];
    if (str(m.thesis_title)) facts.push(['Thesis', str(m.thesis_title), true]);
    var sups = (Array.isArray(m.supervisors) ? m.supervisors : []).map(str).filter(Boolean);
    if (sups.length) facts.push([sups.length > 1 ? 'Supervisors' : 'Supervisor', sups]);
    if (str(m.funding)) facts.push(['Funding', str(m.funding)]);
    if (facts.length) {
      var ds = section('Research details');
      var dl = el('dl', 'profile-facts');
      facts.forEach(function (f) {
        dl.appendChild(el('dt', '', f[0]));
        var dd = el('dd');
        if (Array.isArray(f[1])) {
          f[1].forEach(function (s, i) {
            if (i) dd.appendChild(document.createTextNode(', '));
            dd.appendChild(s === PI ? link('index.html', s) : document.createTextNode(s));
          });
        } else if (f[2]) {
          dd.appendChild(el('i', '', f[1]));
        } else {
          dd.textContent = f[1];
        }
        dl.appendChild(dd);
      });
      ds.appendChild(dl);
      body.appendChild(ds);
    }

    if (body.childNodes.length) container.appendChild(body);
    else container.appendChild(el('p', 'members-message', 'More details coming soon.'));
  }

  function notFound(container) {
    container.textContent = '';
    container.appendChild(el('h1', 'profile-missing-title', 'Member not found'));
    var p = el('p', 'members-message', 'There’s no lab member at this address. ');
    p.appendChild(link('group.html', 'See everyone in the DAIS Lab.'));
    container.appendChild(p);
    document.title = 'Member not found · DAIS Lab';
  }

  function loadProfile(container) {
    var id = new URLSearchParams(location.search).get('id') || '';
    // Only plain lowercase names that appear in index.json: nothing else gets fetched.
    if (!/^[a-z0-9-]+$/.test(id)) { notFound(container); return; }
    getIndex()
      .then(function (files) {
        var file = files.filter(function (f) { return slugOf(f) === id; })[0];
        if (!file) return null;
        return getJSON('members/' + encodeURIComponent(file));
      })
      .then(function (m) {
        if (!visible(m)) notFound(container);
        else renderProfile(m, container);
      })
      .catch(function (err) { console.warn(err); showError(message); });
  }

  /* --- Which page are we on? --- */
  var profile = document.getElementById('member-profile');
  if (profile) {
    loadProfile(profile);
  } else {
    getIndex()
      .then(function (files) {
        return Promise.all(files.map(function (f) {
          return getJSON('members/' + encodeURIComponent(f)).then(
            function (data) { return { file: f, data: data }; },
            function (err) { return { file: f, error: err }; }
          );
        }));
      })
      .then(renderGroup)
      .catch(function (err) { console.warn(err); showError(message); });
  }
})();
