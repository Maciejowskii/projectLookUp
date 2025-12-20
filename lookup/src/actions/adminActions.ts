"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function approveClaim(claimId: string) {
  await checkAdminAuth();
  // 1. Pobierz zgłoszenie
  const claim = await prisma.claimRequest.findUnique({
    where: { id: claimId },
  });

  if (!claim) throw new Error("Nie znaleziono zgłoszenia");

  // 2. Zaktualizuj status zgłoszenia
  await prisma.claimRequest.update({
    where: { id: claimId },
    data: { status: "APPROVED" },
  });

  // 3. Zaktualizuj firmę (zweryfikuj ją i przypisz dane kontaktowe właściciela)
  await prisma.company.update({
    where: { id: claim.companyId },
    data: {
      isVerified: true,
      email: claim.email, // Nadpisujemy email firmowy emailem właściciela (opcjonalne)
      // phone: claim.phone // Możemy też nadpisać telefon, jeśli chcesz
    },
  });

  revalidatePath("/admin/zgloszenia");
  revalidatePath(`/firma`); // Odśwież widok publiczny
}

export async function rejectClaim(claimId: string) {
  await checkAdminAuth();
  await prisma.claimRequest.update({
    where: { id: claimId },
    data: { status: "REJECTED" },
  });
  revalidatePath("/admin/zgloszenia");
}

export async function deleteReview(reviewId: string) {
  await checkAdminAuth();
  await prisma.review.delete({
    where: { id: reviewId },
  });
  revalidatePath("/admin/reviews");
}

// ... (istniejące importy i funkcje)

// --- KATEGORIE ---

export async function createCategory(formData: FormData) {
  await checkAdminAuth();
  const name = formData.get("name") as string;
  const tenantId = "default"; // Lub pobierz z konfiguracji, jeśli masz multitenancy

  // Prosty slug generator: "Usługi Prawne" -> "uslugi-prawne"
  const slug = name
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/ś/g, "s")
    .replace(/ć/g, "c")
    .replace(/ą/g, "a")
    .replace(/ę/g, "e")
    .replace(/ń/g, "n")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/ó/g, "o")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");

  const defaultTenant = await prisma.tenant.findFirst();
  if (!defaultTenant) throw new Error("Brak Tenanta w bazie!");

  await prisma.category.create({
    data: {
      name,
      slug,
      tenantId: defaultTenant.id, // Używamy ID znalezionego tenanta
    },
  });

  revalidatePath("/admin/categories");
}

export async function deleteCategory(id: string) {
  await checkAdminAuth();
  // Opcjonalnie: sprawdź czy kategoria nie ma firm przed usunięciem
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
}

// --- USTAWIENIA GLOBALNE ---

export async function updateSettings(formData: FormData) {
  await checkAdminAuth();
  // Pobieramy wszystkie pola z formularza
  const entries = Array.from(formData.entries());

  for (const [key, value] of entries) {
    // Ignorujemy pola systemowe next.js (zaczynające się od $)
    if (!key.startsWith("$")) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }
  }

  revalidatePath("/admin/settings");
}
