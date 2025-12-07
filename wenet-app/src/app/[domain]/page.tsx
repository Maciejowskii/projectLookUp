import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { MapPin, Star, ShieldCheck } from "lucide-react";

type Props = {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ q?: string; city?: string }>;
};

export default async function TenantHomePage({ params, searchParams }: Props) {
  const { domain } = await params;
  const { q, city } = await searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: domain },
  });
  if (!tenant) return notFound();

  const whereClause: any = { tenantId: tenant.id };
  if (q) whereClause.name = { contains: q, mode: "insensitive" };
  if (city) whereClause.city = { contains: city, mode: "insensitive" };

  const companies = await prisma.company.findMany({
    where: whereClause,
    take: 20,
    orderBy: { isVerified: "desc" },
  });

  return (
    <div>
      {/* --- HERO SECTION --- */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Znajdź najlepsze firmy: <br />
            <span className="text-blue-200">{tenant.name}</span>
          </h1>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            {tenant.description ||
              "Przeglądaj tysiące zweryfikowanych specjalistów w Twojej okolicy."}
          </p>

          {/* SearchBar wewnątrz Hero (będzie wyglądał lepiej na białym tle w containerze poniżej) */}
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-5xl mx-auto px-4 -mt-8">
        <SearchBar />

        <div className="mt-12 mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Polecane firmy</h2>
            <p className="text-gray-500 text-sm mt-1">
              Znaleziono: {companies.length} wyników
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {companies.length > 0 ? (
            companies.map((company) => (
              <Link
                key={company.id}
                href={`/firma/${company.slug}`}
                className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
                    {/* Placeholder na logo */}
                    <Star size={24} />
                  </div>
                  {company.plan === "PREMIUM" && (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      <ShieldCheck size={12} /> Zweryfikowana
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">
                  {company.name}
                </h3>

                <div className="mt-auto pt-4 flex items-center text-gray-500 text-sm gap-1">
                  <MapPin size={16} />
                  <span>
                    {company.address}, {company.city}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-2 text-center py-16 bg-white rounded-xl border border-dashed">
              <p className="text-gray-500 text-lg">
                Brak wyników dla Twojego zapytania.
              </p>
              <button className="mt-4 text-blue-600 font-medium hover:underline">
                Wyczyść filtry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
