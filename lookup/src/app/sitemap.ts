import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${process.env.NEXT_PUBLIC_URL || "https://www.katalogo.pl"}`,
      lastModified: new Date(),
    },
  ];
}
