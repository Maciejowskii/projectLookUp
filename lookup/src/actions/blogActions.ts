"use server";

import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "react-hot-toast";

interface FormState {
  message?: string;
}
// Inicjalizacja klienta Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || "");

async function fetchPexelsImage(query: string): Promise<string | null> {
  if (!process.env.PEXELS_API_KEY) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&locale=pl-PL`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );
    const data = await res.json();
    if (data.photos && data.photos.length > 0) {
      return data.photos[0].src.landscape;
    }
  } catch (e) {
    console.error("Pexels error:", e);
  }
  return null;
}

export async function createPost(formData: FormData) {
  await checkAdminAuth();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const excerpt = formData.get("excerpt") as string;
  const image = formData.get("image") as string;

  // Slugify
  const slug = title
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/ś/g, "s")
    .replace(/ć/g, "c")
    .replace(/ą/g, "a")
    .replace(/ę/g, "e")
    .replace(/ń/g, "n")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/ó/g, "o")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      image,
      published: true,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  // ✅ NIE ZWRACA NIC - dla formularza
}

export async function deletePost(id: string) {
  await checkAdminAuth();
  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

// --- GENERATOR AI DLA CRON (ZWRACA ID) ---
export async function generatePostAI(formData: FormData): Promise<string> {
  await checkAdminAuth();

  const topic = formData.get("topic") as string;

  if (!process.env.GOOGLE_AI_KEY) {
    throw new Error("Brak klucza API Google Gemini (GOOGLE_AI_KEY)");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `
      Napisz artykuł blogowy pod SEO na temat: "${topic}".
      
      Wymagania:
      1. Tytuł (Title).
      2. Krótki wstęp (Excerpt) - max 2 zdania.
      3. Treść HTML (Content): Używaj znaczników <h2>, <p>, <ul>, <li>. Nie używaj <h1> ani <html>/<body>.
         WAŻNE: W połowie tekstu oraz na samym końcu wstaw tag: <img src="IMAGE_PLACEHOLDER" alt="Tematyczne zdjęcie" />
      4. Słowo kluczowe do wyszukiwania zdjęcia (PhotoQuery) po angielsku (np. "plumber", "modern house").
  
      Struktura JSON:
      {
        "title": "string",
        "excerpt": "string",
        "content": "string",
        "photoQuery": "string"
      }
    `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      console.error("AI Raw Response:", text);
      throw new Error("AI nie zwróciło poprawnego obiektu JSON.");
    }

    const cleanJson = text.substring(firstBrace, lastBrace + 1);

    let data;
    try {
      data = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("Błąd parsowania danych od AI.");
    }

    let extraImages: string[] = [];
    if (process.env.PEXELS_API_KEY) {
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(
            data.photoQuery
          )}&per_page=3&locale=en-US`,
          { headers: { Authorization: process.env.PEXELS_API_KEY } }
        );
        const pexelsData = await res.json();
        if (pexelsData.photos)
          extraImages = pexelsData.photos.map((p: any) => p.src.medium);
      } catch (e) {
        console.error(e);
      }
    }

    const mainImage =
      extraImages[0] || "https://placehold.co/800x400?text=No+Image";
    let finalContent = data.content;

    if (extraImages[1])
      finalContent = finalContent.replace(
        'src="IMAGE_PLACEHOLDER"',
        `src="${extraImages[1]}" class="w-full h-auto rounded-2xl my-8 object-cover shadow-sm"`
      );
    else
      finalContent = finalContent.replace(
        'src="IMAGE_PLACEHOLDER"',
        `src="https://placehold.co/800x400?text=Blog+Image+1" class="w-full h-auto rounded-2xl my-8"`
      );

    if (extraImages[2])
      finalContent = finalContent.replace(
        'src="IMAGE_PLACEHOLDER"',
        `src="${extraImages[2]}" class="w-full h-auto rounded-2xl my-8 object-cover shadow-sm"`
      );
    else
      finalContent = finalContent.replace(
        'src="IMAGE_PLACEHOLDER"',
        `src="https://placehold.co/800x400?text=Blog+Image+2" class="w-full h-auto rounded-2xl my-8"`
      );

    const slug =
      data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Date.now().toString().slice(-4);

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: finalContent,
        published: true,
        image: mainImage,
      },
    });

    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return post.id; // ✅ ZWRACA ID dla cron
  } catch (error: any) {
    console.error("Błąd AI:", error);
    throw new Error(error.message);
  }
}

// --- DLA FORMULARZA (NIE ZWRACA NIC) ---
export async function generatePostAIForm(formData: FormData) {
  await generatePostAI(formData); // wywołuje główną funkcję
  revalidatePath("/admin/blog");
}

export async function schedulePost(formData: FormData) {
  const topic = formData.get("topic")?.toString();
  const date = formData.get("date")?.toString();
  const time = formData.get("time")?.toString() || "08:00";

  if (!topic || !date) return;

  const scheduledAt = new Date(`${date}T${time}`); // ✅ DATA + GODZINA!

  await prisma.scheduledPost.create({
    data: {
      topic,
      scheduledAt,
      status: "scheduled", // ✅ Domyślny status
    },
  });

  revalidatePath("/admin/blog");
}

export async function updatePost(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const id = formData.get("id")?.toString();
  const title = formData.get("title")?.toString() ?? "";
  const excerpt = formData.get("excerpt")?.toString() ?? "";
  const content = formData.get("content")?.toString() ?? "";

  if (!id) {
    return { message: "❌ Brak ID posta!" };
  }

  await prisma.post.update({
    where: { id },
    data: { title, excerpt, content },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");

  return { message: "✅ Zmiany zapisane pomyślnie!" };
}

// DODAJ te 2 funkcje:
export async function publishScheduledPost(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const job = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!job) return;

  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "processing" },
  });

  const formDataAI = new FormData();
  formDataAI.set("topic", job.topic);
  const postId = await generatePostAI(formDataAI);

  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "done", executedAt: new Date(), postId },
  });

  revalidatePath("/admin/blog");
}

export async function cancelScheduledPost(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "cancelled" },
  });
  revalidatePath("/admin/blog");
}
