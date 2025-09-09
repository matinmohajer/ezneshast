import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ایزی نشست – رونویسی و تولید صورت‌جلسهٔ آسان",
    template: "%s • ایزی نشست",
  },
  description:
    "ایزی نشست صدای جلسه را به متن دقیق و صورت‌جلسهٔ قابل‌ استناد تبدیل می‌کند؛ سریع، دقیق و با حفظ حریم خصوصی.",
  applicationName: "ایزی نشست",
  keywords: [
    "رونویسی جلسه",
    "صورت‌ جلسه اتوماتیک",
    "تبدیل صدا به متن",
    "ویرایشگر متن جلسه",
    "موارد اقدام",
    "پشتیبانی فارسی",
    "ایزی نشست",
  ],
  openGraph: {
    type: "website",
    title: "ایزی نشست – رونویسی و تولید صورت‌جلسهٔ آسان",
    description:
      "صدا را به متن تمیز و صورت‌جلسهٔ حرفه‌ای با تصمیم‌ها و کارها تبدیل کنید.",
    siteName: "ایزی نشست",
  },
  twitter: {
    card: "summary_large_image",
    title: "ایزی نشست – رونویسی و تولید صورت‌جلسهٔ آسان",
    description:
      "صدا را به متن تمیز و صورت‌جلسهٔ حرفه‌ای با تصمیم‌ها و کارها تبدیل کنید.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_90%_-10%,_rgba(99,102,241,0.12),_transparent),radial-gradient(800px_400px_at_-10%_10%,_rgba(79,70,229,0.08),_transparent)]" />
          <div className="relative">
            <Navigation />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
