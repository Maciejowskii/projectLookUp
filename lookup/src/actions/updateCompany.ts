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
  const openingHours = openingHoursRaw ? JSON.parse(openingHoursRaw) : undefined;

  // 5. Pobieramy slug firmy dla revalidatePath
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true },
  });

  // 6. Aktualizacja w bazie
  await prisma.company.update({
    where: { id: companyId },
    data: {
      description,
      website,
      phone,
      email,
      address,
      openingHours,
    },
  });

  // 7. Odświeżamy cache, żeby użytkownik od razu widział zmiany
  revalidatePath("/dashboard");
  if (company?.slug) {
    revalidatePath(`/firma/${company.slug}`);
  }
}
