
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SearchBarOptimized } from "@/components/SearchBarOptimized";
import MapWrapper from "@/components/MapWrapper";
import { CompaniesListClient } from "@/components/CompaniesListClient";
import { Suspense } from "react";
import { CompanyListSkeleton } from "@/components/CompanyListSkeleton";

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

  // 3. Pobranie danych dla mapy (tylko pierwsze 50 z współrzędnymi)
  // Reszta będzie ładowana przez React Query w komponencie klienckim
  const mapDataRaw = await prisma.company.findMany({
    where: {
      ...whereClause,
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      city: true,
      lat: true,
      lng: true,
    },
    take: 50, // Tylko pierwsze 50 dla mapy
    orderBy: [
      { isVerified: "desc" },
      { logo: "desc" },
      { name: "asc" },
    ],
  });

  const mapData = mapDataRaw.map((c) => ({
    ...c,
    lat: c.lat!,
    lng: c.lng!,
  }));

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* === HEADER / NAVBAR (Mobile-First) === */}
      <header className="flex-none bg-white border-b border-gray-200 z-30 px-4 py-3 shadow-sm sticky top-0" style={{ paddingTop: `calc(0.75rem + var(--safe-area-inset-top))` }}>
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          {/* Logo / Nazwa Tenanta */}
          <Link href="/" className="flex items-center gap-2 group touch-manipulation active:scale-95 transition-transform">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md md:group-hover:scale-105 transition-transform">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                {tenant.name}
              </h1>
              <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Katalog branżowy
              </p>
            </div>
          </Link>

          {/* SearchBar - kompaktowy na headerze */}
          <div className="w-full md:w-auto md:flex-1 md:max-w-2xl order-3 md:order-2">
            <SearchBarOptimized />
          </div>

          {/* CTA Button (Desktop only) */}
          <Link
            href="/dodaj-firme"
            className="hidden md:flex text-sm font-medium text-blue-600 md:hover:bg-blue-50 px-4 py-2 rounded-full transition-colors touch-manipulation min-h-[44px] items-center justify-center order-3"
          >
            Dodaj firmę
          </Link>
        </div>
      </header>

      {/* === MAIN CONTENT (Mobile: Single Column, Desktop: Split View) === */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* --- LEWA KOLUMNA: LISTA (Scroll) - Full width on mobile --- */}
        <div className="w-full lg:w-[40%] xl:w-[500px] h-full bg-gray-50 lg:border-r border-gray-200 flex flex-col pb-20 md:pb-0" style={{ paddingBottom: `calc(5rem + var(--safe-area-inset-bottom))` }}>
          {/* Statystyki wyników */}
          <div className="sticky top-0 bg-gray-50/95 backdrop-blur z-10 px-4 py-2 md:py-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">
              Wyniki wyszukiwania
            </span>
          </div>

          {/* Lista firm z React Query i virtualizacją */}
          <Suspense fallback={<div className="p-4"><CompanyListSkeleton /></div>}>
            <CompaniesListClient
              initialDomain={decodedDomain}
              initialTenantId={tenant.id}
              initialQuery={q}
              initialCity={city}
              slugifyCity={slugifyCity}
            />
          </Suspense>

          {/* Footer listy */}
          <div className="pt-4 pb-4 px-4 text-center text-xs text-gray-400 flex-shrink-0 border-t border-gray-200">
            &copy; 2025 {tenant.name}. Wszystkie prawa zastrzeżone.
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
