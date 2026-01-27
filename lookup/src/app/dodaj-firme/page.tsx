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
import { CategorySearch } from "@/components/CategorySearch";
import Link from "next/link";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getResend } from "@/lib/resend";
import { getNotificationEmails } from "@/lib/notificationEmails";
import {
  validateNIP,
  validatePostalCode,
  validateCityAndPostalCode,
  formatNIP,
  formatPostalCode,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function AddCompanyPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  const defaultTenant = await prisma.tenant.findFirst();

  if (!defaultTenant) {
    return (
      <div className="p-10 text-center text-red-600 font-sans">
        Błąd: Brak konfiguracji tenanta.
      </div>
    );
  }

  async function createCompany(formData: FormData) {
    "use server";

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("Błąd krytyczny: Brak tenanta.");

    const rawData = {
      name: formData.get("name") as string,
      nip: formData.get("nip") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      city: formData.get("city") as string,
      zip: formData.get("zip") as string,
      categoryId: formData.get("categoryId") as string,
    };

    if (!rawData.categoryId) throw new Error("Wybierz kategorię!");

    // WALIDACJA NIP
    const nipValidation = validateNIP(rawData.nip);
    if (!nipValidation.valid) {
      throw new Error(nipValidation.error || "Nieprawidłowy NIP");
    }

    // WALIDACJA KODU POCZTOWEGO
    const zipValidation = validatePostalCode(rawData.zip);
    if (!zipValidation.valid) {
      throw new Error(zipValidation.error || "Nieprawidłowy kod pocztowy");
    }

    // WALIDACJA MIASTA + KOD POCZTOWY (sprawdzenie czy pasują do siebie)
    const cityValidation = await validateCityAndPostalCode(rawData.city, rawData.zip);
    if (!cityValidation.valid) {
      throw new Error(cityValidation.error || "Miasto i kod pocztowy nie pasują do siebie");
    }

    // Formatuj dane
    const formattedNIP = rawData.nip ? formatNIP(rawData.nip) : null;
    const formattedZip = formatPostalCode(rawData.zip);
    const normalizedCity = cityValidation.normalizedCity || rawData.city.trim();

    // Generujemy losowe hasło dla użytkownika (możesz je wyświetlić na stronie sukcesu)
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const slug =
      rawData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.floor(Math.random() * 1000);

    let newCompanyId: string;
    let userId: string | null = null;

    await prisma.$transaction(async (tx) => {
      // 1. Tworzymy firmę
      const newCompany = await tx.company.create({
        data: {
          name: rawData.name,
          slug,
          nip: formattedNIP,
          email: rawData.email,
          phone: rawData.phone,
          city: normalizedCity,
          zip: formattedZip,
          tenantId: tenant.id,
          categoryId: rawData.categoryId,
          isVerified: false,
        },
      });
      newCompanyId = newCompany.id;

      // 2. Tworzymy użytkownika (od razu zweryfikowany email)
      const user = await tx.user.upsert({
        where: { email: rawData.email },
        update: {
          password: hashedPassword,
          companyId: newCompany.id,
          emailVerified: new Date(),
        },
        create: {
          email: rawData.email,
          password: hashedPassword,
          companyId: newCompany.id,
          emailVerified: new Date(), // Konto od razu aktywne
        },
      });
      userId = user.id;

      // 3. Tworzymy ClaimRequest dla nowej firmy (do akceptacji przez admina)
      await tx.claimRequest.create({
        data: {
          companyId: newCompany.id,
          userId: user.id,
          fullName: rawData.name,
          email: rawData.email,
          phone: rawData.phone || '-',
          status: 'PENDING',
          message: `Nowa wizytówka utworzona przez formularz rejestracji.`,
        },
      });
    });

    // Powiadom adminów (notification_emails) o nowej wizytówce – wszystkie dane z formularza
    // Wysyłamy do WSZYSTKICH maili podanych w ustawieniach admina
    const category = await prisma.category.findUnique({
      where: { id: rawData.categoryId },
      select: { name: true },
    });
    const notifEmails = await getNotificationEmails();
    const resendNotif = getResend();
    
    if (resendNotif && notifEmails.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://www.katalogo.pl";
      const adminHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f3f4f6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
              color: white;
              padding: 30px 24px;
              border-radius: 12px 12px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .header p {
              margin: 8px 0 0;
              opacity: 0.95;
              font-size: 16px;
            }
            .content {
              background: #f8fafc;
              padding: 30px 24px;
              border: 1px solid #e2e8f0;
              border-top: none;
            }
            .info-box {
              background: white;
              padding: 18px 20px;
              border-radius: 8px;
              margin: 12px 0;
              border-left: 4px solid #8b5cf6;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            .label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
              margin-bottom: 6px;
            }
            .value {
              font-size: 15px;
              font-weight: 600;
              color: #1e293b;
              margin-top: 4px;
            }
            .value a {
              color: #8b5cf6;
              text-decoration: none;
            }
            .value a:hover {
              text-decoration: underline;
            }
            .button-container {
              text-align: center;
              margin-top: 24px;
            }
            .button {
              display: inline-block;
              background: #8b5cf6;
              color: white;
              padding: 14px 28px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 15px;
              transition: background-color 0.2s;
            }
            .button:hover {
              background: #7c3aed;
            }
            .footer {
              text-align: center;
              padding: 20px 16px;
              color: #64748b;
              font-size: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-top: none;
              border-radius: 0 0 12px 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Nowa wizytówka</h1>
              <p>${rawData.name}</p>
            </div>
            <div class="content">
              <div class="info-box">
                <div class="label">NAZWA FIRMY</div>
                <div class="value">${rawData.name}</div>
              </div>
              <div class="info-box">
                <div class="label">NIP</div>
                <div class="value">${rawData.nip || "—"}</div>
              </div>
              <div class="info-box">
                <div class="label">EMAIL</div>
                <div class="value"><a href="mailto:${rawData.email}">${rawData.email}</a></div>
              </div>
              <div class="info-box">
                <div class="label">TELEFON</div>
                <div class="value">${rawData.phone}</div>
              </div>
              <div class="info-box">
                <div class="label">MIASTO</div>
                <div class="value">${normalizedCity}</div>
              </div>
              <div class="info-box">
                <div class="label">KOD POCZTOWY</div>
                <div class="value">${formattedZip}</div>
              </div>
              <div class="info-box">
                <div class="label">BRANŻA</div>
                <div class="value">${category?.name ?? "—"}</div>
              </div>
              <div class="button-container">
                <a href="${baseUrl}/admin/zgloszenia" class="button">Panel admina →</a>
              </div>
            </div>
            <div class="footer">
              <p>Katalogo – powiadomienie automatyczne</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Wysyłamy email do WSZYSTKICH adresów z ustawień admina
      console.log(`📧 Wysyłanie powiadomień o nowej wizytówce do ${notifEmails.length} adresów...`);
      const sendPromises = notifEmails.map(async (to) => {
        try {
          await resendNotif.emails.send({
            from: "Katalogo <onboarding@resend.dev>",
            to: to.trim(),
            subject: `📋 Nowa wizytówka: ${rawData.name}`,
            html: adminHtml,
          });
          console.log(`✅ Powiadomienie do admina (nowa firma) wysłane: ${to}`);
          return { success: true, email: to };
        } catch (e: any) {
          console.error(`❌ Błąd wysyłania do ${to}:`, e?.message || e);
          return { success: false, email: to, error: e?.message || 'Unknown error' };
        }
      });
      
      // Czekamy na wszystkie wysyłki (ale nie blokujemy przekierowania)
      const results = await Promise.allSettled(sendPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      if (failed > 0) {
        console.warn(`⚠️  ${failed} z ${results.length} emaili nie zostało wysłanych`);
      } else {
        console.log(`✅ Wszystkie powiadomienia (${successful}) zostały wysłane pomyślnie`);
      }
    } else {
      if (!resendNotif) {
        console.warn("⚠️  RESEND_API_KEY nie jest ustawione - powiadomienia email nie będą wysyłane");
      }
      if (notifEmails.length === 0) {
        console.warn("⚠️  Brak adresów email w ustawieniach admina (notification_emails) - powiadomienia nie będą wysyłane");
      }
    }

    redirect(`/sukces-rejestracji?email=${rawData.email}&p=${tempPassword}`);
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans">
      <Navbar />

      <div className="flex-grow flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent -z-10"></div>

        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden min-h-[650px] border border-gray-100">
          {/* LEWA KOLUMNA: FORMULARZ */}
          <div className="lg:col-span-7 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
            <div className="mb-8">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                Natychmiastowa aktywacja
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
                Dodaj swoją firmę
              </h1>
              <p className="text-gray-600 text-lg">
                Twoje konto zostanie utworzone automatycznie.
              </p>
            </div>

            <form action={createCompany} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Nazwa firmy
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="np. Auto-Serwis Kowalski"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Branża <span className="text-red-500">*</span>
                  </label>
                  <CategorySearch
                    categories={categories}
                    name="categoryId"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    Wpisz nazwę kategorii aby wyszukać ({categories.length} dostępnych)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    NIP <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="nip"
                    type="text"
                    required
                    maxLength={13}
                    placeholder="1234567890"
                    pattern="[0-9-]{0,13}"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                    title="NIP musi składać się z 10 cyfr"
                  />
                  <p className="text-xs text-gray-500 mt-1 ml-1">10 cyfr (bez myślników) - zostanie zweryfikowany</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Kod pocztowy <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="zip"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="00-000"
                    pattern="[0-9]{2}-[0-9]{3}"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                    title="Format: XX-XXX (np. 00-001)"
                  />
                  <p className="text-xs text-gray-500 mt-1 ml-1">Format: XX-XXX</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                  Miasto <span className="text-red-500">*</span>
                </label>
                <input
                  name="city"
                  required
                  placeholder="np. Warszawa"
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  Miasto zostanie zweryfikowane na podstawie kodu pocztowego
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="+48 500 600 700"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Email (Login) <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="kontakt@twojafirma.pl"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl flex justify-center items-center gap-3 group text-lg transform active:scale-[0.99]">
                  Zarejestruj firmę
                  <ArrowRight
                    size={20}
                    className="text-gray-400 group-hover:text-white transition-colors"
                  />
                </button>
              </div>
            </form>
          </div>

          {/* PRAWA KOLUMNA: MARKETING */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-900 text-white p-12">
            <h2 className="text-3xl font-bold leading-tight">
              Zacznij pozyskiwać klientów już teraz
            </h2>
            <ul className="space-y-6">
              <FeatureItem
                icon={<Search size={24} />}
                title="Profil SEO"
                desc="Twoja firma pojawi się w wynikach wyszukiwania."
              />
              <FeatureItem
                icon={<ShieldCheck size={24} />}
                title="Panel partnera"
                desc="Zarządzaj swoimi danymi i opiniami 24/7."
              />
              <FeatureItem
                icon={<TrendingUp size={24} />}
                title="Statystyki"
                desc="Sprawdzaj ile osób zobaczyło Twój numer telefonu."
              />
            </ul>
            <div className="bg-white/10 p-4 rounded-xl text-sm border border-white/20 italic">
              Po rejestracji zostaniesz przekierowany do strony z danymi do
              logowania.
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

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
    <li className="flex gap-4 items-start">
      <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5 shrink-0">
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
