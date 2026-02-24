import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		const cookieStore = await cookies()
		const userId = cookieStore.get('session_user_id')?.value

		if (!userId) {
			return NextResponse.json({ user: null })
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				image: true,
				companies: {
					include: {
						company: {
							select: {
								id: true,
								name: true,
								slug: true,
							},
						},
					},
					orderBy: { createdAt: 'asc' },
				},
				company: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
			},
		})

		if (!user) {
			return NextResponse.json({ user: null })
		}

		let userCompanies = user.companies.map(cu => cu.company)
		if (userCompanies.length === 0 && user.company) {
			userCompanies = [user.company]
		}

		const primaryCompany = userCompanies[0] || null
		const displayName = primaryCompany?.name || user.name || user.email.split('@')[0]

		return NextResponse.json({
			user: {
				id: user.id,
				email: user.email,
				displayName,
				image: user.image,
				companies: userCompanies,
				primaryCompany,
			},
		})
	} catch (error) {
		console.error('Error fetching current user:', error)
		return NextResponse.json({ user: null })
	}
}
