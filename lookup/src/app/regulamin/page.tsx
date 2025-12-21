import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Regulamin | Katalogo.pl",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
            Regulamin Serwisu Katalogo.pl
          </h1>

          <div className="space-y-6 text-gray-600 leading-relaxed text-sm md:text-base">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                §1. Postanowienia ogólne
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Niniejszy Regulamin określa zasady korzystania z serwisu
                  internetowego dostępnego pod adresem{" "}
                  <strong>katalogo.pl</strong>.
                </li>
                <li>
                  Właścicielem Serwisu jest firma: <strong>Jakub Wolert</strong>
                  , ul. Targowa 6/5, 72-010 Police, NIP: 8513315629, REGON:
                  52918637000000.
                </li>
                <li>
                  Kontakt z Usługodawcą możliwy jest pod adresem e-mail:{" "}
                  <a
                    href="mailto:kontakt@katalogo.pl"
                    className="text-blue-600"
                  >
                    kontakt@katalogo.pl
                  </a>
                  .
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                §2. Definicje
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Serwis</strong> – platforma internetowa Katalogo.pl.
                </li>
                <li>
                  <strong>Użytkownik</strong> – każda osoba fizyczna lub prawna
                  korzystająca z Serwisu.
                </li>
                <li>
                  <strong>Wizytówka</strong> – podstrona w Serwisie prezentująca
                  dane firmy Użytkownika.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                §3. Zasady korzystania z Serwisu
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Korzystanie z Serwisu jest dobrowolne. Dodanie podstawowej
                  wizytówki firmy jest bezpłatne.
                </li>
                <li>
                  Użytkownik zobowiązany jest do podawania danych zgodnych ze
                  stanem faktycznym.
                </li>
                <li>
                  Zabrania się dodawania treści bezprawnych, obraźliwych lub
                  naruszających prawa osób trzecich.
                </li>
                <li>
                  Administrator zastrzega sobie prawo do weryfikacji, edycji lub
                  usunięcia wizytówek naruszających Regulamin.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                §4. Odpowiedzialność
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Administrator dokłada wszelkich starań, aby dane w Serwisie
                  były aktualne, jednak nie ponosi odpowiedzialności za treść
                  wizytówek dodawanych przez Użytkowników.
                </li>
                <li>
                  Administrator nie ponosi odpowiedzialności za przerwy w
                  działaniu Serwisu wynikające z przyczyn technicznych lub
                  niezależnych od niego.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                §5. Reklamacje
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Reklamacje dotyczące działania Serwisu można zgłaszać drogą
                  elektroniczną na adres e-mail Administratora.
                </li>
                <li>
                  Reklamacja powinna zawierać dane zgłaszającego oraz opis
                  problemu.
                </li>
                <li>Administrator rozpatruje reklamacje w terminie 14 dni.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                §6. Postanowienia końcowe
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  W sprawach nieuregulowanych niniejszym Regulaminem
                  zastosowanie mają przepisy Kodeksu Cywilnego oraz RODO.
                </li>
                <li>
                  Polityka Prywatności oraz Polityka Cookies stanowią integralną
                  część niniejszego Regulaminu.
                </li>
              </ol>
            </section>

            <div className="pt-8 border-t border-gray-100 mt-8">
              <p>
                Ostatnia aktualizacja regulaminu:{" "}
                {new Date().toLocaleDateString("pl-PL")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
