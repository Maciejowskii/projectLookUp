export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24 font-sans text-gray-800">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">
        Polityka Plików Cookies
      </h1>

      <div className="prose prose-blue prose-lg">
        <p className="lead text-xl text-gray-600 mb-8">
          Niniejsza Polityka Cookies wyjaśnia, czym są pliki cookies i jak ich
          używamy na stronie katalogo.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Czym są pliki cookies?</h2>
          <p className="mb-4">
            Pliki cookies (tzw. "ciasteczka") to małe pliki tekstowe, które są
            zapisywane na Twoim urządzeniu (komputerze, tablecie, smartfonie)
            podczas przeglądania naszej strony internetowej.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            2. Jakich cookies używamy?
          </h2>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <strong>Niezbędne:</strong> Konieczne do prawidłowego działania
              strony (np. logowanie).
            </li>
            <li>
              <strong>Analityczne:</strong> Pomagają nam zrozumieć, jak
              użytkownicy korzystają ze strony (np. Google Analytics).
            </li>
            <li>
              <strong>Funkcjonalne:</strong> Zapamiętują Twoje preferencje (np.
              wybrane miasto w wyszukiwarce).
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. Zarządzanie cookies</h2>
          <p>
            Większość przeglądarek internetowych domyślnie akceptuje pliki
            cookies. Możesz jednak w każdej chwili zmienić ustawienia swojej
            przeglądarki, aby blokować cookies lub otrzymywać powiadomienia o
            ich wysyłaniu.
          </p>
        </section>
      </div>
    </div>
  );
}
