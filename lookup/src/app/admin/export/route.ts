import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

export async function GET() {
	try {
		await checkAdminAuth()

		// Pobierz wszystkie dane
		const [companies, claims, leads, reviews] = await Promise.all([
			prisma.company.findMany({
				include: {
					category: true,
					_count: {
						select: {
							leads: true,
							reviews: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			}),
			prisma.claimRequest.findMany({
				include: {
					company: {
						select: {
							name: true,
							slug: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			}),
			prisma.lead.findMany({
				include: {
					company: {
						select: {
							name: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			}),
			prisma.review.findMany({
				include: {
					company: {
						select: {
							name: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			}),
		])

		// Funkcja pomocnicza do escape CSV
		const escapeCSV = (value: any): string => {
			if (value === null || value === undefined) return ''
			const str = String(value)
			if (str.includes(',') || str.includes('"') || str.includes('\n')) {
				return `"${str.replace(/"/g, '""')}"`
			}
			return str
		}

		// Formatuj datę
		const formatDate = (date: Date | null): string => {
			if (!date) return ''
			return new Date(date).toLocaleString('pl-PL')
		}

		// Generuj CSV dla firm
		let csv = '=== FIRMY ===\n'
		csv += 'ID,Nazwa,Slug,Kategoria,NIP,Email,Telefon,Miasto,Plan,Premium do,Zweryfikowana,Utworzona,Leady,Opinie\n'
		for (const company of companies) {
			csv += [
				escapeCSV(company.id),
				escapeCSV(company.name),
				escapeCSV(company.slug),
				escapeCSV(company.category.name),
				escapeCSV(company.nip),
				escapeCSV(company.email),
				escapeCSV(company.phone),
				escapeCSV(company.city),
				escapeCSV(company.plan),
				escapeCSV(company.premiumUntil ? formatDate(company.premiumUntil) : ''),
				escapeCSV(company.isVerified ? 'Tak' : 'Nie'),
				escapeCSV(formatDate(company.createdAt)),
				escapeCSV(company._count.leads),
				escapeCSV(company._count.reviews),
			].join(',') + '\n'
		}

		// Generuj CSV dla przejęć
		csv += '\n=== PRZEJĘCIA FIRM ===\n'
		csv += 'ID,Firma,Email,Zgłaszający,Telefon,Status,Data utworzenia,Wiadomość\n'
		for (const claim of claims) {
			csv += [
				escapeCSV(claim.id),
				escapeCSV(claim.company?.name || 'Firma usunięta'),
				escapeCSV(claim.email),
				escapeCSV(claim.fullName),
				escapeCSV(claim.phone),
				escapeCSV(claim.status),
				escapeCSV(formatDate(claim.createdAt)),
				escapeCSV(claim.message || ''),
			].join(',') + '\n'
		}

		// Generuj CSV dla nowych firm (utworzonych przez formularz)
		const newCompanies = claims.filter(c => c.message?.includes('Nowa wizytówka'))
		csv += '\n=== NOWE WIZYTÓWKI (Utworzone przez formularz) ===\n'
		csv += 'ID,Firma,Email,Zgłaszający,Telefon,Status,Data utworzenia\n'
		for (const claim of newCompanies) {
			csv += [
				escapeCSV(claim.id),
				escapeCSV(claim.company?.name || 'Firma usunięta'),
				escapeCSV(claim.email),
				escapeCSV(claim.fullName),
				escapeCSV(claim.phone),
				escapeCSV(claim.status),
				escapeCSV(formatDate(claim.createdAt)),
			].join(',') + '\n'
		}

		// Generuj CSV dla leadów
		csv += '\n=== LEADY ===\n'
		csv += 'ID,Firma,Imię,Email,Telefon,Źródło,Status,Data utworzenia,Opis\n'
		for (const lead of leads) {
			csv += [
				escapeCSV(lead.id),
				escapeCSV(lead.company?.name || 'Firma usunięta'),
				escapeCSV(lead.contactName),
				escapeCSV(lead.email),
				escapeCSV(lead.phone),
				escapeCSV((lead as any).source || 'UNKNOWN'),
				escapeCSV(lead.status),
				escapeCSV(formatDate(lead.createdAt)),
				escapeCSV((lead as any).description || ''),
			].join(',') + '\n'
		}

		// Generuj CSV dla opinii
		csv += '\n=== OPINIE ===\n'
		csv += 'ID,Firma,Ocena,Imię,Email,Telefon,Komentarz,Data utworzenia\n'
		for (const review of reviews) {
			csv += [
				escapeCSV(review.id),
				escapeCSV(review.company?.name || 'Firma usunięta'),
				escapeCSV(review.rating),
				escapeCSV(review.userName),
				escapeCSV(review.userEmail),
				escapeCSV(review.userPhone),
				escapeCSV(review.comment || ''),
				escapeCSV(formatDate(review.createdAt)),
			].join(',') + '\n'
		}

		// Statystyki podsumowujące
		csv += '\n=== STATYSTYKI ===\n'
		csv += 'Kategoria,Wartość\n'
		csv += `Wszystkie firmy,${companies.length}\n`
		csv += `Firmy Premium,${companies.filter(c => c.plan === 'PREMIUM').length}\n`
		csv += `Firmy zweryfikowane,${companies.filter(c => c.isVerified).length}\n`
		csv += `Wszystkie przejęcia,${claims.length}\n`
		csv += `Przejęcia zaakceptowane,${claims.filter(c => c.status === 'APPROVED').length}\n`
		csv += `Przejęcia odrzucone,${claims.filter(c => c.status === 'REJECTED').length}\n`
		csv += `Przejęcia oczekujące,${claims.filter(c => c.status === 'PENDING').length}\n`
		csv += `Nowe wizytówki (30 dni),${newCompanies.filter(c => {
			const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
			return new Date(c.createdAt) >= thirtyDaysAgo
		}).length}\n`
		csv += `Wszystkie leady,${leads.length}\n`
		csv += `Wszystkie opinie,${reviews.length}\n`

		// Zwróć plik CSV
		const filename = `katalogo-export-${new Date().toISOString().split('T')[0]}.csv`
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		})
	} catch (error: any) {
		console.error('Export error:', error)
		return new NextResponse(
			JSON.stringify({ error: error.message || 'Błąd podczas eksportu danych' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		)
	}
}
