'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getResend } from '@/lib/resend'
import { getNotificationEmails } from '@/lib/notificationEmails'

export async function claimCompanyAction(formData: FormData) {
	const cookieStore = await cookies()
	const userId = cookieStore.get('session_user_id')?.value

	if (!userId) {
		throw new Error('Musisz być zalogowany, aby przejąć firmę')
	}

	const companySlug = formData.get('companySlug') as string

	if (!companySlug) {
		throw new Error('Wprowadź slug firmy')
	}

	// Znajdź firmę po slug
	const company = await prisma.company.findFirst({
		where: { slug: companySlug },
	})

	if (!company) {
		throw new Error('Nie znaleziono firmy o podanym slug')
	}

	// Sprawdź czy użytkownik już ma tę firmę (nowa relacja CompanyUser)
	const existingRelation = await prisma.companyUser.findFirst({
		where: {
			userId,
			companyId: company.id,
		},
	})

	if (existingRelation) {
		throw new Error('Już posiadasz tę firmę')
	}

	// Sprawdź legacy companyId (dla użytkowników z poprzednią strukturą)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { companyId: true, email: true, name: true },
	})

	if (user?.companyId === company.id) {
		throw new Error('Już posiadasz tę firmę')
	}

	// Sprawdź czy firma ma już właściciela
	const existingOwners = await prisma.companyUser.findMany({
		where: { companyId: company.id },
	})

	if (existingOwners.length > 0) {
		// Firma ma właściciela - utwórz zgłoszenie (z danymi usera, żeby w Przejęcia było widać)
		await prisma.claimRequest.create({
			data: {
				companyId: company.id,
				userId: userId,
				fullName: user?.name || user?.email || 'Użytkownik z dashboardu',
				email: user?.email || 'brak@email.pl',
				phone: '-',
				status: 'PENDING',
				message: `Użytkownik ${userId} próbuje przejąć firmę z dashboardu.`,
			},
		})

		revalidatePath('/admin/zgloszenia')
		redirect('/dashboard?status=claim_pending')
	} else {
		// Firma nie ma właściciela - automatycznie przypisz
		await prisma.companyUser.create({
			data: {
				userId,
				companyId: company.id,
				role: 'OWNER',
			},
		})

		// Zweryfikuj firmę
		await prisma.company.update({
			where: { id: company.id },
			data: { isVerified: true },
		})

		// Zapisz przejęcie w ClaimRequest (status APPROVED), żeby widoczne w Przejęcia → Historia
		await prisma.claimRequest.create({
			data: {
				companyId: company.id,
				fullName: user?.name || user?.email || 'Użytkownik',
				email: user?.email || 'brak@email.pl',
				phone: '-',
				status: 'APPROVED',
				message: 'Przejęcie automatyczne (firma bez właściciela).',
			},
		})

		revalidatePath('/admin/zgloszenia')

		// Wyślij mail powitalny do użytkownika
		if (user?.email) {
			const resend = getResend()
			if (resend) {
				try {
					const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://www.katalogo.pl'
					const emailHtml = `
					<!DOCTYPE html>
					<html>
					<head>
						<style>
							body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
							.container { max-width: 600px; margin: 0 auto; padding: 20px; }
							.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
							.content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
							.message { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
							.button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
							.footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
						</style>
					</head>
					<body>
						<div class="container">
							<div class="header">
								<h1 style="margin: 0; font-size: 24px;">✅ Wizytówka została przejęta!</h1>
								<p style="margin: 10px 0 0; opacity: 0.9;">Gratulujemy przejęcia profilu firmy</p>
							</div>
							<div class="content">
								<div class="message">
									<p style="margin: 0 0 15px; font-size: 16px;">Dzień dobry ${user.name || user.email},</p>
									<p style="margin: 0 0 15px; font-size: 16px;">
										Dziękujemy za przejęcie wizytówki firmy <strong>${company.name}</strong>!
									</p>
									<p style="margin: 0 0 15px; font-size: 16px;">
										Twoja wizytówka została zweryfikowana i jest teraz w pełni Twoja. Możesz teraz zarządzać profilem, odpowiadać na opinie i edytować dane firmy.
									</p>
									<p style="margin: 0; font-size: 16px;">
										Jeśli chcesz zwiększyć widoczność swojej firmy w internecie i przyciągnąć więcej klientów, zapraszamy do współpracy z naszą agencją marketingową:
									</p>
								</div>
								<div style="text-align: center;">
									<a href="https://quickpick.pl/" class="button" target="_blank" rel="noopener noreferrer">
										Poznaj QuickPick - Agencja SEO/SEM →
									</a>
								</div>
							</div>
							<div class="footer">
								<p>To powiadomienie zostało wygenerowane automatycznie.</p>
								<p>Katalogo - Twój Katalog Firm</p>
							</div>
						</div>
					</body>
					</html>
				`

				await resend.emails.send({
					from: 'Katalogo <onboarding@resend.dev>',
					to: user.email,
					subject: `✅ Wizytówka ${company.name} została przejęta!`,
					html: emailHtml,
				})
				console.log(`✅ Mail powitalny wysłany do: ${user.email}`)
			} catch (error) {
				console.error(`❌ Błąd wysyłania maila powitalnego do ${user.email}:`, error)
			}
			} else {
				console.warn('⚠️ Brak RESEND_API_KEY - mail powitalny nie został wysłany')
			}
		}

		// Powiadom adminów (notification_emails) o bezpośrednim przejęciu – dane użytkownika
		const notifEmails = await getNotificationEmails()
		const resendNotif = getResend()
		if (resendNotif && notifEmails.length > 0) {
			const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://www.katalogo.pl'
			const fullName = user?.name || user?.email || 'Użytkownik'
			const email = user?.email || 'brak@email.pl'
			const adminHtml = `
				<!DOCTYPE html><html><head>
				<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;}
				.container{max-width:600px;margin:0 auto;padding:20px;}
				.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;}
				.content{background:#f8fafc;padding:24px;border:1px solid #e2e8f0;}
				.info-box{background:white;padding:16px;border-radius:8px;margin:12px 0;border-left:4px solid #3b82f6;}
				.label{font-size:11px;color:#64748b;text-transform:uppercase;}
				.value{font-size:15px;font-weight:600;color:#1e293b;margin-top:4px;}
				.footer{text-align:center;padding:16px;color:#64748b;font-size:12px;}
				</style></head><body>
				<div class="container">
					<div class="header"><h1 style="margin:0;font-size:20px;">🔄 Przejęcie bez weryfikacji</h1>
					<p style="margin:8px 0 0;opacity:0.9;">${company.name}</p></div>
					<div class="content">
						<div class="info-box"><div class="label">Przejął</div><div class="value">${fullName}</div></div>
						<div class="info-box"><div class="label">Email</div><div class="value"><a href="mailto:${email}">${email}</a></div></div>
						<div style="text-align:center;margin-top:16px;">
							<a href="${baseUrl}/admin/zgloszenia" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Panel admina →</a>
						</div>
					</div>
					<div class="footer"><p>Katalogo – powiadomienie automatyczne</p></div>
				</div></body></html>
			`
			for (const to of notifEmails) {
				try {
					await resendNotif.emails.send({
						from: 'Katalogo <onboarding@resend.dev>',
						to,
						subject: `🔄 Przejęcie (bez weryfikacji): ${company.name}`,
						html: adminHtml,
					})
					console.log(`✅ Powiadomienie do admina wysłane: ${to}`)
				} catch (e) {
					console.error(`❌ Błąd wysyłania do ${to}:`, e)
				}
			}
		}

		redirect(`/dashboard?companyId=${company.id}&status=claimed_successfully`)
	}
}
