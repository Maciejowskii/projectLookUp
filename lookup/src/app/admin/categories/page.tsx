
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createCategory, deleteCategory } from "@/actions/adminActions";
import { FolderPlus, Trash2, Layers } from "lucide-react";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { companies: true } } }, // Licznik firm w kategorii
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Kategorie Branżowe
          </h1>
          <p className="text-sm text-gray-500">
            Definiuj branże, aby poprawić SEO i nawigację.
          </p>
        </div>

        {/* Formularz dodawania inline */}
        <form action={createCategory} className="flex gap-2 w-full md:w-auto">
          <input
            name="name"
            required
            placeholder="Nowa kategoria (np. Hydraulik)"
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap">
            <FolderPlus size={18} /> Dodaj
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center group hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-500">
                  /{cat.slug} • {cat._count.companies} firm
                </p>
              </div>
            </div>

            <form action={deleteCategory.bind(null, cat.id)}>
              <button
                className="text-gray-300 hover:text-red-500 p-2 transition-colors"
                title="Usuń kategorię"
              >
                <Trash2 size={18} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
