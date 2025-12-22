
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createPost, deletePost, generatePostAI } from "@/actions/blogActions";
import { Trash2, Sparkles, PenTool, Eye } from "lucide-react";
import Link from "next/link";

export default async function AdminBlogPage() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Zarządzanie Blogiem
          </h1>
          <p className="text-gray-500 text-sm">
            Twórz treści, które przyciągną ruch z Google.
          </p>
        </div>
        <Link
          href="/blog"
          target="_blank"
          className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:underline"
        >
          <Eye size={16} /> Podgląd bloga
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KARTA 1: GENERATOR AI */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <h2 className="font-bold text-indigo-900 flex items-center gap-2 mb-4">
            <Sparkles className="text-purple-600" size={20} /> Generator AI
            (Gemini)
          </h2>
          <form action={generatePostAI} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">
                Temat artykułu
              </label>
              <input
                name="topic"
                required
                placeholder="np. Jak wybrać dobrego hydraulika?"
                className="w-full p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-purple-400 outline-none"
              />
            </div>
            <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-200">
              <Sparkles size={18} /> Wygeneruj i Opublikuj
            </button>
            <p className="text-xs text-indigo-400 text-center">
              To zajmie ok. 5-10 sekund. Artykuł pojawi się na liście poniżej.
            </p>
          </form>
        </div>

        {/* KARTA 2: DODAJ RĘCZNIE (Uproszczona) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <PenTool className="text-gray-600" size={20} /> Dodaj ręcznie
          </h2>
          <form action={createPost} className="space-y-3">
            <input
              name="title"
              required
              placeholder="Tytuł"
              className="w-full p-2 border rounded-lg text-sm"
            />
            <input
              name="excerpt"
              required
              placeholder="Krótki wstęp (zajawka)"
              className="w-full p-2 border rounded-lg text-sm"
            />
            <textarea
              name="content"
              required
              placeholder="Treść HTML (<p>...)"
              rows={3}
              className="w-full p-2 border rounded-lg text-sm font-mono"
            />
            <button className="w-full bg-gray-900 text-white font-bold py-2 rounded-lg text-sm hover:bg-black">
              Zapisz
            </button>
          </form>
        </div>
      </div>

      {/* LISTA POSTÓW */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600">
                Tytuł artykułu
              </th>
              <th className="p-4 font-semibold text-gray-600">Data</th>
              <th className="p-4 font-semibold text-gray-600 text-right">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">
                  {post.title}
                  <span className="block text-xs text-gray-400 font-normal truncate max-w-xs">
                    {post.slug}
                  </span>
                </td>
                <td className="p-4 text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <form action={deletePost.bind(null, post.id)}>
                    <button className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-400">
                  Brak postów. Użyj generatora AI powyżej!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
