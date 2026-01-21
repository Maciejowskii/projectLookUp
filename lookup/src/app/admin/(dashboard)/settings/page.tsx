
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { updateSettings } from "@/actions/adminActions";
import { Save, Settings, DollarSign, Phone, Mail, Bell, Info, Star } from "lucide-react";
import { FeaturedCompanySearch } from "@/components/admin/FeaturedCompanySearch";

export default async function AdminSettingsPage() {
  // Pobieramy obecne ustawienia
  const settings = await prisma.setting.findMany();

  // Helper do wyciągania wartości
  const get = (key: string) => settings.find((s) => s.key === key)?.value || "";

  // Pobierz nazwę wybranej firmy (jeśli jest)
  const featuredCompanyId = get("featured_company_id");
  let featuredCompanyName = "";
  if (featuredCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: featuredCompanyId },
      select: { name: true },
    });
    featuredCompanyName = company?.name || "";
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="text-gray-400" /> Ustawienia Portalu
        </h1>
        <p className="text-sm text-gray-500">
          Zmieniaj konfigurację bez dotykania kodu.
        </p>
      </div>

      <form
        action={updateSettings}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6"
      >
        {/* Sekcja: Powiadomienia */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
            <Bell size={18} className="text-amber-500" />
            Powiadomienia Email
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresy email do powiadomień o przejęciach firm
              </label>
              <textarea
                name="notification_emails"
                defaultValue={get("notification_emails")}
                placeholder="admin@example.com&#10;manager@example.com&#10;owner@example.com"
                rows={4}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-mono text-sm text-gray-900 placeholder:text-gray-400"
              />
              <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  Wpisz każdy adres email w nowej linii. Powiadomienia o nowych zgłoszeniach
                  przejęcia firm będą wysyłane na wszystkie podane adresy.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sekcja: Kontakt */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">
            Dane Kontaktowe (Stopka)
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email kontaktowy
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  name="contact_email"
                  defaultValue={get("contact_email")}
                  placeholder="kontakt@twojafirma.pl"
                  className="pl-10 w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  name="contact_phone"
                  defaultValue={get("contact_phone")}
                  placeholder="+48 123 456 789"
                  className="pl-10 w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sekcja: Cennik */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">
            Cennik (Pakiety)
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cena Pakietu Premium (PLN)
              </label>
              <div className="relative">
                <DollarSign
                  size={16}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  name="price_premium"
                  type="number"
                  defaultValue={get("price_premium")}
                  placeholder="99"
                  className="pl-10 w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SEO */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">
            SEO Globalne
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tytuł Strony (Suffix)
            </label>
            <input
              name="site_title_suffix"
              defaultValue={get("site_title_suffix")}
              placeholder="| Najlepszy Katalog Firm"
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Wyróżniona Firma */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
            <Star size={18} className="text-yellow-500" />
            Wyróżniona Firma (Banner Promocyjny)
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wybierz firmę do wyróżnienia na górze strony
            </label>
            <FeaturedCompanySearch 
              defaultValue={featuredCompanyId} 
              defaultCompanyName={featuredCompanyName}
            />
            <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                Wybrana firma będzie wyświetlana w banerze promocyjnym na górze strony głównej z tekstem "Najlepsza Agencja SEO/SEM w 2025 roku".
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all flex justify-center items-center gap-2"
          >
            <Save size={18} /> Zapisz zmiany
          </button>
        </div>
      </form>
    </div>
  );
}
