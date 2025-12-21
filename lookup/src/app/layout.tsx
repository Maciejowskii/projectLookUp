import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.setting.findMany();
  const get = (key: string) => settings.find((s) => s.key === key)?.value;
  const suffix = get("site_title_suffix") || "| Katalog Firm";

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: "Katalogo.pl - Znajdź najlepszych fachowców",
      template: "%s | Katalogo.pl",
    },
    description: "Największa baza firm i fachowców w Twojej okolicy.",
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
  // Pobierz ID z .env dla bezpieczeństwa i łatwej zmiany na prod
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="pl">
      <body className={inter.className}>
        {children}

        {/* Wczytuj tylko jeśli ID są zdefiniowane */}
        {gtmId && <GoogleTagManager gtmId={gtmId} />}
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
