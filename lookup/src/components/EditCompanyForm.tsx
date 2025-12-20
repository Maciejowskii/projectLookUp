"use client";

import { updateCompanyAction } from "@/actions/updateCompany";
import {
  Save,
  Globe,
  Phone,
  Mail,
  MapPin,
  AlignLeft,
  Image as ImageIcon,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing"; // <--- Importujemy przycisk
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CompanyData {
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo: string | null; // <--- Dodajemy pole logo
}

export function EditCompanyForm({ company }: { company: CompanyData }) {
  const router = useRouter(); // Żeby odświeżyć stronę po uploadzie

  return (
    <div className="space-y-8">
      {/* SEKCJA 0: LOGO UPLOAD (Osobno, bo to nie jest input formularza) */}
      <div className="bg-white p-6 rounded-2xl border-2 border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
          <ImageIcon size={16} className="text-blue-600" /> Logo Firmy
        </h3>
        <div className="flex items-center gap-6">
          {/* Podgląd aktualnego logo */}
          <div className="w-24 h-24 rounded-xl border-2 border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden relative">
            {company.logo ? (
              <Image
                src={company.logo}
                alt="Logo firmy"
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-gray-400 text-xs text-center px-2">
                Brak logo
              </span>
            )}
          </div>

          {/* Przycisk UploadThing */}
          <div>
            <UploadButton
              endpoint="companyLogo"
              onClientUploadComplete={(res) => {
                // Po sukcesie odświeżamy stronę, żeby zobaczyć nowe logo
                alert("Logo zaktualizowane!");
                router.refresh();
              }}
              onUploadError={(error: Error) => {
                alert(`Błąd: ${error.message}`);
              }}
              appearance={{
                button:
                  "bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition-all",
                allowedContent: "text-gray-400 text-xs",
              }}
            />
            <p className="text-xs text-gray-400 mt-2">Max 4MB (JPG, PNG)</p>
          </div>
        </div>
      </div>

      {/* Reszta formularza (bez zmian w strukturze, tylko wrapujemy w <form>) */}
      <form action={updateCompanyAction} className="space-y-8">
        {/* ... TUTAJ WKLEJ CAŁĄ RESZTĘ POPRZEDNIEGO FORMULARZA (Pola Opis, Telefon itd.) ... */}
        {/* Pamiętaj, żeby nie zgubić Sekcji 1 i Sekcji 2 z poprzedniego kodu */}

        {/* Sekcja 1: Opis Firmy */}
        <div className="space-y-4">
          {/* ... kod z poprzedniej wiadomości ... */}
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide">
            <AlignLeft size={16} className="text-blue-600" /> O firmie
          </label>
          <div className="relative">
            <textarea
              name="description"
              defaultValue={company.description || ""}
              rows={6}
              className="w-full p-4 rounded-xl border-2 border-gray-100 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-y font-medium text-base shadow-sm"
              placeholder="Napisz czym się zajmujesz..."
            />
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 my-8"></div>

        {/* Sekcja 2: Dane Kontaktowe - skopiuj z poprzedniego kodu */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-6 flex items-center gap-2">
            Kontakt i Adres
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Telefon, Email, Website, Adres - identycznie jak wcześniej */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Numer telefonu
              </label>
              <div className="relative group">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  name="phone"
                  type="text"
                  defaultValue={company.phone || ""}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Email
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  name="email"
                  type="text"
                  defaultValue={company.email || ""}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">WWW</label>
              <div className="relative group">
                <Globe
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  name="website"
                  type="text"
                  defaultValue={company.website || ""}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Adres
              </label>
              <div className="relative group">
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  name="address"
                  type="text"
                  defaultValue={company.address || ""}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex items-center justify-between border-t border-gray-100 mt-8">
          <p className="text-sm text-gray-500 hidden md:block">
            Pamiętaj, aby zapisywać zmiany regularnie.
          </p>
          <button
            type="submit"
            className="w-full md:w-auto bg-gray-900 text-white font-bold py-4 px-8 rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 active:scale-95"
          >
            <Save size={20} /> Zapisz zmiany
          </button>
        </div>
      </form>
    </div>
  );
}
