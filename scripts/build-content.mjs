// Merges content/*.json, validates it, orders it by calendar day and writes:
//   video/batch.json      – one row of HyperFrames variables per short (only missing renders unless --all)
//   site/data/shorts.json – the feed data for the scroll page
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Four fields. Each reuses one of the four background pads in video/assets.
export const KINDS = {
  ai: { tag: "AI & DATA", accent: "#4cc9f0", accent2: "#4361ee", label: "AI & data", music: "studie" },
  fysik: { tag: "FYSIK", accent: "#b892ff", accent2: "#ff6fb5", label: "Fysik", music: "begrepp" },
  rymd: { tag: "RYMDEN", accent: "#f5b942", accent2: "#e8613c", label: "Rymden", music: "filosofi" },
  liv: { tag: "LIV & SAMHÄLLE", accent: "#5be3a1", accent2: "#2bb3c0", label: "Liv & samhälle", music: "myt" },
  matte: { tag: "MATEMATIK", accent: "#ff6b6b", accent2: "#ffb04c", label: "Matematik", music: "myt" },
};
const LIMITS = { hook: 100, title: 34, meta: 60, point: 105, takeaway: 62, source: 90, statLabel: 70 };
const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MONTHS_LONG = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
// Day 1 = 1 January, in a non-leap year (day 365 = 31 December).
const dateOf = (day) => {
  const d = new Date(Date.UTC(2027, 0, day));
  return { d: d.getUTCDate(), m: d.getUTCMonth() };
};

const files = readdirSync(join(root, "content")).filter((f) => f.endsWith(".json")).sort();
const items = files.flatMap((f) => JSON.parse(readFileSync(join(root, "content", f), "utf8")));

// ---- validate ----
const problems = [];
const ids = new Set();
const arxivIds = new Map();
const days = new Map();
for (const it of items) {
  const where = it.id || "(no id)";
  if (!it.id || ids.has(it.id)) problems.push(`${where}: missing or duplicate id`);
  ids.add(it.id);
  if (!KINDS[it.kind]) problems.push(`${where}: unknown kind ${it.kind}`);
  for (const k of ["hook", "title", "meta", "takeaway", "source", "more", "arxiv", "paper"])
    if (!it[k]) problems.push(`${where}: missing ${k}`);
  if (it.arxiv && !/^(\d{4}\.\d{4,5}|[a-z-]+(\.[A-Z]{2})?\/\d{7})$/.test(it.arxiv)) problems.push(`${where}: bad arxiv id ${it.arxiv}`);
  if (it.arxiv && arxivIds.has(it.arxiv)) problems.push(`${where}: same paper as ${arxivIds.get(it.arxiv)}`);
  arxivIds.set(it.arxiv, it.id);
  if (!Number.isInteger(it.day) || it.day < 1 || it.day > 365) problems.push(`${where}: day must be 1–365`);
  else if (days.has(it.day)) problems.push(`${where}: day ${it.day} already used by ${days.get(it.day)}`);
  else days.set(it.day, it.id);
  if (!Array.isArray(it.points) || it.points.length !== 3) problems.push(`${where}: needs exactly 3 points`);
  const check = (k, v, max) => v && v.length > max && problems.push(`${where}: ${k} is ${v.length} chars (max ${max})`);
  check("hook", it.hook, LIMITS.hook);
  check("title", it.title, LIMITS.title);
  check("meta", it.meta, LIMITS.meta);
  check("takeaway", it.takeaway, LIMITS.takeaway);
  check("source", it.source, LIMITS.source);
  check("statLabel", it.statLabel, LIMITS.statLabel);
  (it.points || []).forEach((p, i) => check(`point ${i + 1}`, p, LIMITS.point));
  validateViz(it, problems);
}

// Each short carries its own visual in "viz", short enough to fit the 850 px column.
function validateViz(it, problems) {
  const VLIM = { title: 44, note: 64, bar: 34, step: 46, item: 26, quote: 120, by: 60, versus: 96, ev: 56, zone: 20 };
  const v = it.viz;
  const where = `${it.id} (viz)`;
  if (!v) { problems.push(`${where}: missing`); return; }
  const check = (k, s, max) => s && s.length > max && problems.push(`${where}: ${k} "${s}" is ${s.length} chars (max ${max})`);
  check("title", v.title, VLIM.title);
  check("note", v.note, VLIM.note);
  const need = (cond, msg) => !cond && problems.push(`${where}: ${msg}`);
  switch (v.type) {
    case "bars": need(v.items?.length >= 2 && v.items.length <= 5, "bars needs 2–5 items"); v.items?.forEach((b) => check("bar", b.l, VLIM.bar)); break;
    case "line": need(v.series?.every((s) => s.pts.length === v.x.length), "line: every series needs one point per x label"); v.marks?.forEach((m) => m.i === v.x.length - 1 && m.t.length > 6 && problems.push(`${where}: mark "${m.t}" on the last point is clipped (max 6 chars)`)); break;
    case "dots": need(v.n >= 0 && v.n <= (v.of || 100), "dots: n out of range"); break;
    case "versus": check("myth", v.myth, VLIM.versus); check("fact", v.fact, VLIM.versus); break;
    case "quote": check("quote", v.text, VLIM.quote); check("by", v.by, VLIM.by); break;
    case "flow": need(v.steps?.length >= 2 && v.steps.length <= 5, "flow needs 2–5 steps"); v.steps?.forEach((x) => check("step", x, VLIM.step)); break;
    case "split": for (const c of [v.a, v.b]) { need(c?.items?.length <= 4, "split: max 4 items"); c?.items.forEach((x) => check("item", x, VLIM.item)); } break;
    case "gauge": v.zones?.forEach((z) => check("zone", z, VLIM.zone)); break;
    case "timeline": need(v.ev?.length >= 2 && v.ev.length <= 4, "timeline needs 2–4 events"); v.ev?.forEach((e) => check("event", e.d, VLIM.ev)); break;
    case "spectrum": need(v.rows?.length >= 1 && v.rows.length <= 3, "spectrum needs 1–3 rows"); break;
    default: problems.push(`${where}: unknown type ${v.type}`);
  }
}

if (problems.length) {
  console.error("Content problems:\n  " + problems.join("\n  "));
  process.exit(1);
}

const ordered = [...items].sort((a, b) => a.day - b.day);
const pad3 = (n) => String(n).padStart(3, "0");
const rows = ordered.map((it) => {
  const k = KINDS[it.kind];
  const { d, m } = dateOf(it.day);
  return {
    slug: it.id,
    kind: it.kind,
    tag: k.tag,
    num: `${d} ${MONTHS[m].toUpperCase()}`,
    hook: it.hook,
    title: it.title,
    meta: it.meta,
    stat: it.stat || "",
    statLabel: it.statLabel || "",
    p1: it.points[0],
    p2: it.points[1],
    p3: it.points[2],
    takeaway: it.takeaway,
    source: it.source,
    accent: k.accent,
    accent2: k.accent2,
    music: `assets/pad-${k.music}.m4a`,
    viz: JSON.stringify(it.viz),
  };
});

// Only rows without a finished render, unless --all is given.
const all = process.argv.includes("--all");
const todo = rows.filter((r) => all || !existsSync(join(root, "renders", `${r.slug}.mp4`)));
writeFileSync(join(root, "video", "batch.json"), JSON.stringify(todo, null, 2));

mkdirSync(join(root, "site", "data"), { recursive: true });
const site = ordered.map((it) => {
  const { d, m } = dateOf(it.day);
  return {
    id: it.id,
    day: it.day,
    date: `${d} ${MONTHS_LONG[m]}`,
    kind: it.kind,
    label: KINDS[it.kind].label,
    accent: KINDS[it.kind].accent,
    hook: it.hook,
    title: it.title,
    meta: it.meta,
    paper: it.paper,
    arxiv: it.arxiv,
    points: it.points,
    takeaway: it.takeaway,
    source: it.source,
    more: it.more,
    video: `videos/${it.id}.mp4`,
    poster: `posters/${it.id}.jpg`,
    ready: existsSync(join(root, "site", "videos", `${it.id}.mp4`)),
  };
});
writeFileSync(join(root, "site", "data", "shorts.json"), JSON.stringify(site, null, 1));

const counts = Object.fromEntries(Object.keys(KINDS).map((k) => [k, items.filter((i) => i.kind === k).length]));
const missingDays = [];
for (let d = 1; d <= 365; d++) if (!days.has(d)) missingDays.push(d);
console.log(`${items.length} shorts`, counts, `→ ${todo.length} to render`);
if (missingDays.length) console.log(`${missingDays.length} days without a short (first: ${missingDays.slice(0, 5).join(", ")})`);
