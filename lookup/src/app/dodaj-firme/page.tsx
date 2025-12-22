import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Check,
  ArrowRight,
  Star,
  TrendingUp,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
export const dynamic = "force-dynamic";

export default async function AddCompanyPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  const defaultTenant = await prisma.tenant.findFirst();

  if (!defaultTenant) {
    return (
      <div className="p-10 text-center text-red-600">
        Błąd: Brak konfiguracji tenanta.
      </div>
    );
  }

  async function createCompany(formData: FormData) {
    "use server";

    // Pobieramy tenanta ponownie wewnątrz Server Action dla bezpieczeństwa typów
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("Błąd krytyczny: Brak tenanta.");

    const rawData = {
      name: formData.get("name") as string,
      nip: formData.get("nip") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      city: formData.get("city") as string,
      categoryId: formData.get("categoryId") as string,
    };

    if (!rawData.categoryId) throw new Error("Wybierz kategorię!");

    const tempPassword = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const verificationToken = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slug =
      rawData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.floor(Math.random() * 1000);

    await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: rawData.name,
          slug,
          nip: rawData.nip,
          email: rawData.email,
          phone: rawData.phone,
          city: rawData.city,
          tenantId: tenant.id,
          categoryId: rawData.categoryId,
          isVerified: false,
        },
      });

      await tx.user.create({
        data: {
          email: rawData.email,
          password: hashedPassword,
          companyId: newCompany.id,
          emailVerified: null,
        },
      });

      await tx.verificationToken.create({
        data: {
          identifier: rawData.email,
          token: verificationToken,
          expires: tokenExpires,
        },
      });
    });

    const confirmLink = `${
      process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
    }/weryfikacja?token=${verificationToken}`;

    try {
      await resend.emails.send({
        from: "katalogo <onboarding@resend.dev>",
        to: rawData.email,
        subject: "Potwierdź konto - katalogo",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h1>Dziękujemy za rejestrację!</h1>
            <p>Aby aktywować konto firmy <strong>${rawData.name}</strong>, kliknij w link:</p>
            <a href="${confirmLink}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:20px 0;">
                Aktywuj konto
            </a>
            <p style="font-size:12px;color:#888;">Link wygasa za 24h.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Mail error:", error);
    }

    redirect("/sprawdz-email");
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans">
      <Navbar />

      <div className="flex-grow flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Tło - subtelniejsze */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent -z-10"></div>

        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden min-h-[650px] border border-gray-100">
          {/* LEWA KOLUMNA: FORMULARZ (7/12 szerokości na duzych ekranach) */}
          <div className="lg:col-span-7 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
            <div className="mb-8">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                Dla firm
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
                Dodaj swoją wizytówkę
              </h1>
              <p className="text-gray-600 text-lg">
                Dołącz do lokalnej bazy firm w 30 sekund. To nic nie kosztuje.
              </p>
            </div>

            <form action={createCompany} className="space-y-5">
              {/* Sekcja 1 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Nazwa firmy
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="np. Auto-Serwis Kowalski"
                    // ZMIANA: Ciemniejszy border, ciemniejszy placeholder, wyraźniejszy tekst
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white placeholder:text-gray-500 text-gray-900 font-medium shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Branża
                  </label>
                  <div className="relative">
                    <select
                      name="categoryId"
                      required
                      defaultValue=""
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 appearance-none cursor-pointer shadow-sm font-medium"
                    >
                      <option value="" disabled className="text-gray-500">
                        Wybierz kategorię...
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <ArrowRight className="rotate-90" size={18} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2 kolumny */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    NIP
                  </label>
                  <input
                    name="nip"
                    placeholder="000-000-00-00"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white placeholder:text-gray-500 text-gray-900 font-medium shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Miasto
                  </label>
                  <input
                    name="city"
                    required
                    placeholder="np. Warszawa"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white placeholder:text-gray-500 text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

              {/* Grid 2 kolumny */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Telefon
                  </label>
                  <input
                    name="phone"
                    placeholder="+48 500 600 700"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white placeholder:text-gray-500 text-gray-900 font-medium shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Email firmowy
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="kontakt@twojafirma.pl"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white placeholder:text-gray-500 text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-gray-900/20 flex justify-center items-center gap-3 group text-lg transform active:scale-[0.99]">
                  Utwórz wizytówkę za darmo
                  <ArrowRight
                    size={20}
                    className="text-gray-400 group-hover:text-white transition-colors"
                  />
                </button>
                <p className="text-xs text-center text-gray-500 mt-4">
                  Klikając przycisk, akceptujesz{" "}
                  <Link
                    href="/regulamin"
                    className="underline hover:text-gray-800"
                  >
                    Regulamin
                  </Link>
                  .
                </p>
              </div>
            </form>
          </div>

          {/* PRAWA KOLUMNA: MARKETING (5/12 szerokości) */}
          {/* ZMIANA: Gradient, lepsze ikony, efekt glassmorphism */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white p-12 relative overflow-hidden">
            {/* Dekoracje tła */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/20 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-[80px] -translate-x-1/2 translate-y-1/2"></div>

            {/* Treść górna */}
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-8 leading-tight">
                Rozwijaj biznes <br />z katalogo
              </h2>

              <ul className="space-y-6">
                <FeatureItem
                  icon={<Search className="text-blue-200" size={24} />}
                  title="Daj się znaleźć w Google"
                  desc="Nasze wizytówki są zoptymalizowane pod SEO, co zwiększa Twoją widoczność."
                />
                <FeatureItem
                  icon={<ShieldCheck className="text-blue-200" size={24} />}
                  title="Buduj zaufanie"
                  desc="Zweryfikowane konto i opinie klientów budują wizerunek profesjonalisty."
                />
                <FeatureItem
                  icon={<TrendingUp className="text-blue-200" size={24} />}
                  title="Więcej klientów"
                  desc="Otrzymuj zapytania bezpośrednio od osób szukających Twoich usług."
                />
              </ul>
            </div>

            {/* Dolna karta "Social Proof" - to bardzo pomaga w konwersji */}
            <div className="relative z-10 mt-12">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-lg">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={16}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-blue-50 leading-relaxed mb-4">
                  "Dzięki wizytówce w katalogo pozyskałem 3 nowych klientów w
                  pierwszym tygodniu. Polecam!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center font-bold text-xs">
                    MK
                  </div>
                  <div>
                    <p className="text-sm font-bold">Marek Kowalski</p>
                    <p className="text-xs text-blue-200">
                      Właściciel warsztatu
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// Pomocniczy komponent do listy zalet
function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex gap-4 items-start group">
      <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5 shrink-0 group-hover:bg-white/20 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-blue-100 text-sm leading-relaxed opacity-90">
          {desc}
        </p>
      </div>
    </li>
  );
}
