import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { VOIVODESHIPS } from "@/lib/regions"; // <--- Importujemy regiony

// Pobierz URL z ENV, a jak nie ma, to localhost (bezpieczniej dla produkcji)
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Pobierz firmy
  const companies = await prisma.company.findMany({
    select: { slug: true, updatedAt: true },
    take: 20000, // Zwiększyłem limit, Google "łyka" do 50k na plik
  });

  // 2. Pobierz kategorie
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });

  // 3. Mapuj firmy
  const companyEntries: MetadataRoute.Sitemap = companies.map((company) => ({
    url: `${BASE_URL}/firma/${company.slug}`,
    lastModified: company.updatedAt || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 4. Mapuj kategorie
  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/kategoria/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  // 5. Mapuj Województwa (NOWE!)
  // To kluczowe dla SEO lokalnego
  const regionEntries: MetadataRoute.Sitemap = VOIVODESHIPS.map((region) => ({
    url: `${BASE_URL}/wojewodztwo/${region.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.9, // Wysoki priorytet, bo to ważne huby
  }));

  // 6. Strony statyczne
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/wojewodztwa`, // Lista wszystkich
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/szukaj`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/dodaj-firme`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/kontakt`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  return [
    ...staticEntries,
    ...regionEntries,
    ...categoryEntries,
    ...companyEntries,
  ];
}
