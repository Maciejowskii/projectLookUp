import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MapPin } from "lucide-react";

export async function CityCrossLinks({ city }: { city?: string }) {
  if (!city) return null;

  // Pobieramy 8 losowych kategorii (lub najpopularniejszych)
  const categories = await prisma.category.findMany({
    take: 8,
    // Możesz dodać logikę losowania, tutaj bierzemy pierwsze 8
  });

  return (
    <div className="w-full bg-gray-50 border-t border-gray-200 py-12 mt-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
            <MapPin size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Inne usługi w miejscowości{" "}
            <span className="text-blue-600">{city}</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              // Linkujemy do wyszukiwarki z parametrami miasto + kategoria
              href={`/szukaj?q=${cat.name}&city=${city}`}
              className="bg-white px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all text-center truncate"
              title={`${cat.name} ${city}`}
            >
              {cat.name}{" "}
              <span className="text-gray-400 font-normal text-xs ml-1">
                {city}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
