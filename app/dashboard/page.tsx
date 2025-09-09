import {
  createServerSupabaseClientWithCookies,
  getServerUser,
} from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "../components/SignOutButton";

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const supabase = await createServerSupabaseClientWithCookies();

  // Get user's credit balance
  const { data: credits } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  // Get recent credit ledger entries
  const { data: ledgerEntries } = await supabase
    .from("credit_ledger")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get recent jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const balance = credits?.balance || 0;

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                داشبورد
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                خوش آمدید، {user.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/voice-transcribe"
                className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
              >
                رونویسی جدید
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>

        {/* Credit Balance Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                اعتبار
              </h2>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {balance}
              </p>
              <p className="text-sm text-gray-500 mt-1">اعتبار قابل استفاده</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                هزینه هر ۱ ساعت رونویسی
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                10
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                تراکنش‌های اخیر
              </h3>
            </div>
            <div className="p-6">
              {ledgerEntries && ledgerEntries.length > 0 ? (
                <div className="space-y-4">
                  {ledgerEntries.map(
                    (entry: {
                      id: string;
                      reason: string;
                      created_at: string;
                      amount: number;
                    }) => (
                      <div
                        key={entry.id}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.reason}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            entry.amount > 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {entry.amount > 0 ? "+" : ""}
                          {entry.amount}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  هنوز تراکنشی ندارید
                </p>
              )}
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                وظایف اخیر
              </h3>
            </div>
            <div className="p-6">
              {jobs && jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map(
                    (job: {
                      id: string;
                      type: string;
                      created_at: string;
                      status: "completed" | "failed" | "processing" | string;
                      cost: number;
                    }) => (
                      <div
                        key={job.id}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {job.type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(job.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              job.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300"
                                : job.status === "failed"
                                ? "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300"
                                : job.status === "processing"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300"
                                : "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200"
                            }`}
                          >
                            {job.status}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            -{job.cost}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  کاری ثبت نشده است
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            اقدامات سریع
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/voice-transcribe"
              className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-primary-300 hover:bg-primary-50/60 dark:hover:bg-primary-500/10 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🎤</div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  رونویسی صدا
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  تبدیل فایل صوتی به متن
                </p>
              </div>
            </Link>

            <Link
              href="/voice-meeting-minutes"
              className="p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-primary-300 hover:bg-primary-50/60 dark:hover:bg-primary-500/10 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📝</div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  صورت‌جلسه
                </h4>
                <p className="text-sm text-gray-500 mt-1">تولید خلاصه جلسه</p>
              </div>
            </Link>

            <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-white/10 opacity-60">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  گزارش‌ها
                </h4>
                <p className="text-sm text-gray-500 mt-1">به‌زودی</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
