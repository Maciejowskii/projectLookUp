"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createLead(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const contactName = formData.get("contactName") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const subdomain = formData.get("subdomain") as string;
  const slug = formData.get("slug") as string;

  if (!companyId || !contactName || !phone) {
    return { success: false, message: "Wypełnij wymagane pola!" };
  }

  try {
    // 1. Zapisujemy leada w bazie
    await prisma.lead.create({
      data: {
        companyId,
        contactName,
        phone,
        email,
      },
    });

    // 2. TUTAJ w przyszłości dodasz strzał do Webhooka (np. Make.com)
    // await fetch("https://hook.us1.make.com/...", { ... })

    console.log("✅ Nowy lead dla firmy ID:", companyId);

    // 3. Odświeżamy stronę, żeby pokazać komunikat sukcesu (opcjonalne)
    revalidatePath(`/firma/${slug}`);

    return {
      success: true,
      message: "Zgłoszenie wysłane! Oddzwonimy wkrótce.",
    };
  } catch (error) {
    console.error("Błąd zapisu leada:", error);
    return { success: false, message: "Wystąpił błąd serwera." };
  }
}
