import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  const tenants = await prisma.tenant.findMany();

  return (
    <div className="min-h-screen bg-gray-50 p-10 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          Panel WENET (Localhost)
        </h1>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-600">
            Twoje Katalogi:
          </h2>

          {tenants.length === 0 ? (
            <p className="text-red-500">
              Baza pusta. Uruchom 'npx prisma db seed'
            </p>
          ) : (
            <ul className="space-y-3">
              {tenants.map((t: any) => (
                <li key={t.id}>
                  <a
                    href={`http://${t.subdomain}.localhost:3000`}
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-blue-700 font-medium"
                  >
                    <span>{t.name}</span>
                    <span className="text-sm opacity-70">
                      🔗 {t.subdomain}.localhost:3000
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
