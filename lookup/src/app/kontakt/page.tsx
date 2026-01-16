import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";

export const metadata = {
  title: "Kontakt | Katalogo.pl",
  description: "Skontaktuj się z nami. Pomożemy Ci w każdej sprawie dotyczącej serwisu Katalogo.pl.",
};

export default async function ContactPage() {
  // Pobierz ustawienia kontaktowe
  const settings = await prisma.setting.findMany();
  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || null;
  const contactEmail = getSetting("contact_email") || "kontakt@katalogo.pl";
  const contactPhone = getSetting("contact_phone") || "+48 123 456 789";

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Kontakt</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Masz pytania? Chętnie pomożemy! Skontaktuj się z nami w dowolny sposób.
          </p>
        </div>
      </div>

      <div className="flex-grow container mx-auto px-4 py-12 max-w-5xl -mt-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dane kontaktowe</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">E-mail</h3>
                  <a 
                    href={`mailto:${contactEmail}`}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {contactEmail}
                  </a>
                  <p className="text-sm text-gray-500 mt-1">Odpowiadamy w ciągu 24h</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Telefon</h3>
                  <a 
                    href={`tel:${contactPhone.replace(/\s/g, '')}`}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {contactPhone}
                  </a>
                  <p className="text-sm text-gray-500 mt-1">Pon-Pt: 9:00 - 17:00</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Adres</h3>
                  <p className="text-gray-600">Jakub Wolert</p>
                  <p className="text-gray-600">ul. Targowa 6/5</p>
                  <p className="text-gray-600">72-010 Police</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="text-orange-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Godziny pracy</h3>
                  <p className="text-gray-600">Poniedziałek - Piątek: 9:00 - 17:00</p>
                  <p className="text-gray-600">Sobota - Niedziela: Nieczynne</p>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Dane firmowe</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Nazwa:</strong> Jakub Wolert</p>
                <p><strong>NIP:</strong> 8513315629</p>
                <p><strong>REGON:</strong> 52918637000000</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Napisz do nas</h2>
                <p className="text-gray-500 text-sm">Odpowiemy najszybciej jak to możliwe</p>
              </div>
            </div>
            
            <form 
              action={`mailto:${contactEmail}`} 
              method="POST" 
              encType="text/plain"
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="Jan Kowalski"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="jan@firma.pl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temat
                </label>
                <select
                  name="subject"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white"
                >
                  <option value="">Wybierz temat...</option>
                  <option value="Pytanie ogólne">Pytanie ogólne</option>
                  <option value="Pomoc techniczna">Pomoc techniczna</option>
                  <option value="Faktura / Płatności">Faktura / Płatności</option>
                  <option value="Pakiet Premium">Pakiet Premium</option>
                  <option value="Zgłoszenie błędu">Zgłoszenie błędu</option>
                  <option value="Współpraca">Współpraca</option>
                  <option value="Inne">Inne</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wiadomość
                </label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                  placeholder="Opisz swoją sprawę..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20"
              >
                Wyślij wiadomość
              </button>

              <p className="text-xs text-gray-500 text-center">
                Wysyłając wiadomość, akceptujesz naszą{" "}
                <a href="/polityka-prywatnosci" className="text-blue-600 hover:underline">
                  Politykę Prywatności
                </a>
              </p>
            </form>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Potrzebujesz szybkiej odpowiedzi?</h2>
          <p className="text-gray-600 mb-6">
            Sprawdź nasze Centrum Pomocy - znajdziesz tam odpowiedzi na najczęściej zadawane pytania.
          </p>
          <a
            href="/pomoc"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            Przejdź do Centrum Pomocy
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
