"use client";

import { useMemo, useState } from "react";

type SectionKey = "farbrengens" | "sichos" | "maamarim" | "likutei";
type VideoItem = { id: string; title: string; duration: string; seconds: number };
type Row = Record<string, string | boolean | VideoItem[] | undefined> & {
  id: string;
  sourceUrl?: string;
  confidence?: string;
  needsReview?: boolean;
  reviewNote?: string;
};
type Stage = "start" | "researching" | "result" | "rules";
type ChartType = "standard" | "mugah" | "compact";
type SourceRun = {
  id: string;
  createdAt: string;
  rulesCount: number;
  sources: {
    name: string;
    url: string;
    status: "connected" | "review" | "unavailable";
    detail: string;
  }[];
};
type CustomSection = { id: string; title: string; rows: Row[] };
type MugahRow = {
  id: string;
  year: string;
  title: string;
  pages: string;
  sourceUrl?: string;
  confidence?: string;
  needsReview?: boolean;
  reviewNote?: string;
};

const sectionInfo: Record<
  SectionKey,
  { title: string; columns: { key: string; label: string; wide?: boolean }[] }
> = {
  farbrengens: {
    title: "התוועדויות",
    columns: [
      { key: "year", label: "שנה" },
      { key: "audio", label: "אודיו" },
      { key: "video", label: "וידאו" },
      { key: "hebrew", label: "עמודים בלה״ק" },
      { key: "yiddish", label: "עמודים באידיש" },
      { key: "mother", label: "שם ושם האם", wide: true },
      { key: "family", label: "שם משפחה", wide: true },
      { key: "learned", label: "למדתי" },
    ],
  },
  sichos: {
    title: "שיחות",
    columns: [
      { key: "year", label: "שנה", wide: true },
      { key: "audio", label: "אודיו" },
      { key: "video", label: "וידאו" },
      { key: "hebrew", label: "עמודים בלה״ק" },
      { key: "yiddish", label: "עמודים באידיש" },
      { key: "mother", label: "שם ושם האם", wide: true },
      { key: "family", label: "שם משפחה", wide: true },
      { key: "learned", label: "למדתי" },
    ],
  },
  maamarim: {
    title: "מאמרים",
    columns: [
      { key: "year", label: "שנה" },
      { key: "dibur", label: "דיבור המתחיל", wide: true },
      { key: "pages", label: "עמודים" },
      { key: "mother", label: "שם ושם האם", wide: true },
      { key: "family", label: "שם משפחה", wide: true },
      { key: "learned", label: "למדתי" },
    ],
  },
  likutei: {
    title: "לקוטי שיחות",
    columns: [
      { key: "volume", label: "חלק" },
      { key: "item", label: "שיחה", wide: true },
      { key: "pages", label: "עמודים" },
      { key: "mother", label: "שם ושם האם", wide: true },
      { key: "family", label: "שם משפחה", wide: true },
      { key: "learned", label: "למדתי" },
    ],
  },
};

const demoRows: Record<SectionKey, Row[]> = {
  farbrengens: [
    {
      id: "f1",
      year: "תש״י",
      audio: "—",
      video: "—",
      hebrew: "13",
      yiddish: "6",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "f2",
      year: "תשי״א",
      audio: "1:47:58",
      video: "—",
      hebrew: "38",
      yiddish: "18",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "f3",
      year: "תשי״ב",
      audio: "—",
      video: "—",
      hebrew: "7",
      yiddish: "4",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "f4",
      year: "תשי״ב · י״ג תמוז",
      audio: "—",
      video: "—",
      hebrew: "25",
      yiddish: "19",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "f5",
      year: "תשי״ג",
      audio: "—",
      video: "—",
      hebrew: "31",
      yiddish: "23",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "f6",
      year: "תשי״ד",
      audio: "2:26:21",
      video: "—",
      hebrew: "46",
      yiddish: "24",
      mother: "",
      family: "",
      learned: "",
    },
  ],
  sichos: [
    {
      id: "s1",
      year: "תשמ״ח · ליל י״ב תמוז",
      audio: "16:28",
      video: "17:05",
      hebrew: "16",
      yiddish: "—",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "s2",
      year: "תשמ״ח · י״ב תמוז",
      audio: "17:18",
      video: "17:54",
      hebrew: "16",
      yiddish: "—",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "s3",
      year: "תשמ״ח · י״ג תמוז",
      audio: "20:00",
      video: "20:45",
      hebrew: "—",
      yiddish: "—",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "s4",
      year: "תשמ״ט · מוצאי י״ג תמוז",
      audio: "13:29",
      video: "13:31",
      hebrew: "4",
      yiddish: "—",
      mother: "",
      family: "",
      learned: "",
    },
  ],
  maamarim: [
    {
      id: "m1",
      year: "תשי״א",
      dibur: "נתת ליראיך נס להתנוסס",
      pages: "7",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "m2",
      year: "תשי״ב",
      dibur: "נתת ליראיך נס להתנוסס",
      pages: "10",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "m3",
      year: "תשי״ג",
      dibur: "למען דעת כל עמי הארץ",
      pages: "17",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "m4",
      year: "תשי״ד",
      dibur: "למען יחלצון ידידיך",
      pages: "24",
      mother: "",
      family: "",
      learned: "",
    },
  ],
  likutei: [
    {
      id: "l1",
      volume: "חלק ד׳",
      item: "י״ב–י״ג תמוז",
      pages: "8",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "l2",
      volume: "חלק י״ח",
      item: "י״ב–י״ג תמוז",
      pages: "10",
      mother: "",
      family: "",
      learned: "",
    },
    {
      id: "l3",
      volume: "חלק י״ח",
      item: "הוספות ע׳ 397 – 390",
      pages: "8",
      mother: "",
      family: "",
      learned: "",
    },
  ],
};

const defaultRules = [
  "באשרינו: לסרוק את כל האירועים, לבדוק גם תאריכים סמוכים, ולהכניס רק הקלטות שבאמת שייכות למועד.",
  "במפתח: לעבור על לשונית המועד לפי שנים; להתוועדויות, שיחות ומאמרים להשתמש באזור שיחות ומאמרים.",
  "בהתוועדויות: להשתמש רק בבלתי מוגה. שיחו״ק נחשב תמליל באידיש; תו״מ התוועדויות נחשב תמליל בלה״ק.",
  "אם מופיעים ׳בהוס׳ לשיחו״ק׳ או ׳שיחו״ק (נקודות)׳: לא למלא את מספר העמודים באותה שפה; לסמן את השורה לבדיקה ידנית.",
  "מספרי עמודים בתמלילים צריכים לכלול רק את גוף התמליל; דפי כריכה, הקדשה ודפים ריקים אינם חלק מהמספר.",
  "בשיחות: לרשום שנה בלבד בעמודה הראשונה, אודיו, וידאו ומספר עמודים בלה״ק ובאידיש.",
  "במאמרים: לבחור מוגה; אם אינו קיים, לבחור בלתי מוגה במהדורה חדשה. אחרי שם מאמר מוגה לכתוב מוגה.",
  "בלקוטי שיחות: לרשום חלק באותיות עבריות; בשיחה לכתוב רק את הכותרת שבתוך הסוגריים ולפתוח ראשי תיבות מוכרים. בהוספות לכתוב הוספות ע׳ ומספרי עמודים בסדר יורד עם רווחים משני צדי המקף; כששני המספרים זהים לכתוב את המספר פעם אחת. בעמודת עמודים נפרדת לרשום את מספר העמודים.",
  "העמודות שם ושם האם, שם משפחה ולמדתי נשארות תמיד ריקות.",
];

const blankFor = (key: SectionKey): Row => ({
  id: `${key}-${Date.now()}`,
  ...Object.fromEntries(sectionInfo[key].columns.map((c) => [c.key, ""])),
  needsReview: true,
  confidence: "ידני",
});
const blankCustom = (): Row => ({
  id: `custom-${Date.now()}`,
  year: "",
  audio: "",
  video: "",
  hebrew: "",
  yiddish: "",
  mother: "",
  family: "",
  learned: "",
  needsReview: true,
  confidence: "ידני",
});

const hebrewNumeral = (raw: string) => {
  const unmarked = raw.trim().replace(/[׳'״"]/g, "");
  const number = Number(unmarked.replace(/\D/g, ""));
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const letters =
    Number.isFinite(number) && number >= 1 && number <= 30
      ? number === 15
        ? "טו"
        : number === 16
          ? "טז"
          : number < 10
            ? ones[number]
            : tens[Math.floor(number / 10)] + ones[number % 10]
      : unmarked;
  if (!/^[א-ת]{1,2}$/.test(letters)) return raw;
  return letters.length === 1
    ? `${letters}׳`
    : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
};
const volumeLabel = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/^חלק\s*/, "")
    .replace(/[׳'״\"]/g, "");
  if (!cleaned || cleaned === "הוספות") return cleaned;
  return hebrewNumeral(cleaned);
};
const YearLabel = ({ value }: { value: string }) => {
  const [year, ...date] = value.split("·").map((x) => x.trim());
  return (
    <span className="year-label">
      <b>{year}</b>
      {date.length > 0 && <small>{date.join(" · ")}</small>}
    </span>
  );
};
const EmptyValue = () => (
  <span className="empty-value" aria-label="לא זמין">
    –
  </span>
);
const CellValue = ({
  value,
  showDash = true,
}: {
  value: string;
  showDash?: boolean;
}) => (value.trim() ? <span>{value}</span> : showDash ? <EmptyValue /> : null);
const LekuteiItemValue = ({ value }: { value: string }) => {
  // In הוספות, the words follow the letter typeface while the page numerals
  // follow the dedicated numeral typeface.  Other sicha titles stay entirely
  // in the 12 pt letter typeface.
  if (!/^הוספות\s+ע[׳']\s+/.test(value.trim()))
    return <CellValue value={value} />;
  const parts = value.split(/(\d+)/g);
  return (
    <span className="hosafos-value">
      {parts.map((part, index) =>
        /^\d+$/.test(part) ? (
          <b className="hosafos-number" key={index}>
            {part}
          </b>
        ) : (
          <i className="hosafos-letters" key={index}>
            {part}
          </i>
        ),
      )}
    </span>
  );
};
const MaamarValue = ({ value }: { value: string }) => {
  const match = value.match(/^(.*?)(\s+מוגה)$/);
  return match ? (
    <span>
      {match[1]}
      <span className="mugah">{match[2]}</span>
    </span>
  ) : (
    <CellValue value={value} />
  );
};
const displayDuration = (seconds: number) => {
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
};
const VideoBreakdown = ({
  value,
  items,
  onRemove,
}: {
  value: string;
  items: VideoItem[];
  onRemove: (id: string) => void;
}) => {
  if (!items.length) return <CellValue value={value} />;
  return (
    <span className="video-breakdown" tabIndex={0}>
      <span className="video-total">{value || "–"}</span>
      <span className="video-popover" role="tooltip">
        <b>הסרטונים שנכללו בסך הכול</b>
        {items.map((item) => (
          <span className="video-item" key={item.id}>
            <button
              type="button"
              title="הסרה מהסכום"
              aria-label={`הסרת ${item.title} מהסכום`}
              onClick={(event) => {
                event.stopPropagation();
                onRemove(item.id);
              }}
            >
              ×
            </button>
            <span>{item.title}</span>
            <i>{item.duration}</i>
          </span>
        ))}
        <small>לחצו × כדי להסיר סרטון מהסכום</small>
      </span>
    </span>
  );
};
const volumeRun = (list: Row[], index: number) => {
  const volume = volumeLabel(String(list[index].volume || ""));
  const isFirst =
    index === 0 || volumeLabel(String(list[index - 1].volume || "")) !== volume;
  if (!isFirst) return { isFirst: false, span: 0, volume };
  let span = 1;
  while (
    index + span < list.length &&
    volumeLabel(String(list[index + span].volume || "")) === volume
  )
    span++;
  return { isFirst: true, span, volume };
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("start");
  const [occasion, setOccasion] = useState("י״ב–י״ג תמוז");
  const [rows, setRows] = useState<Record<SectionKey, Row[]>>(demoRows);
  const [mugah, setMugah] = useState<MugahRow[]>([]);
  const [chartTypes, setChartTypes] = useState<ChartType[]>(["standard"]);
  const [printOnly, setPrintOnly] = useState<ChartType | null>(null);
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<SourceRun | null>(null);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [error, setError] = useState("");
  const [rules, setRules] = useState<string[]>(() =>
    typeof window === "undefined"
      ? defaultRules
      : JSON.parse(localStorage.getItem("rebbe-chart-rules") || "null") ||
        defaultRules,
  );
  const total = useMemo(
    () => Object.values(rows).reduce((n, x) => n + x.length, 0),
    [rows],
  );

  const generate = async () => {
    if (!occasion.trim()) return;
    setError("");
    setStage("researching");
    setProgress(12);
    const timer = window.setInterval(
      () => setProgress((old) => Math.min(old + 9, 82)),
      350,
    );
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasion, rules }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.message || "ההרצה נכשלה");
      setProgress(100);
      setOccasion(data.occasion);
      setRows(data.rows);
      setMugah(data.mugah || []);
      setRun(data.run);
      localStorage.setItem(
        "rebbe-chart-last-run",
        JSON.stringify({
          occasion: data.occasion,
          rows: data.rows,
          run: data.run,
        }),
      );
      window.setTimeout(() => setStage("result"), 250);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ההרצה נכשלה");
      setStage("start");
    } finally {
      window.clearInterval(timer);
    }
  };
  const updateCell = (s: SectionKey, id: string, key: string, value: string) =>
    setRows((old) => ({
      ...old,
      [s]: old[s].map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    }));
  const moveRow = (s: SectionKey, id: string, direction: -1 | 1) =>
    setRows((old) => {
      const list = [...old[s]],
        at = list.findIndex((r) => r.id === id),
        to = at + direction;
      if (at < 0 || to < 0 || to >= list.length) return old;
      [list[at], list[to]] = [list[to], list[at]];
      return { ...old, [s]: list };
    });
  const duplicateRow = (s: SectionKey, id: string) =>
    setRows((old) => {
      const list = [...old[s]],
        at = list.findIndex((r) => r.id === id);
      if (at < 0) return old;
      list.splice(at + 1, 0, {
        ...list[at],
        id: `${s}-${Date.now()}`,
        needsReview: true,
        reviewNote: "שוכפל ידנית — יש לבדוק",
      });
      return { ...old, [s]: list };
    });
  const removeVideoItem = (section: SectionKey, rowId: string, itemId: string) =>
    setRows((old) => ({
      ...old,
      [section]: old[section].map((row) => {
        if (row.id !== rowId) return row;
        const items = ((row.videoItems as VideoItem[] | undefined) || []).filter(
          (item) => item.id !== itemId,
        );
        return {
          ...row,
          videoItems: items,
          video: items.length
            ? displayDuration(items.reduce((sum, item) => sum + item.seconds, 0))
            : "",
        };
      }),
    }));
  const updateCustomCell = (
    sectionId: string,
    id: string,
    key: string,
    value: string,
  ) =>
    setCustomSections((old) =>
      old.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              rows: s.rows.map((r) =>
                r.id === id ? { ...r, [key]: value } : r,
              ),
            },
      ),
    );
  const saveRules = () => {
    localStorage.setItem("rebbe-chart-rules", JSON.stringify(rules));
    setStage("start");
  };
  const chartLabel = (type: ChartType) =>
    type === "standard"
      ? "חלוקה מלאה"
      : type === "mugah"
        ? "מפתח חלקים מוגהים"
        : "פרטי התוועדויות";
  const downloadWord = async (types = chartTypes) => {
    for (const type of types) {
      const response = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasion, rows, mugah, chartType: type }),
      });
      if (!response.ok) {
        setError("לא ניתן היה ליצור את קובץ ה-Word.");
        return;
      }
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `חלוקת תורת רבינו - ${occasion} - ${chartLabel(type)}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  };
  const downloadPdf = (type?: ChartType) => {
    setPrintOnly(type || null);
    const clearSelection = () => setPrintOnly(null);
    window.addEventListener("afterprint", clearSelection, { once: true });
    // Wait for React to apply the selected-chart print attribute before the
    // browser takes its print snapshot. A zero-delay timer could capture the
    // previous layout and include or offset the other selected charts.
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => window.print()),
    );
    window.setTimeout(clearSelection, 30000);
  };

  if (stage === "start")
    return (
      <main className="start" dir="rtl">
        <header className="simple-head">
          <div className="brand">
            <span className="brand-mark">מ</span>
            <div>
              <b>מפתח</b>
              <small>מחולל חלוקת תורת רבינו</small>
            </div>
          </div>
          <button className="text-btn" onClick={() => setStage("rules")}>
            כללי המערכת <span>←</span>
          </button>
        </header>
        <section className="hero-card">
          <div className="seal">✦</div>
          <p className="eyebrow">יצירת חלוקה חדשה</p>
          <h1>לאיזה מועד להכין את החלוקה?</h1>
          <p className="lead">
            בחרו תאריך או מועד. המערכת תחפש את החומר המתאים ותמלא את הטבלאות
            אוטומטית לפי הכללים שלכם.
          </p>
          <label>תאריך או מועד חסידי</label>
          <div className="generate-row">
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="לדוגמה: י״ב–י״ג תמוז או Lag BaOmer"
              autoFocus
            />
            <button onClick={generate}>
              יצירת החלוקה <span>←</span>
            </button>
          </div>
          <div
            className="chart-type-picker"
            role="group"
            aria-label="סוג החלוקה"
          >
            {(["standard", "mugah", "compact"] as ChartType[]).map((type) => (
              <button
                key={type}
                className={chartTypes.includes(type) ? "selected" : ""}
                onClick={() =>
                  setChartTypes((old) =>
                    old.includes(type)
                      ? old.length === 1
                        ? old
                        : old.filter((x) => x !== type)
                      : [...old, type],
                  )
                }
              >
                <b>
                  {type === "standard"
                    ? "חלוקה מלאה"
                    : type === "mugah"
                      ? "מפתח חלקים מוגהים"
                      : "פרטי התוועדויות"}
                </b>
                <small>
                  {type === "standard"
                    ? "התוועדויות, שיחות, מאמרים ולקוטי שיחות"
                    : type === "mugah"
                      ? "שנה, לקו״ש ומספר עמודים"
                      : "כל השנים בעמוד אחד, בשני טורים"}
                </small>
              </button>
            ))}
          </div>
          {error && <div className="error-box">{error}</div>}
        </section>
      </main>
    );

  if (stage === "researching")
    return (
      <main className="loading-page" dir="rtl">
        <div className="loader-card">
          <div className="spinner">מ</div>
          <p className="eyebrow">מכין חלוקה על</p>
          <h1>{occasion}</h1>
          <div className="progress">
            <i style={{ width: `${progress}%` }}></i>
          </div>
          <b>
            {progress < 40
              ? "מחפש הקלטות רלוונטיות באשרינו…"
              : progress < 75
                ? "בודק תמלילים ומספרי עמודים במפתח…"
                : chartTypes.length > 1
                  ? "מסדר את כל החלוקות שבחרת…"
                  : chartTypes.includes("mugah")
                    ? "מסדר את החלקים המוגהים…"
                    : chartTypes.includes("compact")
                      ? "מסדר את ההתוועדויות בשני טורים…"
                      : "מסדר את ארבע הטבלאות…"}
          </b>
          <small>{progress}% הושלם</small>
        </div>
      </main>
    );

  if (stage === "rules")
    return (
      <main className="rules-page" dir="rtl">
        <header className="simple-head">
          <button className="text-btn" onClick={() => setStage("start")}>
            → חזרה
          </button>
          <h2>כללי המערכת</h2>
          <button className="primary" onClick={saveRules}>
            שמירת הכללים
          </button>
        </header>
        <section className="rules-card">
          <p>
            הכללים האלה מנחים כל חלוקה חדשה. אפשר לערוך אותם עכשיו ולהוסיף כללים
            נוספים בהמשך.
          </p>
          {rules.map((r, i) => (
            <div className="rule" key={i}>
              <span>{i + 1}</span>
              <textarea
                value={r}
                onChange={(e) =>
                  setRules((old) =>
                    old.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
              <button
                onClick={() => setRules((old) => old.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="add-rule"
            onClick={() => setRules((old) => [...old, ""])}
          >
            ＋ הוספת כלל
          </button>
        </section>
      </main>
    );

  if (editing && false)
    return (
      <main dir="rtl">
        <header className="topbar no-print">
          <button className="primary" onClick={() => setEditing(false)}>
            סיום עריכה
          </button>
        </header>
        <section className="rules-card">
          <h2>תיקון ידני</h2>
          {chartTypes.includes("mugah") && (
            <>
              <h3>מפתח חלקים מוגהים</h3>
              {mugah.map((row) => (
                <div className="rule" key={row.id}>
                  <input
                    aria-label="שנה"
                    value={row.year}
                    onChange={(e) =>
                      setMugah((old) =>
                        old.map((x) =>
                          x.id === row.id ? { ...x, year: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="כותרת"
                    value={row.title}
                    onChange={(e) =>
                      setMugah((old) =>
                        old.map((x) =>
                          x.id === row.id ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="עמודים"
                    value={row.pages}
                    onChange={(e) =>
                      setMugah((old) =>
                        old.map((x) =>
                          x.id === row.id ? { ...x, pages: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <button
                    aria-label="מחיקת שורה"
                    onClick={() =>
                      setMugah((old) => old.filter((x) => x.id !== row.id))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="add-row"
                onClick={() =>
                  setMugah((old) => [
                    ...old,
                    {
                      id: `mugah-${Date.now()}`,
                      year: "",
                      title: "",
                      pages: "",
                      needsReview: true,
                    },
                  ])
                }
              >
                ＋ הוספת שורה
              </button>
            </>
          )}
          {chartTypes
            .filter((type) => type !== "mugah")
            .map((type) => (
              <div key={type}>
                <h3>
                  {type === "standard" ? "חלוקה מלאה" : "פרטי התוועדויות"}
                </h3>
                {(type === "standard"
                  ? (Object.keys(sectionInfo) as SectionKey[])
                  : ["farbrengens" as SectionKey]
                ).map((section) => (
                  <div key={section}>
                    <h4>{sectionInfo[section].title}</h4>
                    {rows[section].map((row) => (
                      <div className="rule" key={row.id}>
                        {sectionInfo[section].columns.map((column) => (
                          <input
                            key={column.key}
                            aria-label={column.label}
                            value={String(row[column.key] || "")}
                            onChange={(e) =>
                              updateCell(
                                section,
                                row.id,
                                column.key,
                                e.target.value,
                              )
                            }
                          />
                        ))}
                        <button
                          aria-label="מחיקת שורה"
                          onClick={() =>
                            setRows((old) => ({
                              ...old,
                              [section]: old[section].filter(
                                (x) => x.id !== row.id,
                              ),
                            }))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="add-row"
                      onClick={() =>
                        setRows((old) => ({
                          ...old,
                          [section]: [...old[section], blankFor(section)],
                        }))
                      }
                    >
                      ＋ הוספת שורה
                    </button>
                  </div>
                ))}
              </div>
            ))}
        </section>
      </main>
    );
  const chartType = chartTypes[0];
  const compactColumns = sectionInfo.farbrengens.columns.filter((column) =>
    ["year", "audio", "video", "hebrew", "yiddish"].includes(column.key),
  );
  const splitRows = (list: Row[]) => [
    list.slice(0, Math.ceil(list.length / 2)),
    list.slice(Math.ceil(list.length / 2)),
  ];
  return (
    <main dir="rtl" data-print-only={printOnly || ""}>
      <header className="topbar no-print">
        <div className="brand">
          <span className="brand-mark">מ</span>
          <div>
            <b>מפתח</b>
            <small>חלוקה על {occasion}</small>
          </div>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => setStage("start")}>
            מועד חדש
          </button>
          <button className="ghost" onClick={() => setEditing(!editing)}>
            {editing ? "סיום עריכה" : "תיקון ידני"}
          </button>
          <button className="ghost" onClick={downloadWord}>
            הורדת Word — כל החלוקות שנבחרו
          </button>
          <button className="primary" onClick={() => downloadPdf()}>
            הורדת PDF — כל החלוקות שנבחרו
          </button>
        </div>
      </header>
      <div className="result-shell">
        <div className="result-summary no-print">
          <div>
            <span className="success">✓</span>
            <div>
              <h2>החלוקה מוכנה לבדיקה</h2>
              <p>
                נמצאו {total} פריטים עבור {occasion}. נתונים לא מאומתים נשארים
                מסומנים.
              </p>
            </div>
          </div>
          <div className="result-counts">
            {(Object.keys(sectionInfo) as SectionKey[]).map((k) => (
              <span key={k}>
                <b>{rows[k].length}</b>
                {sectionInfo[k].title}
              </span>
            ))}
          </div>
        </div>
        {run && (
          <section className="run-panel no-print">
            <div className="run-title">
              <div>
                <h3>דו״ח ההרצה</h3>
                <p>
                  כל מקור מדווח בנפרד; נתוני דוגמה אינם מוצגים כאילו נאספו
                  אוטומטית.
                </p>
              </div>
              <small>{new Date(run.createdAt).toLocaleString("he-IL")}</small>
            </div>
            <div className="source-cards">
              {run.sources.map((source) => (
                <div
                  key={source.name}
                  className={`source-card ${source.status}`}
                >
                  <span>
                    {source.status === "connected"
                      ? "✓"
                      : source.status === "review"
                        ? "!"
                        : "×"}
                  </span>
                  <div>
                    <b>{source.name}</b>
                    <p>{source.detail}</p>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        פתיחת המקור ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {chartTypes.map((chartType) => (
          <article key={chartType} className={`paper ${chartType}`}>
            <div className="chart-downloads no-print">
              <b>{chartLabel(chartType)}</b>
              <button onClick={() => downloadWord([chartType])}>
                הורדת Word
              </button>
              <button onClick={() => downloadPdf(chartType)}>הורדת PDF</button>
            </div>
            <div className="paper-kicker">ב״ה</div>
            {chartType === "mugah" ? (
              <>
                <h1>מפתח לחלקים המוגהים של ההתוועדויות של {occasion}</h1>
                <section className="mugah-grid">
                  {[
                    mugah.slice(0, Math.ceil(mugah.length / 2)),
                    mugah.slice(Math.ceil(mugah.length / 2)),
                  ].map((half, index) => (
                    <table className="mugah-table" key={index}>
                      <thead>
                        <tr>
                          <th>שנה</th>
                          <th>ספר</th>
                          <th>עמודים</th>
                        </tr>
                      </thead>
                      <tbody>
                        {half.map((row) => (
                          <tr
                            key={row.id}
                            className={row.needsReview ? "needs-review" : ""}
                          >
                            <td>
                              {editing ? (
                                <input
                                  value={row.year}
                                  onChange={(e) =>
                                    setMugah((old) =>
                                      old.map((x) =>
                                        x.id === row.id
                                          ? { ...x, year: e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              ) : (
                                row.sourceUrl ? (
                                  <a
                                    className="year-source-link"
                                    href={row.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="פתיחת המקור"
                                  >
                                    {row.year}
                                  </a>
                                ) : (
                                  row.year
                                )
                              )}
                            </td>
                            <td>
                              {editing ? (
                                <input
                                  value={row.title}
                                  onChange={(e) =>
                                    setMugah((old) =>
                                      old.map((x) =>
                                        x.id === row.id
                                          ? { ...x, title: e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              ) : (
                                row.title
                              )}
                            </td>
                            <td>
                              {editing ? (
                                <input
                                  value={row.pages}
                                  onChange={(e) =>
                                    setMugah((old) =>
                                      old.map((x) =>
                                        x.id === row.id
                                          ? { ...x, pages: e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              ) : (
                                row.pages || "–"
                              )}
                            </td>
                            {editing && (
                              <td className="row-tools no-print">
                                <button
                                  onClick={() =>
                                    setMugah((old) =>
                                      old.filter((x) => x.id !== row.id),
                                    )
                                  }
                                >
                                  ×
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </section>
                <table className="mugah-table split-print-table">
                  <thead>
                    <tr>
                      <th>שנה</th><th>ספר</th><th>עמודים</th>
                      <th>שנה</th><th>ספר</th><th>עמודים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(mugah.length / 2) }, (_, index) => {
                      const pivot = Math.ceil(mugah.length / 2);
                      const pair = [mugah[index], mugah[index + pivot]];
                      return (
                        <tr key={`mugah-print-${index}`}>
                          {pair.flatMap((row, side) => [
                            <td key={`${side}-year`}>
                              {row?.sourceUrl ? <a className="year-source-link" href={row.sourceUrl}>{row.year}</a> : row?.year || ""}
                            </td>,
                            <td key={`${side}-title`}>{row?.title || ""}</td>,
                            <td key={`${side}-pages`}>{row?.pages || "–"}</td>,
                          ])}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : chartType === "compact" ? (
              <>
                <h1>פרטי ההתוועדויות של {occasion}</h1>
                <section className="compact-grid">
                  {splitRows(rows.farbrengens).map((half, index) => (
                    <table className="compact-table" key={index}>
                      <thead>
                        <tr>
                          {compactColumns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {half.map((row) => (
                          <tr key={row.id}>
                            {compactColumns.map((column) => (
                              <td key={column.key}>
                                {editing ? (
                                  <input
                                    value={String(row[column.key] || "")}
                                    onChange={(e) =>
                                      updateCell(
                                        "farbrengens",
                                        row.id,
                                        column.key,
                                        e.target.value,
                                      )
                                    }
                                  />
                                ) : column.key === "year" ? (
                                  row.sourceUrl ? (
                                    <a
                                      className="year-source-link"
                                      href={String(row.sourceUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="פתיחת המקור"
                                    >
                                      <YearLabel value={String(row.year || "")} />
                                    </a>
                                  ) : (
                                    <YearLabel value={String(row.year || "")} />
                                  )
                                ) : column.key === "video" ? (
                                  <VideoBreakdown
                                    value={String(row.video || "")}
                                    items={(row.videoItems as VideoItem[] | undefined) || []}
                                    onRemove={(itemId) =>
                                      removeVideoItem("farbrengens", row.id, itemId)
                                    }
                                  />
                                ) : (
                                  <CellValue
                                    value={String(row[column.key] || "")}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </section>
                <table className="compact-table split-print-table">
                  <thead>
                    <tr>
                      {[...compactColumns, ...compactColumns].map((column, index) => (
                        <th key={`${column.key}-${index}`}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(rows.farbrengens.length / 2) }, (_, index) => {
                      const pivot = Math.ceil(rows.farbrengens.length / 2);
                      const pair = [rows.farbrengens[index], rows.farbrengens[index + pivot]];
                      return (
                        <tr key={`compact-print-${index}`}>
                          {pair.flatMap((row, side) => compactColumns.map((column) => (
                            <td key={`${side}-${column.key}`}>
                              {!row ? "" : column.key === "year" ? (
                                row.sourceUrl ? <a className="year-source-link" href={String(row.sourceUrl)}><YearLabel value={String(row.year || "")} /></a> : <YearLabel value={String(row.year || "")} />
                              ) : <CellValue value={String(row[column.key] || "")} />}
                            </td>
                          )))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <h1>~ חלוקת תורת רבינו על {occasion} ~</h1>
                {(Object.keys(sectionInfo) as SectionKey[]).map((key) => (
                  <section className="chart-section" key={key}>
                    <h2>{sectionInfo[key].title}</h2>
                    {key === "farbrengens" && (
                      <p className="section-subtitle">
                        מומלץ ללמוד החלקים המוגהים של ההתוועדויות
                      </p>
                    )}
                    <div className="table-wrap">
                      <table className={`chart-table ${key}`}>
                        <colgroup>
                          {sectionInfo[key].columns.map((c) => (
                            <col key={c.key} className={`col-${c.key}`} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            {sectionInfo[key].columns.map((c) => (
                              <th
                                className={`col-${c.key}${c.wide ? " wide" : ""}`}
                                key={c.key}
                              >
                                {c.label}
                              </th>
                            ))}
                            {editing && (
                              <th className="row-tools no-print">עריכה</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rows[key].map((row, rowIndex) => {
                            const run =
                              key === "likutei"
                                ? volumeRun(rows.likutei, rowIndex)
                                : null;
                            return (
                              <tr
                                key={row.id}
                                className={
                                  row.needsReview ? "needs-review" : ""
                                }
                              >
                                {sectionInfo[key].columns.map((c) => {
                                  const studentColumn = [
                                    "mother",
                                    "family",
                                    "learned",
                                  ].includes(c.key);
                                  if (
                                    key === "likutei" &&
                                    c.key === "volume" &&
                                    !editing
                                  ) {
                                    if (!run?.isFirst) return null;
                                    return (
                                      <td
                                        key={c.key}
                                        rowSpan={run.span}
                                        className="volume-cell"
                                      >
                                        <CellValue value={run.volume} />
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={c.key} className={`col-${c.key}`}>
                                      {editing ? (
                                        <textarea
                                          value={String(row[c.key] || "")}
                                          onChange={(e) =>
                                            updateCell(
                                              key,
                                              row.id,
                                              c.key,
                                              e.target.value,
                                            )
                                          }
                                        />
                                      ) : c.key === "year" ? (
                                        <>
                                          <YearLabel
                                            value={String(row[c.key] || "")}
                                          />
                                          {row.needsReview && (
                                            <span
                                              className="review-flag"
                                              title={
                                                row.reviewNote ||
                                                "נדרשת בדיקה ידנית"
                                              }
                                            >
                                              ⚑
                                            </span>
                                          )}
                                        </>
                                      ) : c.key === "video" ? (
                                        <VideoBreakdown
                                          value={String(row[c.key] || "")}
                                          items={(row.videoItems as VideoItem[] | undefined) || []}
                                          onRemove={(itemId) =>
                                            removeVideoItem(key, row.id, itemId)
                                          }
                                        />
                                      ) : key === "likutei" &&
                                        c.key === "volume" ? (
                                        <CellValue
                                          value={volumeLabel(
                                            String(row[c.key] || ""),
                                          )}
                                        />
                                      ) : key === "likutei" &&
                                        c.key === "item" ? (
                                        <LekuteiItemValue
                                          value={String(row[c.key] || "")}
                                        />
                                      ) : key === "maamarim" &&
                                        c.key === "dibur" ? (
                                        <MaamarValue
                                          value={String(row[c.key] || "")}
                                        />
                                      ) : (
                                        <CellValue
                                          value={String(row[c.key] || "")}
                                          showDash={!studentColumn}
                                        />
                                      )}
                                    </td>
                                  );
                                })}
                                {editing && (
                                  <td className="row-tools no-print">
                                    <div className="edit-tools">
                                      <button
                                        title="העברה למעלה"
                                        onClick={() => moveRow(key, row.id, -1)}
                                      >
                                        ↑
                                      </button>
                                      <button
                                        title="העברה למטה"
                                        onClick={() => moveRow(key, row.id, 1)}
                                      >
                                        ↓
                                      </button>
                                      <button
                                        title="שכפול"
                                        onClick={() =>
                                          duplicateRow(key, row.id)
                                        }
                                      >
                                        ⧉
                                      </button>
                                      <button
                                        className="verify"
                                        title="אישור השורה"
                                        onClick={() =>
                                          setRows((old) => ({
                                            ...old,
                                            [key]: old[key].map((r) =>
                                              r.id === row.id
                                                ? {
                                                    ...r,
                                                    needsReview: false,
                                                    reviewNote: "",
                                                  }
                                                : r,
                                            ),
                                          }))
                                        }
                                      >
                                        ✓
                                      </button>
                                      <button
                                        title="מחיקת השורה"
                                        onClick={() =>
                                          setRows((old) => ({
                                            ...old,
                                            [key]: old[key].filter(
                                              (r) => r.id !== row.id,
                                            ),
                                          }))
                                        }
                                      >
                                        ×
                                      </button>
                                      {row.sourceUrl && (
                                        <a
                                          href={String(row.sourceUrl)}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          מקור
                                        </a>
                                      )}
                                    </div>
                                    {row.needsReview && (
                                      <small className="review-note">
                                        {row.reviewNote || "נדרשת בדיקה ידנית"}
                                      </small>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="review-key">
                      ⚑ שורה זו דורשת בדיקה ידנית לפני הדפסה סופית.
                    </p>
                    {editing && (
                      <button
                        className="add-row no-print"
                        onClick={() =>
                          setRows((old) => ({
                            ...old,
                            [key]: [...old[key], blankFor(key)],
                          }))
                        }
                      >
                        ＋ הוספת שורה
                      </button>
                    )}
                  </section>
                ))}
              </>
            )}
            <p className="paper-memorial">
              לע״נ הרה״ש <strong>חיים מרדכי</strong> ז״ל בן יבדלחט״א הרה״ש{" "}
              <strong>יוסף יצחק</strong> שי׳
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
