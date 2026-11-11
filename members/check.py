"""Check the lab member files: each one matches _schema.json, and index.json lists exactly the files present.

Run from the repository root:  python3 members/check.py
Needs:                         pip install jsonschema
"""
import glob, json, os, sys

try:
    from jsonschema import Draft7Validator
except ImportError:
    sys.exit("Please install jsonschema first: pip install jsonschema")

here = os.path.dirname(os.path.abspath(__file__))
validator = Draft7Validator(json.load(open(os.path.join(here, "_schema.json"))))
problems = 0

files = sorted(os.path.basename(f) for f in glob.glob(os.path.join(here, "*.json"))
               if not os.path.basename(f).startswith("_") and os.path.basename(f) != "index.json")

for name in files:
    try:
        data = json.load(open(os.path.join(here, name), encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"{name}: not valid JSON ({e})"); problems += 1; continue
    errors = [f"{'/'.join(map(str, e.path)) or '(top level)'}: {e.message}" for e in validator.iter_errors(data)]
    if errors:
        problems += 1
        print(f"{name}:"); [print("   ", msg) for msg in errors]
    else:
        print(f"{name}: OK")

listed = json.load(open(os.path.join(here, "index.json")))
for name in sorted(set(files) - set(listed)):
    print(f"index.json: {name} is missing, so it won't appear on the website"); problems += 1
for name in sorted(set(listed) - set(files)):
    print(f"index.json: lists {name}, but there is no such file"); problems += 1

print("\nAll good." if not problems else f"\n{problems} problem(s) found.")
sys.exit(1 if problems else 0)
