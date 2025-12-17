import { prisma } from "@/lib/prisma";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Wszystkie zgłoszenia (CRM)
      </h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Klient</th>
              <th className="px-6 py-3">Telefon</th>
              <th className="px-6 py-3">Firma</th>
              <th className="px-6 py-3">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-500">
                  {new Date(lead.createdAt).toLocaleDateString("pl-PL")}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">
                    {lead.contactName}
                  </div>
                  <div className="text-xs text-gray-500">{lead.email}</div>
                </td>
                <td className="px-6 py-4 font-mono text-gray-600">
                  {lead.phone}
                </td>
                <td className="px-6 py-4 text-blue-600 max-w-[200px] truncate">
                  {lead.company?.name}
                </td>
                <td className="px-6 py-4">
                  <button className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 transition">
                    Szczegóły
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
