"""Turn a BibTeX file (e.g. exported from DBLP or Google Scholar) into paper files.

Usage, from the repository root:
    python3 papers/import_bibtex.py my-papers.bib            # add new papers
    python3 papers/import_bibtex.py my-papers.bib --dry-run  # only show what would happen

Papers whose title already has a file are skipped, and no existing file is overwritten.
New files are added to papers/index.json. Check the result with python3 papers/check.py
and fill in what BibTeX doesn't have (themes, code, pdf...) by hand.
"""
import json, os, re, sys, unicodedata

here = os.path.dirname(os.path.abspath(__file__))

ACCENTS = {"'": "\u0301", "`": "\u0300", "^": "\u0302", '"': "\u0308", "~": "\u0303",
           "=": "\u0304", ".": "\u0307", "u": "\u0306", "v": "\u030c", "H": "\u030b", "c": "\u0327", "k": "\u0328"}
SPECIAL = {"ss": "ß", "o": "ø", "O": "Ø", "ae": "æ", "AE": "Æ", "aa": "å", "AA": "Å", "l": "ł", "L": "Ł", "i": "ı", "&": "&", "%": "%", "_": "_"}

def delatex(s):
    """LaTeX accents and braces to plain Unicode text."""
    s = re.sub(r"\\([`'^\"~=.])\s*\{?\\?([A-Za-z])\}?", lambda m: unicodedata.normalize("NFC", m.group(2) + ACCENTS[m.group(1)]), s)
    s = re.sub(r"\\([uvHck])\s*\{\\?([A-Za-z])\}", lambda m: unicodedata.normalize("NFC", m.group(2) + ACCENTS[m.group(1)]), s)
    s = re.sub(r"\\(ss|ae|AE|aa|AA|[oOlLi])\b\s*", lambda m: SPECIAL[m.group(1)], s)
    s = re.sub(r"\\([&%_])", lambda m: m.group(1), s)
    s = s.replace("--", "\u2013").replace("~", " ")
    s = re.sub(r"\\[a-zA-Z]+\s*", "", s)          # drop any other command, e.g. \textit
    s = s.replace("{", "").replace("}", "")
    return re.sub(r"\s+", " ", s).strip()

def parse_bibtex(text):
    """Return a list of (entry_type, {field: raw_value}) from BibTeX text."""
    entries, i, n = [], 0, len(text)
    while True:
        at = text.find("@", i)
        if at < 0: break
        m = re.match(r"@\s*(\w+)\s*[{(]", text[at:])
        if not m: i = at + 1; continue
        etype = m.group(1).lower(); i = at + m.end()
        if etype in ("comment", "preamble", "string"):
            depth = 1
            while i < n and depth:
                depth += {"{": 1, "}": -1}.get(text[i], 0); i += 1
            continue
        comma = text.find(",", i)
        if comma < 0: break
        i = comma + 1
        fields = {}
        while i < n:
            m = re.match(r"\s*([\w:-]+)\s*=\s*", text[i:])
            if not m:
                close = re.match(r"\s*[})]", text[i:])
                i += close.end() if close else 1
                break
            key = m.group(1).lower(); i += m.end()
            if text[i] == "{":
                depth, j = 0, i
                while j < n:
                    depth += {"{": 1, "}": -1}.get(text[j], 0); j += 1
                    if depth == 0: break
                value = text[i + 1:j - 1]; i = j
            elif text[i] == '"':
                j = i + 1
                while j < n and not (text[j] == '"' and text[j - 1] != "\\"): j += 1
                value = text[i + 1:j]; i = j + 1
            else:
                m2 = re.match(r"[^,}\s]+", text[i:]); value = m2.group(0) if m2 else ""; i += len(value)
            fields[key] = value
            m3 = re.match(r"\s*,", text[i:])
            if m3: i += m3.end()
        entries.append((etype, fields))
    return entries

def person(name):
    name = delatex(name)
    if "," in name:
        last, first = [p.strip() for p in name.split(",", 1)]
        name = f"{first} {last}"
    return re.sub(r"\s+\d{4}$", "", name).strip()          # DBLP homonym suffixes, e.g. "Wei Li 0001"

def to_paper(etype, f):
    get = lambda k: delatex(f.get(k, ""))
    title, year = get("title"), get("year")
    if not title or not year.isdigit(): return None
    journal, booktitle = get("journal"), get("booktitle")
    arxiv = ""
    if f.get("eprinttype", "").lower() == "arxiv" or f.get("archiveprefix", "").lower() == "arxiv":
        arxiv = get("eprint")
    m = re.search(r"abs/(\d{4}\.\d{4,5})", f.get("volume", "") + " " + f.get("url", ""))
    if not arxiv and m: arxiv = m.group(1)
    if etype in ("inproceedings", "conference"):
        ptype = "workshop" if re.search(r"workshop", booktitle, re.I) else "conference"
        venue = booktitle
    elif etype == "article":
        if re.match(r"(corr|arxiv)", journal, re.I) or (arxiv and not f.get("doi")):
            ptype, venue = "preprint", "arXiv preprint"
        else:
            ptype, venue = "journal", journal
            vol, num = get("volume"), get("number")
            if vol: venue += f" {vol}" + (f"({num})" if num else "")
    elif etype in ("phdthesis", "mastersthesis"):
        ptype, venue = "thesis", get("school")
    elif etype in ("incollection", "inbook"):
        ptype, venue = "book chapter", booktitle or get("publisher")
    else:
        ptype, venue = ("preprint", "arXiv preprint") if arxiv else ("other", booktitle or journal or get("howpublished"))
    paper = {"$schema": "./_schema.json", "title": title,
             "authors": [person(a) for a in re.split(r"\s+and\s+", f.get("author", "")) if a.strip()],
             "year": int(year), "type": ptype, "venue": venue}
    doi = get("doi")
    if doi: paper["doi"] = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi)
    if arxiv: paper["arxiv"] = arxiv
    url = get("url")
    if url and not doi and not arxiv: paper["url"] = url
    paper["selected"] = False
    return paper

def slug(paper):
    def ascii_word(s):
        s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
        return re.sub(r"[^a-z0-9]", "", s)
    last = ascii_word(paper["authors"][0].split()[-1]) if paper["authors"] else "anon"
    words = [ascii_word(w) for w in paper["title"].split()]
    first = next((w for w in words if w and w not in ("a", "an", "the", "on", "of", "towards", "toward")), "paper")
    return f"{paper['year']}-{last}-{first}"

def norm(t): return re.sub(r"[^a-z0-9]", "", t.lower())

def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    dry = "--dry-run" in sys.argv
    text = open(sys.argv[1], encoding="utf-8").read()
    index_path = os.path.join(here, "index.json")
    index = json.load(open(index_path))
    known = {norm(json.load(open(os.path.join(here, f), encoding="utf-8"))["title"]) for f in index}
    added = skipped = 0
    for etype, fields in parse_bibtex(text):
        paper = to_paper(etype, fields)
        if not paper:
            print(f"  skipped an entry without a title or year ({etype})"); continue
        if norm(paper["title"]) in known:
            skipped += 1; continue
        base = slug(paper); name = base + ".json"; k = 2
        while os.path.exists(os.path.join(here, name)) or name in index:
            name = f"{base}-{k}.json"; k += 1
        print(f"  {'would add' if dry else 'added'} {name}: {paper['title']} ({paper['year']}, {paper['type']})")
        if not dry:
            with open(os.path.join(here, name), "w", encoding="utf-8") as fh:
                json.dump(paper, fh, indent=2, ensure_ascii=False); fh.write("\n")
            index.append(name)
        known.add(norm(paper["title"])); added += 1
    if not dry and added:
        index.sort(reverse=True)
        with open(index_path, "w") as fh: json.dump(index, fh, indent=2); fh.write("\n")
    print(f"\n{added} new paper(s){' (dry run, nothing written)' if dry else ''}, {skipped} already present.")

if __name__ == "__main__":
    main()
