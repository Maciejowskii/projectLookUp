import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ClaimForm from "@/components/ClaimForm";
import { Lock, MapPin, Globe, Phone, CheckCircle, Star } from "lucide-react";

type Props = {
  params: Promise<{ domain: string; slug: string }>; // ZMIANA NA PROMISE
};

export default async function CompanyPage({ params }: Props) {
  // --- FIX: AWAIT PARAMS ---
  const { domain, slug } = await params;

  if (!domain || !slug) return notFound();

  // 1. Pobieramy tenanta
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: domain },
  });

  if (!tenant) return notFound();

  // 2. Pobieramy firmę
  const company = await prisma.company.findFirst({
    where: {
      slug: slug,
      tenantId: tenant.id,
    },
    include: { category: true },
  });

  if (!company) return notFound();

  const isPremium = company.plan === "PREMIUM";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* --- HEADER FIRMY --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-6 items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              {/* Logo Placeholder */}
              <span className="text-2xl font-bold">
                {company.name.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">
                  {company.category.name}
                </span>
                {isPremium && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                    <CheckCircle size={12} /> Partner Premium
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {company.name}
              </h1>
              <div className="flex items-center gap-2 text-gray-500 mt-2">
                <MapPin size={18} />
                <p>
                  {company.address}, {company.zip} {company.city}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-yellow-400">
              <Star fill="currentColor" size={20} />
              <Star fill="currentColor" size={20} />
              <Star fill="currentColor" size={20} />
              <Star fill="currentColor" size={20} />
              <Star fill="currentColor" size={20} />
              <span className="text-gray-400 text-sm ml-2">(Brak opinii)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- LEWA KOLUMNA: TREŚĆ --- */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">
              O firmie
            </h2>
            {isPremium ? (
              <div className="prose max-w-none text-gray-600 leading-relaxed">
                {company.description || "Brak opisu."}
              </div>
            ) : (
              <div className="relative py-12 px-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div className="absolute inset-0 backdrop-blur-[1px] bg-white/30"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                    <Lock className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    Opis firmy jest ukryty
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    Pełne informacje o ofercie, cenniku i historii firmy są
                    dostępne tylko w wersji zweryfikowanej.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* --- PRAWA KOLUMNA: KONTAKT (LEAD MAGNET) --- */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-lg shadow-blue-50/50 sticky top-24">
            <h3 className="font-bold text-lg mb-6 text-gray-900 flex items-center gap-2">
              <Phone size={20} className="text-blue-600" />
              Dane kontaktowe
            </h3>

            {isPremium ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Telefon
                    </p>
                    <p className="font-mono text-lg font-medium text-gray-900">
                      {company.phone}
                    </p>
                  </div>
                </div>
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 transition"
                  >
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">
                        Strona WWW
                      </p>
                      <p className="font-medium text-blue-600 truncate max-w-[200px]">
                        {company.website}
                      </p>
                    </div>
                  </a>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-6 space-y-3 opacity-50 pointer-events-none select-none filter blur-[2px]">
                  <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
                  <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm font-medium text-gray-900 mb-3 text-center">
                    To Twoja firma? <br />
                    <span className="text-gray-500 font-normal">
                      Odbierz dostęp, aby odblokować dane.
                    </span>
                  </p>
                  <ClaimForm
                    companyId={company.id}
                    subdomain={domain}
                    slug={slug}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
