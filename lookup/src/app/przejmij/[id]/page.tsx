import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { submitClaimRequest } from "@/actions/claimProfile";

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

          {/* PRAWA STRONA - FORMULARZ */}
          <div className="p-10 md:w-3/5">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Wypełnij formularz zgłoszeniowy
            </h2>

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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
