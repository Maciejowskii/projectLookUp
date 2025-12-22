// lookup/src/actions/claimProfile.ts

"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Missing RESEND_API_KEY");
    return null;
  }
  return new Resend(key);
}

export async function submitClaimRequest(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;

  if (!companyId || !email || !phone || !fullName) {
    throw new Error("Wypełnij wymagane pola");
  }

  const claim = await prisma.claimRequest.create({
    data: {
      companyId,
      fullName,
      email,
      phone,
      status: "PENDING",
    },
    include: {
      company: true,
    },
  });

  const resend = getResend();
  if (resend && process.env.ADMIN_EMAIL) {
    try {
      await resend.emails.send({
        from: "System <onboarding@resend.dev>",
        to: process.env.ADMIN_EMAIL,
        subject: `🔥 Nowe zgłoszenie przejęcia: ${claim.company.name}`,
        html: `
        <h1>Ktoś chce przejąć firmę!</h1>
        <p><strong>Firma:</strong> ${claim.company.name}</p>
        <p><strong>Osoba:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${phone}</p>
        <br />
        <a href="${
          process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"
        }/admin/zgloszenia">
          Kliknij tutaj, aby zatwierdzić lub odrzucić
        </a>
      `,
      });
    } catch (error) {
      console.error("Błąd wysyłania maila:", error);
    }
  }

  redirect(`/przejmij/sukces?id=${companyId}`);
}
