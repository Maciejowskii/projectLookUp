
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowRight, Calendar } from "lucide-react";

export const metadata = {
  title: "Blog i Porady | katalogo",
  description: "Najnowsze artykuły, porady i rankingi firm.",
};

export default async function BlogIndexPage() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 pt-32 pb-20 max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Blog i Porady
          </h1>
          <p className="text-xl text-gray-500">
            Wiedza, która pomoże Ci wybrać najlepszych fachowców.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="h-56 bg-gray-200 relative overflow-hidden">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-3xl opacity-90">
                    {post.title.charAt(0)}
                  </div>
                )}
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">
                  <Calendar size={14} />
                  {new Date(post.createdAt).toLocaleDateString("pl-PL")}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-500 text-sm line-clamp-3 mb-6 flex-grow">
                  {post.excerpt}
                </p>
                <div className="flex items-center text-blue-600 font-bold text-sm gap-2 mt-auto">
                  Czytaj dalej{" "}
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            Jeszcze nie ma żadnych wpisów. Wróć wkrótce!
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
