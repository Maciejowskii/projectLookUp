import { prisma } from "@/lib/prisma";
import MapWrapper from "@/components/MapWrapper";

export default async function TestMapyPage() {
  const companies = await prisma.company.findMany({
    where: {
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      lat: true,
      lng: true,
      city: true,
      address: true,
    },
    take: 500,
  });

  const mapData = companies.map((c) => ({
    ...c,
    lat: c.lat!,
    lng: c.lng!,
  }));

  return (
    <div className="container mx-auto p-4 h-screen flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Test Mapy</h1>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
          Znaleziono punktów: {mapData.length}
        </span>
      </div>

      <div className="flex-1 w-full relative min-h-[500px] border-4 border-gray-300 rounded-xl">
        {/* Używamy wrappera zamiast bezpośredniego dynamic importu */}
        <MapWrapper companies={mapData} />
      </div>
    </div>
  );
}
