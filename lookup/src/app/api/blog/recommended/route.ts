import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url)
		const excludePostId = searchParams.get('excludePostId')
		const limit = parseInt(searchParams.get('limit') || '10', 10)

		const blogs = await prisma.post.findMany({
			where: {
				published: true,
				...(excludePostId && { id: { not: excludePostId } }),
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
			take: limit,
		})

		return NextResponse.json(blogs)
	} catch (error) {
		console.error('Error fetching recommended blogs:', error)
		return NextResponse.json([], { status: 500 })
	}
}
