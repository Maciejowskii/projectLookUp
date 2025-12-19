import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Search, MapPin } from "lucide-react";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>; // <--- Zmiana typu na Promise
}) {
  // 1. Musimy "odpakować" parametry za pomocą await
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";
  const city = resolvedParams.city || "";

  // Logika wyszukiwania
  const companies = await prisma.company.findMany({
    where: {
      AND: [
        // Szukanie po nazwie lub opisie lub kategorii
        query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                {
                  category: { name: { contains: query, mode: "insensitive" } },
                },
              ],
            }
          : {},
        // Szukanie po mieście (jeśli podane)
        city
          ? {
              city: { contains: city, mode: "insensitive" },
            }
          : {},
      ],
    },
    include: { category: true },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow pt-32 pb-20 container mx-auto px-4">
        {/* Header Wyników */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Wyniki wyszukiwania
          </h1>
          <p className="text-gray-500">
            Dla zapytania:{" "}
            <span className="font-bold text-gray-900">"{query}"</span>
            {city && (
              <span>
                {" "}
                w mieście{" "}
                <span className="font-bold text-gray-900">"{city}"</span>
              </span>
            )}{" "}
            ({companies.length} wyników)
          </p>
        </div>

        {/* Grid Wyników */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  {company.category.name}
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {company.name}
              </h2>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {company.description || "Brak opisu."}
              </p>

              <div className="space-y-1 text-sm text-gray-600">
                {company.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} /> {company.city}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Nic nie znaleziono
            </h3>
            <p className="text-gray-500">
              Spróbuj wpisać inne słowa kluczowe lub sprawdź pisownię.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
