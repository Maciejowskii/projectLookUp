import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function PremiumTopPage({
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
					category: true,
				},
			},
		},
	})

	if (!companyUser || companyUser.company.plan !== 'PREMIUM') {
		redirect('/dashboard')
	}

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
						<h1 className='text-3xl font-black text-gray-900 mb-2'>Top kategorii</h1>
						<p className='text-gray-500'>Status wyróżnienia "Top kategorii" na 30 dni</p>
					</div>

					<div className='bg-white p-8 rounded-3xl border border-gray-100 shadow-sm'>
						<div className='p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200'>
							<div className='flex items-center gap-4 mb-4'>
								<div className='w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center'>
									<TrendingUp size={24} className='text-white' />
								</div>
								<div>
									<h3 className='font-black text-gray-900 text-lg'>Aktywne wyróżnienie</h3>
									<p className='text-sm text-gray-600'>Kategoria: {companyUser.company.category.name}</p>
								</div>
							</div>
							<p className='text-sm text-gray-700'>
								Twoja firma jest wyróżniona w kategorii "{companyUser.company.category.name}" i wyświetla się na
								szczycie listy. Wyróżnienie jest aktywne przez 30 dni od daty zakupu Premium.
							</p>
							{companyUser.company.premiumUntil && (
								<p className='text-xs text-gray-600 mt-3'>
									Ważne do:{' '}
									{new Date(companyUser.company.premiumUntil).toLocaleDateString('pl-PL', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
									})}
								</p>
							)}
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	)
}
