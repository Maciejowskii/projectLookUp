import { prisma } from "@/lib/prisma";
import { updateSettings } from "@/actions/adminActions";
import { Save, Settings, DollarSign, Phone, Mail } from "lucide-react";

export default async function AdminSettingsPage() {
  // Pobieramy obecne ustawienia
  const settings = await prisma.setting.findMany();

  // Helper do wyciągania wartości
  const get = (key: string) => settings.find((s) => s.key === key)?.value || "";

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
                  className="pl-10 w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="pl-10 w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="pl-10 w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
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
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
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
