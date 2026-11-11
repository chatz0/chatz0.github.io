# Publications

One JSON file per paper: `year-firstauthor-firstword.json`, e.g. `2024-tirana-workflow.json`.
The full publication list (`publications.html`) is built from these files.

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
| `authors` | In order, full names. **Required.** Names that match a lab member in `members/` link to their page. |
| `year` | A number, e.g. `2024`. **Required.** |
| `type` | `conference`, `journal`, `workshop`, `preprint`, `book chapter`, `thesis` or `other`. **Required.** The list page can filter by it. |
| `venue` | e.g. `IEEE INFOCOM 2024`, `IEEE Transactions on Mobile Computing 19(3)`. |
| `doi` | Just the DOI, e.g. `10.4230/LIPIcs.AFT.2024.4`. The title links to it. |
| `url` | Publisher page, used for the title link when there's no DOI. |
| `arxiv` | arXiv id, e.g. `2402.10092`. |
| `eprint`, `pdf`, `code`, `slides` | Full links, shown as buttons. |
| `abstract` | Shown behind an "Abstract" toggle. |
| `note` | A short line under the paper, e.g. an award. |
| `themes` | Any of `learning`, `ledgers`, `incentives`, `mobile` (the homepage's research themes). |
| `selected` | `true` for the papers in the homepage's *Selected publications*. |

## Note

The homepage's *Selected publications* list and its graph are still written in `index.html`, so the
homepage keeps working when opened straight from disk. When you add a paper to that list, set
`"selected": true` in its file too.

To preview the full list locally: `python3 -m http.server`, then open http://localhost:8000/publications.html.
