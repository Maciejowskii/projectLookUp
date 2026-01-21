"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function trackPhoneReveal(companyId: string, email?: string, phone?: string, description?: string) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id")?.value;

    let contactName = "Anonimowy";
    let leadEmail = email || "anonim@analytics.local";
    let leadPhone = phone || "N/A";
    let source = "PHONE_REVEAL";

    // Jeśli użytkownik jest zalogowany, pobierz jego dane
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user) {
        contactName = user.name || user.email.split("@")[0];
        leadEmail = user.email;
        source = "PHONE_REVEAL_LOGGED_IN";
      }
    }

    // Zapisujemy lead z danymi użytkownika
    await prisma.lead.create({
      data: {
        companyId: companyId,
        contactName,
        email: leadEmail,
        phone: leadPhone,
        description: description || null,
        source,
        status: "NEW",
      },
    });

    console.log(`[Analytics] Zapisano lead dla firmy: ${companyId}, email: ${leadEmail}`);
  } catch (error) {
    console.error("[Analytics] Błąd zapisu leada:", error);
    // Nie rzucamy błędu wyżej, żeby nie psuć UX użytkownikowi
  }
}

// Funkcja do zapisywania leadów przy rejestracji/logowaniu
export async function trackUserRegistration(userId: string, email: string, name?: string) {
  try {
    // Sprawdź czy użytkownik ma przypisane firmy
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        companies: {
          include: { company: true },
        },
        company: true,
      },
    });

    if (!user) return;

    const contactName = name || email.split("@")[0];

    // Utwórz lead dla każdej przypisanej firmy
    const companies = user.companies.map((cu) => cu.company);
    if (user.company && !companies.some((c) => c.id === user.companyId)) {
      companies.push(user.company);
    }

    // Jeśli użytkownik nie ma firm, utwórz lead ogólny (bez companyId będzie null, więc pomijamy)
    for (const company of companies) {
      await prisma.lead.create({
        data: {
          companyId: company.id,
          contactName,
          email: user.email,
          phone: "Nie podano",
          description: `Nowy użytkownik zarejestrował się i zarządza firmą: ${company.name}`,
          source: "REGISTRATION",
          status: "NEW",
        },
      });
    }

    console.log(`[Analytics] Zapisano lead rejestracji dla użytkownika: ${email}`);
  } catch (error) {
    console.error("[Analytics] Błąd zapisu leada rejestracji:", error);
  }
}

// Funkcja do zapisywania leadów przy logowaniu (opcjonalnie, tylko jeśli użytkownik się zalogował po długiej przerwie)
export async function trackUserLogin(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, updatedAt: true },
    });

    if (!user) return;

    // Opcjonalnie: można dodać logikę sprawdzającą, czy to pierwsze logowanie po długiej przerwie
    // Na razie pomijamy, aby nie zaśmiecać bazy
  } catch (error) {
    console.error("[Analytics] Błąd zapisu leada logowania:", error);
  }
}
