"""Look up candidate papers on the arXiv API and keep the metadata.

Usage: python3 research/fetch_arxiv.py research/candidates.txt
Each candidate line is "<arxiv id> <kind> <keyword>". The keyword must appear in the
title or abstract (case-insensitive), otherwise the ID is reported as a mismatch.
Results are merged into research/papers.json (id -> metadata incl. abstract).
"""
import json, sys, time, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from pathlib import Path

NS = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
OUT = Path(__file__).with_name("papers.json")


def fetch(ids):
    url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode(
        {"id_list": ",".join(ids), "max_results": len(ids)})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return ET.fromstring(r.read())
        except Exception as e:  # rate limiting or network hiccup
            print("retry", attempt, e, file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise SystemExit("arXiv API unreachable")


def main(path):
    cands = []
    for line in Path(path).read_text().splitlines():
        if line.strip() and not line.startswith("#"):
            aid, kind, kw = line.split(" ", 2)
            cands.append((aid, kind, kw.strip()))
    papers = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [c for c in cands if c[0] not in papers]
    for i in range(0, len(todo), 40):
        chunk = todo[i:i + 40]
        root = fetch([c[0] for c in chunk])
        got = {}
        for e in root.findall("a:entry", NS):
            eid = e.findtext("a:id", "", NS).rsplit("/abs/", 1)[-1]
            base = eid.rsplit("v", 1)[0] if "v" in eid.split("/")[-1] else eid
            title = " ".join(e.findtext("a:title", "", NS).split())
            if not title or title == "Error":
                continue
            got[base] = {
                "title": title,
                "authors": [a.findtext("a:name", "", NS) for a in e.findall("a:author", NS)],
                "published": e.findtext("a:published", "", NS)[:10],
                "category": e.find("arxiv:primary_category", NS).get("term") if e.find("arxiv:primary_category", NS) is not None else "",
                "journal": e.findtext("arxiv:journal_ref", "", NS),
                "abstract": " ".join(e.findtext("a:summary", "", NS).split()),
            }
        for aid, kind, kw in chunk:
            m = got.get(aid)
            if not m:
                print(f"MISSING  {aid} ({kw})")
                continue
            ok = kw.lower() in (m["title"] + " " + m["abstract"]).lower()
            print(f"{'ok      ' if ok else 'MISMATCH'} {aid} [{kind}] {m['title'][:90]} — {m['authors'][0]} {m['published'][:4]}")
            if ok:
                papers[aid] = {"kind": kind, **m}
        OUT.write_text(json.dumps(papers, ensure_ascii=False, indent=1))
        time.sleep(3.5)
    print(len(papers), "papers verified in total")


main(sys.argv[1])
