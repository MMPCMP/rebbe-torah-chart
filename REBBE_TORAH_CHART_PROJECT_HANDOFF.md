# Rebbe Torah Chart — Complete Project Handoff

## 1. Project purpose

This project is a Hebrew, right-to-left web application that automatically creates learning-allocation charts for a Chassidic date or occasion. A user enters an occasion such as `י״ב–י״ג תמוז`, chooses one or more chart types, reviews and edits the generated data, and downloads each chart as PDF or Word.

Production site:

https://rebbe-torah-chart.minimimi123go.chatgpt.site

The app is currently hosted with ChatGPT Sites. The Sites project ID is stored in `.openai/hosting.json`; preserve that file and project ID when continuing the existing site.

## 2. Technology

- TypeScript
- React 19
- Next.js-compatible app structure compiled with Vinext/Vite
- Cloudflare Worker-compatible server output
- `docx` npm package for Word generation
- CSS print layouts for browser-generated PDFs
- No database is currently used
- No user login is required
- Hebrew RTL interface

The app is not a single HTML file and it is not Python. The important editable files are:

- `app/page.tsx` — all main interface, chart rendering, editing controls, download buttons, and client state
- `app/globals.css` — visual design, table dimensions, fonts, responsive behavior, and PDF/print rules
- `app/api/generate/route.ts` — data collection, matching, parsing, page counts, video-duration matching, and chart-row generation
- `app/api/export-docx/route.ts` — Word document generation for all three chart types
- `public/jem-video-metadata.json` — video metadata derived from the supplied Excel workbook
- `public/fonts/` — the Hebrew fonts required for the intended design
- `.openai/hosting.json` — existing Sites identity; do not replace its project ID

## 3. Running and editing locally

Requirements: Node.js 22.13 or newer and npm.

From the project directory:

```bash
npm run install:ci
npm run dev
```

Build and validate:

```bash
npm run build
```

The repository contains the lockfile and all source files. `node_modules` and generated `dist` output are intentionally not included in the source archive; they are recreated by installation/build commands.

## 4. Main user flow

1. Enter a Hebrew or English date/occasion.
2. Select one or more chart types. At least one type must remain selected.
3. Generate the charts.
4. Review source status and rows marked for manual checking.
5. Use `תיקון ידני` to edit cells, move rows, duplicate rows, approve warnings, delete rows, or add rows.
6. Download all selected charts, or use the download buttons next to an individual chart.

The front page is intentionally minimal. It contains the date input, chart-type choices, generation button, and access to the rules. The following explanatory content was deliberately removed:

- The sentence listing alternate date spellings
- The `חיפוש באשרינו ← בדיקה במפתח ← יצירת טבלאות` strip
- The entire `כך זה יעבוד` section and four automatic-fill cards

Do not restore those items unless the user explicitly asks.

## 5. Chart types

### A. Full chart (`standard`)

Contains four sections:

1. `התוועדויות`
2. `שיחות`
3. `מאמרים`
4. `לקוטי שיחות`

The title at the top is:

`~ חלוקת תורת רבינו על [occasion] ~`

#### Farbrengens columns

- שנה
- אודיו
- וידאו
- עמודים בלה״ק
- עמודים באידיש
- שם ושם האם
- שם משפחה
- למדתי

The final three student columns remain blank.

#### Sichos columns

- שנה
- אודיו
- וידאו
- עמודים בלה״ק
- עמודים באידיש
- שם ושם האם
- שם משפחה
- למדתי

#### Maamarim columns

- שנה
- דיבור המתחיל
- עמודים
- שם ושם האם
- שם משפחה
- למדתי

Prefer a mugah maamar. If unavailable, prefer a bilti-mugah new edition. Append `מוגה` after the title when applicable.

#### Likkutei Sichos columns

- חלק
- שיחה
- עמודים
- שם ושם האם
- שם משפחה
- למדתי

Display only the Hebrew chelek letters in the chelek column, not the word `חלק`. Consecutive rows from the same chelek visually share the chelek cell. The title column contains the bracketed sicha title. Hosafos entries use `הוספות ע׳ ...`. Page ranges use an en dash with spaces, high number first; if equal, write one number.

### B. Mugah chart (`mugah`)

Title:

`מפתח לחלקים המוגהים של ההתוועדויות של [occasion]`

Columns:

- שנה
- ספר
- עמודים

The chart is split into two equal side-by-side halves. On screen it uses two tables. For PDF it uses a single six-column table so both sides remain aligned and paginate correctly.

Data must be taken from the same Mafteach event area used for ordinary farbrengens, but from the `מוגה` pane rather than `בלתי מוגה`.

There may be two categories, or only one:

- `ליקוט`
- `הנחה`

Formatting examples:

- Source: `ח״ט ע׳ 162 (תבא ב)`
- Output: `לקו״ש חלק ט׳ תבא ב׳`

For `הנחה`, insert `הוספות` after the chelek and append the page:

- Source: `ח״ד ע׳ 1322 (י״ב–י״ג תמוז)`
- Output: `לקו״ש חלק ד׳ הוספות י״ב–י״ג תמוז ע׳ 1322`

Every entry starts with `לקו״ש`. Titles wrap to a second line rather than entering the next column. Corresponding left/right rows have equal heights. For the first four chalakim, page count displays `*` rather than a number.

Source hyperlinks appear only in the year cells, not in title or page-count cells.

### C. Compact farbrengen chart (`compact`)

Title:

`פרטי ההתוועדויות של [occasion]`

Contains the farbrengen information in two side-by-side halves. Columns in each half:

- שנה
- אודיו
- וידאו
- עמודים בתו״מ
- עמודים בשיחו״ק

On-screen layout uses two tables. PDF uses a single ten-column table to keep both sides aligned. Source hyperlinks appear only in year cells.

## 6. Data sources and collection rules

### Mafteach

The server scans Mafteach (`mafteiach.app`) for the occasion and its events. Mafteach is the main authority for event structure, source documents, mugah/non-mugah sections, maamarim, and Likkutei Sichos.

### Ashreinu

Ashreinu provides event audio. Follow the Mafteach event’s audio link, use the parent event, gather all distinct recordings in the event tree, and sum all parts. Do not guess audio durations.

### Transcripts and page counts

- `תו״מ התוועדויות` counts as the Hebrew transcript.
- `שיחו״ק` counts as the Yiddish transcript.
- Count transcript body pages only.
- Exclude covers, dedications, blank pages, and unrelated pages.
- If the source says `בהוס׳ לשיחו״ק` or `שיחו״ק (נקודות)`, do not fill that language’s page count; mark it for manual review.
- When no resource is available, show a centered dash rather than invented information.

### Classification

The Mafteach link is authoritative. The application distinguishes farbrengens and sichos using event structure and available parts. Avoid title-only guessing when a direct event link exists.

## 7. Video duration system

Video data comes from the user-supplied Excel workbook, converted into `public/jem-video-metadata.json`.

Workbook meaning:

- Column 1: Jewish year as a number, e.g. `5786`
- Column 2: Jewish month number/name, where Tishrei = 1, Cheshvan = 2, etc.
- Column 3: English video title; not every title says Farbrengen
- Duration column: video duration

Current matching rules:

1. Match the Jewish year and month exactly.
2. Do not filter by the word `Farbrengen` or any other title word.
3. Include every valid-duration video dated on the target day or within two days before/after it.
4. If no dated video matches and exactly one undated video exists in that year/month, use it and mark the result approximate.
5. Sum every matched item into the displayed video total.
6. Invalid spreadsheet summary/footer rows are ignored because their duration is not a valid time.

Website interaction:

- Hover or keyboard-focus the video total to see every included video title and its individual duration.
- Each item has an `×` button.
- Removing an item immediately recalculates the total.
- The breakdown does not appear in PDF/Word; only the adjusted total is exported.

## 8. Editing behavior

Manual editing must work in all chart types.

For full-chart rows, the user can:

- Edit every cell
- Move a row up/down
- Duplicate a row
- Mark a review warning approved
- Delete a row
- Add a row

For mugah rows, the user can edit year, title, and pages and delete rows.

For compact charts, edits update the underlying farbrengen rows, so the compact and full views remain consistent.

When adding or duplicating rows, generate a unique row ID. Preserve source URLs and review metadata unless the user intentionally changes them.

## 9. Downloads

Each chart has its own Word and PDF buttons next to it. The top buttons download all selected charts. Word downloads are separate `.docx` files, one per selected chart. PDF uses the browser print dialog.

### Word

- Generated by `app/api/export-docx/route.ts`
- All three chart types must work
- The mugah and compact tables are split side-by-side in one physical table
- Source links for the two smaller charts appear only in year cells
- Full-chart source-link rules:
  - Farbrengens and sichos: link by year
  - Maamarim and Likkutei Sichos: link the relevant title
- Preserve the embedded font choices and RTL alignment

### PDF

- Generated with print CSS in `app/globals.css`
- Each selected chart begins on a new A4 page
- The two smaller charts use one unified print table, avoiding unequal grid pagination
- A delayed double `requestAnimationFrame` is used before `window.print()` so React has time to apply the correct `data-print-only` selection
- When one chart’s PDF button is used, only that chart prints

## 10. Dedication requirement

Exact text:

`לע״נ הרה״ש חיים מרדכי ז״ל בן יבדלחט״א הרה״ש יוסף יצחק שי׳`

`חיים מרדכי` and `יוסף יצחק` are bold.

Rules:

- It appears at the bottom of the first page of every chart.
- It must not repeat on later pages.
- It applies to every chart type: full, mugah, and compact.
- If multiple chart types are generated, each chart has its own first-page dedication.
- Word uses a first-page-only footer (`titlePage: true` and `footers.first`).
- PDF uses one `.paper-memorial` per chart, anchored at the bottom area of that chart’s first A4 sheet.
- Do not move it to the bottom of the entire multi-page chart.

## 11. Fonts and visual rules

The application includes custom fonts in `public/fonts`. Do not replace them casually; the chart design depends on them.

Key font families defined in CSS include:

- Rebbe LeBe / BA Le-Be for main chart titles and dedication
- Rebbe Shefa for headers and numeric columns
- Rebbe Hadasa for textual cell content
- Rebbe Carizma for chelek values
- Rebbe Eleganti for the word `מוגה`

Important sizing rules already encoded in CSS/Word generation:

- Full-chart section headers: large display type
- Farbrengen header cells: generally 14 pt; name columns 18 pt
- Other chart headers: generally 18 pt; audio/video/page/learned columns 14 pt as applicable
- Audio/video values: about 15 pt
- Page-count values: generally 16 pt; Likkutei Sichos page count 14 pt
- Textual values: generally 12 pt
- Small date beneath a farbrengen year: about 9 pt
- Dedication: 10 pt

## 12. Date and label normalization

The generator accepts multiple spellings and languages for dates/occasions. It normalizes common Hebrew punctuation, Hebrew/English names, and occasion variants. Existing examples and aliases include Tu BiShvat, Lag BaOmer, Hebrew date spellings, and punctuation variants.

Display rules for farbrengen year/date labels:

- Year is large.
- Show a smaller date/title only when it differs meaningfully from the requested occasion.
- Do not print `מוצאי [date]` as a separate small date.
- Do preserve `ליל [date]` where relevant.
- Parasha labels use `ש״פ [parasha]`.

## 13. Review and error behavior

- Never silently invent missing durations, transcripts, or page counts.
- Rows with uncertain matches have `needsReview`, `confidence`, and `reviewNote` metadata.
- The website shows review flags and explanatory hover text.
- Review markings are hidden from final print output.
- The run report lists source status as connected, review, or unavailable.
- A failure to reach one source should not present sample data as freshly collected data.

## 14. Performance notes

The generator performs several remote lookups, PDF inspections, and page counts, so chart creation can take time. Existing code uses limited concurrency and caches repeated lookups. Preserve those controls; unrestricted parallel fetching can overwhelm source sites or the Worker’s 128 MB memory limit.

Potential future optimization should focus on:

- Reusing event/document results within a generation run
- Avoiding repeated PDF downloads
- Maintaining bounded concurrency
- Returning partial source status clearly

Do not trade correctness for speed by guessing missing values.

## 15. Known architecture cautions

- `app/page.tsx` is large and contains most client behavior. Refactoring is possible, but first preserve all current interactions and print selectors.
- `app/globals.css` contains several generations of print rules. Later rules intentionally override earlier ones. Test full, mugah, compact, single-chart, and multi-chart printing after any cleanup.
- The mugah Word bug was caused by placing an array of `TextRun` objects as a nested single paragraph child. The correct form is a flat `children` array.
- The smaller PDF charts should continue using their `.split-print-table` versions during printing; the two on-screen grid tables are hidden in print.
- Do not remove `public/jem-video-metadata.json`; it is required for video totals.
- Keep `.openai/hosting.json` and its current project ID when publishing updates to the same site.
- Never commit `node_modules`, `dist`, credentials, or temporary archives.

## 16. Validation checklist for future changes

Before publishing, verify:

1. The production build succeeds.
2. Full chart generates and can be manually edited.
3. Mugah chart appears and title parsing is correct for both `ליקוט` and `הנחה`.
4. Compact and mugah charts are side-by-side and centered.
5. Long mugah titles wrap without crossing columns; opposite rows remain aligned.
6. Individual Word downloads work for all three chart types.
7. Individual PDF buttons print only the chosen chart.
8. Multi-chart PDF places each chart on a new page.
9. Each chart’s dedication is at the bottom of its first page only.
10. Source links in the two smaller charts exist only in year cells.
11. Video totals include all nearby titles, show a hover/focus breakdown, and recalculate when an item is removed.
12. Removed video items do not return in the downloaded total during that session.
13. Missing data displays a dash and uncertain data is marked for review.
14. Hebrew RTL layout and custom fonts are preserved.

## 17. Instructions to another AI coding agent

Use the supplied source archive as the authoritative current codebase. Do not rebuild the project from scratch. Read this handoff and then inspect `.openai/hosting.json`, `package.json`, `app/page.tsx`, `app/globals.css`, `app/api/generate/route.ts`, and `app/api/export-docx/route.ts` before editing.

Preserve all existing features unless the user explicitly requests a change. Make the smallest coherent fix, build the project, and test the exact affected chart/download path. If publishing through ChatGPT Sites, reuse the existing Sites project ID and repository; save a new version and ask for explicit approval before publishing publicly.

When requirements are ambiguous, ask for a concrete example or screenshot instead of changing unrelated formatting. Treat the user’s latest instruction as authoritative over older behavior, but retain unrelated decisions documented here.

## 18. Copy-and-paste continuation prompt

```text
Continue the existing Rebbe Torah Chart project from the attached source archive. Do not recreate it from scratch. First read REBBe_TORAH_CHART_PROJECT_HANDOFF.md completely, then inspect the current source files. Preserve every existing feature and formatting rule unless I explicitly ask to change it.

This is a TypeScript/React/Vinext app hosted with ChatGPT Sites. The main files are app/page.tsx, app/globals.css, app/api/generate/route.ts, app/api/export-docx/route.ts, and public/jem-video-metadata.json. Keep the existing .openai/hosting.json project ID if publishing to the same site.

For each requested change: diagnose the existing behavior, make the smallest safe code edit, run the production build, test the affected chart and its Word/PDF download behavior, and summarize exactly what changed. Do not publish a public version until I explicitly approve it.

My next requested change is:
[WRITE THE NEW REQUEST HERE]
```

