"use server";

import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const image = formData.get("image") as string; // URL z UploadThing (opcjonalne)

  // Prosty slugify
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
    throw new Error("Brak klucza API Google Gemini");
  }

  // 1. Instrukcja dla AI
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
      Napisz artykuł blogowy pod SEO na temat: "${topic}".
      
      Wymagania:
      1. Tytuł (Title).
      2. Krótki wstęp (Excerpt).
      3. Treść HTML (Content): Używaj <h2>, <p>, <ul>. 
         WAŻNE: W połowie tekstu i na końcu wstaw tag <img src="IMAGE_PLACEHOLDER" alt="Tematyczne zdjęcie" /> - ja potem podmienię ten placeholder na prawdziwe zdjęcie.
      4. Słowo kluczowe do wyszukiwania zdjęcia (PhotoQuery) po angielsku (np. "plumber", "modern house").
  
      Format JSON:
      {
        "title": "...",
        "excerpt": "...",
        "content": "...",
        "photoQuery": "..."
      }
    `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  const cleanJson = text.replace(/``````/g, "").trim();

  let data;
  try {
    data = JSON.parse(cleanJson);
  } catch (e) {
    throw new Error("Błąd JSON z AI.");
  }

  // 2. Pobieramy zdjęcia z Pexels
  // Główne (Okładka)
  const mainImage =
    (await fetchPexelsImage(data.photoQuery)) ||
    "https://placehold.co/800x400?text=No+Image";

  // Dodatkowe (do treści) - szukamy czegoś innego lub tego samego (dla uproszczenia pobierzmy 3 zdjęcia od razu)
  // W wersji prostej: podmieniamy IMAGE_PLACEHOLDER na to samo zdjęcie, ale lepiej pobrać więcej.

  // Ulepszone pobieranie (3 zdjęcia)
  let extraImages: string[] = [];
  if (process.env.PEXELS_API_KEY) {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${data.photoQuery}&per_page=3`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY },
      }
    );
    const pexelsData = await res.json();
    if (pexelsData.photos) {
      extraImages = pexelsData.photos.map((p: any) => p.src.medium);
    }
  }

  // Podmieniamy placeholdery w treści na prawdziwe zdjęcia
  let finalContent = data.content;
  if (extraImages.length > 1) {
    // Pierwszy placeholder -> drugie zdjęcie (pierwsze idzie na okładkę)
    finalContent = finalContent.replace(
      'src="IMAGE_PLACEHOLDER"',
      `src="${extraImages[1]}" class="w-full rounded-2xl my-8"`
    );
    // Drugi placeholder -> trzecie zdjęcie
    finalContent = finalContent.replace(
      'src="IMAGE_PLACEHOLDER"',
      `src="${
        extraImages[2] || extraImages[0]
      }" class="w-full rounded-2xl my-8"`
    );
  } else {
    // Fallback jeśli Pexels nie oddał zdjęć
    finalContent = finalContent.replace(
      /src="IMAGE_PLACEHOLDER"/g,
      `src="https://placehold.co/600x400?text=Blog+Image" class="w-full rounded-2xl my-8"`
    );
  }

  // 3. Slugify
  const slug =
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now().toString().slice(-4);

  // 4. Zapis
  await prisma.post.create({
    data: {
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: finalContent,
      published: true,
      image: extraImages[0] || mainImage, // Okładka
    },
  });

  revalidatePath("/admin/blog");
}
