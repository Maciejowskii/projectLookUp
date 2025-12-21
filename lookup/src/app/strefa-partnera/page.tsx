import { loginAction } from "@/actions/authActions";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Lock, Mail, ArrowRight, Quote } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative">
      <Navbar />

      {/* Dekoracyjne tło pod spodem (subtelne) */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10 pointer-events-none"></div>

      {/* Główny kontener - odsunięty od góry (pt-36) i wyśrodkowany */}
      <div className="flex-grow flex items-center justify-center pt-36 pb-20 px-4 sm:px-6">
        {/* KARTA LOGOWANIA */}
        <div className="w-full max-w-[1100px] bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[600px] border border-white">
          {/* LEWA STRONA: FORMULARZ */}
          <div className="p-10 md:p-14 lg:p-16 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
                  Witaj ponownie
                </h1>
                <p className="text-gray-500">
                  Zaloguj się, aby zarządzać swoją firmą.
                </p>
              </div>

              <form action={loginAction} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail
                      className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                      size={20}
                    />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="jan@firma.pl"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium"
                    />
                  </div>
                </div>

                {/* Hasło */}
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Hasło
                    </label>
                    <Link
                      href="#"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Zapomniałeś?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock
                      className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                      size={20}
                    />
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium"
                    />
                  </div>
                </div>

                <button className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-gray-900/10 flex justify-center items-center gap-2 group transform active:scale-[0.98] mt-2">
                  Zaloguj się{" "}
                  <ArrowRight
                    size={20}
                    className="text-gray-400 group-hover:text-white transition-colors"
                  />
                </button>
              </form>

              <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <p className="text-gray-500 text-sm">
                  Nie masz konta?{" "}
                  <Link
                    href="/dodaj-firme"
                    className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
                  >
                    Załóż darmową wizytówkę
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* PRAWA STRONA: DEKORACJA */}
          <div className="hidden lg:flex relative bg-blue-600 p-12 items-center justify-center overflow-hidden">
            {/* Gradient i Kształty */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800"></div>
            <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[80px]"></div>

            {/* Glass Card */}
            <div className="relative z-10 max-w-sm">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl">
                <Quote className="text-blue-200 mb-6" size={40} />
                <p className="text-lg text-white font-medium leading-relaxed mb-6 opacity-95">
                  "Panel jest niesamowicie prosty. Mogę edytować ofertę i
                  odpowiadać na opinie z telefonu, będąc u klienta."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-blue-50 flex items-center justify-center text-blue-900 font-bold shadow-lg">
                    AK
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Adam Krawczyk</h4>
                    <p className="text-blue-200 text-xs uppercase tracking-wide font-medium">
                      Hydraulik 24h
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
