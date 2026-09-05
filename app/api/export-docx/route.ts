import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from "docx";
import { NextRequest, NextResponse } from "next/server.js";

type Key = "farbrengens" | "sichos" | "maamarim" | "likutei";
type Row = Record<string, string | boolean>;
type ChartType = "standard" | "mugah" | "compact";
type MugahRow = {
  year?: string;
  title?: string;
  pages?: string;
  sourceUrl?: string;
};

const sections: Record<
  Key,
  { title: string; columns: { key: string; label: string }[] }
> = {
  farbrengens: {
    title: "התוועדויות",
    columns: [
      { key: "year", label: "שנה" },
      { key: "audio", label: "אודיו" },
      { key: "video", label: "וידאו" },
      { key: "hebrew", label: "עמודים בלה״ק" },
      { key: "yiddish", label: "עמודים באידיש" },
      { key: "mother", label: "שם ושם האם" },
      { key: "family", label: "שם משפחה" },
      { key: "learned", label: "למדתי" },
    ],
  },
  sichos: {
    title: "שיחות",
    columns: [
      { key: "year", label: "שנה" },
      { key: "audio", label: "אודיו" },
      { key: "video", label: "וידאו" },
      { key: "hebrew", label: "עמודים בלה״ק" },
      { key: "yiddish", label: "עמודים באידיש" },
      { key: "mother", label: "שם ושם האם" },
      { key: "family", label: "שם משפחה" },
      { key: "learned", label: "למדתי" },
    ],
  },
  maamarim: {
    title: "מאמרים",
    columns: [
      { key: "year", label: "שנה" },
      { key: "dibur", label: "דיבור המתחיל" },
      { key: "pages", label: "עמודים" },
      { key: "mother", label: "שם ושם האם" },
      { key: "family", label: "שם משפחה" },
      { key: "learned", label: "למדתי" },
    ],
  },
  likutei: {
    title: "לקוטי שיחות",
    columns: [
      { key: "volume", label: "חלק" },
      { key: "item", label: "שיחה" },
      { key: "pages", label: "עמודים" },
      { key: "mother", label: "שם ושם האם" },
      { key: "family", label: "שם משפחה" },
      { key: "learned", label: "למדתי" },
    ],
  },
};

const border = { style: BorderStyle.SINGLE, size: 4, color: "777777" };
const columnWidths: Record<Key, number[]> = {
  farbrengens: [1080, 1260, 1291, 1103, 974, 2330, 1677, 864],
  sichos: [1080, 1022, 1004, 1079, 1077, 1505, 1545, 2267],
  maamarim: [1348, 2802, 1102, 2700, 1725, 902],
  likutei: [1305, 2241, 1195, 2973, 1981, 884],
};
const numberColumn = (key: string) =>
  ["audio", "video", "hebrew", "yiddish", "pages"].includes(key);
const headerSize = (section: Key, key: string) =>
  section === "farbrengens"
    ? key === "mother" || key === "family"
      ? 36
      : 28
    : numberColumn(key) || key === "learned"
      ? 28
      : 36;

const displayValue = (value: string, key: string, header = false) => {
  if (header || value) return value;
  return ["mother", "family", "learned"].includes(key) ? "" : "–";
};
const sectionInfoLabel = (key: string) =>
  ({
    year: "שנה",
    audio: "אודיו",
    video: "וידאו",
    hebrew: "עמודים בתו״מ",
    yiddish: "עמודים בשיחו״ק",
  })[key] || key;

// Word does not always apply its built-in Hyperlink style to generated DOCX
// files.  Give every Mafteach link an explicit visible style, so it is clear
// that the year/title can be clicked (or Ctrl+clicked) to open the source.
const linkedRun = (text: string, font: string, size: number, bold = false) =>
  new TextRun({
    text,
    font,
    size,
    bold,
    color: "0563C1",
    underline: { type: "single" },
  });

const cell = (
  value: string,
  section: Key,
  key: string,
  header = false,
  sourceUrl = "",
) => {
  value = displayValue(value, key, header);
  const numeric = numberColumn(key);
  const size = header
    ? headerSize(section, key)
    : section === "likutei" && key === "pages"
      ? 28
      : numeric
        ? 32
        : 24;
  const font = header ? "AAd_ShefaClassic" : numeric ? "1Carizma" : "HadasaNew";
  const run =
    sourceUrl && !header
      ? linkedRun(
          value || "",
          font,
          size,
          !numeric && key !== "audio" && key !== "video",
        )
      : new TextRun({
          text: value || "",
          font,
          size,
          bold: header || (!numeric && key !== "audio" && key !== "video"),
        });
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { before: 0, after: 0 },
        children: [
          sourceUrl && !header
            ? new ExternalHyperlink({ link: sourceUrl, children: [run] })
            : run,
        ],
      }),
    ],
    borders: { top: border, bottom: border, left: border, right: border },
    margins: { top: 55, bottom: 55, left: 55, right: 55 },
  });
};

const maamarCell = (value: string, sourceUrl = "") => {
  const match = value.match(/^(.*?)(\s+מוגה)$/);
  const runs = match
    ? [
        sourceUrl
          ? linkedRun(match[1], "HadasaNew", 24, true)
          : new TextRun({
              text: match[1],
              font: "HadasaNew",
              size: 24,
              bold: true,
            }),
        sourceUrl
          ? linkedRun(match[2], "HadasaNew", 24, false)
          : new TextRun({
              text: match[2],
              font: "HadasaNew",
              size: 24,
              bold: false,
            }),
      ]
    : [
        sourceUrl
          ? linkedRun(displayValue(value, "dibur"), "HadasaNew", 24, true)
          : new TextRun({
              text: displayValue(value, "dibur"),
              font: "HadasaNew",
              size: 24,
              bold: true,
            }),
      ];
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { before: 0, after: 0 },
        children: sourceUrl
          ? [new ExternalHyperlink({ link: sourceUrl, children: runs })]
          : runs,
      }),
    ],
    borders: { top: border, bottom: border, left: border, right: border },
    margins: { top: 55, bottom: 55, left: 55, right: 55 },
  });
};

// A Hisvaadus title/date is a separate line beneath the year: exactly 9 pt.
const farbrengenYearCell = (value: string, sourceUrl = "") => {
  const [year, ...title] = value
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedYear = (year || "").replace(/\s[-–—]\s/g, " – ");
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { before: 0, after: title.length ? 20 : 0 },
        children: [
          sourceUrl
            ? new ExternalHyperlink({
                link: sourceUrl,
                children: [linkedRun(normalizedYear, "HadasaNew", 24, true)],
              })
            : new TextRun({
                text: normalizedYear,
                font: "HadasaNew",
                size: 24,
                bold: true,
              }),
        ],
      }),
      ...(title.length
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { before: 0, after: 0 },
              children: [
                sourceUrl
                  ? new ExternalHyperlink({
                      link: sourceUrl,
                      children: [
                        linkedRun(title.join(" · "), "HadasaNew", 18, true),
                      ],
                    })
                  : new TextRun({
                      text: title.join(" · "),
                      font: "HadasaNew",
                      size: 18,
                      bold: true,
                    }),
              ],
            }),
          ]
        : []),
    ],
    borders: { top: border, bottom: border, left: border, right: border },
    margins: { top: 55, bottom: 55, left: 55, right: 55 },
  });
};

const chelekLabel = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/^חלק\s*/, "")
    .replace(/[׳'״"]/g, "");
  if (!cleaned || cleaned === "הוספות") return cleaned;
  const n = Number(cleaned);
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"],
    tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const letters =
    Number.isFinite(n) && n >= 1 && n <= 30
      ? n === 15
        ? "טו"
        : n === 16
          ? "טז"
          : n < 10
            ? ones[n]
            : tens[Math.floor(n / 10)] + ones[n % 10]
      : cleaned;
  return /^[א-ת]{1,2}$/.test(letters)
    ? letters.length === 1
      ? `${letters}׳`
      : `${letters.slice(0, -1)}״${letters.slice(-1)}`
    : cleaned;
};
const chelekCell = (value: string, continued = false) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    verticalMerge: continued
      ? VerticalMergeType.CONTINUE
      : VerticalMergeType.RESTART,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [
          new TextRun({
            text: continued ? "" : chelekLabel(value),
            font: "1Carizma",
            size: 40,
            bold: true,
          }),
        ],
      }),
    ],
    borders: { top: border, bottom: border, left: border, right: border },
    margins: { top: 55, bottom: 55, left: 55, right: 55 },
  });

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    occasion?: string;
    rows?: Partial<Record<Key, Row[]>>;
    mugah?: MugahRow[];
    chartType?: ChartType;
    chartTypes?: ChartType[];
  };
  const chartType = body.chartTypes?.[0] || body.chartType || "standard";
  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 0 },
      children: [
        new TextRun({ text: "ב״ה", font: "BA Le-Be Regular", size: 28 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 1200, after: 1050 },
      children: [
        new TextRun({
          text: `~ חלוקת תורת רבינו על ${body.occasion || ""} ~`,
          font: "BA Le-Be Regular",
          size: 64,
        }),
      ],
    }),
  ];
  const compactCell = (value: string, key: string, sourceUrl = "") =>
    cell(value, "farbrengens", key, false, key === "year" ? sourceUrl : "");
  if (chartType === "mugah") {
    children[1] = new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 240, after: 380 },
      children: [
        new TextRun({
          text: `מפתח לחלקים המוגהים של ההתוועדויות של ${body.occasion || ""}`,
          font: "BA Le-Be Regular",
          size: 48,
        }),
      ],
    });
    const list = body.mugah || [],
      pivot = Math.ceil(list.length / 2),
      left = list.slice(0, pivot),
      right = list.slice(pivot);
    const tableRows = [
      new TableRow({
        children: [
          cell("שנה", "maamarim", "year", true),
          cell("ספר", "maamarim", "dibur", true),
          cell("עמודים", "maamarim", "pages", true),
          cell("שנה", "maamarim", "year", true),
          cell("ספר", "maamarim", "dibur", true),
          cell("עמודים", "maamarim", "pages", true),
        ],
      }),
      ...Array.from(
        { length: Math.max(left.length, right.length) },
        (_, index) => {
          const a = left[index],
            b = right[index];
          return new TableRow({
            children: [
              cell(
                a?.year || "",
                "maamarim",
                "year",
                false,
                a?.sourceUrl || "",
              ),
              maamarCell(a?.title || ""),
              cell(
                a?.pages || "",
                "maamarim",
                "pages",
                false,
                "",
              ),
              cell(
                b?.year || "",
                "maamarim",
                "year",
                false,
                b?.sourceUrl || "",
              ),
              maamarCell(b?.title || ""),
              cell(
                b?.pages || "",
                "maamarim",
                "pages",
                false,
                "",
              ),
            ],
          });
        },
      ),
    ];
    children.push(
      new Table({
        width: { size: 10579, type: WidthType.DXA },
        columnWidths: [1050, 3300, 940, 1050, 3300, 940],
        layout: TableLayoutType.FIXED,
        visuallyRightToLeft: true,
        rows: tableRows,
      }),
    );
  } else if (chartType === "compact") {
    children[1] = new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 240, after: 380 },
      children: [
        new TextRun({
          text: `פרטי ההתוועדויות של ${body.occasion || ""}`,
          font: "BA Le-Be Regular",
          size: 54,
        }),
      ],
    });
    const list = body.rows?.farbrengens || [],
      pivot = Math.ceil(list.length / 2),
      left = list.slice(0, pivot),
      right = list.slice(pivot),
      cols = ["year", "audio", "video", "hebrew", "yiddish"];
    const tableRows = [
      new TableRow({
        children: [
          ...cols.map((key) =>
            cell(sectionInfoLabel(key), "farbrengens", key, true),
          ),
          ...cols.map((key) =>
            cell(sectionInfoLabel(key), "farbrengens", key, true),
          ),
        ],
      }),
      ...Array.from(
        { length: Math.max(left.length, right.length) },
        (_, index) => {
          const a = left[index],
            b = right[index];
          return new TableRow({
            children: [
              ...cols.map((key) =>
                compactCell(
                  String(a?.[key] || ""),
                  key,
                  String(a?.sourceUrl || ""),
                ),
              ),
              ...cols.map((key) =>
                compactCell(
                  String(b?.[key] || ""),
                  key,
                  String(b?.sourceUrl || ""),
                ),
              ),
            ],
          });
        },
      ),
    ];
    children.push(
      new Table({
        width: { size: 10579, type: WidthType.DXA },
        columnWidths: [
          1100, 1100, 1050, 1050, 1050, 1050, 1150, 1150, 940, 940,
        ],
        layout: TableLayoutType.FIXED,
        visuallyRightToLeft: true,
        rows: tableRows,
      }),
    );
  } else
    (Object.keys(sections) as Key[]).forEach((key) => {
      const info = sections[key],
        widths = columnWidths[key];
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 240, after: 110 },
          children: [
            new TextRun({
              text: info.title,
              font: "1Carizma",
              size: 72,
              bold: true,
            }),
          ],
        }),
      );
      if (key === "farbrengens")
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "מומלץ ללמוד החלקים המוגהים של ההתוועדויות",
                font: "HadasaNew",
                size: 28,
                bold: true,
              }),
            ],
          }),
        );
      const tableRows = [
        new TableRow({
          children: info.columns.map((column) =>
            cell(column.label, key, column.key, true),
          ),
        }),
        ...(body.rows?.[key] || []).map(
          (row, index, list) =>
            new TableRow({
              children: info.columns.map((column) => {
                if (key === "likutei" && column.key === "volume") {
                  const current = String(row.volume || "");
                  const previous = index
                    ? String(list[index - 1].volume || "")
                    : "";
                  return chelekCell(
                    current,
                    index > 0 && chelekLabel(current) === chelekLabel(previous),
                  );
                }
                const sourceUrl = String(row.sourceUrl || "");
                return key === "farbrengens" && column.key === "year"
                  ? farbrengenYearCell(String(row[column.key] || ""), sourceUrl)
                  : key === "maamarim" && column.key === "dibur"
                    ? maamarCell(String(row[column.key] || ""), sourceUrl)
                    : cell(
                        String(row[column.key] || ""),
                        key,
                        column.key,
                        false,
                        (key === "sichos" && column.key === "year") ||
                          (key === "likutei" && column.key === "item")
                          ? sourceUrl
                          : "",
                      );
              }),
            }),
        ),
      ];
      children.push(
        new Table({
          width: { size: 10579, type: WidthType.DXA },
          columnWidths: widths,
          layout: TableLayoutType.FIXED,
          visuallyRightToLeft: true,
          rows: tableRows,
        }),
      );
    });
  const memorial = new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    children: [
      new TextRun({ text: "לע״נ הרה״ש ", font: "BA Le-Be Regular", size: 20 }),
      new TextRun({
        text: "חיים מרדכי",
        font: "BA Le-Be Regular",
        size: 20,
        bold: true,
      }),
      new TextRun({
        text: " ז״ל בן יבדלחט״א הרה״ש ",
        font: "BA Le-Be Regular",
        size: 20,
      }),
      new TextRun({
        text: "יוסף יצחק",
        font: "BA Le-Be Regular",
        size: 20,
        bold: true,
      }),
      new TextRun({ text: " שי׳", font: "BA Le-Be Regular", size: 20 }),
    ],
  });
  const doc = new Document({
    sections: [
      {
        // A first-page footer is intentionally used: this dedication must not
        // repeat on later pages of a long chart.
        properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 567, bottom: 800, left: 664, right: 664 } } },
        footers: { first: new Footer({ children: [memorial] }) },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new NextResponse(bytes, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": "attachment; filename=rebbe-torah-chart.docx",
    },
  });
}
