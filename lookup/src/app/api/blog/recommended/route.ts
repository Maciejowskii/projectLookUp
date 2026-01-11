import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const revalidate = 3600 // 1 hour cache

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const excludePostId = searchParams.get('excludePostId') || ''
		const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 50) // Max 50

		// Pobierz więcej niż potrzeba, aby miał sporo do losowania
		const posts = await prisma.post.findMany({
			where: {
				published: true,
				id: excludePostId ? { not: excludePostId } : undefined,
			},
			select: {
				id: true,
				slug: true,
				title: true,
				excerpt: true,
				image: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
			take: Math.max(limit * 3, 20), // 3x więcej do losowania
		})

		if (posts.length === 0) {
			return NextResponse.json([], {
				headers: {
					'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
				},
			})
		}

		// Fisher-Yates shuffle - losowe artykuły
		const shuffled = posts.sort(() => Math.random() - 0.5).slice(0, limit)

		return NextResponse.json(shuffled, {
			headers: {
				'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
			},
		})
	} catch (error) {
		console.error('❌ Błąd API /blog/recommended:', error)

		return NextResponse.json({ error: 'Błąd przy pobieraniu polecanych artykułów' }, { status: 500 })
	}
}
