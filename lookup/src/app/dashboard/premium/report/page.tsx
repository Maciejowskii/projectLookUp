import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BarChart3, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default async function PremiumReportPage({
	searchParams,
}: {
	searchParams: Promise<{ companyId?: string }>
}) {
	const cookieStore = await cookies()
	const userId = cookieStore.get('session_user_id')?.value
	const params = await searchParams

	if (!userId) redirect('/strefa-partnera')
	if (!params.companyId) redirect('/dashboard')

	const companyUser = await prisma.companyUser.findFirst({
		where: {
			userId,
			companyId: params.companyId,
		},
		include: {
			company: {
				include: {
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

	if (!companyUser || companyUser.company.plan !== 'PREMIUM') {
		redirect('/dashboard')
	}

	const company = companyUser.company

	return (
		<div className='min-h-screen bg-gray-50 font-sans flex flex-col'>
			<Navbar />
			<main className='container mx-auto px-4 pt-32 pb-20 flex-grow'>
				<div className='max-w-4xl mx-auto'>
					<div className='mb-8'>
						<Link
							href={`/dashboard?companyId=${params.companyId}`}
							className='text-blue-600 hover:text-blue-700 font-bold text-sm mb-4 inline-block'
						>
							← Powrót do dashboardu
						</Link>
						<h1 className='text-3xl font-black text-gray-900 mb-2'>Raport roczny</h1>
						<p className='text-gray-500'>Statystyki i analityka Twojej firmy</p>
					</div>

					<div className='bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6'>
						{/* Link do profilu */}
						<div className='p-6 bg-blue-50 rounded-2xl border border-blue-200'>
							<h3 className='font-black text-gray-900 mb-2 flex items-center gap-2'>
								<ExternalLink size={20} /> Link do profilu
							</h3>
							<Link
								href={`/firma/${company.slug}`}
								target='_blank'
								className='text-blue-600 hover:text-blue-700 font-medium break-all'
							>
								/firma/{company.slug}
							</Link>
						</div>

						{/* Data odnowienia */}
						{company.premiumUntil && (
							<div className='p-6 bg-amber-50 rounded-2xl border border-amber-200'>
								<h3 className='font-black text-gray-900 mb-2'>Data odnowienia Premium</h3>
								<p className='text-lg font-bold text-gray-900'>
									{new Date(company.premiumUntil).toLocaleDateString('pl-PL', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
									})}
								</p>
							</div>
						)}

						{/* Statystyki */}
						<div className='p-6 bg-gray-50 rounded-2xl border border-gray-200'>
							<h3 className='font-black text-gray-900 mb-4 flex items-center gap-2'>
								<BarChart3 size={20} /> Statystyki
							</h3>
							<div className='grid md:grid-cols-2 gap-4'>
								<div>
									<p className='text-sm text-gray-500 mb-1'>Opinie</p>
									<p className='text-2xl font-black text-gray-900'>{company._count.reviews}</p>
								</div>
								<div>
									<p className='text-sm text-gray-500 mb-1'>Odsłonięcia telefonu</p>
									<p className='text-2xl font-black text-gray-900'>{company._count.leads}</p>
								</div>
							</div>
							<p className='text-xs text-gray-500 mt-4'>
								Szczegółowa analityka wyświetleń profilu będzie dostępna wkrótce.
							</p>
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	)
}
