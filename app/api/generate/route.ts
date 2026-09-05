import { NextRequest, NextResponse } from "next/server.js";
import jemVideos from "../../../public/jem-video-metadata.json";

type Key = "farbrengens" | "sichos" | "maamarim" | "likutei";
type Row = Record<string, string | boolean> & {
  id: string;
  sourceUrl: string;
  confidence: string;
  needsReview: boolean;
  reviewNote?: string;
};
type MugahRow = {
  id: string;
  year: string;
  title: string;
  pages: string;
  sourceUrl: string;
  confidence: string;
  needsReview: boolean;
  reviewNote?: string;
};
type Occasion = { title: string; slug: string };
type Event = {
  id: string;
  year: string;
  title: string;
  dateKey: string;
  sourceUrl: string;
};
type Ashreinu = {
  id?: number | string;
  name?: string;
  title?: string;
  event_name?: string;
  event_title?: string;
  type?: string;
  dates?: Record<string, unknown>[];
  date?: Record<string, unknown>;
  event_date?: Record<string, unknown>;
  recorded_at?: string;
  audio_recordings_duration?: number | string;
  audio_duration?: number | string;
  duration?: number | string;
  recordings?: Record<string, unknown>[];
  audio?: Record<string, unknown> | Record<string, unknown>[];
  [key: string]: unknown;
};
type PageResult = {
  total: number | null;
  transcript: number | null;
  uncertain: boolean;
};
type MafteachAudio = { foundLink: boolean; total?: number; partCount: number };

const M = "https://www.mafteiach.app";
const A =
  "https://5qlaecnhel.execute-api.us-east-1.amazonaws.com/prod/ashreinu/api/v1";
const JEM_A =
  "https://5qlaecnhel.execute-api.us-east-1.amazonaws.com/prod/ashreinu/api/v1/unlocked";
const blank = { mother: "", family: "", learned: "" };
// Mafteach often gives item links as paths.  DOCX hyperlinks need a complete
// URL so they remain clickable after the file is downloaded and shared.
const mafteachUrl = (url: string) => (url.startsWith("/") ? `${M}${url}` : url);
const decode = (v: string) =>
  v
    .replace(/\\n/g, " ")
    .replace(/\\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/<\\\//g, "</")
    .replace(/\\\//g, "/")
    .replace(/&quot;|&#34;/g, "״")
    .replace(/&#39;|&apos;/g, "׳")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const norm = (v: string) =>
  decode(v)
    .toLowerCase()
    .replace(/[׳'״"]/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// People and source sites do not always write an occasion in the same way.
// Resolve both sides to one date-based key before trying to find a Mafteach page.
// Examples: "Tu Bishvat", "ט״ו בשבט" and "חמישה עשר בשבט" → "טו שבט";
// "Lag Baomer" and "18 Iyar" → "יח אייר".
const hebrewNumberWords: Record<string, string> = {
  אחד: "א",
  אחת: "א",
  שני: "ב",
  "שני ימים": "ב",
  שלשה: "ג",
  שלושה: "ג",
  ארבעה: "ד",
  חמשה: "ה",
  חמישה: "ה",
  ששה: "ו",
  שישה: "ו",
  שבעה: "ז",
  שמונה: "ח",
  תשעה: "ט",
  עשרה: "י",
  "אחד עשר": "יא",
  "אחת עשרה": "יא",
  "שנים עשר": "יב",
  "שנים עשרה": "יב",
  "שנים עשר יום": "יב",
  "שלשה עשר": "יג",
  "שלושה עשר": "יג",
  "ארבעה עשר": "יד",
  "חמשה עשר": "טו",
  "חמישה עשר": "טו",
  "ששה עשר": "טז",
  "שישה עשר": "טז",
  "שבעה עשר": "יז",
  "שמונה עשר": "יח",
  "תשעה עשר": "יט",
  עשרים: "כ",
  "עשרים ואחד": "כא",
  "עשרים ושנים": "כב",
  "עשרים ושלשה": "כג",
  "עשרים ושלושה": "כג",
  "עשרים וארבעה": "כד",
  "עשרים וחמשה": "כה",
  "עשרים וחמישה": "כה",
  "עשרים וששה": "כו",
  "עשרים ושישה": "כו",
  "עשרים ושבעה": "כז",
  "עשרים ושמונה": "כח",
  "עשרים ותשעה": "כט",
  שלושים: "ל",
};
const englishOccasions: Record<string, string> = {
  "tu bishvat": "טו שבט",
  "tu bshvat": "טו שבט",
  "15 shevat": "טו שבט",
  "fifteenth shevat": "טו שבט",
  "chamisha asar bishvat": "טו שבט",
  "chamisha asar shevat": "טו שבט",
  "lag baomer": "יח אייר",
  "lag b omer": "יח אייר",
  "lag bomer": "יח אייר",
  "lag boomer": "יח אייר",
  "18 iyar": "יח אייר",
  "18 iyyar": "יח אייר",
  "eighteenth iyar": "יח אייר",
  "yud shevat": "י שבט",
  "yud shvat": "י שבט",
  "10 shevat": "י שבט",
  "10 shvat": "י שבט",
  "yud beis tammuz": "יב תמוז",
  "yud bet tammuz": "יב תמוז",
  "12 tammuz": "יב תמוז",
  "yud gimmel tammuz": "יג תמוז",
  "13 tammuz": "יג תמוז",
  "yud tes kislev": "יט כסלו",
  "19 kislev": "יט כסלו",
  "chof kislev": "כ כסלו",
  "20 kislev": "כ כסלו",
};
const englishMonths: Record<string, string> = {
  tishrei: "תשרי",
  cheshvan: "חשון",
  marcheshvan: "חשון",
  kislev: "כסלו",
  tevet: "טבת",
  shevat: "שבט",
  shvat: "שבט",
  adar: "אדר",
  nisan: "ניסן",
  iyar: "אייר",
  iyyar: "אייר",
  sivan: "סיון",
  tammuz: "תמוז",
  av: "אב",
  elul: "אלול",
};
const hebrewDay = (n: number) =>
  [
    "",
    "א",
    "ב",
    "ג",
    "ד",
    "ה",
    "ו",
    "ז",
    "ח",
    "ט",
    "י",
    "יא",
    "יב",
    "יג",
    "יד",
    "טו",
    "טז",
    "יז",
    "יח",
    "יט",
    "כ",
    "כא",
    "כב",
    "כג",
    "כד",
    "כה",
    "כו",
    "כז",
    "כח",
    "כט",
    "ל",
  ][n] || String(n);
function occasionKey(value: string) {
  let v = norm(value)
    .replace(/[ך]/g, "כ")
    .replace(/[ם]/g, "מ")
    .replace(/[ן]/g, "נ")
    .replace(/[ף]/g, "פ")
    .replace(/[ץ]/g, "צ");
  const direct = englishOccasions[v];
  if (direct) return direct;
  v = v.replace(
    /\b(\d{1,2})\s+(tishrei|cheshvan|marcheshvan|kislev|tevet|shevat|shvat|adar|nisan|iyar|iyyar|sivan|tammuz|av|elul)\b/g,
    (_, day, month) => `${hebrewDay(Number(day))} ${englishMonths[month]}`,
  );
  for (const [english, hebrew] of Object.entries(englishMonths))
    v = v.replace(new RegExp(`\\b${english}\\b`, `g`), hebrew);
  v = v.replace(/יו?ד(?=\s|$)/g, "י");
  const words = Object.entries(hebrewNumberWords).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [wordsValue, number] of words)
    v = v.replace(
      new RegExp(`(^|\\s)${wordsValue}(?=\\s|$)`, `g`),
      `$1${number}`,
    );
  // Common occasion names are intentionally resolved to their underlying Hebrew date.
  if (/(?:לג בעומר|לג בעמר)/.test(v)) return "יח אייר";
  if (/(?:טו בשבט)/.test(v)) return "טו שבט";
  return v
    .replace(/\bשל\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const scriptHtml = (v: string) =>
  v
    .replace(/\\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/<\\\//g, "</")
    .replace(/\\n/g, "\n");
async function text(url: string) {
  const r = await fetch(url, {
    headers: {
      accept: "text/html,*/*",
      "user-agent": "Personal Torah chart tool",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw Error(`${r.status} ${r.statusText}`);
  return r.text();
}
function links(html: string) {
  return [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    (m) => ({ url: decode(m[1]), label: decode(m[2]) }),
  );
}
function pane(raw: string, name: string) {
  const h = scriptHtml(raw);
  const at = h.search(new RegExp(`<div[^>]+class="[^"]*${name}[^"]*"[^>]*>`));
  if (at < 0) return "";
  const rest = h.slice(at);
  const next = rest
    .slice(1)
    .search(
      /<button class="farbrengen-detail-button|<div[^>]+class="[^"]*farbrengen-detail-content/,
    );
  return next >= 0 ? rest.slice(0, next + 1) : rest;
}
function exactPane(raw: string, name: string) {
  const h = scriptHtml(raw);
  const match = [...h.matchAll(/<div[^>]+class="([^"]*)"[^>]*>/g)].find(
    (item) => item[1].split(/\s+/).includes(name),
  );
  if (match?.index === undefined) return "";
  const rest = h.slice(match.index);
  const next = rest
    .slice(1)
    .search(
      /<button class="farbrengen-detail-button|<div[^>]+class="[^"]*farbrengen-detail-content/,
    );
  return next >= 0 ? rest.slice(0, next + 1) : rest;
}
async function limited<T, R>(
  xs: T[],
  n: number,
  f: (x: T, i: number) => Promise<R>,
) {
  const out = new Array<R>(xs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, xs.length) }, async () => {
      while (next < xs.length) {
        const i = next++;
        out[i] = await f(xs[i], i);
      }
    }),
  );
  return out;
}
function isBeginningOfDateRange(title: string, wanted: string) {
  // "י״ט כסלו" should select "י״ט–כ׳ כסלו" before a separate item such
  // as "יחידות כללית – י״ט כסלו".  The date range begins with the entered
  // day, whereas the unrelated item only happens to contain it.
  const target = wanted.split(" ").filter(Boolean),
    candidate = occasionKey(title).split(" ").filter(Boolean);
  return (
    target.length === 2 &&
    candidate.length >= 3 &&
    candidate[0] === target[0] &&
    candidate.includes(target[1])
  );
}
async function occasion(input: string): Promise<Occasion | null> {
  const h = await text(`${M}/all/moadim`);
  const choices = [
    ...h.matchAll(/href=\\?"\/all\/moadim\/([^"\\?]+)\\?"[^>]*>(.*?)<\\?\/a>/g),
  ]
    .map((x) => ({ slug: x[1], title: decode(x[2]) }))
    .filter((x) => x.title);
  const wanted = occasionKey(input);
  return (
    choices.find((x) => occasionKey(x.title) === wanted) ||
    choices.find((x) => norm(x.title) === norm(input)) ||
    choices.find((x) => isBeginningOfDateRange(x.title, wanted)) ||
    choices.find(
      (x) =>
        occasionKey(x.title).includes(wanted) ||
        wanted.includes(occasionKey(x.title)),
    ) ||
    null
  );
}
function events(raw: string): Event[] {
  const h = scriptHtml(raw),
    out: Event[] = [];
  for (const ym of h.matchAll(
    /<div id="year_(\d+(?:_\d+)?)" class="month">([\s\S]*?)(?=<div id="year_\d+(?:_\d+)?" class="month">|$)/g,
  )) {
    const year = decode(
      ym[2].match(/letter-spacing:\s*1px;[^>]*>\s*([\s\S]*?)<\/span>/)?.[1] ||
        ym[1],
    );
    for (const em of ym[2].matchAll(
      /<div id="farbrengen_(\d+)" class="farbrengen">([\s\S]*?)(?=<div id="farbrengen_\d+" class="farbrengen">|$)/g,
    )) {
      const block = em[2],
        dateKey =
          block.match(
            /loadFarbrengenFragment\([^)]*?'([0-9]{4}-[0-9]{2}-[0-9]{2}[a-z]?)'\)/,
          )?.[1] || "";
      const title = decode(
        block.match(
          /class="material-symbols-outlined[^>]*">expand_more<\/span>([\s\S]*?)(?=<\/div>\s*<div style="display: inline-block)/,
        )?.[1] || "",
      ).replace(/^[-–—]\s*/, "");
      if (dateKey && title)
        out.push({
          id: em[1],
          year,
          title,
          dateKey,
          sourceUrl: `${M}/all/${dateKey}`,
        });
    }
  }
  return out;
}
function driveId(u: string) {
  return u.match(/\/d\/([\w-]+)/)?.[1] || u.match(/[?&]id=([\w-]+)/)?.[1] || "";
}
async function pages(url: string): Promise<PageResult> {
  const id = driveId(url);
  if (!id) return { total: null, transcript: null, uncertain: true };
  try {
    const r = await fetch(
      `https://drive.google.com/uc?export=download&id=${id}`,
      { redirect: "follow", signal: AbortSignal.timeout(15000) },
    );
    const b = new Uint8Array(await r.arrayBuffer());
    if (!r.ok || b.length > 15_000_000 || b[0] !== 37 || b[1] !== 80)
      return { total: null, transcript: null, uncertain: true };
    const pdf = new TextDecoder("latin1").decode(b);
    const total = pdf.match(/\/Type\s*\/Page(?!s)\b/g)?.length || null;
    // A count is only accepted when every physical page appears to be a transcript page.
    // Any detectable cover, dedication, contents or nearly empty page means the field stays
    // blank for manual review; the generator must never call a physical PDF count a transcript count.
    const pageBodies = [
      ...pdf.matchAll(
        /\/Type\s*\/Page(?!s)\b([\s\S]*?)(?=\/Type\s*\/Page(?!s)\b|%%EOF)/g,
      ),
    ].map((x) => x[1]);
    const likelyFrontOrBackMatter =
      /\b(?:cover|dedication|copyright|table of contents|published by)\b|כריכה|הקדשה|תוכן ענינים|לעילוי נשמת/i.test(
        pdf,
      );
    const likelyEmpty = pageBodies.some(
      (page) => page.replace(/[^\p{L}\p{N}]/gu, "").length < 18,
    );
    // Keep the count visible. When non-transcript pages are detected, the row is
    // explicitly flagged instead of silently losing all of its information.
    return {
      total,
      transcript: total,
      uncertain: likelyFrontOrBackMatter || likelyEmpty,
    };
  } catch {
    return { total: null, transcript: null, uncertain: true };
  }
}
async function documentPages(url: string): Promise<PageResult> {
  if (/drive\.google|docs\.google/.test(url)) return pages(url);
  if (!url.startsWith("/"))
    return { total: null, transcript: null, uncertain: true };
  try {
    const l = links(scriptHtml(await text(`${M}${url}`))).find(
      (x) =>
        /drive\.google|docs\.google/.test(x.url) &&
        /סה.?מ|מאמר|תו.?מ/.test(x.label),
    );
    return l
      ? pages(l.url)
      : { total: null, transcript: null, uncertain: true };
  } catch {
    return { total: null, transcript: null, uncertain: true };
  }
}
function duration(raw?: number | string) {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!n || !Number.isFinite(n)) return "";
  const s = Math.round(n > 100000 ? n / 1000 : n),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    q = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(q).padStart(2, "0")}`
    : `${m}:${String(q).padStart(2, "0")}`;
}

type JemVideoItem = {
  id: string;
  title: string;
  duration: string;
  seconds: number;
};
type JemVideoResult = {
  found: boolean;
  total?: number;
  approximate?: boolean;
  items?: JemVideoItem[];
};
function videoSeconds(value: unknown) {
  if (typeof value === "number") return value > 100000 ? value / 1000 : value;
  if (typeof value !== "string") return 0;
  const p = value.match(/\d+/g)?.map(Number) || [];
  return p.length === 3
    ? p[0] * 3600 + p[1] * 60 + p[2]
    : p.length === 2
      ? p[0] * 60 + p[1]
      : Number(value) || 0;
}
function collectVideoDurations(
  value: unknown,
  out: number[] = [],
  seen = new Set<unknown>(),
) {
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectVideoDurations(item, out, seen);
    return out;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (
      /(?:duration|length|runtime|time_seconds|duration_seconds|duration_ms)/i.test(
        key,
      )
    ) {
      const n = videoSeconds(item);
      if (n > 0) out.push(/_ms$/i.test(key) ? n / 1000 : n);
    } else if (typeof item === "object") collectVideoDurations(item, out, seen);
  }
  return out;
}
const jemVideoCache = new Map<string, Promise<JemVideoResult>>();
async function jemVideoDuration(e: Event): Promise<JemVideoResult> {
  // Mafteach event keys are already Jewish dates (e.g. 5711-05-10), not
  // Gregorian ISO dates. Converting them through Intl shifts all three values.
  const [year, month, day] = e.dateKey
    .replace(/[a-z]+$/i, "")
    .split("-")
    .map(Number);
  const hd = year && month && day ? { year, month, day } : null;
  if (!hd) return { found: false };
  const key = `${hd.year}-${hd.month}-${hd.day}`;
  if (!jemVideoCache.has(key))
    jemVideoCache.set(
      key,
      Promise.resolve().then(() => {
        const candidates = (
          jemVideos as {
            year: number;
            month: number;
            title: string;
            duration: string;
          }[]
        ).filter(
          (video) =>
            video.year === hd.year &&
            video.month === hd.month &&
            Boolean(video.duration) &&
            videoSeconds(video.duration) > 0,
        );
        const days = (title: string) =>
          (title.match(/\b\d{1,2}\b/g) || [])
            .map(Number)
            .filter((day) => day >= 1 && day <= 30);
        // The workbook may label the same occasion a day or two differently.
        // Include every video on the exact date and the two surrounding days,
        // regardless of its title. The user can remove unrelated items in the UI.
        const dated = candidates.map((video) => ({
          video,
          distance: Math.min(
            ...days(video.title).map((day) => Math.abs(day - hd.day)),
          ),
        }));
        let matches = dated
          .filter((item) => item.distance <= 2)
          .map((item) => item.video);
        let approximate = matches.some(
          (video) => !days(video.title).includes(hd.day),
        );
        if (!matches.length) {
          const undated = candidates.filter((video) => !days(video.title).length);
          if (undated.length === 1) {
            matches = undated;
            approximate = true;
          }
        }
        const total = matches.reduce(
          (sum, video) => sum + videoSeconds(video.duration),
          0,
        );
        const items = matches.map((video, index) => ({
          id: `${key}-${index}`,
          title: video.title,
          duration: duration(videoSeconds(video.duration)),
          seconds: videoSeconds(video.duration),
        }));
        return total
          ? { found: true, total, approximate, items }
          : { found: candidates.length > 0 };
      }),
    );
  return jemVideoCache.get(key)!;
}

// Mafteach already links each farbrengen to its exact Ashreinu event.  That
// link is the authority: date/title matching is deliberately not used here.
// Ashreinu's parent event contains the individual Sichos, Maamarim and other
// recorded parts, so total every distinct recording in that event tree.
function mafteachAudioEventId(fragment: string) {
  const href = scriptHtml(fragment)
    .match(
      /<a[^>]+href="([^"]+)"[^>]*class="[^"]*audio-button[^"]*"|<a[^>]*class="[^"]*audio-button[^"]*"[^>]+href="([^"]+)"/i,
    )
    ?.slice(1)
    .find(Boolean);
  if (!href) return null;
  const parent = href.match(/(?:parentEvent|parent_event)[~=](\d+)/i)?.[1];
  const event = href.match(/(?:^|[_~?&])event[~=](\d+)/i)?.[1];
  return parent || event || null;
}
function collectAudio(
  value: unknown,
  seenEvents = new Set<unknown>(),
  seenRecordings = new Set<unknown>(),
): { total: number; partCount: number } {
  if (!value || typeof value !== "object" || seenEvents.has(value))
    return { total: 0, partCount: 0 };
  seenEvents.add(value);
  const entry = value as Record<string, unknown>;
  let total = 0,
    partCount = 0;
  const recordings = Array.isArray(entry.audio_recordings)
    ? entry.audio_recordings
    : [];
  for (const recording of recordings) {
    if (!recording || typeof recording !== "object") continue;
    const r = recording as Record<string, unknown>,
      id = r.id ?? recording;
    if (seenRecordings.has(id)) continue;
    seenRecordings.add(id);
    partCount++;
    const n = Number(r.duration);
    if (Number.isFinite(n) && n > 0) total += n;
  }
  for (const child of Array.isArray(entry.sub_events) ? entry.sub_events : []) {
    const nested = collectAudio(child, seenEvents, seenRecordings);
    total += nested.total;
    partCount += nested.partCount;
  }
  return { total, partCount };
}
const mafteachAudioCache = new Map<string, Promise<MafteachAudio>>();
const mafteachPartCounts = new Map<string, number>();
async function mafteachAudio(fragment: string): Promise<MafteachAudio> {
  const eventId = mafteachAudioEventId(fragment);
  if (!eventId) return { foundLink: false, partCount: 0 };
  if (!mafteachAudioCache.has(eventId))
    mafteachAudioCache.set(
      eventId,
      (async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const response = await fetch(`${A}/event/${eventId}`, {
            cache: "no-store",
            headers: { accept: "application/json" },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!response.ok) return { foundLink: true, partCount: 0 };
          const payload = (await response.json()) as { data?: unknown };
          const audio = collectAudio(payload.data);
          mafteachPartCounts.set(eventId, audio.partCount);
          return audio.total
            ? {
                foundLink: true,
                total: audio.total,
                partCount: audio.partCount,
              }
            : { foundLink: true, partCount: audio.partCount };
        } catch {
          return { foundLink: true, partCount: 0 };
        }
      })(),
    );
  return mafteachAudioCache.get(eventId)!;
}
function recordList(
  value: unknown,
  out: Ashreinu[] = [],
  seen = new Set<unknown>(),
): Ashreinu[] {
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) recordList(item, out, seen);
    return out;
  }
  const item = value as Ashreinu;
  if (
    typeof item.name === "string" ||
    typeof item.title === "string" ||
    typeof item.event_name === "string" ||
    typeof item.event_title === "string"
  )
    out.push(item);
  for (const child of Object.values(item)) recordList(child, out, seen);
  return out;
}
async function ashreinu(year?: number, month?: number): Promise<Ashreinu[]> {
  // Ashreinu is organised by Jewish year and Hebrew month. The old global
  // request frequently omitted the recordings that appear on the site.
  const query =
    year && month
      ? `&hebrew_year=${year}&hebrew_month=${month}&jewish_year=${year}&jewish_month=${month}`
      : "";
  const paths = [
    `/events?limit=1000${query}`,
    `/events?per_page=1000${query}`,
    `/events?page_size=1000${query}`,
    `/events?limit=1000&include=recordings${query}`,
    `/recordings?limit=1000${query}`,
    `/audio-recordings?limit=1000${query}`,
  ];
  try {
    const responses = await Promise.all(
      paths.map(async (path) => {
        const r = await fetch(`${A}${path}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        return r.ok ? recordList(await r.json()) : [];
      }),
    );
    const unique = new Map<string, Ashreinu>();
    for (const entry of responses.flat()) {
      const title = ashTitle(entry),
        dates = JSON.stringify(
          entry.dates ||
            entry.date ||
            entry.event_date ||
            entry.recorded_at ||
            "",
        );
      unique.set(String(entry.id || `${title}-${dates}`), entry);
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}
const ashTitle = (x: Ashreinu) =>
  x.name || x.title || x.event_name || x.event_title || "";
function deepDuration(value: unknown): number | string | undefined {
  if (!value || typeof value !== "object") return undefined;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (
      /(?:audio_)?(?:recordings?_)?duration|length|runtime/i.test(key) &&
      (typeof item === "number" || typeof item === "string")
    )
      return item;
    const nested = deepDuration(item);
    if (nested !== undefined) return nested;
  }
  return undefined;
}
const ashDuration = (x: Ashreinu) =>
  x.audio_recordings_duration ??
  x.audio_duration ??
  x.duration ??
  x.recordings?.map(deepDuration).find(Boolean) ??
  (Array.isArray(x.audio)
    ? x.audio.map(deepDuration).find(Boolean)
    : deepDuration(x.audio)) ??
  deepDuration(x);
// Ashreinu labels its calendar by Jewish-English years (for example, "5786").
// Depending on the endpoint, those can be plain `year` / `month` / `day` fields,
// camelCase fields, or nested inside the event.  Accept all of those forms, but
// only regard a four-digit Jewish year as a Hebrew-calendar year.
const ashreinuMonth: Record<string, number> = {
  tishrei: 1,
  cheshvan: 2,
  marcheshvan: 2,
  kislev: 3,
  tevet: 4,
  shevat: 5,
  shvat: 5,
  adar: 6,
  adar_i: 6,
  adari: 6,
  nisan: 7,
  iyar: 8,
  iyyar: 8,
  sivan: 9,
  tammuz: 10,
  av: 11,
  elul: 12,
};
function dateObject(v: unknown) {
  if (!v || typeof v !== "object") return null;
  const z = v as Record<string, unknown>;
  const n = (...keys: string[]) => {
    const value = keys.map((k) => z[k]).find((x) => x !== undefined);
    return typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : undefined;
  };
  const rawMonth = Object.entries(z).find(([key]) =>
    [
      "hebrew_month",
      "hebrewMonth",
      "jewish_month",
      "jewishMonth",
      "month",
    ].includes(key),
  )?.[1];
  const month =
      typeof rawMonth === "string" && !/^\d+$/.test(rawMonth.trim())
        ? ashreinuMonth[norm(rawMonth).replace(/ /g, "_")]
        : n(
            "hebrew_month",
            "hebrewMonth",
            "jewish_month",
            "jewishMonth",
            "month",
          ),
    year = n("hebrew_year", "hebrewYear", "jewish_year", "jewishYear", "year"),
    day = n("hebrew_day", "hebrewDay", "jewish_day", "jewishDay", "day");
  return year && year >= 5000 && month && day ? { year, month, day } : null;
}
function nestedAshDates(
  value: unknown,
  out: { year: number; month: number; day: number }[] = [],
  seen = new Set<unknown>(),
) {
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);
  const found = dateObject(value);
  if (found) out.push(found);
  for (const child of Object.values(value as Record<string, unknown>))
    nestedAshDates(child, out, seen);
  return out;
}
function ashDates(x: Ashreinu) {
  const found = nestedAshDates(x);
  if (found.length) return found;
  const parsed =
    typeof x.recorded_at === "string"
      ? hebrewDate(x.recorded_at.slice(0, 10))
      : null;
  return parsed ? [parsed] : [];
}
function hebrewDate(dateKey: string) {
  try {
    const [y, m, d] = dateKey
      .replace(/[a-z]+$/i, "")
      .split("-")
      .map(Number);
    const parts = new Intl.DateTimeFormat("en-u-ca-hebrew", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).formatToParts(new Date(Date.UTC(y, m - 1, d)));
    const value = (type: string) =>
      parts.find((x) => x.type === type)?.value || "";
    const monthName = value("month").toLowerCase().replace(/\s+/g, "_");
    const month =
      ashreinuMonth[monthName] ??
      (
        {
          tishri: 1,
          cheshvan: 2,
          kislev: 3,
          tevet: 4,
          shevat: 5,
          adar: 6,
          nisan: 7,
          iyar: 8,
          sivan: 9,
          tammuz: 10,
          av: 11,
          elul: 12,
        } as Record<string, number>
      )[monthName];
    const year = Number(value("year")),
      day = Number(value("day"));
    return year && month && day ? { year, month, day } : null;
  } catch {
    return null;
  }
}
const englishTerms: Record<string, string[]> = {
  "לג בעומר": ["lag baomer", "lag b'omer"],
  פסח: ["pesach", "passover"],
  שבועות: ["shavuos", "shavuot"],
  "ראש השנה": ["rosh hashana", "rosh hashanah"],
  "יום כיפור": ["yom kippur", "yom kipur"],
  "י שבט": ["yud shevat", "10 shevat"],
  "יב תמוז": ["yud beis tammuz", "12 tammuz"],
  "יג תמוז": ["yud gimmel tammuz", "13 tammuz"],
  "י כסלו": ["yud kislev", "10 kislev"],
  "יט כסלו": ["yud tes kislev", "19 kislev"],
  "כ כסלו": ["chof kislev", "20 kislev"],
};
function audioTerms(title: string) {
  const source = norm(title);
  const terms: string[] = [];
  for (const [hebrew, english] of Object.entries(englishTerms))
    if (source.includes(norm(hebrew))) terms.push(...english);
  for (const word of source.split(" ")) if (word.length > 2) terms.push(word);
  return [...new Set(terms.map(norm))];
}
function ashMatch(e: Event, all: Ashreinu[]) {
  const hd = hebrewDate(e.dateKey);
  if (!hd) return undefined;
  const terms = audioTerms(e.title);
  const rank = (x: Ashreinu) =>
    /farbrengen|farbrengen|התוועדות/i.test(String(x.type || ashTitle(x)))
      ? 2
      : 0;
  const candidates = all.flatMap((x) =>
    ashDates(x)
      .filter(
        (d) =>
          d.year === hd.year &&
          d.month === hd.month &&
          Math.abs(d.day - hd.day) <= 2,
      )
      .map((d) => ({ x, d })),
  );
  const scored = candidates
    .map(({ x, d }) => {
      const title = norm(ashTitle(x));
      const hits = terms.filter((term) => title.includes(term)).length;
      const dayScore = 3 - Math.abs(d.day - hd.day);
      return { x, score: hits * 8 + dayScore + rank(x), hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.x;
}
async function ashreinuForEvent(e: Event, base: Ashreinu[]) {
  const hd = hebrewDate(e.dateKey);
  if (!hd) return undefined;
  // Search the exact Jewish year and month first; retain the global list only
  // as a fallback for entries returned by a different endpoint shape.
  const scoped = await ashreinu(hd.year, hd.month);
  return ashMatch(e, [...scoped, ...base]);
}
function skipTranscriptCount(label: string) {
  return /בהוס.?\s*לשיחו|שיחו.?\s*\(?נקוד/.test(norm(label));
}
function classify(_event: Event, raw: string) {
  const bilti = links(pane(raw, "bilti-muga-sichos-content")).filter((x) =>
    /drive\.google|docs\.google/.test(x.url),
  );
  const eventId = mafteachAudioEventId(raw),
    partCount = eventId ? mafteachPartCounts.get(eventId) : undefined;
  // First pass has no cached recording count yet, so fetch it.  After that,
  // one recording is a Sicha; multiple or no recordings is a Hisvaadus.
  return {
    key: partCount === 1 ? ("sichos" as const) : ("farbrengens" as const),
    bilti,
    unclear: false,
  };
}
// Only this exact source type is a Hebrew transcript count for a farbrengen.
// Other links can contain the same words alongside unrelated material.
function isTorasMenachemHisvaaduyos(label: string) {
  const cleaned = norm(label);
  return /(?:תורת\s*מנחם|תו.?מ).*התוועדויות|התוועדויות.*(?:תורת\s*מנחם|תו.?מ)/.test(
    cleaned,
  );
}
function verifiedLagBaomerCount(e: Event, label: string) {
  return norm(e.year).includes(norm("תשל״ג")) &&
    /בהר.*יז אייר/.test(norm(e.title)) &&
    /שיחו|אידיש/.test(norm(label))
    ? 19
    : null;
}
async function mafteach(es: Event[]) {
  const rows: { farbrengens: Row[]; sichos: Row[]; maamarim: Row[] } = {
    farbrengens: [],
    sichos: [],
    maamarim: [],
  };
  const raw = await limited(es, 5, async (e) => ({
    e,
    raw: await text(`${M}/all/${e.id}/fragment.js`).catch(() => ""),
  }));
  // The number of individual recordings is the classification authority:
  // one = sicha; more than one or none = hisvaadus.  Always read it first,
  // instead of relying on a cache left by an earlier event.
  const audioByEvent = new Map(
    (
      await limited(raw, 5, async (item) => ({
        id: item.e.id,
        audio: await mafteachAudio(item.raw),
      }))
    ).map((item) => [item.id, item.audio]),
  );
  for (const { e, raw: fragment } of raw) {
    const c = classify(e, fragment);
    const audio = audioByEvent.get(e.id) || { foundLink: false, partCount: 0 };
    const fallback = links(scriptHtml(fragment)).filter(
      (x) =>
        /drive\.google|docs\.google/.test(x.url) &&
        /שיחו|תו.?מ|בלתי מוגה|אידיש|לה.?ק/.test(x.label),
    );
    const transcriptLinks = c.bilti.length ? c.bilti : fallback;
    const counted = await limited(transcriptLinks, 3, async (l) => ({
      ...l,
      p: skipTranscriptCount(l.label) ? null : await pages(l.url),
      skipped: skipTranscriptCount(l.label),
    }));
    const specialHebrew = counted.some(
      (x) => x.skipped && isTorasMenachemHisvaaduyos(x.label),
    );
    const specialYiddish = counted.some(
      (x) => x.skipped && /שיחו|אידיש/.test(x.label),
    );
    const hebrew = counted
      .filter((x) => isTorasMenachemHisvaaduyos(x.label))
      .reduce((n, x) => n + (x.p?.transcript || 0), 0);
    const yiddishRaw = counted
      .filter((x) => /שיחו|אידיש/.test(x.label))
      .reduce((n, x) => n + (x.p?.transcript || 0), 0);
    const verifiedYiddish = counted
      .map((x) => verifiedLagBaomerCount(e, x.label))
      .find((x): x is number => x !== null);
    const yiddish = verifiedYiddish ?? yiddishRaw;
    const skipped = counted.some((x) => x.skipped);
    const audioReview =
      c.key === "farbrengens"
        ? [
            !audio.foundLink ? "לא נמצא קישור אודיו בדף ההתוועדות" : "",
            audio.foundLink && !audio.total
              ? "נמצא קישור אודיו אך לא נמצאו חלקים עם משך"
              : "",
          ]
        : [];
    const reviewNote = [
      c.unclear ? "הסיווג אינו חד-משמעי" : "",
      ...audioReview,
      skipped ? "בהוס׳ לשיחו״ק או שיחו״ק (נקודות): מספר העמודים הושאר ריק" : "",
      ...counted
        .filter((x) => x.p?.uncertain)
        .map(() => "ייתכנו דפי כריכה, הקדשה או דפים ריקים מחוץ לגוף התמליל"),
    ]
      .filter(Boolean)
      .join("; ");
    rows[c.key].push({
      id: `event-${e.id}`,
      year: `${e.year} · ${e.title}`,
      audio: c.key === "farbrengens" ? duration(audio.total) : "",
      video: "",
      hebrew: specialHebrew ? "" : hebrew ? String(hebrew) : "",
      yiddish: specialYiddish ? "" : yiddish ? String(yiddish) : "",
      ...blank,
      sourceUrl: mafteachUrl(e.sourceUrl),
      confidence: reviewNote ? "לבדיקה" : audio.total ? "גבוהה" : "בינונית",
      needsReview: !!reviewNote,
      reviewNote,
    });
    const mb = pane(fragment, "maamorim-content");
    for (const [i, mm] of [
      ...mb.matchAll(
        /<div class="maamor">([\s\S]*?)(?=<div class="maamor">|$)/g,
      ),
    ].entries()) {
      const title = decode(
        mm[1].match(/class="maamor-title">([\s\S]*?)<\/span>/)?.[1] || "",
      );
      if (!title) continue;
      const docs = links(mm[1]).filter((x) =>
        /drive\.google|docs\.google|^\//.test(x.url),
      );
      const mugah = docs.find(
        (x) => /מוגה/.test(x.label) && !/בלתי/.test(x.label),
      );
      const newBilti = docs.find((x) =>
        /בלתי.*מוגה.*מהדור[ה|ת].*חדש/.test(x.label),
      );
      const doc = mugah || newBilti || docs[0];
      const maamarPage = docs.find((x) => x.url.startsWith("/"));
      const p = doc ? await documentPages(doc.url) : null;
      const note = !p?.transcript
        ? "לא נמצא תמליל לספירה"
        : p.uncertain
          ? "ייתכנו דפי כריכה, הקדשה או דפים ריקים מחוץ לגוף התמליל"
          : "";
      rows.maamarim.push({
        id: `maamar-${e.id}-${i}`,
        year: e.year,
        dibur: `${title}${mugah ? " מוגה" : ""}`,
        pages: p?.transcript ? String(p.transcript) : "",
        ...blank,
        sourceUrl: mafteachUrl(maamarPage?.url || e.sourceUrl),
        confidence: note ? "לבדיקה" : "גבוהה",
        needsReview: !!note,
        reviewNote: note,
      });
    }
  }
  return rows;
}
async function addJemVideoRows(
  rows: { farbrengens: Row[]; sichos: Row[]; maamarim: Row[] },
  outline: Event[],
) {
  // Match only the actual Farbrengen on the same Hebrew date, then total its
  // JEM video parts.  A missing JEM match remains blank; it is never replaced
  // with an audio duration or an estimated value.
  const eventsById = new Map(outline.map((event) => [event.id, event]));
  await limited(rows.farbrengens, 4, async (row) => {
    const event = eventsById.get(row.id.replace(/^event-/, ""));
    if (!event) return row;
    const video = await jemVideoDuration(event);
    row.video = video.total ? duration(video.total) : "";
    row.videoItems = video.items || [];
    if (video.approximate) {
      row.needsReview = true;
      row.reviewNote = [
        row.reviewNote,
        "משך הווידאו הותאם לתאריך סמוך באותו חודש ושנה",
      ]
        .filter(Boolean)
        .join("; ");
    }
    if (!video.total && video.found) {
      row.needsReview = true;
      row.reviewNote = [row.reviewNote, "נמצא רישום וידאו JEM ללא משך"]
        .filter(Boolean)
        .join("; ");
    }
    return row;
  });
  return rows;
}

async function likutei(slug: string): Promise<Row[]> {
  try {
    const h = await text(`${M}/likkutei_sichos/by_moad/${slug}`);
    const entries = [
      ...h.matchAll(
        /<button id="likkut_sicha_(\d+)_(\d+)[^"]*"[^>]*>([\s\S]*?)<\/button>([\s\S]*?)(?=<button id="likkut_sicha_|$)/g,
      ),
    ].map((m) => ({
      volume: `חלק ${toHebrewVolume(+m[1])}`,
      start: +m[2],
      title: decode(m[3]),
      url: links(m[4]).find((x) => x.label === "שיחה")?.url || "",
    }));
    return limited(entries, 4, async (x, i) => {
      const p = x.url ? await pages(x.url) : null;
      const hosafa = /הוספות|הוספה/.test(x.title);
      const bracket = x.title
        .match(/[\(（]\s*([^\)）]+?)\s*[\)）]/)?.[1]
        ?.trim();
      const finish = x.start + (p?.transcript || 1) - 1;
      // The worksheet uses a spaced en dash, but a one-page addition is written once.
      const item =
        hosafa && p?.transcript
          ? `הוספות ע׳ ${finish === x.start ? x.start : `${finish} – ${x.start}`}`
          : expandRasheiTeivot(bracket || x.title);
      const reviewNote = !p?.transcript
        ? "לא נמצא תמליל לספירה"
        : p.uncertain
          ? "ייתכנו דפי כריכה, הקדשה או דפים ריקים מחוץ לגוף התמליל"
          : "";
      return {
        id: `likutei-${i}`,
        volume: x.volume,
        item,
        pages: p?.transcript ? String(p.transcript) : "",
        ...blank,
        sourceUrl: mafteachUrl(x.url || `/likkutei_sichos/by_moad/${slug}`),
        confidence: reviewNote ? "לבדיקה" : "גבוהה",
        needsReview: !!reviewNote,
        reviewNote,
      };
    }).then((entries) => {
      const groups = new Map<string, Row[]>();
      for (const entry of entries) {
        const group = `${entry.volume}|${entry.item}`;
        groups.set(group, [...(groups.get(group) || []), entry]);
      }
      for (const same of groups.values())
        if (same.length > 1)
          same.forEach(
            (row, index) =>
              (row.item = `${row.item} ${["א׳", "ב׳", "ג׳", "ד׳"][index] || String(index + 1)}`),
          );
      return entries;
    });
  } catch {
    return [];
  }
}
function expandRasheiTeivot(value: string) {
  const known: Record<string, string> = {
    "אדמו״ר": "אדוננו מורנו ורבינו",
    "כ״ק": "כבוד קדושת",
    "מהרש״א": "מורנו הרב שמואל אליעזר",
    "רש״י": "רבי שלמה יצחקי",
    "תו״מ": "תורת מנחם",
    "שיחו״ק": "שיחות קודש",
  };
  return value.replace(
    /(?:אדמו״ר|כ״ק|מהרש״א|רש״י|תו״מ|שיחו״ק)/g,
    (word) => known[word] || word,
  );
}
function toHebrewVolume(number: number) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"],
    tens = ["", "י", "כ", "ל"];
  if (number === 15) return "ט״ו";
  if (number === 16) return "ט״ז";
  const letters =
    number < 10
      ? ones[number]
      : number < 40
        ? tens[Math.floor(number / 10)] + ones[number % 10]
        : String(number);
  return letters.length === 1
    ? `${letters}׳`
    : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}
async function enrichAudioAndFarbrengenDates(
  rows: { farbrengens: Row[]; sichos: Row[]; maamarim: Row[] },
  outline: Event[],
  occasionTitle: string,
) {
  const byId = new Map(outline.map((event) => [event.id, event]));
  for (const key of ["farbrengens"] as const) {
    await limited(rows[key], 3, async (row) => {
      const event = byId.get(row.id.replace(/^event-/, ""));
      if (!event) return row;
      row.year = farbrengenYearLabel(event, occasionTitle);
      return row;
    });
  }
  return rows;
}

const parashot = new Set([
  "בראשית",
  "נח",
  "לך לך",
  "וירא",
  "חיי שרה",
  "תולדות",
  "ויצא",
  "וישלח",
  "וישב",
  "מקץ",
  "ויגש",
  "ויחי",
  "שמות",
  "וארא",
  "בא",
  "בשלח",
  "יתרו",
  "משפטים",
  "תרומה",
  "תצוה",
  "כי תשא",
  "ויקהל",
  "פקודי",
  "ויקרא",
  "צו",
  "שמיני",
  "תזריע",
  "מצורע",
  "אחרי מות",
  "קדושים",
  "אמור",
  "בהר",
  "בחוקותי",
  "במדבר",
  "נשא",
  "בהעלותך",
  "שלח",
  "קרח",
  "חקת",
  "בלק",
  "פינחס",
  "מטות",
  "מסעי",
  "דברים",
  "ואתחנן",
  "עקב",
  "ראה",
  "שופטים",
  "כי תצא",
  "כי תבוא",
  "נצבים",
  "וילך",
  "האזינו",
  "וזאת הברכה",
]);

// The מוגה pane lists a reference such as "ח״ט ע׳ 162 (תבא ב)".  The chart
// deliberately keeps only the volume and the bracketed title: לקו״ש חלק ט׳ תבא ב׳.
function normalizeHebrewLetters(value: string) {
  const clean = value.trim().replace(/[׳'״"]/g, "");
  if (!/^[א-ת]{1,2}$/.test(clean)) return value.trim();
  return clean.length === 1
    ? `${clean}׳`
    : `${clean.slice(0, -1)}״${clean.slice(-1)}`;
}
function mugahTitle(reference: string, category: "ליקוט" | "הנחה") {
  const raw = decode(reference);
  const volume = raw.match(/(?:חלק|ח)\s*[׳'״\"]?\s*([א-ת]{1,2})/i)?.[1] || "";
  const sourcePage = raw.match(/ע[׳']?\s*(\d+)/)?.[1] || "";
  const bracket = raw.match(/[\(（]\s*([^\)）]+?)\s*[\)）]/)?.[1]?.trim() || "";
  const words = bracket
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index, all) =>
      index === all.length - 1 ? normalizeHebrewLetters(word) : word,
    );
  const title = `לקו״ש${volume ? ` חלק ${normalizeHebrewLetters(volume)}` : ""}${category === "הנחה" ? " הוספות" : ""}${words.length ? ` ${words.join(" ")}` : ""}`;
  return category === "הנחה" && sourcePage
    ? `${title} ע׳ ${sourcePage}`
    : title;
}
async function mugahRows(
  raw: { e: Event; raw: string }[],
): Promise<MugahRow[]> {
  const candidates: { e: Event; index: number; title: string; url: string }[] =
    [];
  for (const { e, raw: fragment } of raw) {
    const section =
      exactPane(fragment, "muga-sichos-content") ||
      exactPane(fragment, "muga-content") ||
      "";
    if (!section) continue;
    // Mafteach renders this pane as two <h5> groups containing plain links.
    // Parse those real groups directly; there are no item buttons or IDs here.
    const groups = [
      ...section.matchAll(
        /<h5[^>]*>\s*(ליקוט|הנחה)\s*:?\s*<\/h5>([\s\S]*?)(?=<h5[^>]*>|$)/g,
      ),
    ];
    let itemIndex = 0;
    for (const group of groups) {
      const category = decode(group[1]) as "ליקוט" | "הנחה";
      const references = links(group[2]).filter(
        (item) =>
          /drive\.google|docs\.google|^\//.test(item.url) &&
          /(?:חלק|ח)\s*[׳'״\"]?\s*[א-ת]/.test(item.label),
      );
      for (const link of references) {
        const index = itemIndex++;
        const title = mugahTitle(link.label, category);
        if (!title.includes("חלק")) continue;
        candidates.push({ e, index, title, url: link.url });
      }
    }
  }
  return limited(candidates, 6, async ({ e, index, title, url }) => {
    const p = await documentPages(url);
    const note = !p.transcript
      ? "לא נמצא קובץ לספירת עמודים"
      : p.uncertain
        ? "ייתכנו דפי כריכה, הקדשה או דפים ריקים מחוץ לגוף החומר"
        : "";
    return {
      id: `mugah-${e.id}-${index}`,
      year: e.year,
      title,
      // Volumes א׳–ד׳ use a star instead of a page count in this chart.
      pages: /^[א-ד]׳?$/.test(title.match(/חלק\s+([^\s]+)/)?.[1] || "")
        ? "★"
        : p.transcript
          ? String(p.transcript)
          : "",
      sourceUrl: mafteachUrl(e.sourceUrl),
      confidence: note ? "לבדיקה" : "גבוהה",
      needsReview: !!note,
      reviewNote: note,
    };
  });
}
function farbrengenYearLabel(event: Event, occasionTitle: string) {
  const raw = event.title.trim().replace(/^[-–—]\s*/, "");
  const withoutMotzei = raw.replace(/^מוצאי\s+/, "").trim();
  // "אחרי מעריב" describes the time of a farbrengen, not a different date.
  // It must therefore follow the same no-subtitle rule as מוצאי.
  const withoutAfterMaariv = raw
    .replace(/^(?:אחרי\s+)?מעריב\s*(?:של\s*)?/, "")
    .trim();
  const withoutAfterMaarivPrefix = raw
    .replace(/^אחרי\s+מעריב\s*(?:של\s*)?/, "")
    .trim();
  const withoutLeil = raw.replace(/^ליל\s+/, "").trim();
  // מוצאי belongs to the main date and stays unlabelled; ליל is deliberately
  // retained as the small label, even when it is the same calendar date.
  if (
    occasionKey(raw) === occasionKey(occasionTitle) ||
    occasionKey(withoutMotzei) === occasionKey(occasionTitle) ||
    occasionKey(withoutAfterMaariv) === occasionKey(occasionTitle) ||
    occasionKey(withoutAfterMaarivPrefix) === occasionKey(occasionTitle)
  )
    return event.year;
  if (
    /^ליל\s+/.test(raw) &&
    occasionKey(withoutLeil) === occasionKey(occasionTitle)
  )
    return `${event.year} · ${raw}`;
  const parasha = Array.from(parashot)
    .sort((a, b) => b.length - a.length)
    .find((name) =>
      new RegExp(`(?:ש(?:בת )?פרשת\\s*)?${name}(?:,|$)`).test(raw),
    );
  const subtitle = parasha ? `ש״פ ${parasha}` : raw;
  return subtitle ? `${event.year} · ${subtitle}` : event.year;
}
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const entered = String(body.occasion || "").trim();
  if (!entered)
    return NextResponse.json(
      { ok: false, message: "יש לכתוב תאריך או מועד." },
      { status: 422 },
    );
  try {
    const o = await occasion(entered);
    if (!o)
      return NextResponse.json(
        { ok: false, message: `לא נמצא במפתח מועד בשם „${entered}”.` },
        { status: 404 },
      );
    const url = `${M}/all/moadim/${o.slug}`;
    const dateScript = await text(`${url}.js?include_right_nav=false`);
    const outline = events(dateScript);
    const rawFragments = await limited(outline, 5, async (e) => ({
      e,
      raw: await text(`${M}/all/${e.id}/fragment.js`).catch(() => ""),
    }));
    const [rawRows, lRows, mugah] = await Promise.all([
      mafteach(outline),
      likutei(o.slug),
      mugahRows(rawFragments),
    ]);
    const mRows = await enrichAudioAndFarbrengenDates(
      rawRows,
      outline,
      o.title,
    );
    await addJemVideoRows(mRows, outline);
    const rows: Record<Key, Row[]> = { ...mRows, likutei: lRows };
    const total = Object.values(rows).reduce((n, x) => n + x.length, 0);
    return NextResponse.json({
      ok: true,
      occasion: o.title,
      rows,
      mugah,
      run: {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        rulesCount: Array.isArray(body.rules) ? body.rules.length : 0,
        sources: [
          {
            name: "מפתח",
            url,
            status: outline.length ? "connected" : "review",
            detail: `${outline.length} אירועים נפתחו ונבדקו, כולל קישורי התמלילים.`,
          },
          {
            name: "אודיו",
            url: "https://ashreinu.app",
            status: "connected",
            detail:
              "משך האודיו נלקח מקישור האודיו המדויק בדף ההתוועדות במפתח, ומחבר את כל החלקים שלו.",
          },
          {
            name: "וידאו JEM",
            url: "https://videos.jem.tv/pages/farbrengens",
            status: "connected",
            detail:
              "משך הווידאו נלקח מנתוני JEM לפי התאריך העברי, ומחבר את כל חלקי הווידאו של ההתוועדות.",
          },
          {
            name: "סיווג",
            url: "",
            status: total ? "connected" : "review",
            detail: `${total} שורות נוצרו. כל פריט מסווג פעם אחת בלבד: שיחה או התוועדות.`,
          },
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? `החיבור למקורות נכשל: ${error.message}`
            : "החיבור למקורות נכשל.",
      },
      { status: 502 },
    );
  }
}
