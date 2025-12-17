import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// URL Twojej produkcji (zmień jak już będziesz miał domenę)
const BASE_URL = "https://twoja-domena.pl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Pobieramy wszystkich tenantów (żeby wygenerować linki do stron głównych)
  const tenants = await prisma.tenant.findMany({
    select: { subdomain: true },
  });

  // 2. Pobieramy firmy (limitujemy np. do 50k najnowszych, sitemap ma limity)
  const companies = await prisma.company.findMany({
    select: {
      slug: true,
      createdAt: true,
      tenant: {
        select: { subdomain: true },
      },
    },
    take: 50000, // Limit Google na jeden plik sitemap
  });

  // 3. Generujemy wpisy dla stron głównych tenantów
  const tenantUrls = tenants.map((tenant) => ({
    url: `https://${tenant.subdomain}.twoja-domena.pl`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1.0,
  }));

  // 4. Generujemy wpisy dla firm
  const companyUrls = companies.map((company) => ({
    url: `https://${company.tenant.subdomain}.twoja-domena.pl/${company.slug}`,
    lastModified: company.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...tenantUrls, ...companyUrls];
}
