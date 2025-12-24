// app/sitemap-companies.xml/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://www.katalogo.pl";

export async function GET() {
  const companies = await prisma.company.findMany({
    select: { slug: true, updatedAt: true },
    take: 20000, // jak w sitemap.ts
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${companies
  .map((company) => {
    const lastmod = (company.updatedAt || new Date()).toISOString();
    return `  <url>
    <loc>${BASE_URL}/firma/${company.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
