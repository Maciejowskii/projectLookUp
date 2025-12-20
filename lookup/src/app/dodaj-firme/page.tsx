import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import bcrypt from "bcryptjs"; // <--- NOWOŚĆ
import { resend } from "@/lib/resend"; // <--- NOWOŚĆ

export default async function AddCompanyPage() {
  // 1. Pobieramy kategorie
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  async function createCompany(formData: FormData) {
    "use server";

    const rawData = {
      name: formData.get("name") as string,
      nip: formData.get("nip") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      city: formData.get("city") as string,
      categoryId: formData.get("categoryId") as string,
    };

    // Walidacja podstawowa
    if (!rawData.categoryId) throw new Error("Wybierz kategorię!");

    const defaultTenant = await prisma.tenant.findFirst();
    if (!defaultTenant) throw new Error("Błąd konfiguracji.");

    // --- 1. GENEROWANIE HASŁA ---
    // Generujemy losowe hasło 8-znakowe
    const tempPassword =
      Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 9);
    // Haszujemy hasło (bezpieczeństwo)
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Generowanie sluga
    const baseSlug = rawData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const safeSlug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

    // --- 2. TRANSAKCJA (Firma + User) ---
    // Używamy transakcji, żeby mieć pewność, że albo powstanie wszystko, albo nic
    await prisma.$transaction(async (tx) => {
      // A. Tworzymy firmę
      const newCompany = await tx.company.create({
        data: {
          name: rawData.name,
          slug: safeSlug,
          nip: rawData.nip,
          email: rawData.email, // Email firmowy (publiczny)
          phone: rawData.phone,
          city: rawData.city,
          address: "Do uzupełnienia",
          zip: "00-000",
          tenantId: defaultTenant.id,
          categoryId: rawData.categoryId,
          isVerified: false,
        },
      });

      // B. Tworzymy konto użytkownika (User) dla tej firmy
      await tx.user.create({
        data: {
          email: rawData.email, // Login = Email
          password: hashedPassword,
          companyId: newCompany.id,
        },
      });
    });

    // --- 3. WYSYŁKA EMAILA Z HASŁEM ---
    try {
      await resend.emails.send({
        from: "LookUp <onboarding@resend.dev>", // Zmień na swoją domenę w produkcji
        to: rawData.email,
        subject: "Witaj w LookUp! Oto Twój dostęp do konta",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Dziękujemy za dodanie firmy!</h1>
            <p>Twoja wizytówka została utworzona.</p>
            <p>Aby zarządzać profilem, zaloguj się w Strefie Partnera:</p>
            
            <div style="background: #f4f4f4; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Login:</strong> ${rawData.email}</p>
              <p><strong>Hasło tymczasowe:</strong> ${tempPassword}</p>
            </div>

            <a href="http://localhost:3000/strefa-partnera" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Przejdź do logowania
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">Po zalogowaniu zalecamy zmianę hasła.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Błąd wysyłki maila:", error);
      // Nie przerywamy, firma i tak została utworzona
    }

    // 🔥 DODAJ TĘ LINIJKĘ TYMCZASOWO:
    console.log("====================================");
    console.log("LOGIN (Email):", rawData.email);
    console.log("TWOJE HASŁO:", tempPassword);
    console.log("====================================");

    redirect("/dziekujemy");
  }

  // ... reszta Twojego return (JSX formularza) bez zmian ...
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <div className="flex-grow flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Dekoracyjne tło */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px] relative z-10 border border-white/50">
          {/* Kolumna Lewa - Formularz */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
              Darmowa wizytówka
            </h1>
            <p className="text-gray-500 mb-8">
              Wypełnij dane, aby dołączyć do bazy LookUp w 30 sekund.
            </p>

            <form action={createCompany} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">
                  Nazwa firmy
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="np. Auto-Naprawa Nowak"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900"
                />
              </div>

              {/* --- WYBÓR KATEGORII (POPRAWIONE) --- */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">
                  Branża / Kategoria
                </label>
                <div className="relative">
                  <select
                    name="categoryId"
                    required
                    defaultValue=""
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white text-gray-900 appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-gray-400">
                      Wybierz z listy...
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {/* Używamy Lucide ArrowRight obróconego o 90 stopni zamiast inline SVG */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ArrowRight className="rotate-90" size={16} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">
                    NIP
                  </label>
                  <input
                    name="nip"
                    type="text"
                    placeholder="000-000-00-00"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">
                    Miasto
                  </label>
                  <input
                    name="city"
                    type="text"
                    required
                    placeholder="np. Kraków"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">
                  Telefon
                </label>
                <input
                  name="phone"
                  type="text"
                  placeholder="+48 000 000 000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">
                  Email kontaktowy
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="biuro@firma.pl"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400 font-medium text-gray-900"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group mt-4 shadow-xl shadow-gray-900/10"
              >
                Dodaj firmę{" "}
                <ArrowRight
                  size={18}
                  className="text-gray-400 group-hover:text-white transition-colors"
                />
              </button>

              <p className="text-xs text-center text-gray-400 mt-4 font-medium">
                Klikając, akceptujesz{" "}
                <Link
                  href="/legal/regulamin"
                  className="underline hover:text-gray-600"
                >
                  Regulamin
                </Link>
                .
              </p>
            </form>
          </div>

          {/* Kolumna Prawa */}
          <div className="hidden md:flex flex-col justify-center h-full bg-blue-600 text-white p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 opacity-20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8">Dlaczego warto?</h2>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="bg-white/20 p-2 rounded-lg mt-1">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Więcej klientów</h3>
                    <p className="text-blue-100 text-sm leading-relaxed mt-1">
                      Twoja wizytówka wyświetla się osobom szukającym usług w
                      Twojej okolicy.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white/20 p-2 rounded-lg mt-1">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Pozycjonowanie SEO</h3>
                    <p className="text-blue-100 text-sm leading-relaxed mt-1">
                      Wysoka pozycja w Google dzięki autorytetowi domeny LookUp.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white/20 p-2 rounded-lg mt-1">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Opinie i Zaufanie</h3>
                    <p className="text-blue-100 text-sm leading-relaxed mt-1">
                      Zbieraj gwiazdki i buduj wizerunek profesjonalisty.
                    </p>
                  </div>
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
