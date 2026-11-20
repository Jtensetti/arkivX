"""Give every verified paper a calendar day (1-365): the free day closest to the day of
year it was first submitted to arXiv. Writes research/schedule.json (day -> arxiv id)."""
import json, datetime
from pathlib import Path
here = Path(__file__).parent
papers = json.loads((here / "papers.json").read_text())
papers.pop("2210.09261", None)
(here / "papers.json").write_text(json.dumps(papers, ensure_ascii=False, indent=1))
assert len(papers) == 365, len(papers)

def doy(date):
    d = datetime.date.fromisoformat(date)
    if d.month == 2 and d.day == 29:
        d = d.replace(day=28)
    return d.replace(year=2027).timetuple().tm_yday

free = set(range(1, 366))
sched = {}
# Older papers first, so the classics are most likely to land on their exact anniversary.
for aid, p in sorted(papers.items(), key=lambda kv: kv[1]["published"]):
    want = doy(p["published"])
    day = min(free, key=lambda d: (min(abs(d - want), 365 - abs(d - want)), d))
    free.remove(day)
    sched[day] = aid
exact = sum(1 for d, a in sched.items() if doy(papers[a]["published"]) == d)
print(f"{exact} of 365 on their exact anniversary")
(here / "schedule.json").write_text(json.dumps({str(d): sched[d] for d in sorted(sched)}, indent=0))
