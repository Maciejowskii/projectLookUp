
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VOIVODESHIPS } from "@/lib/regions";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";

// --- GENEROWANIE METADANYCH (SEO) ---
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const region = VOIVODESHIPS.find((r) => r.slug === slug);

  if (!region) return { title: "Region nie znaleziony" };

  return {
    title: `Firmy w województwie ${region.name} | Katalog Firm`,
    description: `Znajdź najlepsze firmy i usługi w województwie ${
      region.name
    }. Przeglądaj bazę firm w miastach: ${region.cities.join(", ")}.`,
  };
}

// --- STRONA GŁÓWNA ---
export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Sprawdzamy czy region istnieje w naszej stałej liście
  const region = VOIVODESHIPS.find((r) => r.slug === slug);
  if (!region) return notFound();

  // 2. Pobieramy firmy z tego województwa
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { province: { equals: slug, mode: "insensitive" } }, // Np. province="mazowieckie"
        { province: { equals: region.name, mode: "insensitive" } }, // Np. province="Mazowieckie"
        { city: { in: region.cities } }, // Fallback dla starych wpisów (główne miasta)
      ],
    },
    take: 50,
    orderBy: [
      { isVerified: "desc" }, // Zweryfikowane na górze
      { createdAt: "desc" }, // Najnowsze zaraz po nich
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 pt-32 pb-20">
        {/* Header Regionu */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between">
          <div>
            <span className="text-blue-600 font-bold uppercase tracking-wide text-sm mb-2 block">
              Region
            </span>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Województwo {region.name}
            </h1>
            <p className="text-gray-500">
              Baza firm i usługodawców. Liczba znalezionych firm:{" "}
              <strong>{companies.length}</strong>
            </p>
          </div>
          <div className="mt-6 md:mt-0 hidden md:block opacity-20">
            <MapPin size={100} />
          </div>
        </div>

        {/* Lista Firm */}
        {companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link
                href={`/firma/${company.slug}`}
                key={company.id}
                className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-500 overflow-hidden relative">
                    {company.logo ? (
                      <Image
                        src={company.logo}
                        alt={company.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      company.name.charAt(0)
                    )}
                  </div>
                  {company.isVerified && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                      Zweryfikowana
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {company.name}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
                  <MapPin size={14} /> {company.city}
                </p>

                <div className="flex items-center text-blue-600 text-sm font-bold gap-1 group-hover:gap-2 transition-all mt-auto">
                  Zobacz profil <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Pusto w tym regionie...
            </h3>
            <p className="text-gray-500 mb-6">
              Jesteś pierwszy? Dodaj swoją firmę za darmo.
            </p>
            <Link
              href="/dodaj-firme"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
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
