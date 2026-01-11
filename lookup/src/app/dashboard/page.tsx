export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { DashboardContent } from '@/components/DashboardContent'

export default async function DashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string; error?: string }>
}) {
	const cookieStore = await cookies()
	const userId = cookieStore.get('session_user_id')?.value

	if (!userId) redirect('/strefa-partnera')

	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { company: true },
	})

	if (!user || !user.company) redirect('/strefa-partnera')

	const phoneReveals = await prisma.lead.count({
		where: { companyId: user.companyId, status: 'PHONE_REVEAL' },
	})

	const reviewCount = await prisma.review.count({
		where: { companyId: user.companyId },
	})

	const params = await searchParams

	return (
		<div className='min-h-screen bg-gray-50 font-sans flex flex-col'>
			<Navbar />
			<main className='container mx-auto px-4 pt-32 pb-20 flex-grow'>
				<DashboardContent
					user={user}
					phoneReveals={phoneReveals}
					reviewCount={reviewCount}
					status={params.status}
					error={params.error}
				/>
			</main>
			<Footer />
		</div>
	)
}
