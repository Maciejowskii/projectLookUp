import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MapPin } from "lucide-react"; // Pamiętaj o imporcie ikon

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>; // <--- W Next 15 to musi być Promise!
}) {
  // Awaitowanie paramsów (Next 15)
  const { slug } = await params;

  const category = await prisma.category.findFirst({
    where: { slug: slug },
    include: {
      companies: true,
    },
  });

  if (!category) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-20 flex-grow">
        {/* ... reszta kodu JSX ... */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            {category.name}
          </h1>
          <p className="text-xl text-gray-600">
            Znaleziono {category.companies.length} firm.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {category.companies.map((company) => (
            <Link
              key={company.id}
              href={`/firma/${company.slug}`}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group block"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {company.name}
              </h2>
              <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed">
                {company.description || "Brak opisu firmy."}
              </p>

              <div className="space-y-2 text-sm text-gray-600 border-t border-gray-50 pt-4">
                {company.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} /> {company.city}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
