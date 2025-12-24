// app/sitemap-pages.xml/route.ts
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://www.katalogo.pl";

export async function GET() {
  const now = new Date().toISOString();

  const staticPages = [
    "/", // home
    "/wojewodztwa", // lista
    "/szukaj",
    "/dodaj-firme",
    "/kontakt",
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (path) => `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${
      path === "/" || path === "/szukaj"
        ? "daily"
        : path === "/kontakt"
        ? "yearly"
        : "monthly"
    }</changefreq>
    <priority>${
      path === "/"
        ? "1.0"
        : path === "/kontakt"
        ? "0.3"
        : path === "/szukaj"
        ? "0.8"
        : "0.6"
    }</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
