"""Print the papers for a range of days, with abstract, to write content from.
Usage: python3 research/brief.py FIRST LAST"""
import json, sys
from pathlib import Path
here = Path(__file__).parent
papers = json.loads((here / "papers.json").read_text())
sched = json.loads((here / "schedule.json").read_text())
a, b = int(sys.argv[1]), int(sys.argv[2])
for d in range(a, b + 1):
    aid = sched[str(d)]; p = papers[aid]
    au = p["authors"]; who = au[0] + (" m.fl." if len(au) > 1 else "")
    print(f"## day {d} | {aid} | {p['kind']} | {p['published']} | {who} ({len(au)} auth) | {p['journal']}")
    print(p["title"])
    print(p["abstract"][:950])
    print()
