import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "מחולל חלוקת תורת רבינו",
  description: "יצירת טבלאות לימוד לפי מועדי וחגי ישראל",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <footer className="site-memorial" dir="rtl">לע״נ הרה״ש <strong>חיים מרדכי</strong> ז״ל בן יבדלחט״א הרה״ש <strong>יוסף יצחק</strong> שי׳</footer>
      </body>
    </html>
  );
}
