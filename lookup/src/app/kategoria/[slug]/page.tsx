import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MapPin, ArrowRight } from "lucide-react";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Pobierz kategorię
  const category = await prisma.category.findFirst({
    where: { slug: slug },
    include: {
      companies: {
        where: { isVerified: true }, // Możesz usunąć to where, jeśli chcesz widzieć wszystkie
        orderBy: { isVerified: "desc" }, // Zweryfikowane na górze
      },
    },
  });

  if (!category) return notFound();

  // 2. Pobierz firmy (jeśli wolisz osobne zapytanie dla lepszej kontroli)
  const companies = await prisma.company.findMany({
    where: { categoryId: category.id },
    orderBy: [
      { isVerified: "desc" }, // Zweryfikowane pierwsze
      { logo: "desc" }, // Te z logo wyżej (null jest na końcu)
      { name: "asc" },
    ],
  });

  return (
    // Używamy <div> jako głównego kontenera, to bezpieczne.
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-20 flex-grow">
        {/* HEADER KATEGORII */}
        <div className="mb-12 text-center md:text-left">
          <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block">
            Kategoria
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            {category.name}
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            Znaleziono {companies.length} firm w tej kategorii. Przeglądaj
            najlepszych specjalistów w Twojej okolicy.
          </p>
        </div>

        {/* LISTA FIRM */}
        {companies.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/firma/${company.slug}`}
                className="group block bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* LOGO / AVATAR */}
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    {company.name.charAt(0)}
                  </div>

                  {/* TREŚĆ */}
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {company.name}
                      </h2>
                      {company.isVerified && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                          Zweryfikowana
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-4 font-medium">
                      <MapPin size={16} className="text-gray-400" />
                      {company.city || "Polska"}, {company.address || ""}
                    </div>

                    {/* OPIS - Teraz obsługuje newlines ze scrapera */}
                    <p className="text-gray-600 leading-relaxed line-clamp-3 md:line-clamp-2 whitespace-pre-line">
                      {company.description || "Brak opisu."}
                    </p>

                    <div className="mt-4 flex items-center text-blue-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                      Zobacz profil <ArrowRight size={16} className="ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <h3 className="text-xl font-bold text-gray-400">
              Brak firm w tej kategorii
            </h3>
            <p className="text-gray-400 mt-2">
              Bądź pierwszy i dodaj swoją firmę!
            </p>
            <Link
              href="/dodaj-firme"
              className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
            >
              Dodaj firmę
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
