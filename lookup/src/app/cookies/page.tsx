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
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
