
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CityCrossLinks } from "@/components/CityCrossLinks";
import {
  MapPin,
  Globe,
  Mail,
  Calendar,
  FileText,
  CheckCircle,
  ChevronRight, // <--- Nowa ikona do breadcrumbs
} from "lucide-react";
import { ReviewSection } from "@/components/ReviewSection";
import { PhoneRevealButton } from "@/components/PhoneRevealButton";
import { Metadata } from "next";

/* =========================================================
   METADATA (SEO)
========================================================= */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await prisma.company.findFirst({
    where: { slug },
  });

  if (!company) {
    return { title: "Firma nie znaleziona | katalogo" };
  }

  return {
    title: `${company.name} – ${company.city} | Opinie i Kontakt`,
    description:
      company.description?.slice(0, 160) ||
      `Sprawdź ofertę firmy ${company.name} w ${company.city}. Opinie, telefon i adres.`,
    alternates: {
      canonical: `https://twoja-domena.pl/firma/${company.slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: company.name,
      description: company.description?.slice(0, 100),
      images: company.logo ? [company.logo] : [],
    },
  };
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const company = await prisma.company.findFirst({
    where: { slug },
    include: {
      category: true,
      reviews: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) return notFound();

  const mapQuery = encodeURIComponent(
    `${company.name} ${company.city} ${company.address}`
  );

  /* ===== JSON-LD (SCHEMA.ORG) ===== */

  const reviewCount = company.reviews.length;
  const averageRating =
    reviewCount > 0
      ? (
          company.reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount
        ).toFixed(1)
      : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    image: company.logo
      ? [company.logo]
      : ["https://placehold.co/600x600?text=Logo"],
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address,
      addressLocality: company.city,
      postalCode: company.zip,
      addressCountry: "PL",
    },
    url: company.website || `https://twoja-domena.pl/firma/${company.slug}`,
    telephone: company.phone,
    description:
      company.description ||
      `Profil firmy ${company.name} w miejscowości ${company.city}.`,
    priceRange: "PLN",
    openingHours: ["Mo-Fr 08:00-17:00"],
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating,
        reviewCount,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* PASEK "CZY TO TWOJA FIRMA?" */}
      {!company.isVerified && (
        <div className="pt-24 pb-4 px-4 bg-yellow-50 border-b border-yellow-100">
          <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-yellow-800 text-sm">
              <strong>To Twoja firma?</strong> Przejmij ten profil, aby edytować
              dane i odpowiadać na opinie.
            </p>
            <Link
              href={`/przejmij/${company.id}`}
              className="bg-white text-yellow-700 px-4 py-2 rounded-lg text-sm font-bold border border-yellow-200 hover:bg-yellow-100"
            >
              Zarządzaj profilem →
            </Link>
          </div>
        </div>
      )}

      {/* HEADER PROFILU */}
      <div
        className={`bg-white border-b ${
          !company.isVerified ? "pt-8" : "pt-32"
        } pb-12`}
      >
        <div className="container mx-auto px-4 max-w-5xl">
          {/* --- 1. BREADCRUMBS (SEO) --- */}
          <nav className="flex flex-wrap items-center text-sm text-gray-500 mb-6 gap-2">
            <Link href="/" className="hover:text-blue-600 hover:underline">
              Strona główna
            </Link>
            <ChevronRight size={14} className="text-gray-400" />

            <Link
              href={`/kategoria/${company.category.id}`}
              className="hover:text-blue-600 hover:underline"
            >
              {company.category.name}
            </Link>
            <ChevronRight size={14} className="text-gray-400" />

            {/* Opcjonalnie: Link do miasta, jeśli będziesz miał taką stronę */}
            <span className="text-gray-700">{company.city}</span>
            <ChevronRight size={14} className="text-gray-400" />

            <span className="font-semibold text-gray-900 truncate max-w-[200px]">
              {company.name}
            </span>
          </nav>

          <div className="flex flex-col md:flex-row gap-8">
            {/* LOGO */}
            <div className="flex-shrink-0">
              {company.logo ? (
                <div className="w-32 h-32 relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <Image
                    src={company.logo}
                    alt={`Logo ${company.name}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-sm">
                  {company.name.charAt(0)}
                </div>
              )}
            </div>

            {/* DANE GŁÓWNE */}
            <div className="flex-grow">
              <div className="flex flex-wrap gap-3 mb-3">
                {/* --- 2. KATEGORIA JAKO LINK (SEO) --- */}
                <Link
                  href={`/kategoria/${company.category.id}`}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  {company.category.name}
                </Link>

                {company.nip && (
                  <span className="bg-gray-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-gray-200 text-gray-600">
                    <FileText size={12} /> NIP: {company.nip}
                  </span>
                )}

                {company.isVerified && (
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-100">
                    <CheckCircle size={12} /> Zweryfikowana
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 leading-tight">
                {company.name}
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {company.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />{" "}
                    {company.city}, {company.address}
                  </div>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Globe size={16} /> Strona www
                  </a>
                )}
              </div>
            </div>

            {/* AKCJE */}
            <div className="bg-gray-50 p-6 rounded-2xl min-w-[280px] border border-gray-100 h-fit">
              {company.phone && (
                <PhoneRevealButton
                  phone={company.phone}
                  companyId={company.id}
                />
              )}

              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="mt-3 flex items-center justify-center gap-2 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Mail size={18} /> Wyślij wiadomość
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TREŚĆ GŁÓWNA */}
      <main className="container mx-auto px-4 py-12 max-w-5xl grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Opis */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">O firmie</h2>
            <div className="prose prose-blue text-gray-600 leading-relaxed whitespace-pre-line">
              {company.description ||
                "Ta firma nie dodała jeszcze szczegółowego opisu swojej działalności."}

              {/* --- 3. SEO TEXT INJECTION --- */}
              <p className="mt-6 text-gray-500 italic text-sm border-t pt-4 border-gray-100">
                Świadczymy usługi w lokalizacji {company.city} i okolicach.
                Zapraszamy do kontaktu telefonicznego lub mailowego w celu
                ustalenia szczegółów współpracy.
              </p>
            </div>
          </section>

          {/* Sekcja Opinii */}
          <ReviewSection
            reviews={company.reviews}
            companyId={company.id}
            companySlug={company.slug}
          />
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
          <div className="bg-white p-2 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-64 rounded-2xl grayscale hover:grayscale-0 transition-all duration-500"
              src={`https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`}
            />
            <div className="p-4">
              <p className="font-bold text-gray-900">{company.address}</p>
              <p className="text-sm text-gray-500">
                {company.city}, {company.zip}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-gray-900">
              <Calendar size={18} className="text-blue-600" /> Godziny otwarcia
            </h3>
            <div className="text-sm space-y-3">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-600">Poniedziałek – Piątek</span>
                <span className="font-bold text-gray-900">08:00 – 17:00</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-600">Sobota</span>
                <span className="font-bold text-gray-900">09:00 – 14:00</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Niedziela</span>
                <span>Zamknięte</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
      <CityCrossLinks city={company.city || undefined} />
      <Footer />
    </div>
  );
}
