import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VOIVODESHIPS } from "@/lib/regions";
import Link from "next/link";
import { Map } from "lucide-react";

export const metadata = {
  title: "Baza Firm według Województw | katalogo",
  description:
    "Znajdź najlepsze firmy w swoim województwie. Przeglądaj katalog lokalnych usługodawców.",
};

export default function RegionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 pt-32 pb-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Wybierz region
          </h1>
          <p className="text-xl text-gray-500">
            Przeglądaj firmy lokalnie w 16 województwach Polski.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {VOIVODESHIPS.map((region) => (
            <Link
              key={region.slug}
              href={`/wojewodztwo/${region.slug}`}
              className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Map size={32} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                {region.name}
              </h2>
              <span className="text-sm text-gray-400 group-hover:text-blue-500 transition-colors font-medium">
                Zobacz firmy &rarr;
              </span>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
