import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Polityka Prywatności | Katalogo.pl",
  description: "Zasady przetwarzania danych osobowych w serwisie Katalogo.pl",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
            Polityka Prywatności
          </h1>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p className="font-semibold text-gray-900">
              Uprzejmie informujemy o polityce prywatności zgodnie z art. 13
              ust. 1 i ust. 2 rozporządzenia Parlamentu Europejskiego i Rady
              (UE) 2016/679 z 27 kwietnia 2016 r. (RODO).
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-6">
              1. Administrator Danych
            </h2>
            <p>
              Administratorem Pani/Pana danych osobowych jest firma{" "}
              <strong>Jakub Wolert</strong> z siedzibą pod adresem: ul. Targowa
              6/5, 72-010 Police, NIP: 8513315629, REGON: 52918637000000.
              <br />
              Kontakt e-mail:{" "}
              <a href="mailto:kontakt@katalogo.pl" className="text-blue-600">
                kontakt@katalogo.pl
              </a>
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-6">
              2. Cel i podstawa przetwarzania
            </h2>
            <p>
              Przetwarzanie Pani/Pana danych osobowych będzie się odbywać na
              podstawie art. 6 RODO. W celu marketingowym Administrator powołuje
              się na prawnie uzasadniony interes, którym jest zbieranie danych
              statystycznych i analizowanie ruchu na stronie internetowej{" "}
              <strong>katalogo.pl</strong>.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-6">
              3. Dobrowolność i Odbiorcy danych
            </h2>
            <p>
              Podanie danych osobowych na stronie internetowej katalogo.pl jest
              dobrowolne. Podstawą przetwarzania danych jest moja zgoda. Mam
              wpływ na przeglądarkę internetową i jej ustawienia. Odbiorcami
              danych osobowych mogą być zaufani partnerzy (np. dostawcy
              hostingu, Google, Facebook).
            </p>
            <p>
              Mam prawo wycofania zgody w dowolnym momencie poprzez zmianę
              ustawień w przeglądarce. Dane osobowe będą przetwarzane i
              przechowywane w zależności od okresu używania technologii.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-6">
              4. Prawa użytkownika
            </h2>
            <p>
              Posiada Pani/Pan prawo dostępu do treści swoich danych osobowych,
              prawo do ich sprostowania, usunięcia, jak i również prawo do
              ograniczenia ich przetwarzania, prawo do cofnięcia zgody, prawo do
              przenoszenia danych oraz prawo do wniesienia sprzeciwu wobec
              przetwarzania.
            </p>
            <p>
              Przysługuje Pani/Panu prawo wniesienia skargi do organu
              nadzorczego (Prezesa Urzędu Ochrony Danych Osobowych), jeśli
              Pani/Pana zdaniem, przetwarzanie danych osobowych narusza przepisy
              unijnego rozporządzenia RODO.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-6">
              5. Profilowanie
            </h2>
            <p>
              Profilowanie używane jest w Google Analytics, Google AdWords,
              Facebook Pixel. W sytuacji wniesienia sprzeciwu wobec
              profilowania, prosimy zoptymalizować odpowiednio przeglądarkę.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-6">
              6. Czas przechowywania
            </h2>
            <p>
              Pani/Pana dane osobowe będą przechowywane przez okres niezbędny do
              realizacji celów, a w celach marketingowych od 30 dni do 5 lat lub
              do czasu wycofania zgody.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-6">7. Kontakt</h2>
            <p>
              W przypadku pytań dotyczących przetwarzania danych osobowych
              prosimy o kontakt z Administratorem pod adresem e-mail:
              kontakt@katalogo.pl lub korespondencyjnie na adres siedziby firmy.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
