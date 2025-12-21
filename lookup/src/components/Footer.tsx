import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VOIVODESHIPS } from "@/lib/regions";
import { ArrowRight } from "lucide-react";

export const Footer = async () => {
  // 1. Pobieramy 6 najpopularniejszych kategorii do stopki
  const categories = await prisma.category.findMany({
    take: 6,
    include: { _count: { select: { companies: true } } },
    orderBy: { companies: { _count: "desc" } },
  });

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
    <footer className="bg-gray-950 text-gray-400 py-16 mt-20 border-t border-gray-900 font-sans">
      <div className="container mx-auto px-4">
        {/* GÓRNA SEKCJA STOPKI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Kolumna 1: Brand */}
          <div className="space-y-4">
            <h3 className="text-white font-black text-2xl tracking-tight">
              LookUp<span className="text-blue-600">.</span>
            </h3>
            <p className="text-sm leading-relaxed opacity-80">
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
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              Strefa Firmy
            </h4>
            <ul className="space-y-3 text-sm">
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
                  className="hover:text-white transition-colors"
                >
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
          <div>
            <h4 className="text-white font-bold mb-6">Popularne Usługi</h4>
            <ul className="space-y-3 text-sm">
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
          <div>
            <h4 className="text-white font-bold mb-6">Informacje</h4>
            <ul className="space-y-3 text-sm">
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
        <div className="border-t border-gray-900 pt-10 pb-6">
          <h5 className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-4 text-center">
            Popularne wyszukiwania lokalne
          </h5>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-gray-500">
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

        <div className="text-center text-xs text-gray-600 mt-8">
          &copy; {new Date().getFullYear()} LookUp. Realizacja:{" "}
          <a
            href="http://digitay.pl"
            target="_blank"
            rel="nofollow"
            className="text-gray-500 hover:text-white transition-colors"
          >
            Digitay
          </a>
        </div>
      </div>
    </footer>
  );
};
