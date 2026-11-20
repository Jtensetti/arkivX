# arkivX

En kort video om dagen om riktig forskning. 365 shorts (1080×1920, 34 s, på svenska) om
verkliga artiklar från [arXiv](https://arxiv.org) – AI, fysik, rymden, matematik och samhälle –
plus ett scrollflöde där varje video täcker skärmen och öppnar på dagens datum.

Formatet och videomallen kommer från [smart-content-](https://github.com/Jtensetti/smart-content-).
Skillnaden är innehållet: varje short bygger på en arXiv-artikel som har slagits upp och
kontrollerats mot arXiv:s API, och varje video slutar med artikelns arXiv-nummer.

## Kalendern

Varje artikel har fått den lediga dag som ligger närmast datumet då den först skickades in
till arXiv (`research/schedule.py`). 170 av 365 hamnar exakt på sin årsdag, resten inom några
dagar. Blandningen:

| Fält | Antal | Exempel |
| --- | --- | --- |
| AI & data | 145 | Transformern, AlphaZero, DeepSeek-R1, ett dussin trendande artiklar från alphaXiv (nov 2026) |
| Rymden | 61 | Första gravitationsvågen, bilden av ett svart hål, Planet nio, 3I/ATLAS |
| Fysik | 60 | Higgsbosonen, Belltester, grafen, LK-99, Googles felkorrigering |
| Matematik | 51 | Perelman, sudoku med 17 ledtrådar, hatten, Busy Beaver 5 |
| Liv & samhälle | 48 | Hedonometern, dejtingappar, smitta i nätverk, AI på jobbet |

Dag 1 = 1 januari i ett vanligt år, dag 365 = 31 december. Flödet hoppar till dagens video.

## Så hålls fakta rätt

1. `research/fetch_arxiv.py` slår upp varje kandidat på arXiv:s API och sparar titel, författare,
   datum och sammanfattning i `research/papers.json`. ID:n som inte matchar avsedd artikel kastas.
2. `research/search_arxiv.py` hittar ID:n från titlar i stället för att gissa dem.
3. Texten skrivs utifrån sammanfattningen (`research/brief.py FÖRSTA SISTA` visar dem dag för dag).
   Siffror tas från sammanfattningen eller väl dokumenterade resultat; schematiska diagram är
   märkta "Schematisk".
4. Omstridda eller felaktiga resultat sägs ut: LK-99, BICEP2, OPERA:s neutriner, fosfin på Venus,
   den tillbakadragna Majorana-artikeln och andra har egna "så gick det"-texter.
5. Ett kontrollskript jämför varje shorts författare och år mot arXiv-datan.

## De tre stegen

| Steg | Var | Vad |
| --- | --- | --- |
| 1. Innehåll | `content/d*.json` | 365 shorts: hook, tre punkter, lärdom, källa, "läs mer" och en animerad visualisering (`viz`) |
| 2. Videor | `video/index.html` | HyperFrames-mallen (HTML + GSAP) som drivs av variabler – en rad per short |
| 3. Flöde | `site/` | Statisk sida: helskärmsvideo, snap-scroll, filter per fält, länk till arXiv och alphaXiv |

```
research/papers.json ─▶ content/d*.json ──build-content──▶ video/batch.json ──hyperframes──▶ renders/*.mp4
                                                         └▶ site/data/shorts.json                │
                                                                                encode-web.sh ◀──┘
                                                                     site/videos/*.mp4 + site/posters/*.jpg
```

## Kom igång

Kräver Node 22+, FFmpeg och Chrome (HyperFrames hämtar en egen om ingen finns).

```bash
npm install
npm run content   # validerar allt innehåll, skriver batch + flödesdata
npm run render    # renderar det som saknas i renders/ (4 åt gången), gör webbkopior, upprepar
npm run serve     # öppna flödet lokalt
npm run preview   # redigera mallen i HyperFrames Studio
```

`npm run render` använder Chromes headless shell om den finns (sätt `PRODUCER_HEADLESS_SHELL_PATH`),
vilket är ungefär dubbelt så snabbt. `CONCURRENCY=2 npm run render` för svagare datorer.
`renders/` (originalen i full kvalitet, ~8 MB/st) är gitignorerad – det är dem du laddar upp
till YouTube. `site/videos/` är webbkopior i 720p (~1 MB/st).

## En short

```json
{
  "id": "grokking",
  "day": 5,
  "kind": "ai",                  // ai | fysik | rymd | matte | liv
  "arxiv": "2201.02177",
  "paper": "Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets",
  "hook": "Ett nätverk som pluggat utantill kan plötsligt förstå – långt senare.",
  "title": "Grokking",
  "meta": "Alethea Power m.fl. · OpenAI, 2022",
  "stat": "",                    // valfri siffra som räknas upp, t.ex. "65 %"
  "statLabel": "",
  "points": ["…", "…", "…"],
  "takeaway": "Att sluta träna för tidigt kan dölja förståelsen.",
  "source": "arXiv:2201.02177 · Power m.fl. (2022)",
  "more": "Längre text under Läs mer i flödet",
  "viz": { "type": "line", "title": "…", "x": ["…"], "series": [{ "l": "…", "pts": [] }] }
}
```

Visualiseringstyperna (`bars`, `line`, `dots`, `versus`, `quote`, `flow`, `split`, `gauge`,
`timeline`, `spectrum`) är desamma som i smart-content. Valideringen stoppar för långa texter,
dubbletter av dag eller artikel, ogiltiga arXiv-ID:n och etiketter som skulle klippas.

### Skrivregler

- Hook ≤ 100 tecken, titel ≤ 34, punkter ≤ 105, lärdom ≤ 62.
- Allt ska gå att belägga i artikeln eller i väl dokumenterade efterföljande resultat.
- Säg till när något är omstritt, tillbakadraget eller senare motbevisat.
- Nya artiklar (2026) beskrivs bara utifrån sin egen sammanfattning.

## Publicera flödet

`.github/workflows/pages.yml` publicerar `site/` till GitHub Pages vid push till `main`.
Slå på det under **Settings → Pages → Source: GitHub Actions**.
Varje video har en egen länk: `…/#grokking`.
