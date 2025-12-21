"use server";

import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicjalizacja klienta Gemini
// Używamy zmiennej z Twojego .env (GOOGLE_AI_KEY)
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
      return data.photos[0].src.landscape; // Bierzemy wersję poziomą
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

  await prisma.post.create({
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
}

export async function deletePost(id: string) {
  await checkAdminAuth();
  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

// --- GENERATOR AI ---

export async function generatePostAI(formData: FormData) {
  await checkAdminAuth();

  const topic = formData.get("topic") as string;

  if (!process.env.GOOGLE_AI_KEY) {
    throw new Error("Brak klucza API Google Gemini (GOOGLE_AI_KEY)");
  }

  // 1. Konfiguracja modelu z WYMUSZENIEM JSON (responseMimeType)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json", // <--- To kluczowa zmiana!
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

    // 2. Pancerne czyszczenie JSONa (wycinamy wszystko od pierwszego { do ostatniego })
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

    // --- Reszta kodu bez zmian (Pexels, Zapis) ---
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

    await prisma.post.create({
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
  } catch (error: any) {
    console.error("Błąd AI:", error);
    throw new Error(error.message);
  }
}
