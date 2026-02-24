'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { getResend } from '@/lib/resend'
import { getNotificationEmails } from '@/lib/notificationEmails'
import {
	validateNIP,
	validatePostalCode,
	validateCityAndPostalCodeStrict,
	formatNIP,
	formatPostalCode,
	getCitiesForPostalCode,
} from '@/lib/validation'

export type AddCompanyResult =
	| { success: false; error: string; citySuggestions?: string[] }
	| { success: true; redirectUrl: string }

export async function createCompanyAction(formData: FormData): Promise<AddCompanyResult> {
	const tenant = await prisma.tenant.findFirst()
	if (!tenant) {
		return { success: false, error: 'Błąd krytyczny: Brak konfiguracji serwisu.' }
	}

	const rawData = {
		name: formData.get('name') as string,
		nip: formData.get('nip') as string,
		email: formData.get('email') as string,
		phone: formData.get('phone') as string,
		city: formData.get('city') as string,
		zip: formData.get('zip') as string,
		categoryId: formData.get('categoryId') as string,
	}

	if (!rawData.name?.trim()) {
		return { success: false, error: 'Nazwa firmy jest wymagana.' }
	}
	if (!rawData.categoryId) {
		return { success: false, error: 'Wybierz kategorię!' }
	}
	if (!rawData.email?.trim()) {
		return { success: false, error: 'Email jest wymagany.' }
	}
	if (!rawData.phone?.trim()) {
		return { success: false, error: 'Numer telefonu jest wymagany.' }
	}

	const nipValidation = validateNIP(rawData.nip)
	if (!nipValidation.valid) {
		return { success: false, error: nipValidation.error || 'Nieprawidłowy NIP' }
	}

	const zipValidation = validatePostalCode(rawData.zip)
	if (!zipValidation.valid) {
		return { success: false, error: zipValidation.error || 'Nieprawidłowy kod pocztowy' }
	}

	const cityValidation = await validateCityAndPostalCodeStrict(rawData.city, rawData.zip)
	if (!cityValidation.valid) {
		let suggestions = cityValidation.suggestions || []
		if (suggestions.length === 0) {
			suggestions = await getCitiesForPostalCode(rawData.zip)
		}
		return {
			success: false,
			error: cityValidation.error || 'Miasto i kod pocztowy nie pasują do siebie.',
			citySuggestions: suggestions,
		}
	}

	const formattedNIP = rawData.nip ? formatNIP(rawData.nip) : null
	const formattedZip = formatPostalCode(rawData.zip)
	const normalizedCity = cityValidation.normalizedCity || rawData.city.trim()

	const slug = rawData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)

	try {
		const existingUser = await prisma.user.findUnique({
			where: { email: rawData.email },
		})
		const isNewUser = !existingUser

		let tempPassword: string | null = null
		let hashedPassword: string | null = null
		if (isNewUser) {
			tempPassword = crypto.randomBytes(4).toString('hex')
			hashedPassword = await bcrypt.hash(tempPassword, 10)
		}

		let userId: string = ''

		await prisma.$transaction(async tx => {
			const newCompany = await tx.company.create({
				data: {
					name: rawData.name,
					slug,
					nip: formattedNIP,
					email: rawData.email,
					phone: rawData.phone,
					city: normalizedCity,
					zip: formattedZip,
					tenantId: tenant.id,
					categoryId: rawData.categoryId,
					isVerified: false,
				},
			})

			if (isNewUser) {
				const user = await tx.user.create({
					data: {
						email: rawData.email,
						password: hashedPassword!,
						companyId: newCompany.id,
						emailVerified: new Date(),
					},
				})
				userId = user.id
			} else {
				userId = existingUser.id
			}

			await tx.companyUser.create({
				data: {
					userId,
					companyId: newCompany.id,
					role: 'OWNER',
				},
			})

			await tx.claimRequest.create({
				data: {
					companyId: newCompany.id,
					userId,
					fullName: rawData.name,
					email: rawData.email,
					phone: rawData.phone || '-',
					status: 'PENDING',
					message: isNewUser
						? 'Nowa wizytówka utworzona przez formularz rejestracji.'
						: 'Kolejna wizytówka dodana do istniejącego konta.',
				},
			})
		})

		const cookieStore = await cookies()
		cookieStore.set('session_user_id', userId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})

		sendAdminNotification(rawData, normalizedCity, formattedZip).catch(err => {
			console.error('Error sending admin notification:', err)
		})

		if (isNewUser) {
			return {
				success: true,
				redirectUrl: `/sukces-rejestracji?email=${encodeURIComponent(rawData.email)}&p=${encodeURIComponent(tempPassword!)}`,
			}
		}

		return {
			success: true,
			redirectUrl: '/dashboard?status=company_added',
		}
	} catch (error: unknown) {
		console.error('Error creating company:', error)

		const prismaError = error as { code?: string }
		if (prismaError?.code === 'P2002') {
			return { success: false, error: 'Firma z tym NIP-em lub adresem email już istnieje w bazie.' }
		}

		return { success: false, error: 'Wystąpił błąd podczas tworzenia firmy. Spróbuj ponownie.' }
	}
}

async function sendAdminNotification(
	rawData: { name: string; nip: string; email: string; phone: string; categoryId: string },
	normalizedCity: string,
	formattedZip: string,
) {
	const category = await prisma.category.findUnique({
		where: { id: rawData.categoryId },
		select: { name: true },
	})
	const notifEmails = await getNotificationEmails()
	const resendNotif = getResend()

	if (!resendNotif || notifEmails.length === 0) {
		if (!resendNotif) {
			console.warn('⚠️  RESEND_API_KEY nie jest ustawione - powiadomienia email nie będą wysyłane')
		}
		if (notifEmails.length === 0) {
			console.warn(
				'⚠️  Brak adresów email w ustawieniach admina (notification_emails) - powiadomienia nie będą wysyłane',
			)
		}
		return
	}

	const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'https://www.katalogo.pl'
	const adminHtml = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				body {
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
					line-height: 1.6;
					color: #333;
					margin: 0;
					padding: 0;
					background-color: #f3f4f6;
				}
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header {
					background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
					color: white;
					padding: 30px 24px;
					border-radius: 12px 12px 0 0;
					text-align: center;
				}
				.header h1 { margin: 0; font-size: 24px; font-weight: 700; }
				.header p { margin: 8px 0 0; opacity: 0.95; font-size: 16px; }
				.content {
					background: #f8fafc;
					padding: 30px 24px;
					border: 1px solid #e2e8f0;
					border-top: none;
				}
				.info-box {
					background: white;
					padding: 18px 20px;
					border-radius: 8px;
					margin: 12px 0;
					border-left: 4px solid #8b5cf6;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
				}
				.label {
					font-size: 11px;
					color: #64748b;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					font-weight: 600;
					margin-bottom: 6px;
				}
				.value { font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 4px; }
				.value a { color: #8b5cf6; text-decoration: none; }
				.value a:hover { text-decoration: underline; }
				.button-container { text-align: center; margin-top: 24px; }
				.button {
					display: inline-block;
					background: #8b5cf6;
					color: white;
					padding: 14px 28px;
					border-radius: 8px;
					text-decoration: none;
					font-weight: 600;
					font-size: 15px;
				}
				.button:hover { background: #7c3aed; }
				.footer {
					text-align: center;
					padding: 20px 16px;
					color: #64748b;
					font-size: 12px;
					background: #f8fafc;
					border: 1px solid #e2e8f0;
					border-top: none;
					border-radius: 0 0 12px 12px;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>Nowa wizytówka</h1>
					<p>${rawData.name}</p>
				</div>
				<div class="content">
					<div class="info-box">
						<div class="label">NAZWA FIRMY</div>
						<div class="value">${rawData.name}</div>
					</div>
					<div class="info-box">
						<div class="label">NIP</div>
						<div class="value">${rawData.nip || '—'}</div>
					</div>
					<div class="info-box">
						<div class="label">EMAIL</div>
						<div class="value"><a href="mailto:${rawData.email}">${rawData.email}</a></div>
					</div>
					<div class="info-box">
						<div class="label">TELEFON</div>
						<div class="value">${rawData.phone}</div>
					</div>
					<div class="info-box">
						<div class="label">MIASTO</div>
						<div class="value">${normalizedCity}</div>
					</div>
					<div class="info-box">
						<div class="label">KOD POCZTOWY</div>
						<div class="value">${formattedZip}</div>
					</div>
					<div class="info-box">
						<div class="label">BRANŻA</div>
						<div class="value">${category?.name ?? '—'}</div>
					</div>
					<div class="button-container">
						<a href="${baseUrl}/admin/zgloszenia" class="button">Panel admina →</a>
					</div>
				</div>
				<div class="footer">
					<p>Katalogo – powiadomienie automatyczne</p>
				</div>
			</div>
		</body>
		</html>
	`

	console.log(`Wysyłanie powiadomień o nowej wizytówce do ${notifEmails.length} adresów...`)
	const sendPromises = notifEmails.map(async (to: string) => {
		try {
			await resendNotif.emails.send({
				from: 'Katalogo <onboarding@resend.dev>',
				to: to.trim(),
				subject: `Nowa wizytówka: ${rawData.name}`,
				html: adminHtml,
			})
			console.log(`Powiadomienie do admina wysłane: ${to}`)
			return { success: true, email: to }
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Unknown error'
			console.error(`Błąd wysyłania do ${to}:`, msg)
			return { success: false, email: to, error: msg }
		}
	})

	const results = await Promise.allSettled(sendPromises)
	const successful = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length
	const failed = results.length - successful

	if (failed > 0) {
		console.warn(`${failed} z ${results.length} emaili nie zostało wysłanych`)
	} else {
		console.log(`Wszystkie powiadomienia (${successful}) zostały wysłane pomyślnie`)
	}
}
