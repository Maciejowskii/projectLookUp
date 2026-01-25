
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Search } from "lucide-react";
import { SearchResultsList } from "@/components/SearchResultsList";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>; // <--- Zmiana typu na Promise
}) {
  // 1. Musimy "odpakować" parametry za pomocą await
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";
  const city = resolvedParams.city || "";

  // Pobierz tylko liczbę wyników (reszta przez React Query)
  const totalResults = await prisma.company.count({
    where: {
      AND: [
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
        city
          ? { city: { contains: city, mode: "insensitive" } }
          : {},
      ],
    },
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
            ({totalResults} wyników)
          </p>
        </div>

        {/* Grid Wyników - używamy zoptymalizowanego komponentu */}
        <SearchResultsList query={query} city={city} totalResults={totalResults} />
      </main>
      <Footer />
    </div>
  );
}
