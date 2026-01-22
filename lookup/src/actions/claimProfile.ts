// lookup/src/actions/claimProfile.ts

"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { getNotificationEmails } from "@/lib/notificationEmails";

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

  // Wyślij powiadomienia email
  const resend = getResend();
  const notificationEmails = await getNotificationEmails();
  
  if (resend && notificationEmails.length > 0) {
    const baseUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
          .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 16px; font-weight: 600; color: #1e293b; margin-top: 4px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🔥 Nowe zgłoszenie przejęcia</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Ktoś chce przejąć firmę w Twoim portalu</p>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="label">Firma</div>
              <div class="value">${claim.company.name}</div>
            </div>
            <div class="info-box">
              <div class="label">Zgłaszający</div>
              <div class="value">${fullName}</div>
            </div>
            <div class="info-box">
              <div class="label">Email</div>
              <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            <div class="info-box">
              <div class="label">Telefon</div>
              <div class="value"><a href="tel:${phone}">${phone}</a></div>
            </div>
            <div style="text-align: center;">
              <a href="${baseUrl}/admin/zgloszenia" class="button">
                Przejdź do panelu admina →
              </a>
            </div>
          </div>
          <div class="footer">
            <p>To powiadomienie zostało wygenerowane automatycznie.</p>
            <p>Katalogo Admin Panel</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Wyślij email do każdego odbiorcy
    const sendPromises = notificationEmails.map(async (recipientEmail) => {
      try {
        await resend.emails.send({
          from: "Katalogo System <onboarding@resend.dev>",
          to: recipientEmail,
          subject: `🔥 Nowe zgłoszenie przejęcia: ${claim.company.name}`,
          html: emailHtml,
        });
        console.log(`✅ Powiadomienie wysłane do: ${recipientEmail}`);
      } catch (error) {
        console.error(`❌ Błąd wysyłania do ${recipientEmail}:`, error);
      }
    });

    // Czekaj na wszystkie wysyłki (ale nie blokuj przekierowania)
    Promise.all(sendPromises).catch((error) => {
      console.error("Błąd wysyłania powiadomień:", error);
    });
  } else {
    console.warn("⚠️ Brak skonfigurowanych emaili powiadomień lub brak klucza Resend API");
  }

  revalidatePath("/admin/zgloszenia");
  redirect(`/przejmij/sukces?id=${companyId}`);
}
