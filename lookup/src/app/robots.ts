import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = "http://localhost:3000"; // Pamiętaj zmienić na produkcji

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/przejmij/"], // Blokujemy admina i proces przejmowania
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
