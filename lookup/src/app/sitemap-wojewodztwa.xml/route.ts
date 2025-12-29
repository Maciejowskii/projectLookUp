// app/sitemap-wojewodztwa.xml/route.ts
import { NextResponse } from "next/server";
import { VOIVODESHIPS } from "@/lib/regions";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://www.katalogo.pl";

export async function GET() {
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${VOIVODESHIPS.map(
  (region) => `  <url>
    <loc>${BASE_URL}/wojewodztwo/${region.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`
).join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
