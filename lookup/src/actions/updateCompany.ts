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

  // 2. Pobieramy usera, żeby wiedzieć jaką firmę edytować
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user || !user.companyId) {
    throw new Error("Nie znaleziono firmy przypisanej do konta.");
  }

  // 3. Pobieramy dane z formularza
  const description = formData.get("description") as string;
  const website = formData.get("website") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;

  // 4. Aktualizacja w bazie
  await prisma.company.update({
    where: { id: user.companyId },
     data:{
      description,
      website,
      phone,
      email,
      address,
    },
  });

  // 5. Odświeżamy cache, żeby użytkownik od razu widział zmiany
  revalidatePath("/dashboard");
  revalidatePath(`/firma/${user.companyId}`); // Opcjonalnie, jeśli znamy slug
}
