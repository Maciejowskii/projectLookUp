import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

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

export async function GET(request: Request) {
	try {
		await checkAdminAuth()

		const { searchParams } = new URL(request.url)
		const type = searchParams.get('type')

		if (!type) {
			return new NextResponse(JSON.stringify({ error: 'Brak typu eksportu' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		let csv = ''
		let filename = ''

		switch (type) {
			case 'new-companies': {
				// Założył sam wizytówkę - nowe logowanie
				const newCompanies = await prisma.claimRequest.findMany({
					where: {
						message: { contains: 'Nowa wizytówka' },
					},
					include: {
						company: {
							select: {
								name: true,
								slug: true,
								nip: true,
								email: true,
								phone: true,
								city: true,
								category: {
									select: { name: true },
								},
								createdAt: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
				})

				csv = 'Nazwa firmy,Slug,NIP,Email,Telefon,Miasto,Branża,Data utworzenia\n'
				for (const claim of newCompanies) {
					if (!claim.company) continue
					csv += [
						escapeCSV(claim.company.name),
						escapeCSV(claim.company.slug),
						escapeCSV(claim.company.nip),
						escapeCSV(claim.email),
						escapeCSV(claim.phone),
						escapeCSV(claim.company.city),
						escapeCSV(claim.company.category.name),
						escapeCSV(formatDate(claim.createdAt)),
					].join(',') + '\n'
				}
				filename = 'nowe-wizytowki'
				break
			}

			case 'reviews-left': {
				// Zostawił opinie
				const reviews = await prisma.review.findMany({
					include: {
						company: {
							select: {
								name: true,
								slug: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
				})

				csv = 'Imię,Email,Telefon,Ocena,Komentarz,Firma,Data utworzenia\n'
				for (const review of reviews) {
					csv += [
						escapeCSV(review.userName),
						escapeCSV(review.userEmail),
						escapeCSV(review.userPhone),
						escapeCSV(review.rating),
						escapeCSV(review.comment || ''),
						escapeCSV(review.company?.name || 'Firma usunięta'),
						escapeCSV(formatDate(review.createdAt)),
					].join(',') + '\n'
				}
				filename = 'opinie-uzytkownikow'
				break
			}

			case 'claims': {
				// Chciał przejąć wizytówkę
				const claims = await prisma.claimRequest.findMany({
					include: {
						company: {
							select: {
								name: true,
								slug: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
				})

				csv = 'Firma,Email,Zgłaszający,Telefon,Status,Data utworzenia,Wiadomość\n'
				for (const claim of claims) {
					csv += [
						escapeCSV(claim.company?.name || 'Firma usunięta'),
						escapeCSV(claim.email),
						escapeCSV(claim.fullName),
						escapeCSV(claim.phone),
						escapeCSV(claim.status),
						escapeCSV(formatDate(claim.createdAt)),
						escapeCSV(claim.message || ''),
					].join(',') + '\n'
				}
				filename = 'przejecia-wizytowek'
				break
			}

			case 'companies-with-reviews': {
				// Ma opinie na profilu
				const companies = await prisma.company.findMany({
					where: {
						reviews: {
							some: {},
						},
					},
					include: {
						category: {
							select: { name: true },
						},
						reviews: {
							select: {
								rating: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
				})

				csv = 'Nazwa firmy,Telefon,Email,Miasto,Branża,Liczba opinii,Średnia ocena,Oceny pozytywne,Oceny negatywne,Data utworzenia\n'
				for (const company of companies) {
					const reviewCount = company.reviews.length
					const avgRating =
						reviewCount > 0
							? (company.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2)
							: '0'
					const positiveReviews = company.reviews.filter((r) => r.rating >= 4).length
					const negativeReviews = company.reviews.filter((r) => r.rating <= 2).length

					csv += [
						escapeCSV(company.name),
						escapeCSV(company.phone),
						escapeCSV(company.email),
						escapeCSV(company.city),
						escapeCSV(company.category.name),
						escapeCSV(reviewCount),
						escapeCSV(avgRating),
						escapeCSV(positiveReviews),
						escapeCSV(negativeReviews),
						escapeCSV(formatDate(company.createdAt)),
					].join(',') + '\n'
				}
				filename = 'firmy-z-opiniami'
				break
			}

			case 'phone-reveals': {
				// Wyświetlono numer firmy - pobierz wszystkie leady z PHONE_REVEAL
				const leads = await prisma.lead.findMany({
					where: {
						status: 'PHONE_REVEAL',
					},
					include: {
						company: {
							select: {
								id: true,
								name: true,
								phone: true,
								email: true,
								city: true,
								category: {
									select: { name: true },
								},
							},
						},
					},
					orderBy: { createdAt: 'desc' },
				})

				// Grupuj po ID firmy i zlicz
				const companyStats = new Map<
					string,
					{
						company: any
						count: number
						lastReveal: Date
					}
				>()

				for (const lead of leads) {
					if (!lead.company) continue
					const companyId = lead.companyId
					const existing = companyStats.get(companyId)
					if (existing) {
						existing.count++
						if (new Date(lead.createdAt) > existing.lastReveal) {
							existing.lastReveal = new Date(lead.createdAt)
						}
					} else {
						companyStats.set(companyId, {
							company: lead.company,
							count: 1,
							lastReveal: new Date(lead.createdAt),
						})
					}
				}

				csv = 'Nazwa firmy,Telefon,Email,Miasto,Branża,Liczba klientów (połączeń),Ostatnie połączenie\n'
				const sortedStats = Array.from(companyStats.values()).sort((a, b) => b.count - a.count)
				for (const stat of sortedStats) {
					csv += [
						escapeCSV(stat.company.name),
						escapeCSV(stat.company.phone),
						escapeCSV(stat.company.email),
						escapeCSV(stat.company.city),
						escapeCSV(stat.company.category.name),
						escapeCSV(stat.count),
						escapeCSV(formatDate(stat.lastReveal)),
					].join(',') + '\n'
				}
				filename = 'wyswietlenia-numerow'
				break
			}

			default:
				return new NextResponse(JSON.stringify({ error: 'Nieznany typ eksportu' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				})
		}

		const finalFilename = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${finalFilename}"`,
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
