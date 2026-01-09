export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { logoutAction, changePasswordAction } from "@/actions/authActions";
import {
  Building2,
  LogOut,
  Phone,
  Star,
  Eye,
  KeyRound,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { EditCompanyForm } from "@/components/EditCompanyForm";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  // 1. Weryfikacja sesji
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  if (!userId) redirect("/strefa-partnera");

  // 2. Pobieranie danych
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user || !user.company) redirect("/strefa-partnera");

  const phoneReveals = await prisma.lead.count({
    where: { companyId: user.companyId, status: "PHONE_REVEAL" },
  });

  const reviewCount = await prisma.review.count({
    where: { companyId: user.companyId },
  });

  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-20 flex-grow">
        <div className="max-w-5xl mx-auto">
          {/* SEKCJA KOMUNIKATÓW */}
          <div className="space-y-4 mb-6">
            {/* Sukces */}
            {params.status === "password_updated" && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <CheckCircle2 size={20} />
                <p className="font-medium">
                  Hasło zostało pomyślnie zaktualizowane.
                </p>
              </div>
            )}

            {/* Obsługa błędów (Naprawia czerwony ekran runtime error) */}
            {params.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
                <AlertCircle size={20} />
                <p className="font-medium">
                  {params.error === "wrong_old_password" &&
                    "Obecne hasło jest nieprawidłowe."}
                  {params.error === "password_too_short" &&
                    "Nowe hasło musi mieć min. 8 znaków."}
                  {params.error === "passwords_not_matching" &&
                    "Podane nowe hasła nie są identyczne."}
                </p>
              </div>
            )}
          </div>

          {/* Nagłówek i przycisk wyloguj */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                Witaj, {user.company.name}
              </h1>
              <p className="text-gray-500 font-medium text-sm">
                Zarządzaj swoją wizytówką w katalogo
              </p>
            </div>

            <form action={logoutAction}>
              <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm active:scale-95">
                <LogOut size={16} /> Wyloguj się
              </button>
            </form>
          </div>

          {/* Statystyki */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500" /> Status
                profilu
              </p>
              <div
                className={`flex items-center gap-2.5 font-bold ${
                  user.company.isVerified ? "text-green-600" : "text-amber-600"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    user.company.isVerified
                      ? "bg-green-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                ></div>
                {user.company.isVerified
                  ? "Zweryfikowany"
                  : "W trakcie weryfikacji"}
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Phone size={14} className="text-blue-500" /> Odsłonięcia
                telefonu
              </p>
              <p className="text-4xl font-black text-gray-900 leading-none">
                {phoneReveals}
              </p>
            </div>

            <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Star size={14} className="text-blue-500" /> Opinie
              </p>
              <p className="text-4xl font-black text-gray-900 leading-none">
                {reviewCount}
              </p>
            </div>
          </div>

          <div className="space-y-12">
            {/* Edycja Danych Firmy */}
            <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-5 mb-10 pb-8 border-b border-gray-100">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
                  <Building2 size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Dane wizytówki
                  </h2>
                  <p className="text-gray-500 text-sm font-medium">
                    Zmień dane kontaktowe i branżę.
                  </p>
                </div>
              </div>
              <EditCompanyForm company={user.company} />
            </section>

            {/* Zmiana Hasła */}
            <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-5 mb-10 pb-8 border-b border-gray-100">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center">
                  <KeyRound size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    Zabezpieczenia
                  </h2>
                  <p className="text-gray-500 text-sm font-medium">
                    Hasło dostępowe do panelu.
                  </p>
                </div>
              </div>

              <form
                action={changePasswordAction}
                className="max-w-md space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2 ml-1">
                      Obecne hasło
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        name="oldPassword"
                        type="password"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 my-4" />

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2 ml-1">
                      Nowe hasło
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        name="newPassword"
                        type="password"
                        required
                        placeholder="Minimum 8 znaków"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2 ml-1">
                      Powtórz nowe hasło
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        name="confirmPassword"
                        type="password"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button className="bg-gray-900 text-white px-10 py-4.5 rounded-[1.25rem] font-black hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 w-full md:w-auto">
                  Zmień hasło
                  <ArrowRight size={20} className="text-gray-400" />
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
