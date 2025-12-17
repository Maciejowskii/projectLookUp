import { prisma } from "@/lib/prisma";
import { ShieldCheck, MapPin, Search } from "lucide-react";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  // Pobieramy firmy (max 50 najnowszych, żeby nie zamulić przeglądarki)
  // Jeśli jest parametr ?q=..., filtrujemy
  const companies = await prisma.company.findMany({
    where: q
      ? {
          name: { contains: q, mode: "insensitive" },
        }
      : undefined,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      tenant: true,
      category: true,
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Zarządzanie Firmami
        </h2>

        {/* Prosta wyszukiwarka (Formularz GET) */}
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Szukaj firmy..."
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Nazwa Firmy</th>
              <th className="px-6 py-3">Tenant (Branża)</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Lokalizacja</th>
              <th className="px-6 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50 group">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{company.name}</div>
                  <div className="text-xs text-gray-500">
                    {company.category.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                    {company.tenant.name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 items-start">
                    {company.plan === "PREMIUM" ? (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        PREMIUM
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        FREE
                      </span>
                    )}

                    {company.isVerified && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                        <ShieldCheck size={12} /> Zweryfikowana
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    {company.city}
                  </div>
                  <div className="text-xs pl-5 truncate max-w-[150px]">
                    {company.address}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-blue-600 hover:underline font-medium text-xs mr-3">
                    Edytuj
                  </button>
                  <button className="text-red-500 hover:underline font-medium text-xs">
                    Usuń
                  </button>
                </td>
              </tr>
            ))}

            {companies.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nie znaleziono firm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400">
        Pokazuję 50 najnowszych firm. Użyj wyszukiwarki, aby znaleźć konkretną.
      </div>
    </div>
  );
}
