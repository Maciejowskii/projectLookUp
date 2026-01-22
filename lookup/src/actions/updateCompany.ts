"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function updateCompanyAction(formData: FormData) {
  // 1. Sprawdzamy sesję (Security First!)
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  if (!userId) {
    throw new Error("Nieautoryzowany dostęp");
  }

  // 2. Pobieramy companyId z formularza
  const companyId = formData.get("companyId") as string;
  
  if (!companyId) {
    throw new Error("Brak identyfikatora firmy.");
  }

  // 3. Sprawdzamy czy użytkownik ma dostęp do tej firmy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companies: {
        where: { companyId },
      },
      // Legacy support
      company: true,
    },
  });

  if (!user) {
    throw new Error("Nie znaleziono użytkownika.");
  }

  // Sprawdzamy dostęp: nowa struktura (CompanyUser) lub legacy (companyId)
  const hasAccessViaNewStructure = user.companies.length > 0;
  const hasAccessViaLegacy = user.companyId === companyId && user.company?.id === companyId;

  if (!hasAccessViaNewStructure && !hasAccessViaLegacy) {
    throw new Error("Brak uprawnień do edycji tej firmy.");
  }

  // 4. Pobieramy dane z formularza
  const description = formData.get("description") as string;
  const website = formData.get("website") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;
  const openingHoursRaw = formData.get("openingHours") as string;
  
  let openingHours = undefined;
  if (openingHoursRaw) {
    try {
      openingHours = JSON.parse(openingHoursRaw);
    } catch (e) {
      console.error("Failed to parse openingHours:", e);
      // Ignorujemy błąd parsowania - zostanie undefined
    }
  }

  // 5. Pobieramy firmę (slug, plan) dla revalidatePath i reguł Premium
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true, plan: true, premiumUntil: true },
  });

  const isPremiumActive =
    company?.plan === "PREMIUM" &&
    company?.premiumUntil &&
    new Date(company.premiumUntil) > new Date();

  const updateData: {
    description: string;
    website?: string;
    phone: string;
    email: string;
    address: string;
    openingHours?: object;
  } = {
    description,
    phone,
    email,
    address,
  };
  if (openingHours !== undefined) {
    updateData.openingHours = openingHours;
  }
  if (isPremiumActive) {
    updateData.website = website ?? "";
  }

  // 6. Aktualizacja w bazie
  await prisma.company.update({
    where: { id: companyId },
    data: updateData,
  });

  // 7. Odświeżamy cache, żeby użytkownik od razu widział zmiany
  revalidatePath("/dashboard");
  if (company?.slug) {
    revalidatePath(`/firma/${company.slug}`);
  }
}
