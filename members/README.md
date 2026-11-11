# DAIS Lab members

One JSON file per lab member: `firstname-lastname.json` (lowercase, hyphens, no accents).

| File | Purpose |
| --- | --- |
| `_template.json` | Blank form. Copy it for every new member. |
| `_schema.json` | Describes the format. Editors such as VS Code use it to check a file as it is filled in. |
| `*.json` | One per person, current members and alumni. |

## Adding a new member

1. Copy `_template.json` to `firstname-lastname.json`.
2. Fill in `name`, `role` and `status` (the only required fields); anything else you know already.
3. Send them the file to complete, and ask for a photo (square, at least 300×300 px).
4. When it comes back, put the file here and the photo in `assets/people/` with the same name,
   e.g. `assets/people/joana-tirana.jpg`, and set `"photo": "joana-tirana.jpg"`.

When someone leaves, set `"status": "alumni"`, fill in `end_year` and, if they're happy to share it, `now_at`. Keep the file.

## Fields

| Field | Notes |
| --- | --- |
| `name` | Full name as shown on the website. **Required.** |
| `preferred_name` | Optional short name. |
| `role` | One of: `PhD student`, `Postdoctoral researcher`, `Research assistant`, `MSc student`, `Visiting researcher`, `Intern`. **Required.** |
| `status` | `current` or `alumni`. **Required.** |
| `start_year`, `end_year` | Years as numbers, e.g. `2024`. `end_year` stays `null` while current. |
| `research_topic` | One short line for their card (80 characters max). |
| `bio` | Two or three sentences, third person (600 characters max). |
| `email` | Leave empty to keep it off the website. |
| `photo` | File name in `assets/people/`. Empty shows initials. |
| `links` | `website`, `google_scholar`, `dblp`, `orcid`, `github`, `linkedin`: full URLs, or empty. |
| `education` | Degrees, most recent first: `degree`, `field`, `institution`, `year`. Add more `{ … }` entries as needed. |
| `supervisors` | Supervisor and any co-supervisors. |
| `funding` | Scholarship or grant, if any. |
| `thesis_title` | Once known. |
| `selected_publications` | Up to three: `title` (exactly as published), `venue`, `year`, `url`. |
| `now_at` | Alumni only: where they went next. |
| `show_on_website` | `false` keeps the file without listing the person publicly. |

`$schema` and `_how_to_fill` are for editors and for the person filling in the file; the website ignores them.

## Style

British English for everything we write (bios, topics), but paper and thesis titles exactly as published.

## Checking files

With Python and `jsonschema` installed (`pip install jsonschema`), from the repository root:

```sh
python3 -c "import json,glob,jsonschema; s=json.load(open('members/_schema.json')); [print(f, 'OK' if not list(jsonschema.Draft7Validator(s).iter_errors(json.load(open(f)))) else 'check this file') for f in sorted(glob.glob('members/[!_]*.json'))]"
```
