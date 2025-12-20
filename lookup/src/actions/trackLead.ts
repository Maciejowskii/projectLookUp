"use server";

import { prisma } from "@/lib/prisma";

export async function trackPhoneReveal(companyId: string) {
  try {
    // Zapisujemy kliknięcie jako Lead z specjalnym statusem
    await prisma.lead.create({
       data: {
        companyId: companyId,
        // Wypełniamy pola wymagane przez schemat "fake" danymi dla analityki
        contactName: "Anonimowy (Kliknięcie)", 
        email: "click@analytics.local", 
        phone: "N/A",
        status: "PHONE_REVEAL", // To pozwoli nam odróżnić kliki od formularzy w Adminie
      },
    });
    console.log(`[Analytics] Zliczono kliknięcie telefonu dla firmy: ${companyId}`);
  } catch (error) {
    console.error("[Analytics] Błąd zapisu kliknięcia:", error);
    // Nie rzucamy błędu wyżej, żeby nie psuć UX użytkownikowi
  }
}
