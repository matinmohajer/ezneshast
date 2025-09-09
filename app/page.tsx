// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, PlayCircle, ShieldCheck, Zap } from "lucide-react";

export default function HomePage() {
  const [, setUser] = useState<{ id: string; email: string | null } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      console.log("[HomePage] Checking authentication...");
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      console.log("[HomePage] Auth result:", {
        user: user ? "present" : "missing",
        error: error ? error.message : "none",
        userEmail: user?.email,
      });

      setUser(user ? { id: user.id, email: user.email ?? null } : null);
      setLoading(false);

      // Redirect to dashboard if user is authenticated
      if (user) {
        console.log(
          "[HomePage] User authenticated, redirecting to dashboard..."
        );
        router.push("/dashboard");
      } else {
        console.log("[HomePage] User not authenticated, showing landing page");
      }
    };

    getUser();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 mt-4">در حال بارگذاری…</p>
      </main>
    );
  }

  // User is not authenticated, show SEO-rich landing page for EZneshast
  return (
    <main className="min-h-screen w-full">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "EZneshast",
            applicationCategory: "BusinessApplication",
            description:
              "EZneshast turns meeting audio into clean transcripts and actionable minutes with decisions and tasks.",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:pt-28">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl"
            >
              ایزی‌نشست
              <span className="block text-primary-600">
                تبدیل صدای جلسه به متن و صورت‌جلسهٔ حرفه‌ای
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300"
            >
              رونویسی دقیق، خلاصه‌سازی هوشمند، و استخراج تصمیم‌ها و کارها — همه
              در یک تجربهٔ سریع و امن.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-10 flex items-center justify-center gap-x-3"
            >
              <Link
                href="/auth/signin"
                className="rounded-2xl bg-primary-600 px-6 py-3 text-white hover:bg-primary-700 shadow-sm"
              >
                شروع رایگان
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <PlayCircle className="h-5 w-5" />
                نحوهٔ کار
              </a>
            </motion.div>
            <div className="mt-6 flex justify-center text-sm text-gray-500 dark:text-gray-400">
              <div className="inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-primary-600" />
                حریم خصوصی و امنیت سازمانی
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              چرا ایزی‌نشست؟
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              طراحی‌شده برای تیم‌هایی که به وضوح و پیگیری نیاز دارند
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "رونویسی سریع و دقیق",
                desc: "متن تمیز با نشانه‌گذاری و خوانایی بالا.",
              },
              {
                title: "صورت‌جلسهٔ عملیاتی",
                desc: "تصمیم‌ها، کارها، مسئولان و سررسیدها به‌صورت ساختاریافته.",
              },
              {
                title: "جستجو و فیلتر",
                desc: "یافتن لحظه‌ها بر اساس کلیدواژه، برچسب، یا گوینده.",
              },
              {
                title: "اولویت حریم خصوصی",
                desc: "احراز هویت امن و دسترسی محدودشده.",
              },
              {
                title: "پشتیبانی فارسی",
                desc: "نتایج عالی برای جلسات فارسی و چندزبانه.",
              },
              {
                title: "خروجی آسان",
                desc: "خروجی Markdown، PDF، یا DOCX با یک کلیک.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              روند کار ایزی‌نشست
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              از صدا تا متن و صورت‌جلسه در چند دقیقه
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                step: "۱",
                title: "آپلود یا ضبط",
                desc: "فایل صوتی را اضافه کنید یا مستقیم در مرورگر ضبط کنید.",
              },
              {
                step: "۲",
                title: "رونویسی",
                desc: "متن تمیز با ساختار و زمان‌بندی تولید می‌شود.",
              },
              {
                step: "۳",
                title: "خلاصه و خروجی",
                desc: "صورت‌جلسه را تایید، وظایف را تعیین و خروجی بگیرید.",
              },
            ].map((s, idx) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6"
              >
                <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              قیمت‌گذاری ساده و شفاف
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              فقط به اندازهٔ استفاده پرداخت کنید
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: "شروع",
                price: "رایگان",
                cta: "شروع رایگان",
                features: [
                  "۱۰۰ اعتبار آزمایشی",
                  "رونویسی استاندارد",
                  "خروجی Markdown",
                ],
              },
              {
                name: "حرفه‌ای",
                price: "تماس بگیرید",
                cta: "ارتباط با ما",
                features: [
                  "حجم بالا و تخفیف",
                  "کنترل دسترسی تیمی",
                  "SLA سازمانی",
                ],
              },
              {
                name: "سازمانی",
                price: "سفارشی",
                cta: "درخواست دمو",
                features: [
                  "SSO و امنیت پیشرفته",
                  "انطباق و لاگ‌ها",
                  "پشتیبانی اختصاصی",
                ],
              },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {p.name}
                </h3>
                <div className="mt-2 text-3xl font-bold text-primary-600">
                  {p.price}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href="/auth/signin"
                    className="inline-flex rounded-xl bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                  >
                    {p.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              "«ایزی‌نشست هر جلسه را قابل‌اقدام می‌کند. دیگر تصمیمی را از دست نمی‌دهیم.»",
              "«کیفیت رونویسی فارسی عالی است. صرفه‌جویی بزرگی در زمان تیم.»",
              "«خروجی Markdown دقیقاً در فرایند مستندسازی ما می‌نشیند.»",
            ].map((q, i) => (
              <motion.blockquote
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 text-sm text-gray-800 dark:text-gray-200"
              >
                {q}
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            جلسه‌ها را به حرکت تبدیل کنید
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            وارد شوید و اولین رونویسی خود را ایجاد کنید.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/auth/signin"
              className="rounded-2xl bg-primary-600 px-6 py-3 text-white hover:bg-primary-700 shadow-sm"
            >
              شروع رایگان
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <Zap className="h-5 w-5" />
              مشاهده روند
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
