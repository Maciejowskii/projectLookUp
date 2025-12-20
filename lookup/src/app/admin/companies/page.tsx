import { prisma } from "@/lib/prisma";
import {
  ShieldCheck,
  MapPin,
  Search,
  MoreHorizontal,
  Globe,
} from "lucide-react";
import Link from "next/link";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const companies = await prisma.company.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { tenant: true, category: true },
  });

  const totalCompanies = await prisma.company.count();

  return (
    <div className="space-y-6">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Baza Firm
          </h1>
          <p className="text-sm text-gray-500">
            Zarządzasz łącznie{" "}
            <strong className="text-gray-900">{totalCompanies}</strong> firmami.
          </p>
        </div>

        <form className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search
              size={16}
              className="text-gray-400 group-focus-within:text-blue-500 transition-colors"
            />
          </div>
          <input
            name="q"
            defaultValue={q}
            placeholder="Szukaj po nazwie..."
            className="pl-10 pr-4 py-2.5 w-full md:w-80 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Firma</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Kategoria</th>
                <th className="px-6 py-4 font-semibold">Lokalizacja</th>
                <th className="px-6 py-4 font-semibold text-right">
                  Zarządzaj
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-gray-50/80 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {/* Logo Placeholder - Initials */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
                        {company.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {company.name}
                        </div>
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Globe size={10} />{" "}
                            {new URL(company.website).hostname}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      {company.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          <ShieldCheck size={12} /> Zweryfikowana
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Niezweryfikowana
                        </span>
                      )}

                      {company.plan === "PREMIUM" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          PREMIUM
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 text-xs">
                      {company.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="truncate max-w-[150px]">
                        {company.city}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/firma/${company.slug}`}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg inline-block"
                    >
                      <MoreHorizontal size={20} />
                    </Link>
                  </td>
                </tr>
              ))}

              {companies.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-gray-500 bg-gray-50/30"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-gray-300" />
                      <p>Nie znaleziono firm spełniających kryteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
