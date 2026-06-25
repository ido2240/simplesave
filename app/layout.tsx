import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Assistant } from "next/font/google";
import "./globals.css";

// Display serif (headlines, big tabular numbers) + body sans — both with Hebrew.
const display = Frank_Ruhl_Libre({
  variable: "--font-display",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700", "900"],
});
const body = Assistant({
  variable: "--font-body",
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SimpleSave — משכנתא חכמה",
  description: "פלטפורמה להשוואת תמהילי משכנתא וקבלת החלטות מימון טובות יותר",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
