# chatz0.github.io

Personal academic homepage of Dimitris Chatzopoulos, served at <https://chatz0.github.io/>.

Plain HTML, CSS and JavaScript: no build step, no dependencies, no server needed.
Open `index.html` in a browser to preview it locally.

| File | What it holds |
| --- | --- |
| `index.html` | All page content: bio, research themes, publications, background, teaching, contact |
| `styles.css` | Layout, light/dark colour tokens (top of the file) |
| `main.js` | Theme toggle, active-section highlighting, the interactive graph in the hero |
| `vendor/force-graph.min.js` | [force-graph](https://github.com/vasturiano/force-graph) 1.50.1 (MIT), the library behind the graph; vendored so the site needs no build or CDN. One local patch: the hover-canvas throttle is 40ms instead of 800ms, so nodes stay grabbable while moving |
| `assets/me.png` | Portrait |
| `404.html` | Not-found page |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

## Editing

- **Add a publication:** copy one `<li class="pub" …>…</li>` block in `index.html` and edit it. Your name goes in `<b>…</b>`.
  The graph picks it up automatically: `data-short` is its label in the graph and `data-themes` lists the research themes it links to
  (`learning`, `ledgers`, `incentives`, `mobile`, matching the `data-theme-id` of the cards in the Research section).
- **Change colours:** edit the variables in `:root` (light) and the two dark blocks at the top of `styles.css`.

## Publishing

GitHub Pages serves the site from a branch: *Settings → Pages → Build and deployment → Deploy from a branch* → pick the branch and `/ (root)`.
Every push to that branch goes live within a minute or two.
