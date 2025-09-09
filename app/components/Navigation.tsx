"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SignOutButton from "../components/SignOutButton";
import { Menu, X } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUserEmail(data.user?.email ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const links: NavLink[] = [
    { href: "/", label: "خانه" },
    { href: "/dashboard", label: "داشبورد" },
    { href: "/voice-transcribe", label: "رونویسی" },
    { href: "/voice-meeting-minutes", label: "صورت‌جلسه" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-white/50 backdrop-blur-md supports-[backdrop-filter]:bg-white/40 dark:bg-black/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="group flex items-center gap-2"
              aria-label="EZneshast Home"
            >
              <div className="h-8 w-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold shadow-sm shadow-primary-600/20 group-hover:shadow-md transition-shadow">
                E
              </div>
              <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                ایزی نشست
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2 rounded-xl bg-white/60 dark:bg-white/5 p-1 shadow-sm ring-1 ring-black/5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(l.href)
                    ? "text-gray-900 dark:text-white bg-primary-50/80 dark:bg-primary-500/10"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/voice-transcribe"
              className="hidden sm:inline-flex h-9 items-center rounded-2xl bg-primary-600 px-3 text-white hover:bg-primary-700 shadow-sm"
              aria-label="شروع رونویسی"
            >
              شروع رونویسی
            </Link>
            {userEmail ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-100 flex items-center justify-center text-xs font-semibold shadow-sm">
                  {userEmail[0]?.toUpperCase()}
                </div>
                <SignOutButton className="h-9 rounded-2xl bg-gray-800 px-3 text-white hover:bg-gray-900" />
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="h-9 rounded-2xl border border-gray-200 dark:border-white/10 px-3 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
              >
                ورود
              </Link>
            )}

            {/* Mobile toggle */}
            <button
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10"
              aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3 py-2 text-sm ${
                  isActive(l.href)
                    ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 flex items-center gap-2">
              {userEmail ? (
                <SignOutButton className="h-9 w-full rounded-2xl bg-gray-800 px-3 text-white hover:bg-gray-900" />
              ) : (
                <Link
                  href="/auth/signin"
                  className="h-9 w-full rounded-2xl border border-gray-200 dark:border-white/10 px-3 text-center text-sm hover:bg-gray-50 dark:hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  ورود
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
