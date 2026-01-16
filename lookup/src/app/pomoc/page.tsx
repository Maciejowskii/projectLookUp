import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  HelpCircle, 
  CreditCard, 
  Building2, 
  Star, 
  Shield, 
  Mail, 
  ChevronRight,
  FileText,
  UserPlus,
  Settings
} from "lucide-react";

export const metadata = {
  title: "Centrum Pomocy | Katalogo.pl",
  description: "Znajdź odpowiedzi na najczęściej zadawane pytania dotyczące serwisu Katalogo.pl.",
};

const faqCategories = [
  {
    id: "konto",
    icon: UserPlus,
    title: "Konto i rejestracja",
    color: "blue",
    questions: [
      {
        q: "Jak założyć konto w serwisie?",
        a: "Aby założyć konto, kliknij przycisk \"Zaloguj się\" w prawym górnym rogu strony, a następnie wybierz opcję \"Utwórz konto\". Możesz zarejestrować się za pomocą adresu e-mail lub przez Google/Facebook."
      },
      {
        q: "Czy założenie konta jest bezpłatne?",
        a: "Tak, założenie konta oraz dodanie podstawowej wizytówki firmy jest całkowicie bezpłatne. Płatne są jedynie opcjonalne pakiety Premium z dodatkowymi funkcjami."
      },
      {
        q: "Jak zresetować hasło?",
        a: "Na stronie logowania kliknij \"Nie pamiętam hasła\", wprowadź swój adres e-mail i postępuj zgodnie z instrukcjami wysłanymi na pocztę."
      },
      {
        q: "Jak przejąć profil mojej firmy?",
        a: "Jeśli Twoja firma jest już w bazie, przejdź na jej stronę i kliknij \"Przejmij ten profil\". Wypełnij formularz weryfikacyjny - nasz zespół zweryfikuje Twoje dane i przekaże dostęp do profilu."
      }
    ]
  },
  {
    id: "firma",
    icon: Building2,
    title: "Wizytówka firmy",
    color: "green",
    questions: [
      {
        q: "Jak dodać firmę do katalogu?",
        a: "Kliknij przycisk \"Dodaj firmę\" w menu głównym. Wypełnij formularz z danymi firmy - nazwa, adres, kategoria, opis i dane kontaktowe. Po weryfikacji Twoja wizytówka pojawi się w katalogu."
      },
      {
        q: "Jak edytować dane mojej firmy?",
        a: "Zaloguj się na swoje konto i przejdź do Panelu Firmy. Tam możesz edytować wszystkie dane, dodać zdjęcia i aktualizować informacje."
      },
      {
        q: "Ile firm mogę dodać do jednego konta?",
        a: "Możesz zarządzać wieloma firmami z jednego konta. Każda firma wymaga osobnej weryfikacji."
      },
      {
        q: "Jak usunąć wizytówkę firmy?",
        a: "Skontaktuj się z nami przez formularz kontaktowy lub napisz na adres kontakt@katalogo.pl z prośbą o usunięcie wizytówki."
      }
    ]
  },
  {
    id: "platnosci",
    icon: CreditCard,
    title: "Płatności i faktury",
    color: "purple",
    questions: [
      {
        q: "Jakie metody płatności są dostępne?",
        a: "Akceptujemy płatności przez Przelewy24: przelewy bankowe online, karty kredytowe/debetowe (Visa, Mastercard), BLIK oraz inne popularne metody płatności w Polsce."
      },
      {
        q: "Kiedy otrzymam fakturę?",
        a: "Faktura VAT jest generowana automatycznie po zaksięgowaniu płatności i wysyłana na adres e-mail podany przy rejestracji. Możesz też pobrać ją z Panelu Firmy."
      },
      {
        q: "Czy mogę anulować subskrypcję Premium?",
        a: "Tak, możesz anulować subskrypcję w dowolnym momencie z Panelu Firmy. Pakiet Premium będzie aktywny do końca opłaconego okresu."
      },
      {
        q: "Jak zmienić dane do faktury?",
        a: "W Panelu Firmy przejdź do sekcji \"Ustawienia\" i zaktualizuj dane rozliczeniowe. Nowe dane będą użyte przy kolejnych fakturach."
      }
    ]
  },
  {
    id: "premium",
    icon: Star,
    title: "Pakiet Premium",
    color: "yellow",
    questions: [
      {
        q: "Co zawiera pakiet Premium?",
        a: "Pakiet Premium zawiera: wyróżnioną pozycję w wynikach wyszukiwania, rozszerzoną wizytówkę z galerią zdjęć, możliwość dodawania promocji, statystyki odwiedzin oraz priorytetowe wsparcie."
      },
      {
        q: "Ile kosztuje pakiet Premium?",
        a: "Aktualne ceny znajdziesz na stronie Cennik. Oferujemy różne plany miesięczne i roczne z atrakcyjnymi rabatami."
      },
      {
        q: "Czy mogę przetestować Premium przed zakupem?",
        a: "Oferujemy 7-dniowy okres próbny dla nowych użytkowników. Skontaktuj się z nami, aby aktywować wersję testową."
      },
      {
        q: "Jak aktywować pakiet Premium?",
        a: "Zaloguj się do Panelu Firmy i przejdź do sekcji \"Premium\". Wybierz odpowiedni plan i dokonaj płatności - pakiet zostanie aktywowany natychmiast."
      }
    ]
  },
  {
    id: "opinie",
    icon: Star,
    title: "Opinie i oceny",
    color: "orange",
    questions: [
      {
        q: "Jak dodać opinię o firmie?",
        a: "Przejdź na stronę firmy i kliknij przycisk \"Dodaj opinię\". Wypełnij formularz - oceń firmę w skali 1-5 gwiazdek i dodaj komentarz opisujący Twoje doświadczenie."
      },
      {
        q: "Czy mogę usunąć niesprawiedliwą opinię?",
        a: "Jeśli uważasz, że opinia narusza regulamin (jest obraźliwa, nieprawdziwa lub spam), zgłoś ją do moderacji. Nasz zespół rozpatrzy zgłoszenie w ciągu 48h."
      },
      {
        q: "Jak odpowiedzieć na opinię jako właściciel firmy?",
        a: "W Panelu Firmy przejdź do sekcji \"Opinie\". Przy każdej opinii zobaczysz przycisk \"Odpowiedz\" - Twoja odpowiedź będzie widoczna publicznie pod opinią klienta."
      }
    ]
  },
  {
    id: "bezpieczenstwo",
    icon: Shield,
    title: "Bezpieczeństwo i prywatność",
    color: "red",
    questions: [
      {
        q: "Jak chronione są moje dane?",
        a: "Twoje dane są chronione zgodnie z RODO. Stosujemy szyfrowanie SSL, bezpieczne metody przechowywania haseł i regularnie aktualizujemy zabezpieczenia."
      },
      {
        q: "Kto ma dostęp do moich danych?",
        a: "Dostęp do Twoich danych mają tylko upoważnieni pracownicy w celu świadczenia usług. Nie sprzedajemy ani nie udostępniamy danych osobowych podmiotom trzecim w celach marketingowych."
      },
      {
        q: "Jak usunąć swoje konto?",
        a: "Aby usunąć konto, skontaktuj się z nami przez formularz kontaktowy. Twoje dane zostaną usunięte zgodnie z naszą Polityką Prywatności."
      }
    ]
  }
];

const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
  green: { bg: "bg-green-50", text: "text-green-600", iconBg: "bg-green-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-600", iconBg: "bg-yellow-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", iconBg: "bg-orange-100" },
  red: { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
};

export default async function HelpPage() {
  // Pobierz dane kontaktowe
  const settings = await prisma.setting.findMany();
  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || null;
  const contactEmail = getSetting("contact_email") || "kontakt@katalogo.pl";

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HelpCircle size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Centrum Pomocy</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Znajdź odpowiedzi na najczęściej zadawane pytania lub skontaktuj się z nami.
          </p>
        </div>
      </div>

      <div className="flex-grow container mx-auto px-4 py-12 max-w-5xl">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 -mt-8">
          <Link 
            href="/kontakt"
            className="bg-white p-4 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow"
          >
            <Mail className="text-blue-600 mx-auto mb-2" size={24} />
            <span className="text-sm font-semibold text-gray-900">Kontakt</span>
          </Link>
          <Link 
            href="/regulamin"
            className="bg-white p-4 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow"
          >
            <FileText className="text-green-600 mx-auto mb-2" size={24} />
            <span className="text-sm font-semibold text-gray-900">Regulamin</span>
          </Link>
          <Link 
            href="/cennik"
            className="bg-white p-4 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow"
          >
            <CreditCard className="text-purple-600 mx-auto mb-2" size={24} />
            <span className="text-sm font-semibold text-gray-900">Cennik</span>
          </Link>
          <Link 
            href="/strefa-partnera"
            className="bg-white p-4 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow"
          >
            <Settings className="text-orange-600 mx-auto mb-2" size={24} />
            <span className="text-sm font-semibold text-gray-900">Panel Firmy</span>
          </Link>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category) => {
            const colors = colorClasses[category.color];
            const Icon = category.icon;
            
            return (
              <div key={category.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Category Header */}
                <div className={`${colors.bg} p-6 flex items-center gap-4`}>
                  <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={colors.text} size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
                </div>
                
                {/* Questions */}
                <div className="divide-y divide-gray-100">
                  {category.questions.map((item, idx) => (
                    <details key={idx} className="group">
                      <summary className="p-6 cursor-pointer list-none flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-gray-900 pr-4">{item.q}</span>
                        <ChevronRight 
                          className="text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" 
                          size={20} 
                        />
                      </summary>
                      <div className="px-6 pb-6 -mt-2">
                        <p className="text-gray-600 leading-relaxed">{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-12 rounded-3xl text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Nie znalazłeś odpowiedzi?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Nasz zespół wsparcia jest do Twojej dyspozycji. Odpowiemy na każde pytanie!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/kontakt"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Mail size={20} />
              Napisz do nas
            </Link>
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-400 transition-colors"
            >
              {contactEmail}
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
