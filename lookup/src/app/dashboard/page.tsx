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
	searchParams: Promise<{ status?: string; error?: string; companyId?: string }>
}) {
	const cookieStore = await cookies()
	const userId = cookieStore.get('session_user_id')?.value

	if (!userId) redirect('/strefa-partnera')

	const params = await searchParams
	const selectedCompanyId = params.companyId

	// Pobierz użytkownika z firmami
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			// New many-to-many
			companies: {
				include: {
					company: {
						include: {
							category: true,
							_count: {
								select: {
									reviews: true,
									leads: true,
								},
							},
						},
					},
				},
			},
			// Legacy support
			company: {
				include: {
					category: true,
					_count: {
						select: {
							reviews: true,
							leads: true,
						},
					},
				},
			},
		},
	})

	if (!user) redirect('/strefa-partnera')

	// Auto-migracja: jeśli użytkownik ma companyId ale nie ma CompanyUser
	if (user.companyId && user.companies.length === 0 && user.company) {
		try {
			await prisma.companyUser.create({
				data: {
					userId: user.id,
					companyId: user.companyId,
					role: 'OWNER',
				},
			})
			// Refresh user data
			const refreshedUser = await prisma.user.findUnique({
				where: { id: userId },
				include: {
					companies: {
						include: {
							company: {
								include: {
									category: true,
									_count: {
										select: {
											reviews: true,
											leads: true,
										},
									},
								},
							},
						},
					},
				},
			})
			if (refreshedUser) {
				Object.assign(user, refreshedUser)
			}
		} catch (error) {
			// Ignore if already exists
			console.log('Auto-migration note:', error)
		}
	}

	// Pobierz wszystkie firmy użytkownika
	let companies: any[] = []
	if (user.companies && user.companies.length > 0) {
		companies = user.companies.map(cu => cu.company)
	} else if (user.company) {
		// Legacy fallback
		companies = [user.company]
	}

	// Wybierz aktywną firmę
	let selectedCompany = null
	if (selectedCompanyId) {
		selectedCompany = companies.find(c => c.id === selectedCompanyId)
	}
	if (!selectedCompany && companies.length > 0) {
		selectedCompany = companies[0]
	}

	// Pobierz statystyki dla wszystkich firm
	const companyIds = companies.map(c => c.id)
	const phoneReveals =
		companyIds.length > 0
			? await prisma.lead.count({
					where: {
						companyId: { in: companyIds },
						status: 'PHONE_REVEAL',
					},
			  })
			: 0

	const reviewCount =
		companyIds.length > 0
			? await prisma.review.count({
					where: { companyId: { in: companyIds } },
			  })
			: 0

	return (
		<div className='min-h-screen bg-gray-50 font-sans flex flex-col'>
			<Navbar />
			<main className='container mx-auto px-4 pt-32 pb-20 flex-grow'>
				<DashboardContent
					user={{
						id: user.id,
						email: user.email,
					}}
					companies={companies}
					selectedCompany={selectedCompany}
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
