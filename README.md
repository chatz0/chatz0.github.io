# chatz0.github.io

Personal academic homepage of Dimitris Chatzopoulos, served at <https://chatz0.github.io/>.

Plain HTML, CSS and JavaScript: no build step, no dependencies, no server needed.
Open `index.html` in a browser to preview it locally.

| File | What it holds |
| --- | --- |
| `index.html` | All page content: bio, research themes, publications, background, teaching, contact |
| `styles.css` | Layout, light/dark colour tokens (top of the file) |
| `main.js` | Theme toggle, active-section highlighting, hero network animation |
| `assets/me.png` | Portrait |
| `404.html` | Not-found page |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

## Editing

- **Add a publication:** copy one `<li class="pub">…</li>` block in `index.html` and edit it. Your name goes in `<b>…</b>`.
- **Change colours:** edit the variables in `:root` (light) and the two dark blocks at the top of `styles.css`.

## Publishing

GitHub Pages serves the site from a branch: *Settings → Pages → Build and deployment → Deploy from a branch* → pick the branch and `/ (root)`.
Every push to that branch goes live within a minute or two.
