import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Ustaw adres swojej domeny (na razie localhost, potem zmienisz na produkcję)
const BASE_URL = "http://localhost:3000";
// Na produkcji np.: "https://twoja-domena.pl"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Pobierz firmy (ograniczmy do np. 10000 najnowszych dla wydajności)
  const companies = await prisma.company.findMany({
    select: { slug: true, updatedAt: true },
    take: 10000,
  });

  // 2. Pobierz kategorie
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });

  // 3. Mapuj firmy na format sitemapy
  const companyEntries: MetadataRoute.Sitemap = companies.map((company) => ({
    url: `${BASE_URL}/firma/${company.slug}`,
    // Jeśli updatedAt jest null/undefined, użyj aktualnej daty
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

  // 5. Strony statyczne
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
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
      priority: 0.5,
    },
  ];

  return [...staticEntries, ...categoryEntries, ...companyEntries];
}
