# Photos

Photos shown beside the text on the inner pages (below the text on smaller screens).

## Adding photos

1. Copy your photos into this folder (`assets/photos/`). JPEG, PNG, WebP, HEIC and TIFF work
   (HEIC needs `pip install pillow-heif` on some systems; exporting as JPEG is simpler).
2. From the repository root run `python3 assets/photos/update.py` (needs `pip install pillow`).
3. Optionally open `photos.js` and fill in a `caption`, an `alt` description, or a `page` to pin a
   photo to one page (`research`, `background`, `teaching`, `service`, `contact`, `group`).
4. Commit and push.

To remove a photo, delete its file here and run the script again.

## What gets published

Only the web-sized copies in `web/` and `photos.js`. Your originals stay on your computer:
`.gitignore` keeps them out of the repository. The copies have the camera's hidden data
(including GPS location) removed.

Each page shows up to three photos: those pinned to it first, then unpinned ones, which are
spread across the pages so the same photo doesn't repeat everywhere.
