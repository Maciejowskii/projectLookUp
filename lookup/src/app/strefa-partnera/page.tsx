import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar"; // Używamy Twojego nowego Navbara
import { Footer } from "@/components/Footer";

export default function PartnerZonePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1. Navbar - żeby było spójnie */}
      <Navbar />

      {/* Główna sekcja */}
      <div className="flex-grow flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Dekoracyjne tło (blobs) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-blue-100/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* LEWA STRONA - Marketing / Info */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
              <ShieldCheck size={14} /> Strefa Bezpieczna
            </div>
            <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              Zarządzaj swoim biznesem{" "}
              <span className="text-blue-600">w jednym miejscu.</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Panel Partnera LookUp pozwala Ci aktualizować dane, odpowiadać na
              opinie klientów i sprawdzać statystyki wyświetleń Twojej
              wizytówki.
            </p>

            <div className="flex gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-40">
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-xs text-gray-500">Dostęp do edycji</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-40">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-xs text-gray-500">Kontroli nad danymi</div>
              </div>
            </div>
          </div>

          {/* PRAWA STRONA - Karta Logowania */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 md:p-10 border border-white/50 relative">
              {/* Header Karty */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center mx-auto mb-5 transform rotate-[-6deg]">
                  <Lock size={26} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Witaj ponownie
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Zaloguj się do panelu partnera
                </p>
              </div>

              {/* Formularz */}
              <form className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">
                    Adres email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white placeholder:text-gray-300 font-medium"
                    placeholder="jan@twojafirma.pl"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Hasło
                    </label>
                    <a
                      href="#"
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors"
                    >
                      Zapomniałeś?
                    </a>
                  </div>
                  <input
                    type="password"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white placeholder:text-gray-300 font-medium"
                    placeholder="••••••••"
                  />
                </div>

                <button className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-900/10 transform active:scale-[0.98] flex items-center justify-center gap-2 group">
                  Zaloguj się{" "}
                  <ArrowRight
                    size={18}
                    className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all"
                  />
                </button>
              </form>

              {/* Footer Karty */}
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  Nowy w LookUp?{" "}
                  <Link
                    href="/dodaj-firme"
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Dodaj firmę za darmo
                  </Link>
                </p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-6 font-medium">
              Chronione przez reCAPTCHA i{" "}
              <a
                href="/legal/polityka-prywatnosci"
                className="underline hover:text-gray-500"
              >
                Politykę Prywatności
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
