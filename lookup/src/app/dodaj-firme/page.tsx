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
import crypto from "crypto";
import { getResend } from "@/lib/resend";
import { getNotificationEmails } from "@/lib/notificationEmails";

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
      categoryId: formData.get("categoryId") as string,
    };

    if (!rawData.categoryId) throw new Error("Wybierz kategorię!");

    // Generujemy losowe hasło dla użytkownika (możesz je wyświetlić na stronie sukcesu)
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const slug =
      rawData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.floor(Math.random() * 1000);

    await prisma.$transaction(async (tx) => {
      // 1. Tworzymy firmę
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

      // 2. Tworzymy użytkownika (od razu zweryfikowany email)
      await tx.user.upsert({
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
    });

    // Powiadom adminów (notification_emails) o nowej wizytówce – wszystkie dane z formularza
    const category = await prisma.category.findUnique({
      where: { id: rawData.categoryId },
      select: { name: true },
    });
    const notifEmails = await getNotificationEmails();
    const resendNotif = getResend();
    if (resendNotif && notifEmails.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://www.katalogo.pl";
      const adminHtml = `
        <!DOCTYPE html><html><head>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;}
        .container{max-width:600px;margin:0 auto;padding:20px;}
        .header{background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;}
        .content{background:#f8fafc;padding:24px;border:1px solid #e2e8f0;}
        .info-box{background:white;padding:16px;border-radius:8px;margin:12px 0;border-left:4px solid #8b5cf6;}
        .label{font-size:11px;color:#64748b;text-transform:uppercase;}
        .value{font-size:15px;font-weight:600;color:#1e293b;margin-top:4px;}
        .footer{text-align:center;padding:16px;color:#64748b;font-size:12px;}
        </style></head><body>
        <div class="container">
          <div class="header"><h1 style="margin:0;font-size:20px;">📋 Nowa wizytówka</h1>
          <p style="margin:8px 0 0;opacity:0.9;">${rawData.name}</p></div>
          <div class="content">
            <div class="info-box"><div class="label">Nazwa firmy</div><div class="value">${rawData.name}</div></div>
            <div class="info-box"><div class="label">NIP</div><div class="value">${rawData.nip || "—"}</div></div>
            <div class="info-box"><div class="label">Email</div><div class="value"><a href="mailto:${rawData.email}">${rawData.email}</a></div></div>
            <div class="info-box"><div class="label">Telefon</div><div class="value">${rawData.phone}</div></div>
            <div class="info-box"><div class="label">Miasto</div><div class="value">${rawData.city}</div></div>
            <div class="info-box"><div class="label">Branża</div><div class="value">${category?.name ?? "—"}</div></div>
            <div style="text-align:center;margin-top:16px;">
              <a href="${baseUrl}/admin/companies" style="display:inline-block;background:#8b5cf6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Panel admina →</a>
            </div>
          </div>
          <div class="footer"><p>Katalogo – powiadomienie automatyczne</p></div>
        </div></body></html>
      `;
      for (const to of notifEmails) {
        try {
          await resendNotif.emails.send({
            from: "Katalogo <onboarding@resend.dev>",
            to,
            subject: `📋 Nowa wizytówka: ${rawData.name}`,
            html: adminHtml,
          });
          console.log(`✅ Powiadomienie do admina (nowa firma) wysłane: ${to}`);
        } catch (e) {
          console.error(`❌ Błąd wysyłania do ${to}:`, e);
        }
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
                    Branża
                  </label>
                  <div className="relative">
                    <select
                      name="categoryId"
                      required
                      defaultValue=""
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 appearance-none cursor-pointer shadow-sm font-medium"
                    >
                      <option value="" disabled>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    NIP
                  </label>
                  <input
                    name="nip"
                    placeholder="000-000-00-00"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
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
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Telefon
                  </label>
                  <input
                    name="phone"
                    required
                    placeholder="+48 500 600 700"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                    Email (Login)
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
