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

	// Sprawdź czy plan to PREMIUM i czy nie wygasł
	if (user.company.plan === 'PREMIUM') {
		if (!user.company.premiumUntil) return false

		const now = new Date()
		return user.company.premiumUntil > now
	}

	return false
}

// Hook do użycia w komponentach
export async function requirePremium() {
	const isPremium = await checkPremium()

	if (!isPremium) {
		throw new Error('Premium subscription required')
	}

	return true
}
