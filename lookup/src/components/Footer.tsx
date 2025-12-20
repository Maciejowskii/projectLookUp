import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Kolumna 1 */}
        <div>
          <h3 className="text-white font-bold text-lg mb-4">LookUp</h3>
          <p className="text-sm">
            Najlepsza baza firm i specjalistów w Twojej okolicy. Znajdź,
            sprawdź, zleć.
          </p>
        </div>

        {/* Kolumna 2 - Oferta */}
        <div>
          <h4 className="text-white font-semibold mb-4">Oferta</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/dla-firm" className="hover:text-white">
                Dla Firm
              </Link>
            </li>
            <li>
              <Link href="/strefa-partnera" className="hover:text-white">
                Strefa Partnera
              </Link>
            </li>
            <li>
              <Link href="/cennik" className="hover:text-white">
                Cennik
              </Link>
            </li>
            <li>
              <Link
                href="/dodaj-firme"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Dodaj firmę za darmo
              </Link>
            </li>
          </ul>
        </div>

        {/* Kolumna 3 - Kategorie */}
        <div>
          <h4 className="text-white font-semibold mb-4">Popularne</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/kategoria/mechanika" className="hover:text-white">
                Mechanika
              </Link>
            </li>
            <li>
              <Link href="/kategoria/budownictwo" className="hover:text-white">
                Budownictwo
              </Link>
            </li>
            <li>
              <Link href="/kategoria/ksiegowosc" className="hover:text-white">
                Księgowość
              </Link>
            </li>
          </ul>
        </div>

        {/* Kolumna 4 - Prawne */}
        <div>
          <h4 className="text-white font-semibold mb-4">Informacje</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/legal/regulamin" className="hover:text-white">
                Regulamin
              </Link>
            </li>
            <li>
              <Link
                href="/legal/polityka-prywatnosci"
                className="hover:text-white"
              >
                Polityka Prywatności
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="hover:text-white">
                Polityka Cookies
              </Link>
            </li>
            <li>
              <Link href="/kontakt" className="hover:text-white">
                Kontakt
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="text-center text-sm text-gray-500 mt-12 pt-8 border-t border-gray-800">
        &copy; {new Date().getFullYear()} ProjectLookUp. Wszelkie prawa
        zastrzeżone. Zrealizowane prrzez{" "}
        <a href="http://digitay.pl" className="text-blue-600 hover:underline">
          Digitay
        </a>
      </div>
    </footer>
  );
};
