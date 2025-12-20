import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Lock, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { loginAction } from "@/actions/authActions"; // Stworzymy to za chwilę

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-lg border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Strefa Partnera
            </h1>
            <p className="text-gray-500">
              Zaloguj się, aby zarządzać swoją firmą.
            </p>
          </div>

          <form action={loginAction} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={20}
                />
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="adres@email.pl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Hasło
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={20}
                />
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              Zaloguj się <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            Nie masz jeszcze konta?{" "}
            <Link
              href="/dodaj-firme"
              className="text-blue-600 font-bold hover:underline"
            >
              Dodaj firmę za darmo
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
