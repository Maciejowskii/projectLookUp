import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MapPin, Globe, Mail, Calendar, FileText } from "lucide-react";
import { ReviewSection } from "@/components/ReviewSection";
import { PhoneRevealButton } from "@/components/PhoneRevealButton";

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const company = await prisma.company.findFirst({
    where: { slug: slug },
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

  // --- PRZYGOTOWANIE DANYCH SEO (SCHEMA.ORG) ---
  // Obliczamy średnią ocen, jeśli są opinie
  const reviewCount = company.reviews.length;
  const averageRating =
    reviewCount > 0
      ? (
          company.reviews.reduce((acc, rev) => acc + rev.rating, 0) /
          reviewCount
        ).toFixed(1)
      : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    image: [
      // Placeholder logo - na produkcji możesz tu dać prawdziwe logo
      "https://placehold.co/600x600?text=Logo",
    ],
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
    priceRange: "$$", // Wymagane przez Google dla LocalBusiness (można zostawić statyczne)
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating,
        reviewCount: reviewCount,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* WSTRZYKNIĘCIE DANYCH STRUKTURALNYCH DLA GOOGLE */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* --- SEKCJA: CLAIM PROFILE BAR (Żółty pasek) --- */}
      {!company.isVerified && (
        <div className="pt-24 pb-4 px-4 bg-yellow-50 border-b border-yellow-100 relative z-10">
          <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-yellow-800 text-sm">
              <strong>To Twoja firma?</strong> Przejmij ten profil, aby edytować
              dane, odpowiadać na opinie i dodać zdjęcia.
            </p>
            <Link
              href={`/przejmij/${company.id}`}
              className="bg-white text-yellow-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-100 transition-colors border border-yellow-200 whitespace-nowrap shadow-sm"
            >
              Zarządzaj profilem &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* HEADER FIRMY */}
      <div
        className={`bg-white border-b border-gray-200 ${
          !company.isVerified ? "pt-8" : "pt-32"
        } pb-12`}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Logo / Initials */}
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-blue-200 flex-shrink-0">
                {company.name.charAt(0)}
              </div>

              <div className="flex-grow">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    {company.category.name}
                  </span>

                  {company.nip && (
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1 border border-gray-200">
                      <FileText size={12} className="text-gray-400" /> NIP:{" "}
                      {company.nip}
                    </span>
                  )}

                  {company.isVerified && (
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1 border border-green-100">
                      ✓ Zweryfikowana
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
                  {company.name}
                </h1>

                <div className="flex flex-wrap gap-4 text-gray-600 text-sm md:text-base">
                  {company.city && (
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <MapPin size={18} className="text-gray-400" />{" "}
                      {company.city}, {company.address}
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Globe size={18} className="text-gray-400" />{" "}
                      <a
                        href={company.website}
                        target="_blank"
                        className="hover:text-blue-600 underline decoration-gray-300 underline-offset-4 font-medium"
                      >
                        Strona www
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Call To Action Box */}
              <div className="w-full md:w-auto bg-gray-50 p-6 rounded-2xl border border-gray-100 min-w-[280px]">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  Kontakt bezpośredni
                </p>

                {company.phone ? (
                  <PhoneRevealButton
                    phone={company.phone}
                    companyId={company.id}
                  />
                ) : (
                  <div className="text-gray-400 text-sm mb-3 italic">
                    Brak telefonu
                  </div>
                )}

                {company.email && (
                  <a
                    href={`mailto:${company.email}`}
                    className="flex items-center justify-center gap-3 w-full bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <Mail size={18} /> Wyślij email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* LEWA KOLUMNA */}
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                O firmie
              </h2>
              <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                {company.description || "Ta firma nie dodała jeszcze opisu."}
              </div>
            </section>

            <ReviewSection
              reviews={company.reviews}
              companyId={company.id}
              companySlug={company.slug}
            />
          </div>

          {/* PRAWA KOLUMNA */}
          <div className="space-y-8">
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="w-full h-64 bg-gray-100 rounded-2xl overflow-hidden relative">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-4">
                <p className="font-bold text-gray-900">{company.address}</p>
                <p className="text-gray-500 text-sm">
                  {company.city}, {company.zip}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" /> Godziny
                otwarcia
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pon - Pt</span>{" "}
                  <span className="font-medium text-gray-900">
                    08:00 - 17:00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sobota</span>{" "}
                  <span className="font-medium text-gray-900">
                    09:00 - 14:00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">Niedziela</span>{" "}
                  <span className="font-medium text-gray-400">Zamknięte</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
