import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Calendar } from "lucide-react";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post) return { title: "Artykuł nie znaleziony" };

  return {
    title: `${post.title} | Blog LookUp`,
    description: post.excerpt,
    openGraph: {
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });

  if (!post) return notFound();

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-20">
        <article className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 mb-6 transition-colors"
            >
              <ArrowLeft size={16} /> Wróć do bloga
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Calendar size={16} />
              {new Date(post.createdAt).toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          {/* Featured Image */}
          {post.image && (
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden mb-12 shadow-lg">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 text-lg leading-relaxed text-gray-700">
            {/* ⚠️ UWAGA: W produkcji użyj np. 'dompurify' jeśli content pochodzi od userów. Tutaj zakładamy, że Ty jesteś autorem. */}
            <div
              dangerouslySetInnerHTML={{ __html: post.content }}
              className="prose prose-lg prose-blue max-w-none"
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
