import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const COMPANIES_PER_PAGE = 50

export async function GET(request: NextRequest) {
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/companies/route.ts:7',message:'GET /api/companies called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
	// #endregion

	try {
		const searchParams = request.nextUrl.searchParams
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = Math.min(parseInt(searchParams.get('limit') || String(COMPANIES_PER_PAGE), 10), 100) // Max 100
		const skip = (page - 1) * limit

		const q = searchParams.get('q') || ''
		const city = searchParams.get('city') || ''
		const categoryId = searchParams.get('categoryId') || ''
		const tenantId = searchParams.get('tenantId') || ''
		const domain = searchParams.get('domain') || ''

		// Budowanie where clause
		const whereClause: any = {}

		if (tenantId) {
			whereClause.tenantId = tenantId
		} else if (domain) {
			// Jeśli mamy domain, znajdź tenantId
			const tenant = await prisma.tenant.findUnique({
				where: { subdomain: domain },
				select: { id: true },
			})
			if (tenant) {
				whereClause.tenantId = tenant.id
			}
		}

		if (q) {
			whereClause.OR = [
				{ name: { contains: q, mode: 'insensitive' } },
				{ description: { contains: q, mode: 'insensitive' } },
				{ category: { name: { contains: q, mode: 'insensitive' } } },
			]
		}

		if (city) {
			whereClause.city = { contains: city, mode: 'insensitive' }
		}

		if (categoryId) {
			whereClause.categoryId = categoryId
		}

		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/companies/route.ts:45',message:'Before Prisma queries',data:{page,limit,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		// Optymalizacja: select tylko potrzebne pola
		const [companies, total] = await Promise.all([
			prisma.company.findMany({
				where: whereClause,
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					address: true,
					city: true,
					logo: true,
					isVerified: true,
					plan: true,
					premiumUntil: true,
					lat: true,
					lng: true,
					category: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
					reviews: {
						select: {
							rating: true,
						},
					},
				},
				orderBy: [
					{ isVerified: 'desc' },
					{ logo: 'desc' },
					{ name: 'asc' },
				],
				skip,
				take: limit,
			}),
			prisma.company.count({ where: whereClause }),
		])

		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/companies/route.ts:75',message:'After Prisma queries',data:{companiesCount:companies.length,total,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		// Oblicz ratingi
		const companiesWithRating = companies.map((c) => {
			const reviewCount = c.reviews.length
			const averageRating =
				reviewCount > 0
					? c.reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount
					: 0
			return {
				...c,
				reviewCount,
				averageRating: Math.round(averageRating * 10) / 10, // Zaokrąglenie do 1 miejsca
			}
		})

		const totalPages = Math.ceil(total / limit)

		return NextResponse.json(
			{
				data: companiesWithRating,
				pagination: {
					page,
					limit,
					total,
					totalPages,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1,
				},
			},
			{
				headers: {
					'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // ISR: 60s cache, 300s stale-while-revalidate
				},
			}
		)
	} catch (error) {
		console.error('Error fetching companies:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch companies' },
			{ status: 500 }
		)
	}
}
