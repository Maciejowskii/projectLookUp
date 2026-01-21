import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('q') || ''
		const limit = parseInt(searchParams.get('limit') || '20')

		if (!query || query.length < 2) {
			return NextResponse.json({ companies: [] })
		}

		const companies = await prisma.company.findMany({
			where: {
				OR: [
					{ name: { contains: query, mode: 'insensitive' } },
					{ city: { contains: query, mode: 'insensitive' } },
					{ email: { contains: query, mode: 'insensitive' } },
				],
			},
			select: {
				id: true,
				name: true,
				city: true,
				slug: true,
			},
			orderBy: [
				{ name: 'asc' },
			],
			take: limit,
		})

		return NextResponse.json({ companies })
	} catch (error) {
		console.error('Error searching companies:', error)
		return NextResponse.json({ error: 'Błąd wyszukiwania' }, { status: 500 })
	}
}
