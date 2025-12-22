import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import MapWrapper from "@/components/MapWrapper";
import { MapPin, Star, ShieldCheck, Phone } from "lucide-react";

// --- TYPY ---
type Props = {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ q?: string; city?: string }>;
};

// --- KOMPONENT GŁÓWNY ---
export default async function TenantHomePage({ params, searchParams }: Props) {
  const { domain } = await params;
  const { q, city } = await searchParams;

  // 1. Rozpoznanie Tenanta (Obsługa localhost i produkcji)
  // Usuwamy porty i .localhost, żeby dostać czystą subdomenę np. "mechanicy"
  const decodedDomain = decodeURIComponent(domain)
    .replace(".localhost:3000", "")
    .replace(".localhost", "");

  const slugifyCity = (city: string) =>
    city
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // Zamień spacje na myślniki
      .replace(/[^a-z0-9-]/g, "") // Usuń znaki specjalne (np. polskie ogonki jeśli nie są obsłużone wcześniej)
      // Opcjonalnie: obsługa polskich znaków (warto dodać dla miast typu 'Łódź' -> 'lodz')
      .replace(/ą/g, "a")
      .replace(/ć/g, "c")
      .replace(/ę/g, "e")
      .replace(/ł/g, "l")
      .replace(/ń/g, "n")
      .replace(/ó/g, "o")
      .replace(/ś/g, "s")
      .replace(/ź/g, "z")
      .replace(/ż/g, "z");

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: decodedDomain },
  });

  if (!tenant) return notFound();

  // 2. Budowanie zapytania do bazy
  const whereClause: any = {
    tenantId: tenant.id, // Tu jest klucz: ufamy bazie, że tenantId jest poprawny
  };

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (city) {
    whereClause.city = { contains: city, mode: "insensitive" };
  }

  // 3. Pobranie danych (Server Side)
  const companies = await prisma.company.findMany({
    where: whereClause,
    take: 100, // Optymalna liczba dla mapy
    orderBy: [
      { isVerified: "desc" }, // Zweryfikowane na górze
      { logo: "desc" }, // Te z logo wyżej
      { name: "asc" },
    ],
    include: {
      category: true,
    },
  });

  // 4. Przygotowanie danych dla mapy
  // Filtrujemy tylko te, które mają współrzędne, żeby nie psuć mapy
  const mapData = companies
    .filter((c) => c.lat && c.lng)
    .map((c) => ({
      ...c,
      lat: c.lat!,
      lng: c.lng!,
    }));

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* === HEADER / NAVBAR === */}
      <header className="flex-none bg-white border-b border-gray-200 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo / Nazwa Tenanta */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {tenant.name}
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Katalog branżowy
              </p>
            </div>
          </Link>

          {/* SearchBar - kompaktowy na headerze */}
          <div className="w-full md:w-auto md:flex-1 md:max-w-2xl">
            <SearchBar />
            {/* Upewnij się, że SearchBar nie ma marginesów (mb-8) w środku. 
                 Najlepiej usuń 'mb-8' z klasy w komponencie SearchBar.tsx */}
          </div>

          {/* CTA Button (Opcjonalnie) */}
          <Link
            href="/dodaj-firme"
            className="hidden md:block text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full transition-colors"
          >
            Dodaj firmę
          </Link>
        </div>
      </header>

      {/* === MAIN CONTENT (SPLIT VIEW) === */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* --- LEWA KOLUMNA: LISTA (Scroll) --- */}
        <div className="w-full lg:w-[40%] xl:w-[500px] h-full overflow-y-auto bg-gray-50 border-r border-gray-200 scrollbar-thin scrollbar-thumb-gray-300">
          {/* Statystyki wyników */}
          <div className="sticky top-0 bg-gray-50/95 backdrop-blur z-10 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">
              Wyniki wyszukiwania
            </span>
            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs font-medium text-gray-700">
              {companies.length} firm
            </span>
          </div>

          <div className="p-4 space-y-3">
            {companies.length > 0 ? (
              companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/${slugifyCity(company.city ?? "")}/${company.slug}`}
                  className="group block bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-blue-400 transition-all duration-200 relative overflow-hidden"
                >
                  {/* Pasek Premium */}
                  {company.plan === "PREMIUM" && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  )}

                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-1.5 py-0.5 rounded">
                          {company.category.name}
                        </span>
                        {company.plan === "PREMIUM" && (
                          <span className="flex items-center gap-0.5 text-[10px] text-green-700 font-bold">
                            <ShieldCheck size={12} /> Zweryfikowana
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-blue-600 transition-colors">
                        {company.name}
                      </h3>

                      <div className="mt-2 flex items-center text-sm text-gray-500 gap-1.5">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">
                          {company.address}, {company.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Akcje / Footer karty */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={14} className="text-gray-200" />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-blue-600 group-hover:underline">
                      Zobacz szczegóły
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              // Empty State
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MapPin size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Brak wyników
                </h3>
                <p className="text-sm text-gray-500 max-w-xs mt-1">
                  Nie znaleźliśmy firm spełniających Twoje kryteria w tym
                  katalogu.
                </p>
                <Link
                  href="/"
                  className="mt-4 text-blue-600 text-sm font-medium hover:underline"
                >
                  Wyczyść filtry
                </Link>
              </div>
            )}

            {/* Footer listy */}
            <div className="pt-8 pb-4 text-center text-xs text-gray-400">
              &copy; 2025 {tenant.name}. Wszystkie prawa zastrzeżone.
            </div>
          </div>
        </div>

        {/* --- PRAWA KOLUMNA: MAPA (Desktop) --- */}
        <div className="hidden lg:block flex-1 h-full relative z-0">
          <MapWrapper companies={mapData} />

          {/* Floating Buttons na mapie */}
          <div className="absolute top-4 right-4 z-[400] flex gap-2">
            <button className="bg-white px-3 py-2 rounded-lg shadow-md text-xs font-semibold hover:bg-gray-50 transition border border-gray-200">
              Szukaj w tym obszarze
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
