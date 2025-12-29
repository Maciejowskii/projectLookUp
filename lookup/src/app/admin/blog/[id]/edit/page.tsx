"use client";

import { useActionState } from "react";
import { useEffect, useState } from "react";
import { updatePost } from "@/actions/blogActions";
import * as React from "react";

interface FormState {
  message?: string;
}

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
}

export default function EditPostPage({
  params, // ✅ params: Promise<{ id: string }>
}: {
  params: Promise<{ id: string }>; // ✅ TYP Promise!
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [state, formAction, isPending] = useActionState(updatePost, {
    message: "",
  });

  // ✅ UNWRAP params w Client Component!
  const resolvedParams = React.use(params); // DODAJ TO!
  const id = resolvedParams.id;

  useEffect(() => {
    fetch(`/api/post/${id}`) // ✅ Użyj resolved id
      .then((res) => res.json())
      .then(setPost);
  }, [id]); // ✅ ZMIENIŁO SIĘ NA id

  if (!post)
    return (
      <div className="flex items-center justify-center h-64">Ładowanie...</div>
    );

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-8">
      {state.message && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg animate-in slide-in-from-top-2 duration-300">
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={post.id} />
        <input
          name="title"
          defaultValue={post.title ?? ""}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          disabled={isPending}
        />
        <input
          name="excerpt"
          defaultValue={post.excerpt ?? ""}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          disabled={isPending}
        />
        <textarea
          name="content"
          defaultValue={post.content ?? ""}
          rows={10}
          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          disabled={isPending}
        />
        <button
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          disabled={isPending}
        >
          {isPending ? "💾 Zapisywanie..." : "💾 Zapisz zmiany"}
        </button>
      </form>
    </div>
  );
}
