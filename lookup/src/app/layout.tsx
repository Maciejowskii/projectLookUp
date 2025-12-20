import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";

const inter = Inter({ subsets: ["latin"] });

// Zdefiniuj adres swojej strony (na razie localhost, na produkcji zmienisz w .env)
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Dynamiczne Metadata z bazy
export async function generateMetadata(): Promise<Metadata> {
  // Pobieramy suffix z ustawień (lub domyślny)
  const settings = await prisma.setting.findMany();
  const get = (key: string) => settings.find((s) => s.key === key)?.value;

  const suffix = get("site_title_suffix") || "| Katalog Firm";

  return {
    // ⚠️ KLUCZOWE DLA SEO: Definiuje bazowy URL dla wszystkich linków względnych
    metadataBase: new URL(BASE_URL),

    title: {
      template: `%s ${suffix}`,
      default: `Znajdź najlepszych fachowców ${suffix}`,
    },
    description: "Największa baza firm i fachowców w Twojej okolicy.",
    // Opcjonalnie: Domyślny obrazek przy udostępnianiu na FB/X
    openGraph: {
      images: ["/og-image.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
