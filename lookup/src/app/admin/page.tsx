import { prisma } from "@/lib/prisma";
import { Building2, Users, MapPin, CheckCircle, Clock } from "lucide-react";

async function getStats() {
  // Pobieramy dane równolegle dla szybkości
  const [companyCount, tenantCount, leadCount, recentLeads] =
    await prisma.$transaction([
      prisma.company.count(),
      prisma.tenant.count(),
      prisma.lead.count(),
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { company: true },
      }),
    ]);

  return { companyCount, tenantCount, leadCount, recentLeads };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">
        Centrum Dowodzenia
      </h2>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Wszystkie Firmy</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.companyCount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <MapPin size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Tenanty (Branże)
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.tenantCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Zgłoszenia (Leady)
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.leadCount}
            </p>
          </div>
        </div>
      </div>

      {/* OSTATNIE LEADY */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Ostatnie zgłoszenia</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-3 font-medium">Data</th>
              <th className="px-6 py-3 font-medium">Osoba</th>
              <th className="px-6 py-3 font-medium">Firma (Cel)</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.recentLeads.length > 0 ? (
              stats.recentLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString("pl-PL")}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {lead.contactName}
                    <br />
                    <span className="text-xs text-gray-400 font-normal">
                      {lead.email}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-blue-600">
                    {lead.company?.name || "Usunięta firma"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.status === "NEW"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {lead.status === "NEW" ? (
                        <Clock size={12} />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  Brak zgłoszeń w systemie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
