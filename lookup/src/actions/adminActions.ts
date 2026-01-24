'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { checkAdminAuth, logAdminAction } from '@/lib/adminAuth'
import { getResend } from '@/lib/resend'
import { getNotificationEmails } from '@/lib/notificationEmails'

export async function approveClaim(claimId: string) {
	const admin = await checkAdminAuth()

	// 1. Pobierz zgłoszenie
	const claim = await prisma.claimRequest.findUnique({
		where: { id: claimId },
		include: { company: { select: { name: true } } },
	})

	if (!claim) throw new Error('Nie znaleziono zgłoszenia')

	// 2. Zaktualizuj status zgłoszenia
	await prisma.claimRequest.update({
		where: { id: claimId },
		data: { status: 'APPROVED' },
	})

	// 3. Znajdź użytkownika po emailu lub userId z claim (jeśli istnieje konto)
	let user = null
	if (claim.userId) {
		user = await prisma.user.findUnique({
			where: { id: claim.userId },
			select: { id: true, companyId: true },
		})
	}
	if (!user) {
		user = await prisma.user.findUnique({
			where: { email: claim.email },
			select: { id: true, companyId: true },
		})
	}

	// 4. Jeśli użytkownik istnieje, utwórz relację CompanyUser (nowy system)
	if (user) {
		// Sprawdź czy już istnieje relacja CompanyUser
		const existingCompanyUser = await prisma.companyUser.findFirst({
			where: {
				userId: user.id,
				companyId: claim.companyId,
			},
		})

		if (!existingCompanyUser) {
			// Utwórz nową relację CompanyUser
			await prisma.companyUser.create({
				data: {
					userId: user.id,
					companyId: claim.companyId,
					role: 'OWNER',
				},
			})
		}

		// Legacy: zaktualizuj też user.companyId dla kompatybilności wstecznej
		if (!user.companyId) {
			await prisma.user.update({
				where: { id: user.id },
				data: { companyId: claim.companyId },
			})
		} else if (user.companyId !== claim.companyId) {
			// Użytkownik ma już inną firmę - nie nadpisujemy (bezpieczeństwo danych)
			console.log(`⚠️ User ${user.id} already has company ${user.companyId}, cannot assign ${claim.companyId}`)
		}
	}

	// 5. Pobierz firmę, żeby sprawdzić czy ma już email
	const company = await prisma.company.findUnique({
		where: { id: claim.companyId },
		select: { email: true },
	})

	// 6. Zaktualizuj firmę (zweryfikuj ją)
	const updateData: { isVerified: boolean; email?: string } = {
		isVerified: true,
	}

	if (claim.email && (!company || !company.email)) {
		updateData.email = claim.email
	}

	await prisma.company.update({
		where: { id: claim.companyId },
		data: updateData,
	})

	// Audit log
	await logAdminAction(admin.id, 'APPROVE_CLAIM', claimId, {
		companyId: claim.companyId,
		companyName: claim.company?.name,
		claimEmail: claim.email,
	})

	// Wyślij mail powitalny do użytkownika
	if (claim.email) {
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
								<p style="margin: 0 0 15px; font-size: 16px;">Dzień dobry ${claim.fullName || claim.email},</p>
								<p style="margin: 0 0 15px; font-size: 16px;">
									Dziękujemy za przejęcie wizytówki firmy <strong>${claim.company?.name || 'Twojej firmy'}</strong>!
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
				to: claim.email,
				subject: `✅ Wizytówka ${claim.company?.name || 'firmy'} została przejęta!`,
				html: emailHtml,
			})
			console.log(`✅ Mail powitalny wysłany do: ${claim.email}`)
			} catch (error) {
				console.error(`❌ Błąd wysyłania maila powitalnego do ${claim.email}:`, error)
			}
		} else {
			console.warn('⚠️ Brak RESEND_API_KEY - mail powitalny nie został wysłany')
		}
	}

	// Powiadom adminów (notification_emails) o zatwierdzonym przejęciu – wszystkie dane zgłaszającego
	const notifEmails = await getNotificationEmails()
	const resendNotif = getResend()
	if (resendNotif && notifEmails.length > 0) {
		const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://www.katalogo.pl'
		const adminHtml = `
			<!DOCTYPE html><html><head>
			<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;}
			.container{max-width:600px;margin:0 auto;padding:20px;}
			.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;}
			.content{background:#f8fafc;padding:24px;border:1px solid #e2e8f0;}
			.info-box{background:white;padding:16px;border-radius:8px;margin:12px 0;border-left:4px solid #10b981;}
			.label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;}
			.value{font-size:15px;font-weight:600;color:#1e293b;margin-top:4px;}
			.footer{text-align:center;padding:16px;color:#64748b;font-size:12px;}
			</style></head><body>
			<div class="container">
				<div class="header"><h1 style="margin:0;font-size:20px;">✅ Wizytówka przejęta (zatwierdzona)</h1>
				<p style="margin:8px 0 0;opacity:0.9;">${claim.company?.name ?? 'Firma'}</p></div>
				<div class="content">
					<div class="info-box"><div class="label">Zgłaszający</div><div class="value">${claim.fullName}</div></div>
					<div class="info-box"><div class="label">Email</div><div class="value"><a href="mailto:${claim.email}">${claim.email}</a></div></div>
					<div class="info-box"><div class="label">Telefon</div><div class="value">${claim.phone}</div></div>
					<div style="text-align:center;margin-top:16px;">
						<a href="${baseUrl}/admin/zgloszenia" style="display:inline-block;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Panel admina →</a>
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
					subject: `✅ Przejęcie zatwierdzone: ${claim.company?.name ?? 'firma'}`,
					html: adminHtml,
				})
				console.log(`✅ Powiadomienie do admina wysłane: ${to}`)
			} catch (e) {
				console.error(`❌ Błąd wysyłania do ${to}:`, e)
			}
		}
	}

	revalidatePath('/admin/zgloszenia')
	revalidatePath(`/firma`)
}

export async function rejectClaim(claimId: string) {
	const admin = await checkAdminAuth()

	const claim = await prisma.claimRequest.findUnique({
		where: { id: claimId },
		include: { company: { select: { name: true } } },
	})

	await prisma.claimRequest.update({
		where: { id: claimId },
		data: { status: 'REJECTED' },
	})

	// Audit log
	await logAdminAction(admin.id, 'REJECT_CLAIM', claimId, {
		companyId: claim?.companyId,
		companyName: claim?.company?.name,
	})

	revalidatePath('/admin/zgloszenia')
}

export async function deleteReview(reviewId: string) {
	const admin = await checkAdminAuth()

	const review = await prisma.review.findUnique({
		where: { id: reviewId },
		include: { company: { select: { name: true } } },
	})

	await prisma.review.delete({
		where: { id: reviewId },
	})

	// Audit log
	await logAdminAction(admin.id, 'DELETE_REVIEW', reviewId, {
		companyId: review?.companyId,
		companyName: review?.company?.name,
		userName: review?.userName,
		rating: review?.rating,
	})

	revalidatePath('/admin/reviews')
}

// --- KATEGORIE ---

export async function createCategory(formData: FormData) {
	const admin = await checkAdminAuth()

	const name = formData.get('name') as string

	// Prosty slug generator
	const slug = name
		.toLowerCase()
		.replace(/ł/g, 'l')
		.replace(/ś/g, 's')
		.replace(/ć/g, 'c')
		.replace(/ą/g, 'a')
		.replace(/ę/g, 'e')
		.replace(/ń/g, 'n')
		.replace(/ź/g, 'z')
		.replace(/ż/g, 'z')
		.replace(/ó/g, 'o')
		.replace(/[^a-z0-9]/g, '-')
		.replace(/-+/g, '-')

	const defaultTenant = await prisma.tenant.findFirst()
	if (!defaultTenant) throw new Error('Brak Tenanta w bazie!')

	const category = await prisma.category.create({
		data: {
			name,
			slug,
			tenantId: defaultTenant.id,
		},
	})

	// Audit log
	await logAdminAction(admin.id, 'CREATE_CATEGORY', category.id, {
		name,
		slug,
	})

	revalidatePath('/admin/categories')
}

export async function deleteCategory(id: string) {
	const admin = await checkAdminAuth()

	const category = await prisma.category.findUnique({
		where: { id },
		select: { name: true },
	})

	await prisma.category.delete({ where: { id } })

	// Audit log
	await logAdminAction(admin.id, 'DELETE_CATEGORY', id, {
		name: category?.name,
	})

	revalidatePath('/admin/categories')
}

// --- USTAWIENIA GLOBALNE ---

export async function updateSettings(formData: FormData) {
	const admin = await checkAdminAuth()

	const entries = Array.from(formData.entries())
	const changes: Record<string, string> = {}

	for (const [key, value] of entries) {
		if (!key.startsWith('$')) {
			changes[key] = value as string
			await prisma.setting.upsert({
				where: { key },
				update: { value: value as string },
				create: { key, value: value as string },
			})
		}
	}

	// Audit log
	await logAdminAction(admin.id, 'UPDATE_SETTINGS', undefined, { changes })

	revalidatePath('/admin/settings')
}

export async function updateCategory(formData: FormData) {
	const admin = await checkAdminAuth()

	const id = formData.get('id') as string
	const name = formData.get('name') as string

	if (!id || !name || name.trim().length < 2) {
		throw new Error('Nazwa kategorii musi mieć minimum 2 znaki')
	}

	const oldCategory = await prisma.category.findUnique({
		where: { id },
		select: { name: true },
	})

	await prisma.category.update({
		where: { id },
		data: {
			name: name.trim(),
			slug: name
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-'),
		},
	})

	// Audit log
	await logAdminAction(admin.id, 'UPDATE_CATEGORY', id, {
		oldName: oldCategory?.name,
		newName: name.trim(),
	})

	revalidatePath('/admin/categories')
}

// --- ZARZĄDZANIE FIRMAMI ---

export async function deleteCompany(companyId: string) {
	const admin = await checkAdminAuth()

	const company = await prisma.company.findUnique({
		where: { id: companyId },
		select: { name: true, nip: true },
	})

	if (!company) throw new Error('Firma nie istnieje')

	// Usuń powiązane dane
	await prisma.$transaction([
		prisma.lead.deleteMany({ where: { companyId } }),
		prisma.review.deleteMany({ where: { companyId } }),
		prisma.claimRequest.deleteMany({ where: { companyId } }),
		prisma.companyUser.deleteMany({ where: { companyId } }),
		prisma.company.delete({ where: { id: companyId } }),
	])

	// Audit log
	await logAdminAction(admin.id, 'DELETE_COMPANY', companyId, {
		name: company.name,
		nip: company.nip,
	})

	revalidatePath('/admin/companies')
}

export async function verifyCompany(companyId: string) {
	const admin = await checkAdminAuth()

	const company = await prisma.company.findUnique({
		where: { id: companyId },
		select: { name: true, isVerified: true },
	})

	if (!company) throw new Error('Firma nie istnieje')

	await prisma.company.update({
		where: { id: companyId },
		data: { isVerified: !company.isVerified },
	})

	// Audit log
	await logAdminAction(admin.id, company.isVerified ? 'UNVERIFY_COMPANY' : 'VERIFY_COMPANY', companyId, {
		name: company.name,
	})

	revalidatePath('/admin/companies')
}

export async function setCompanyPremium(companyId: string, isPremium: boolean) {
	const admin = await checkAdminAuth()

	const company = await prisma.company.findUnique({
		where: { id: companyId },
		select: { name: true },
	})

	if (!company) throw new Error('Firma nie istnieje')

	await prisma.company.update({
		where: { id: companyId },
		data: {
			plan: isPremium ? 'PREMIUM' : 'FREE',
			premiumUntil: isPremium ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
		},
	})

	// Audit log
	await logAdminAction(admin.id, isPremium ? 'SET_PREMIUM' : 'REMOVE_PREMIUM', companyId, {
		name: company.name,
	})

	revalidatePath('/admin/companies')
}

// --- IMPORT CSV ---

export async function importLeadsCSV(formData: FormData) {
	const admin = await checkAdminAuth()

	const file = formData.get('file') as File
	if (!file) {
		return { success: false, message: 'Nie wybrano pliku' }
	}

	try {
		const text = await file.text()
		const lines = text.split('\n').filter(line => line.trim())
		
		if (lines.length < 2) {
			return { success: false, message: 'Plik CSV jest pusty lub zawiera tylko nagłówek' }
		}

		// Pomijamy nagłówek (pierwsza linia)
		const dataLines = lines.slice(1)
		let imported = 0
		let errors = 0

		// Pobierz wszystkie firmy do mapowania nazw na ID
		const companies = await prisma.company.findMany({
			select: { id: true, name: true, slug: true },
		})
		const companyMap = new Map<string, string>()
		companies.forEach(c => {
			companyMap.set(c.name.toLowerCase(), c.id)
			companyMap.set(c.slug.toLowerCase(), c.id)
		})

		for (const line of dataLines) {
			try {
				// Parsuj CSV (obsługa cudzysłowów)
				const values: string[] = []
				let current = ''
				let inQuotes = false

				for (let i = 0; i < line.length; i++) {
					const char = line[i]
					if (char === '"') {
						if (inQuotes && line[i + 1] === '"') {
							current += '"'
							i++
						} else {
							inQuotes = !inQuotes
						}
					} else if (char === ',' && !inQuotes) {
						values.push(current.trim())
						current = ''
					} else {
						current += char
					}
				}
				values.push(current.trim())

				// Format: Data, Imię/Nazwa, Email, Telefon, Firma (nazwa lub ID), Opis, Źródło, Status
				if (values.length < 4) continue // Minimum: Data, Imię, Email, Telefon

				const [dateStr, contactName, email, phone, companyNameOrId, description, source, status] = values

				if (!contactName || !email || !phone) continue // Wymagane pola

				// Znajdź companyId
				let companyId: string | null = null
				if (companyNameOrId) {
					// Spróbuj znaleźć po ID
					const companyById = companies.find(c => c.id === companyNameOrId)
					if (companyById) {
						companyId = companyById.id
					} else {
						// Spróbuj znaleźć po nazwie
						const companyByName = companyMap.get(companyNameOrId.toLowerCase())
						if (companyByName) {
							companyId = companyByName
						}
					}
				}

				// Jeśli nie znaleziono firmy, pomiń ten lead (lub utwórz bez firmy - ale to wymaga zmiany schematu)
				if (!companyId) {
					errors++
					continue
				}

				// Parsuj datę
				let createdAt = new Date()
				if (dateStr) {
					const parsedDate = new Date(dateStr)
					if (!isNaN(parsedDate.getTime())) {
						createdAt = parsedDate
					}
				}

				// Utwórz lead
				await prisma.lead.create({
					data: {
						companyId,
						contactName: contactName || 'Nie podano',
						email: email || 'brak@email.pl',
						phone: phone || 'Nie podano',
						description: description || null,
						source: source || 'CSV_IMPORT',
						status: status || 'NEW',
						createdAt,
					},
				})

				imported++
			} catch (error) {
				console.error('Błąd parsowania linii CSV:', error)
				errors++
			}
		}

		// Audit log
		await logAdminAction(admin.id, 'IMPORT_LEADS_CSV', undefined, {
			imported,
			errors,
			fileName: file.name,
		})

		revalidatePath('/admin/leads')

		return {
			success: true,
			message: `Import zakończony pomyślnie`,
			imported,
			errors,
		}
	} catch (error: any) {
		console.error('Błąd importu CSV:', error)
		return {
			success: false,
			message: `Błąd podczas importu: ${error.message || 'Nieznany błąd'}`,
		}
	}
}
