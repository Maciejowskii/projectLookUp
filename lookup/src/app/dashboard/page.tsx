
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Navbar } from "@/components/Navbar";
import { logoutAction } from "@/actions/authActions";
import { Building2, LogOut, Phone, Star, Eye } from "lucide-react";
import { EditCompanyForm } from "@/components/EditCompanyForm";

export default async function DashboardPage() {
  // 1. Sprawdzamy sesję
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  if (!userId) redirect("/strefa-partnera");

  // 2. Pobieramy dane użytkownika i jego firmy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user) redirect("/strefa-partnera");

  // 3. POBIERAMY PRAWDZIWE STATYSTYKI (NAPRAWA BŁĘDU)
  const phoneReveals = await prisma.lead.count({
    where: {
      companyId: user.companyId,
      status: "PHONE_REVEAL",
    },
  });

  const reviewCount = await prisma.review.count({
    where: { companyId: user.companyId },
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Witaj, {user.company.name}
              </h1>
              <p className="text-gray-500">Panel zarządzania firmą</p>
            </div>

            <form action={logoutAction}>
              <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                <LogOut size={16} /> Wyloguj się
              </button>
            </form>
          </div>

          {/* Statystyki (TERAZ DZIAŁAJĄ!) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Status */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-400 font-bold uppercase mb-2 flex items-center gap-2">
                <Eye size={16} /> Status profilu
              </p>
              <div
                className={`flex items-center gap-2 font-bold ${
                  user.company.isVerified ? "text-green-600" : "text-yellow-600"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    user.company.isVerified ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                {user.company.isVerified
                  ? "Zweryfikowany"
                  : "Oczekuje na weryfikację"}
              </div>
            </div>

            {/* Odsłonięcia telefonu */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-400 font-bold uppercase mb-2 flex items-center gap-2">
                <Phone size={16} /> Odsłonięcia telefonu
              </p>
              <p className="text-4xl font-extrabold text-gray-900">
                {phoneReveals}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Liczba kliknięć "Pokaż numer"
              </p>
            </div>

            {/* Opinie */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-400 font-bold uppercase mb-2 flex items-center gap-2">
                <Star size={16} /> Opinie klientów
              </p>
              <p className="text-4xl font-extrabold text-gray-900">
                {reviewCount}
              </p>
            </div>
          </div>

          {/* Sekcja Edycji Danych (Zastąpiliśmy żółty box formularzem) */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Edytuj dane firmy
                </h2>
                <p className="text-gray-500 text-sm">
                  Zaktualizuj informacje widoczne na wizytówce.
                </p>
              </div>
            </div>

            {/* Wstawiamy komponent formularza */}
            <EditCompanyForm company={user.company} />
          </div>
        </div>
      </main>
    </div>
  );
}
