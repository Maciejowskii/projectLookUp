"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { resend } from "@/lib/resend"; // <--- Import

export async function submitClaimRequest(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;

  if (!companyId || !email || !phone || !fullName) {
    throw new Error("Wypełnij wymagane pola");
  }

  // 1. Zapisz w bazie (to już miałeś)
  const claim = await prisma.claimRequest.create({
    data: {
      companyId,
      fullName,
      email,
      phone,
      status: "PENDING",
    },
    include: {
      company: true, // Pobieramy dane firmy do maila
    },
  });

  // 2. WYŚLIJ EMAIL DO ADMINA (NOWOŚĆ)
  try {
    await resend.emails.send({
      from: "System <onboarding@resend.dev>", // Na początku używaj domyślnego nadawcy Resend
      to: process.env.ADMIN_EMAIL as string, // Twój email z .env
      subject: `🔥 Nowe zgłoszenie przejęcia: ${claim.company.name}`,
      html: `
        <h1>Ktoś chce przejąć firmę!</h1>
        <p><strong>Firma:</strong> ${claim.company.name}</p>
        <p><strong>Osoba:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${phone}</p>
        <br />
        <a href="http://localhost:3000/admin/zgloszenia">Kliknij tutaj, aby zatwierdzić lub odrzucić</a>
      `,
    });
  } catch (error) {
    console.error("Błąd wysyłania maila:", error);
    // Nie blokujemy użytkownika, jeśli mail nie wyjdzie, po prostu logujemy błąd
  }

  redirect(`/przejmij/sukces?id=${companyId}`);
}
