import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VOIVODESHIPS } from "@/lib/regions";
import { ArrowRight, Mail, Phone } from "lucide-react";

export const Footer = async () => {
  // 1. Pobieramy 6 najpopularniejszych kategorii do stopki
  const categories = await prisma.category.findMany({
    take: 6,
    include: { _count: { select: { companies: true } } },
    orderBy: { companies: { _count: "desc" } },
  });

  // 2. Pobieramy ustawienia kontaktowe
  const settings = await prisma.setting.findMany();
  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || null;
  const contactEmail = getSetting("contact_email");
  const contactPhone = getSetting("contact_phone");

  // 2. Generujemy "SEO Combo" - mieszamy kategorie z regionami
  // To tworzy linki typu: "Mechanika (Mazowieckie)", "Budownictwo (Śląskie)"
  const seoLinks = categories.slice(0, 5).map((cat, i) => {
    // Przypisujemy region "na sztywno" cyklicznie, żeby było różnorodnie
    const region = VOIVODESHIPS[i % VOIVODESHIPS.length];
    return {
      label: `${cat.name} ${region.name}`,
      // Linkujemy do wyszukiwarki z pre-filtrowaniem
      href: `/szukaj?q=${cat.name}&region=${region.slug}`,
    };
  });

  return (
    <footer className="bg-gray-950 text-gray-400 py-8 md:py-10 mt-8 md:mt-12 border-t border-gray-900 font-sans overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        {/* GÓRNA SEKCJA STOPKI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* Kolumna 1: Brand */}
          <div className="space-y-2 md:space-y-3 min-w-0">
            <h3 className="text-white font-black text-xl md:text-2xl tracking-tight break-words">
              katalogo<span className="text-blue-600">.</span>
            </h3>
            <p className="text-xs md:text-sm leading-relaxed opacity-80 break-words">
              Największa baza firm i specjalistów w Twojej okolicy. Łączymy
              klientów z najlepszymi wykonawcami w Polsce.
            </p>
            <div className="pt-4">
              <Link
                href="/blog"
                className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-blue-500 hover:text-blue-400 transition-colors"
              >
                Czytaj nasz blog <ArrowRight size={12} className="ml-1" />
              </Link>
            </div>
          </div>

          {/* Kolumna 2: Dla Partnerów */}
          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 md:mb-4 flex items-center gap-2 text-base md:text-lg">
              Strefa Firmy
            </h4>
            <ul className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
              <li>
                <Link
                  href="/dodaj-firme"
                  className="text-white font-medium hover:text-blue-400 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Dodaj firmę za darmo
                </Link>
              </li>
              <li>
                <Link
                  href="/strefa-partnera"
                  className="hover:text-white transition-colors"
                >
                  Logowanie dla firm
                </Link>
              </li>
              <li>
                <Link
                  href="/cennik"
                  className="text-white font-medium hover:text-blue-400 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Cennik i Pakiety
                </Link>
              </li>
              <li>
                <Link
                  href="/pomoc"
                  className="hover:text-white transition-colors"
                >
                  Centrum Pomocy
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolumna 3: Popularne Kategorie */}
          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 md:mb-4 text-base md:text-lg break-words">Popularne Usługi</h4>
            <ul className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/kategoria/${cat.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/kategorie"
                  className="text-xs text-gray-500 hover:text-gray-300 mt-2 block"
                >
                  + Zobacz wszystkie
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolumna 4: Informacje & Blog */}
          <div className="min-w-0">
            <h4 className="text-white font-bold mb-3 md:mb-4 text-base md:text-lg break-words">Informacje</h4>
            <ul className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
              <li>
                <Link
                  href="/kontakt"
                  className="hover:text-white transition-colors"
                >
                  Kontakt
                </Link>
              </li>
              <li>
                <Link
                  href="/regulamin"
                  className="hover:text-white transition-colors"
                >
                  Regulamin
                </Link>
              </li>
              <li>
                <Link
                  href="/polityka-prywatnosci"
                  className="hover:text-white transition-colors"
                >
                  Polityka Prywatności
                </Link>
              </li>
              <li>
                <Link
                  href="/formularz-odstapienia"
                  className="hover:text-white transition-colors"
                >
                  Formularz odstąpienia
                </Link>
              </li>
              {/* Tutaj link do bloga (ukryty w gąszczu linków, dobry dla SEO) */}
              <li>
                <Link
                  href="/blog"
                  className="hover:text-white transition-colors"
                >
                  Porady i Artykuły
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* DOLNA SEKCJA SEO (SEO LINKS) */}
        <div className="border-t border-gray-900 pt-4 md:pt-6 pb-3 md:pb-4 overflow-hidden">
          <h5 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-600 mb-3 md:mb-4 text-center break-words">
            Popularne wyszukiwania lokalne
          </h5>
          <div className="flex flex-wrap justify-center gap-x-3 md:gap-x-6 gap-y-2 md:gap-y-3 text-[10px] md:text-xs text-gray-500">
            {seoLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="hover:text-blue-500 hover:underline transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/wojewodztwa"
              className="hover:text-blue-500 hover:underline transition-colors"
            >
              Firmy wg Województw
            </Link>
          </div>
        </div>

        {/* COMPANY INFO & PAYMENT METHODS */}
        <div className="border-t border-gray-900 pt-4 md:pt-6 mt-4 md:mt-6 overflow-hidden">
          <div className="text-center space-y-2 md:space-y-3">
            {/* Company Details */}
            <div className="text-[10px] md:text-xs text-gray-500 space-y-1 md:space-y-2 break-words">
              <p className="font-semibold text-gray-400 mb-2">Jakub Wolert</p>
              <p>ul. Targowa 6/5, 72-010 Police</p>
              <p>NIP: 8513315629 | REGON: 52918637000000</p>
              
              {/* Contact Information */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-800">
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Mail size={14} className="text-gray-500" />
                    <span>{contactEmail}</span>
                  </a>
                )}
                {contactPhone && (
                  <a
                    href={`tel:${contactPhone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Phone size={14} className="text-gray-500" />
                    <span>{contactPhone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Payment Method Flags */}
            <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
              <span className="text-xs text-gray-500">Płatności:</span>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="text-xs font-semibold text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  Przelewy24
                </span>
                <span className="text-xs font-bold text-white bg-[#1A1F71] px-3 py-1 rounded flex items-center gap-1">
                  <span className="text-[10px]">VISA</span>
                </span>
                <span className="text-xs font-bold text-white bg-[#EB001B] px-3 py-1 rounded flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#F79E1B] mr-1"></span>
                  <span className="text-[10px]">MC</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
