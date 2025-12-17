import Link from "next/link";
import {
  Search,
  MapPin,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Building2,
  Wrench,
  Calculator,
  Stethoscope,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function LandingPage() {
  // Statystyki "na żywo" budują zaufanie
  const stats = await prisma.$transaction([
    prisma.company.count(),
    prisma.tenant.count(),
  ]);

  const [companyCount, categoryCount] = stats;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* --- NAVBAR --- */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-tighter flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg skew-x-[-10deg]"></div>
            LookUp<span className="text-blue-600">.</span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <Link href="/kategorie" className="hover:text-black transition">
              Kategorie
            </Link>
            <Link href="/cennik" className="hover:text-black transition">
              Dla Firm
            </Link>
            <Link href="/admin" className="hover:text-black transition">
              Strefa Partnera
            </Link>
          </div>
          <Link
            href="/dodaj-firme"
            className="hidden md:block bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
          >
            Dodaj firmę za darmo
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Dekoracyjne tło */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-50 rounded-full blur-[100px] -z-10 opacity-60"></div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6 border border-blue-100">
            <TrendingUp size={14} /> Największa baza firm w Polsce
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Znajdź{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              najlepszych
            </span>{" "}
            <br />
            specjalistów w okolicy.
          </h1>

          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            LookUp to nowoczesna wyszukiwarka łącząca klientów z lokalnymi
            ekspertami. Przeszukaj{" "}
            <span className="font-bold text-gray-900">
              {companyCount.toLocaleString()}
            </span>{" "}
            zweryfikowanych firm w{" "}
            <span className="font-bold text-gray-900">{categoryCount}</span>{" "}
            branżach.
          </p>

          {/* Duży SearchBar - Kieruje do "globalnego szukania" (lub na tenanta jeśli zrobimy logikę) */}
          <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-200 flex flex-col md:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex-1 flex items-center px-4 h-14 bg-gray-50 rounded-xl">
              <Search className="text-gray-400 mr-3" />
              <input
                type="text"
                placeholder="Usługa, np. Hydraulik"
                className="bg-transparent w-full outline-none font-medium"
              />
            </div>
            <div className="flex-1 flex items-center px-4 h-14 bg-gray-50 rounded-xl">
              <MapPin className="text-gray-400 mr-3" />
              <input
                type="text"
                placeholder="Miasto, np. Warszawa"
                className="bg-transparent w-full outline-none font-medium"
              />
            </div>
            <button className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200">
              Szukaj
            </button>
          </div>
        </div>
      </section>

      {/* --- POPULARNE KATEGORIE --- */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Popularne branże
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Karty kategorii - linkują do subdomen */}
            <CategoryCard
              icon={<Wrench />}
              title="Mechanika"
              count="12,400+"
              href="http://mechanicy.localhost:3000" // Zmień na domenę prod
            />
            <CategoryCard
              icon={<Calculator />}
              title="Księgowość"
              count="8,200+"
              href="http://ksiegowi.localhost:3000"
            />
            <CategoryCard
              icon={<Building2 />}
              title="Budownictwo"
              count="15,100+"
              href="http://budowlanka.localhost:3000"
            />
            <CategoryCard
              icon={<Stethoscope />}
              title="Medycyna"
              count="5,300+"
              href="http://lekarze.localhost:3000"
            />
          </div>
        </div>
      </section>

      {/* --- VALUE PROP / CTA --- */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto bg-gray-900 rounded-[2.5rem] p-12 md:p-20 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>

          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prowadzisz firmę?
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Dołącz do LookUp i daj się znaleźć tysiącom nowych klientów.
              Darmowa wizytówka to dopiero początek. Zwiększ widoczność dzięki
              pakietom Premium.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/dodaj-firme"
                className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition flex items-center gap-2"
              >
                Dodaj firmę teraz <ArrowRight size={18} />
              </Link>
              <div className="flex items-center gap-2 px-6 py-4 border border-gray-700 rounded-xl text-gray-300">
                <ShieldCheck size={20} className="text-green-400" />{" "}
                Zweryfikowany profil
              </div>
            </div>
          </div>

          {/* Atrapa interfejsu (Visual) */}
          <div className="relative z-10 bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/10 w-full max-w-sm rotate-3 hover:rotate-0 transition-transform duration-500">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full"></div>
              <div>
                <div className="h-3 w-24 bg-white/20 rounded mb-2"></div>
                <div className="h-2 w-16 bg-white/10 rounded"></div>
              </div>
            </div>
            <div className="h-2 w-full bg-white/10 rounded mb-2"></div>
            <div className="h-2 w-full bg-white/10 rounded mb-2"></div>
            <div className="h-2 w-3/4 bg-white/10 rounded"></div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-bold tracking-tighter">LookUp.</div>
          <div className="text-sm text-gray-500">
            &copy; 2025 Project LookUp Inc. Wszystkie prawa zastrzeżone.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Komponent pomocniczy karty kategorii
function CategoryCard({
  icon,
  title,
  count,
  href,
}: {
  icon: any;
  title: string;
  count: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="font-bold text-lg text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{count} firm</p>
    </Link>
  );
}
