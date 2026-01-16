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
				fullName: true,
				image: true,
			},
		})

		if (!user) {
			return NextResponse.json({ user: null })
		}

		// Zwróć nazwę wyświetlaną (preferuj fullName, potem name, potem email)
		const displayName = user.fullName || user.name || user.email.split('@')[0]

		return NextResponse.json({
			user: {
				id: user.id,
				email: user.email,
				displayName,
				image: user.image,
			},
		})
	} catch (error) {
		console.error('Error fetching current user:', error)
		return NextResponse.json({ user: null })
	}
}
