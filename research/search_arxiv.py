"""Find arXiv IDs by title. Input lines: "<kind> <title words>". Prints candidate lines
("<id> <kind> <keyword>") for the best hit, with its full title and year as a comment,
so a person can check them before adding them to a candidates file."""
import sys, time, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from pathlib import Path

NS = {"a": "http://www.w3.org/2005/Atom"}

for line in Path(sys.argv[1]).read_text().splitlines():
    if not line.strip() or line.startswith("#"):
        continue
    kind, q = line.split(" ", 1)
    words = sorted({w.strip("'?,.()") for w in q.replace(":", " ").replace("-", " ").replace("'s", "").split() if len(w) > 3 and w.isascii()}, key=len, reverse=True)[:4]
    query = " AND ".join(f"ti:{w}" for w in words)
    url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode({"search_query": query, "max_results": 3, "sortBy": "relevance"})
    for attempt in range(4):
        try:
            root = ET.fromstring(urllib.request.urlopen(url, timeout=60).read())
            break
        except Exception:
            time.sleep(6)
    else:
        print(f"# FAILED {q}")
        continue
    entries = root.findall("a:entry", NS)
    if not entries:
        print(f"# NOTFOUND {kind} {q}")
    for e in entries[:1]:
        aid = e.findtext("a:id", "", NS).rsplit("/abs/", 1)[-1].rsplit("v", 1)[0]
        title = " ".join(e.findtext("a:title", "", NS).split())
        print(f"{aid} {kind} {words[0].lower()}    # {title[:110]} ({e.findtext('a:published', '', NS)[:4]}) <= {q}")
    sys.stdout.flush()
    time.sleep(3.2)
