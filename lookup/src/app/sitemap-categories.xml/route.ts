// app/sitemap-categories.xml/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://www.katalogo.pl";

export async function GET() {
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categories
  .map(
    (cat) => `  <url>
    <loc>${BASE_URL}/kategoria/${cat.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
