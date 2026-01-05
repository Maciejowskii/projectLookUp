import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://www.katalogo.pl'
const TAKE = 40000
const SKIP = 40000

export async function GET() {
	const companies = await prisma.company.findMany({
		select: { slug: true, updatedAt: true },
		orderBy: { id: 'asc' },
		skip: SKIP,
		take: TAKE,
	})

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${companies
	.map(
		c => `  <url>
    <loc>${BASE_URL}/firma/${c.slug}</loc>
    <lastmod>${(c.updatedAt ?? new Date()).toISOString()}</lastmod>
  </url>`
	)
	.join('\n')}
</urlset>`

	return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } })
}
