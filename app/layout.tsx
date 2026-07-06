import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

// Display serif (headlines, big tabular numbers) + Heebo body sans — both Hebrew.
const display = Frank_Ruhl_Libre({
  variable: "--font-display",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700", "900"],
});
const body = Heebo({
  variable: "--font-body",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ido-new-project.vercel.app"),
  title: { default: "SimpleSave — משכנתא חכמה, פשוט לחסוך", template: "%s · SimpleSave" },
  description:
    "חמישה תמהילי משכנתא מותאמים אישית בחינם: השוואת מסלולים, מחזור משכנתא וביטוח — עם ליווי יועץ עד החתימה.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SimpleSave" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "SimpleSave",
    title: "SimpleSave — משכנתא חכמה, פשוט לחסוך",
    description: "חמישה תמהילי משכנתא מותאמים אישית בחינם, השוואת מחזור וביטוח — עם ליווי יועץ עד החתימה.",
  },
  twitter: { card: "summary" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#2549c9",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
