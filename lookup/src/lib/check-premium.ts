import { prisma } from './prisma'
import { cookies } from 'next/headers'

export async function checkPremium(): Promise<boolean> {
	const cookieStore = await cookies()
	const userId = cookieStore.get('session_user_id')?.value

	if (!userId) return false

	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { company: true },
	})

	if (!user?.company) return false

	if (user.company.plan !== 'PREMIUM') return false

	// null premiumUntil = bezterminowe premium
	if (!user.company.premiumUntil) return true

	return user.company.premiumUntil > new Date()
}

// Hook do użycia w komponentach
export async function requirePremium() {
	const isPremium = await checkPremium()

	if (!isPremium) {
		throw new Error('Premium subscription required')
	}

	return true
}
