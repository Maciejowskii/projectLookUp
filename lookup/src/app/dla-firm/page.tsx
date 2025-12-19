import Link from "next/link";
import {
  Check,
  TrendingUp,
  Shield,
  Globe,
  ArrowRight,
  BarChart3,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ForBusinessPage() {
  return (
    <div className="bg-white font-sans text-gray-900">
      <Navbar />

      {/* --- HERO SECTION (LIGHT MODE) --- */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Dekoracyjne tło */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] bg-blue-50/50 rounded-full blur-[100px] -z-10 opacity-70 pointer-events-none"></div>

        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
            <TrendingUp size={14} /> Dla Profesjonalistów
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gray-900 leading-[1.1]">
            Twoja firma widoczna <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              tam, gdzie są klienci.
            </span>
          </h1>

          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            LookUp to nie tylko katalog. To nowoczesna platforma do generowania
            leadów, budowania reputacji i pozycjonowania w Google.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dodaj-firme"
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Dołącz za darmo <ArrowRight size={18} />
            </Link>
            <Link
              href="/kontakt"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors border border-gray-200 flex items-center justify-center"
            >
              Dowiedz się więcej
            </Link>
          </div>
        </div>
      </section>

      {/* --- STATS / SOCIAL PROOF --- */}
      <section className="py-10 border-y border-gray-100 bg-gray-50/50">
        <div className="container mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-24 opacity-70 grayscale">
          {/* Tu mogłyby być loga partnerów, ale damy statystyki */}
          <div className="text-center">
            <div className="text-3xl font-extrabold text-gray-900">150k+</div>
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Wyszukiwań msc.
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-gray-900">12k+</div>
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Aktywnych Firm
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-gray-900">4.8/5</div>
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Średnia ocena
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURE GRID --- */}
      <section className="py-24 px-6 container mx-auto max-w-6xl">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Wszystko, czego potrzebujesz do wzrostu
          </h2>
          <p className="text-gray-500 text-lg">
            Zapewniamy narzędzia, które normalnie kosztują tysiące, w cenie
            jednego obiadu.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Search />}
            title="SEO & Widoczność"
            desc="Twój profil jest zoptymalizowany pod wyszukiwarki. Klienci znajdą Cię wpisując usługi w Google."
          />
          <FeatureCard
            icon={<BarChart3 />}
            title="Statystyki i Analityka"
            desc="Wiesz, ile osób odwiedza Twój profil i dzwoni do Ciebie. Pełna transparentność."
          />
          <FeatureCard
            icon={<Shield />}
            title="Zaufanie Klientów"
            desc="Zweryfikowane profile otrzymują odznakę, która zwiększa konwersję o nawet 40%."
          />
        </div>
      </section>

      {/* --- PRICING --- */}
      <section className="py-24 bg-gray-900 text-white px-6 rounded-t-[3rem]">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Zacznij bez ryzyka
          </h2>
          <p className="text-gray-400 mb-12 text-lg">
            Dołącz do bazy za darmo. Płać tylko wtedy, gdy będziesz chciał
            więcej.
          </p>

          <div className="bg-white text-gray-900 p-10 rounded-3xl shadow-2xl max-w-md mx-auto relative overflow-hidden transform hover:scale-105 transition-transform duration-300">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Pakiet Start</h3>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                Popularny
              </span>
            </div>

            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-extrabold tracking-tight">
                0 zł
              </span>
              <span className="text-gray-500 ml-2 font-medium">/miesiąc</span>
            </div>

            <ul className="space-y-4 text-left mb-10">
              <li className="flex items-center gap-3 font-medium">
                <div className="bg-green-100 p-1 rounded-full text-green-600">
                  <Check size={16} />
                </div>
                Wizytówka z danymi kontaktowymi
              </li>
              <li className="flex items-center gap-3 font-medium">
                <div className="bg-green-100 p-1 rounded-full text-green-600">
                  <Check size={16} />
                </div>
                Pozycjonowanie w 1 kategorii
              </li>
              <li className="flex items-center gap-3 font-medium">
                <div className="bg-green-100 p-1 rounded-full text-green-600">
                  <Check size={16} />
                </div>
                Odbieranie opinii od klientów
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <div className="bg-gray-100 p-1 rounded-full text-gray-400">
                  <Check size={16} />
                </div>
                Promowanie na listingu (Premium)
              </li>
            </ul>

            <Link
              href="/dodaj-firme"
              className="block w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-xl hover:shadow-2xl"
            >
              Załóż darmowe konto
            </Link>
            <p className="text-xs text-center text-gray-400 mt-4">
              Nie wymagamy karty kredytowej.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 rounded-3xl bg-white border border-gray-100 hover:border-blue-200 transition-all hover:shadow-xl hover:-translate-y-1 group">
      <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
