# Publications

One JSON file per paper: `year-firstauthor-firstword.json`, e.g. `2024-tirana-workflow.json`.
The publication list (`publications.html`, including its Selected filter) and the paper nodes in
the homepage graph are built from these files.

| File | Purpose |
| --- | --- |
| `_template.json` | Blank paper. Copy it to add one by hand. |
| `_schema.json` | Describes the format. Editors such as VS Code use it to check a file as you type. |
| `index.json` | The list of files the website loads. **A file not listed here won't appear on the site.** |
| `check.py` | Checks every file against the format, that `index.json` matches the files present, and that no paper appears twice. |
| `import_bibtex.py` | Turns a BibTeX file into paper files (and adds them to `index.json`). |
| `*.json` | One per paper. |

## Adding papers

**Many at once, from DBLP or Google Scholar:**

1. Export your papers as BibTeX: on DBLP, the download icon next to your name, then *BibTeX*;
   on Google Scholar, tick the papers, *Export*, then *BibTeX*.
2. From the repository root: `python3 papers/import_bibtex.py my-papers.bib --dry-run` to preview,
   then without `--dry-run` to write the files. Papers that already have a file are skipped; nothing is overwritten.
3. Fill in by hand what BibTeX doesn't carry: `themes`, `pdf`, `code`, `abstract`, and `selected`.

**One by hand:** copy `_template.json`, fill it in, and add its file name to `index.json`.

Then run `python3 papers/check.py`, fix anything it reports, commit and push.

## Fields

| Field | Notes |
| --- | --- |
| `title` | Exactly as published, including its original spelling. **Required.** |
| `short_title` | Optional short label for the homepage graph, e.g. `Mneme`. Defaults to the title before any colon. |
| `authors` | In order, full names. **Required.** Names that match a lab member in `members/` link to their page. |
| `year` | A number, e.g. `2024`. **Required.** |
| `type` | `conference`, `journal`, `workshop`, `preprint`, `book chapter`, `thesis` or `other`. **Required.** The list page can filter by it. |
| `venue` | e.g. `IEEE INFOCOM 2024`, `IEEE Transactions on Mobile Computing 19(3)`. |
| `doi` | Just the DOI, e.g. `10.4230/LIPIcs.AFT.2024.4`. The title links to it. |
| `url` | Publisher page, used for the title link when there's no DOI. |
| `arxiv` | arXiv id, e.g. `2402.10092`. |
| `arxiv_label` | Optional label for the arXiv button, e.g. `Extended version`. |
| `eprint`, `pdf`, `code`, `slides` | Full links, shown as buttons. |
| `abstract` | Shown behind an "Abstract" toggle. |
| `note` | A short line under the paper, e.g. an award. |
| `themes` | Any of `learning`, `ledgers`, `incentives`, `mobile`: in the homepage graph, the paper hangs off these research themes. |
| `selected` | `true` to show the paper under the Selected filter and in the homepage graph. |

## Previewing

Browsers won't load these files for a page opened straight from disk, so preview with a local server:
`python3 -m http.server`, then open http://localhost:8000/ (homepage) or http://localhost:8000/publications.html.
