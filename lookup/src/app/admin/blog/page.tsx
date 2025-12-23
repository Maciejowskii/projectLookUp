export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import {
  createPost,
  deletePost,
  generatePostAI,
  schedulePost,
  generatePostAIForm,
  publishScheduledPost, // ✅ DODAJ
  cancelScheduledPost, // ✅ DODAJ
} from "@/actions/blogActions";
import { Trash2, Sparkles, PenTool, Eye, Pencil } from "lucide-react";
import Link from "next/link";

export default async function AdminBlogPage() {
  const [posts, scheduled] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.scheduledPost.findMany({
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

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

      {/* 3 karty: AI, ręcznie, planer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KARTA 1: GENERATOR AI */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <h2 className="font-bold text-indigo-900 flex items-center gap-2 mb-4">
            <Sparkles className="text-purple-600" size={20} /> Generator AI
            (Gemini)
          </h2>
          <form action={generatePostAIForm} className="space-y-4">
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
            <input
              name="image"
              placeholder="URL obrazka (opcjonalne)"
              className="w-full p-2 border rounded-lg text-sm"
            />
            <button className="w-full bg-gray-900 text-white font-bold py-2 rounded-lg text-sm hover:bg-black">
              Zapisz
            </button>
          </form>
        </div>

        {/* ✅ KARTA 3: PLANER WPISÓW AI - ULEPSZONY */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">📅 Planer wpisów AI</h2>

          <form action={schedulePost} className="space-y-3 mb-6">
            <input
              name="topic"
              required
              placeholder="Temat artykułu"
              className="w-full p-2 border rounded-lg text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                name="date"
                required
                className="p-2 border rounded-lg text-sm"
              />
              <input
                type="time"
                name="time"
                required
                defaultValue="08:00"
                className="p-2 border rounded-lg text-sm"
              />
            </div>
            <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-700">
              📅 Zaplanuj na później
            </button>
          </form>

          {/* ✅ LISTA ZAPLANOWANYCH + AKCJE */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {scheduled
              .filter((s) => s.status === "scheduled")
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {s.topic}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(s.scheduledAt).toLocaleString("pl-PL")}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* ✅ PRZYCISK OPUBLIKUJ NATYCHMIAST */}
                    <form action={publishScheduledPost} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded font-bold hover:bg-green-600 transition-colors"
                      >
                        🚀 Opublikuj
                      </button>
                    </form>

                    {/* ✅ PRZYCISK ANULUJ */}
                    <form action={cancelScheduledPost} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-gray-500 text-white text-xs rounded font-bold hover:bg-gray-600 transition-colors"
                      >
                        ❌ Anuluj
                      </button>
                    </form>
                  </div>
                </div>
              ))}

            {scheduled.filter((s) => s.status === "scheduled").length === 0 && (
              <p className="text-gray-400 text-xs text-center py-8">
                Brak zaplanowanych wpisów. 📝
              </p>
            )}
          </div>

          {/* ✅ HISTORIA WYKONAŃ */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
              Historia
            </h3>
            <div className="space-y-1 text-xs">
              {scheduled
                .filter((s) => s.status !== "scheduled")
                .slice(0, 3)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between text-gray-500"
                  >
                    <span className="truncate">{s.topic}</span>
                    <span
                      className={`font-mono ${
                        s.status === "done" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {s.status === "done" ? "✅" : "❌"}{" "}
                      {new Date(
                        s.executedAt || s.scheduledAt
                      ).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA POSTÓW - bez zmian */}
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
                <td className="p-4 text-right flex justify-end gap-2">
                  <Link
                    href={`/admin/blog/${post.id}/edit`}
                    className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={18} />
                  </Link>
                  <form
                    action={deletePost.bind(null, post.id)}
                    className="inline"
                  >
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
