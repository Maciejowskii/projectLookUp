import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Briefcase, Layers } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default async function CategoriesIndexPage() {
  // Pobieramy wszystkie kategorie z bazy
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { companies: true },
      },
    },
    orderBy: {
      name: "asc", // Sortowanie alfabetyczne
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <div className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Header Sekcji */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-4">
              <Layers size={14} /> Katalog Branż
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Przeglądaj według kategorii
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Znajdź specjalistów w ponad {categories.length} branżach. Wybierz
              kategorię, aby zobaczyć listę zweryfikowanych firm.
            </p>
          </div>

          {/* Grid Kategorii */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/kategoria/${cat.slug}`} // Link do szczegółów (pojedyncza liczba)
                className="group relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Subtelny gradient hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <Briefcase size={22} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {cat._count.companies} firm
                    </p>
                  </div>

                  <div className="bg-gray-50 p-2 rounded-full text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 transform group-hover:rotate-[-45deg]">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500">
                Brak kategorii w bazie. Uruchom scraper!
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
