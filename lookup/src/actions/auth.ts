// lookup/src/actions/auth.ts

"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// --- 1. LOGOWANIE ---
export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    throw new Error("Wypełnij wszystkie pola");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  if (!user.emailVerified) {
    throw new Error("Konto nieaktywne. Sprawdź e-mail weryfikacyjny.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Nieprawidłowy email lub hasło");
  }

  const cookieStore = await cookies();
  cookieStore.set("session_user_id", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  redirect("/dashboard");
}

// --- 2. WYLOGOWANIE ---
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session_user_id");
  redirect("/strefa-partnera");
}

// --- 3. USTAWIENIE HASŁA / WERYFIKACJA ---
export async function setPasswordAction(formData: FormData) {
  const token = formData.get("token") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!password || password.length < 8) {
    throw new Error("Hasło musi mieć min. 8 znaków");
  }

  const verificationData = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationData || verificationData.identifier !== email) {
    throw new Error("Nieprawidłowy lub nieważny token.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
      },
    }),
    prisma.verificationToken.delete({
      where: { token },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const cookieStore = await cookies();
    cookieStore.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  redirect("/dashboard");
}
