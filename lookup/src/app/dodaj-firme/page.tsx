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

export const dynamic = "force-dynamic";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Missing RESEND_API_KEY");
    return null;
  }
  return new Resend(key);
}

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

    const resend = getResend();
    if (resend) {
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
    }

    redirect("/sprawdz-email");
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans">
      <Navbar />
      {/* ... reszta JSX dokładnie tak jak masz ... */}
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
