
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { approveClaim, rejectClaim } from "@/actions/adminActions";
import { Check, X, Clock, Building2, User } from "lucide-react";

export default async function AdminClaimsPage() {
  const claims = await prisma.claimRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  const pendingClaims = claims.filter((c) => c.status === "PENDING");
  const historyClaims = claims.filter((c) => c.status !== "PENDING");

  return (
    <div className="space-y-10">
      {/* SEKCJA 1: OCZEKUJĄCE (Priorytet) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-8 bg-yellow-400 rounded-full"></div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Oczekujące decyzji
            </h2>
            <p className="text-sm text-gray-500">
              Weryfikuj właścicieli i zarabiaj.
            </p>
          </div>
        </div>

        {pendingClaims.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white border border-yellow-200 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row gap-6 relative overflow-hidden group hover:shadow-md transition-shadow"
              >
                {/* Ozdobne tło */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:bg-yellow-100 transition-colors"></div>

                <div className="relative z-10 flex-1 space-y-4">
                  {/* Nagłówek Karty */}
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                      <Building2 className="text-gray-700" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">
                        {claim.company.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        NIP: {claim.company.nip || "Brak"}
                      </p>
                    </div>
                  </div>

                  {/* Dane Zgłaszającego */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <User size={16} className="text-gray-400" />{" "}
                      {claim.fullName}
                    </div>
                    <div className="text-xs text-gray-500 pl-6">
                      {claim.email} • {claim.phone}
                    </div>
                  </div>
                </div>

                {/* Akcje */}
                <div className="relative z-10 flex flex-row sm:flex-col justify-center gap-3 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
                  <form
                    action={approveClaim.bind(null, claim.id)}
                    className="w-full"
                  >
                    <button className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-900/10">
                      <Check size={18} /> Akceptuj
                    </button>
                  </form>
                  <form
                    action={rejectClaim.bind(null, claim.id)}
                    className="w-full"
                  >
                    <button className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                      <X size={18} /> Odrzuć
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Check className="text-green-500" size={32} />
            </div>
            <h3 className="text-gray-900 font-bold">Wszystko wyczyszczone!</h3>
            <p className="text-gray-500 text-sm">Brak oczekujących zgłoszeń.</p>
          </div>
        )}
      </section>

      {/* SEKCJA 2: HISTORIA */}
      <section>
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 ml-1">
          Historia Decyzji
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100">
              {historyClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {claim.company.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{claim.email}</td>
                  <td className="px-6 py-4 text-right">
                    {claim.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-md">
                        <Check size={12} /> Zaakceptowano
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-md">
                        <X size={12} /> Odrzucono
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {historyClaims.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="p-6 text-center text-gray-400 text-xs"
                  >
                    Pusta historia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
