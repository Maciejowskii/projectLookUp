"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    // W prawdziwej aplikacji tutaj zwracamy błąd do wyświetlenia w formularzu
    throw new Error("Wypełnij wszystkie pola");
  }

  // 1. Szukamy użytkownika w bazie
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true }, // Pobieramy też dane firmy
  });

  if (!user) {
    // Dla bezpieczeństwa nie mówimy "nie ma takiego maila", tylko ogólnie
    throw new Error("Nieprawidłowy email lub hasło");
  }

  // 2. Sprawdzamy hasło (porównujemy wpisane z zahaszowanym w bazie)
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  // 3. Ustawiamy sesję (Cookie)
  // W prostym MVP trzymamy ID użytkownika w ciasteczku.
  // W produkcji warto użyć JWT lub biblioteki jak Lucia Auth / NextAuth.
  const cookieStore = await cookies(); // Next.js 15 wymaga await przy cookies()

  // Ustawiamy ciasteczko na 7 dni
  cookieStore.set("session_user_id", user.id, {
    httpOnly: true, // JavaScript nie ma dostępu (chroni przed XSS)
    secure: process.env.NODE_ENV === "production", // Tylko HTTPS w produkcji
    maxAge: 60 * 60 * 24 * 7, // 7 dni
    path: "/",
  });

  // 4. Przekierowujemy do panelu (Dashboardu)
  // Musimy go zaraz stworzyć!
  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session_user_id");
  redirect("/strefa-partnera");
}
