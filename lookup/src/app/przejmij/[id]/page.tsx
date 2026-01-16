import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldCheck, CheckCircle2, LogIn, UserPlus } from "lucide-react";
import { submitClaimRequest } from "@/actions/claimProfile";
import { claimCompanyAction } from "@/actions/claimCompany";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
  });

  if (!company) return notFound();

  // Sprawdź czy użytkownik jest zalogowany
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  // Jeśli użytkownik jest zalogowany - sprawdź czy już ma tę firmę
  if (userId) {
    // Sprawdź czy użytkownik już ma tę firmę (nowa relacja CompanyUser)
    const existingRelation = await prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: company.id,
      },
    });

    // Sprawdź legacy companyId (dla użytkowników z poprzednią strukturą)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (existingRelation || (user && user.companyId === company.id)) {
      // Użytkownik już ma tę firmę - przekieruj do dashboard
      redirect(`/dashboard?companyId=${company.id}`);
    }

    // Sprawdź czy firma ma już właściciela
    const existingOwners = await prisma.companyUser.findMany({
      where: { companyId: company.id },
    });

    if (existingOwners.length === 0) {
      // Firma nie ma właściciela - możemy pozwolić na bezpośrednie przejęcie
      // Pokażemy formularz z możliwością bezpośredniego przejęcia
    }
  }

  // Jeśli użytkownik nie jest zalogowany - pokaż ekran "Masz konto?"
  if (!userId) {
    const returnTo = `/przejmij/${company.id}`;
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />

        <div className="pt-32 pb-20 container mx-auto px-4 flex justify-center">
          <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
            {/* LEWA STRONA - INFO */}
            <div className="bg-blue-600 text-white p-10 md:w-2/5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

              <div>
                <div className="bg-blue-500/50 w-fit p-3 rounded-2xl mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-4">Przejmij profil</h1>
                <p className="text-blue-100 mb-8">
                  Potwierdź, że jesteś właścicielem firmy{" "}
                  <strong>{company.name}</strong>, aby odblokować pełny dostęp.
                </p>

                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-blue-300" />{" "}
                    <span>Edycja danych kontaktowych</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-blue-300" />{" "}
                    <span>Odpowiadanie na opinie</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-blue-300" />{" "}
                    <span>Dodawanie zdjęć i logo</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-blue-200 mt-10">
                Proces weryfikacji zajmuje zazwyczaj do 24h.
              </p>
            </div>

            {/* PRAWA STRONA - EKRAN "MASZ KONTO?" */}
            <div className="p-10 md:w-3/5 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Masz już konto?
              </h2>
              <p className="text-gray-500 mb-8">
                Zaloguj się lub załóż konto, aby przejąć profil firmy{" "}
                <strong>{company.name}</strong>.
              </p>

              <div className="space-y-4">
                <Link
                  href={`/strefa-partnera?returnTo=${encodeURIComponent(returnTo)}`}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold shadow-lg group"
                >
                  <LogIn size={20} />
                  <span>Tak, mam konto - Zaloguj się</span>
                </Link>

                <Link
                  href={`/rejestracja?returnTo=${encodeURIComponent(returnTo)}`}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all font-bold shadow-sm"
                >
                  <UserPlus size={20} />
                  <span>Nie, chcę założyć konto</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Jeśli użytkownik jest zalogowany - pokaż formularz przejmowania
  const existingOwners = await prisma.companyUser.findMany({
    where: { companyId: company.id },
  });

  const hasOwner = existingOwners.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <div className="pt-32 pb-20 container mx-auto px-4 flex justify-center">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          {/* LEWA STRONA - INFO */}
          <div className="bg-blue-600 text-white p-10 md:w-2/5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

            <div>
              <div className="bg-blue-500/50 w-fit p-3 rounded-2xl mb-6">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-3xl font-bold mb-4">Przejmij profil</h1>
              <p className="text-blue-100 mb-8">
                {hasOwner
                  ? "Zgłoś chęć przejęcia firmy"
                  : "Przejmij profil firmy"}{" "}
                <strong>{company.name}</strong>, aby odblokować pełny dostęp.
              </p>

              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-blue-300" />{" "}
                  <span>Edycja danych kontaktowych</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-blue-300" />{" "}
                  <span>Odpowiadanie na opinie</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-blue-300" />{" "}
                  <span>Dodawanie zdjęć i logo</span>
                </li>
              </ul>
            </div>

            <p className="text-xs text-blue-200 mt-10">
              {hasOwner
                ? "Proces weryfikacji zajmuje zazwyczaj do 24h."
                : "Firma zostanie natychmiast przypisana do Twojego konta."}
            </p>
          </div>

          {/* PRAWA STRONA - FORMULARZ */}
          <div className="p-10 md:w-3/5">
            {hasOwner ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Wypełnij formularz zgłoszeniowy
                </h2>
                <p className="text-gray-500 mb-6 text-sm">
                  Firma ma już właściciela. Twoje zgłoszenie zostanie
                  rozpatrzone w ciągu 24 godzin.
                </p>

                <form action={submitClaimRequest} className="space-y-5">
                  <input type="hidden" name="companyId" value={company.id} />

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Imię i nazwisko
                    </label>
                    <input
                      name="fullName"
                      type="text"
                      required
                      placeholder="np. Jan Kowalski"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Email służbowy
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="jan@firma.pl"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Telefon kontaktowy
                    </label>
                    <input
                      name="phone"
                      type="text"
                      required
                      placeholder="+48 000 000 000"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg"
                    >
                      Wyślij zgłoszenie
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Firma nie ma właściciela
                </h2>
                <p className="text-gray-500 mb-6">
                  Możesz natychmiast przejąć profil firmy{" "}
                  <strong>{company.name}</strong>. Kliknij poniżej, aby
                  kontynuować.
                </p>

                <form action={claimCompanyAction} className="space-y-5">
                  <input
                    type="hidden"
                    name="companySlug"
                    value={company.slug}
                  />

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg"
                    >
                      Przejmij firmę teraz
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
