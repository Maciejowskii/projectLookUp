import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Formularz odstąpienia od umowy | Katalogo.pl",
};

export default function WithdrawalFormPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
            Formularz odstąpienia od umowy
          </h1>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p className="text-sm text-gray-500 mb-6">
              (Wypełnij ten formularz i odeślij go tylko wtedy, gdy chcesz odstąpić od umowy)
            </p>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Do: (Sprzedawca)
                  </label>
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold">Jakub Wolert</p>
                    <p>ul. Targowa 6/5</p>
                    <p>72-010 Police</p>
                    <p>E-mail:{" "}
                      <a
                        href="mailto:kontakt@katalogo.pl"
                        className="text-blue-600"
                      >
                        kontakt@katalogo.pl
                      </a>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ja/My* niniejszym informuję/informujemy o moim/naszym odstąpieniu od umowy
                    sprzedaży następującego towaru/dostarczenia następującej usługi*
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Opisz usługę/towar, od którego chcesz odstąpić..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data zawarcia umowy*/otrzymania towaru*
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imię i nazwisko konsumenta(-ów)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Jan Kowalski"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres konsumenta(-ów)
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="ul. Przykładowa 1, 00-000 Warszawa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Podpis konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w formie papierowej)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Podpis"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    W przypadku przesłania formularza elektronicznie, podpis nie jest wymagany.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-4">
                    * Wypełnij odpowiednie pole
                  </p>
                  <p className="text-sm text-gray-600">
                    Formularz należy przesłać na adres:{" "}
                    <a
                      href="mailto:kontakt@katalogo.pl"
                      className="text-blue-600 font-semibold"
                    >
                      kontakt@katalogo.pl
                    </a>
                  </p>
                </div>
              </form>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
              <h3 className="font-bold text-gray-900 mb-3">
                Informacje dotyczące prawa odstąpienia
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  • Prawo odstąpienia przysługuje konsumentowi w terminie{" "}
                  <strong>14 dni</strong> od dnia zawarcia umowy.
                </li>
                <li>
                  • W przypadku usług Premium aktywowanych natychmiast po płatności,
                  prawo odstąpienia może nie przysługiwać, jeśli konsument wyraził
                  zgodę na natychmiastową aktywację.
                </li>
                <li>
                  • Zwrotu dokonamy niezwłocznie, nie później niż w terminie 14 dni
                  od dnia otrzymania informacji o odstąpieniu.
                </li>
                <li>
                  • Zwrotu dokonamy tym samym sposobem płatności, jakiego użył
                  konsument.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
