
export const dynamic = "force-dynamic";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Polityka Cookies | Katalogo.pl",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
            Polityka Cookies
          </h1>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p>
              Serwis <strong>Katalogo.pl</strong> używa informacji zapisanych za
              pomocą plików cookies i podobnych technologii w celach
              technicznych, reklamowych, statystycznych oraz by dostosować
              Serwis do indywidualnych potrzeb Użytkowników.
            </p>

            <h3 className="text-lg font-bold text-gray-900">
              Rodzaje plików cookies
            </h3>
            <p>Można je podzielić na:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Cookies niezbędne:</strong> takie, bez których Serwis
                nie może funkcjonować poprawnie (np. utrzymanie sesji
                logowania).
              </li>
              <li>
                <strong>Cookies funkcjonalne (personalizacja):</strong>{" "}
                potrzebne, by zapisać ustawienia i preferencje Użytkowników.
              </li>
              <li>
                <strong>Cookies reklamowe i analityczne:</strong> służą do
                optymalizacji reklam oraz zbierania anonimowych statystyk (np.
                Google Analytics). Mogą służyć do tworzenia profilu użytkownika
                w celach marketingowych.
              </li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-4">
              Zarządzanie plikami cookies
            </h3>
            <p>
              W przeglądarce internetowej można zmienić ustawienia dotyczące
              wszystkich powyższych plików cookies. Brak zmiany tych ustawień
              oznacza akceptację dla stosowanych tu plików cookies.
            </p>

            <h3 className="text-lg font-bold text-gray-900 mt-6">
              Google Consent Mode v2
            </h3>
            <p>
              W celu zapewnienia zgodności z wymogami RODO oraz rozporządzeniem
              o prywatności i łączności elektronicznej, używamy Google Consent
              Mode v2 do zarządzania zgodą użytkowników na pliki cookie.
            </p>
            <p>
              <strong>Jak działa Consent Mode v2:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Domyślne ustawienia:</strong> Wszystkie pliki cookie
                analityczne są domyślnie wyłączone (ustawione na "denied") przed
                wyrażeniem zgody przez użytkownika
              </li>
              <li>
                <strong>Aktywacja po zgodzie:</strong> Pliki cookie analityczne
                (Google Analytics, Google Tag Manager) są aktywowane dopiero po
                wyrażeniu przez użytkownika wyraźnej zgody poprzez banner zgody
              </li>
              <li>
                <strong>Zarządzanie zgodą:</strong> Użytkownik może w każdej
                chwili zmienić swoje preferencje dotyczące plików cookie poprzez:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Banner zgody na pliki cookie (na dole strony)</li>
                  <li>Panel ustawień plików cookie</li>
                  <li>Ustawienia przeglądarki internetowej</li>
                </ul>
              </li>
              <li>
                <strong>Dobrowolność zgody:</strong> Zgoda jest całkowicie
                dobrowolna - użytkownik może odrzucić wszystkie pliki cookie
                analityczne bez wpływu na funkcjonalność podstawową strony
              </li>
              <li>
                <strong>Wycofanie zgody:</strong> Użytkownik może w każdej chwili
                wycofać zgodę, co spowoduje wyłączenie plików cookie analitycznych
              </li>
            </ul>
            <p className="mt-4">
              Więcej informacji o przetwarzaniu danych osobowych znajdziesz w{" "}
              <a
                href="/polityka-prywatnosci"
                className="text-blue-600 hover:underline"
              >
                Polityce Prywatności
              </a>
              .
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
