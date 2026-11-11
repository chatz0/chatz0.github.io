# chatz0.github.io

Personal academic homepage of Dimitris Chatzopoulos, served at <https://chatz0.github.io/>.

Plain HTML, CSS and JavaScript: no build step, no dependencies, no server needed.
Open `index.html` in a browser to preview it locally; pages that read `papers/` or `members/` (publications, DAIS Lab, and the graph's paper nodes) need `python3 -m http.server` instead.

| File | What it holds |
| --- | --- |
| `index.html` | Homepage: the interactive graph and a short About |
| `research.html`, `teaching.html` | Research interests and modules, built from `data.js` |
| `background.html`, `service.html`, `contact.html` | Positions and education, service roles, contact details (written directly in each file) |
| `publications.html`, `papers.js` | The publication list (All / Selected / by type), built from the files in `papers/` |
| `group.html`, `member.html`, `members.js` | DAIS Lab page and each member's page, built from the files in `members/` |
| `data.js` | Research themes and courses, shared by the graph and the Research and Teaching pages |
| `main.js` | Theme toggle, top nav, the homepage graph, and rendering of `data.js` content |
| `styles.css` | Layout, light/dark colour tokens (top of the file) |
| `papers/`, `members/` | One JSON file per paper / lab member, each with a template and README |
| `vendor/force-graph.min.js` | [force-graph](https://github.com/vasturiano/force-graph) 1.50.1 (MIT), the library behind the graph; vendored so the site needs no build or CDN. One local patch: the hover-canvas throttle is 40ms instead of 800ms, so nodes stay grabbable while moving |
| `assets/me.png` | Portrait |
| `404.html` | Not-found page |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

Every page has the same top nav. To add a page, copy `service.html`, and add its link to the `<nav class="site-nav">` block in every `.html` file.

## Editing

- **Add a publication:** add a file to `papers/` (see `papers/README.md`). With `"selected": true` it also appears under the Selected filter and in the homepage graph, linked to the research themes in its `themes` field.
- **Change research themes or courses:** edit `data.js`; the graph and the Research and Teaching pages both update.
- **Add a lab member:** add their JSON file to `members/` and list it in `members/index.json` (details in `members/README.md`). The DAIS Lab page builds its cards from these files; photos go in `assets/people/`. Each member automatically gets their own page, linked from their card. To preview the lab pages locally, run `python3 -m http.server` and open http://localhost:8000/group.html (opened straight from disk, they can't load the files).
- **Add papers to the full list:** see `papers/README.md`; `papers/import_bibtex.py` turns a BibTeX export from DBLP or Scholar into paper files.
- **After changing CSS or JS:** bump the `?v=` number on the `styles.css`, `data.js`, `main.js`, `members.js`, `papers.js` and `vendor/…` links in every `.html` file, so browsers don't keep a cached old copy (GitHub Pages caches for 10 minutes).
- **Change colours:** edit the variables in `:root` (light) and the two dark blocks at the top of `styles.css`.

## Publishing

GitHub Pages serves the site from a branch: *Settings → Pages → Build and deployment → Deploy from a branch* → pick the branch and `/ (root)`.
Every push to that branch goes live within a minute or two.
