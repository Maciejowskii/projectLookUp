import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

export default async function PremiumArticlesPage({
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
			company: true,
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
						<h1 className='text-3xl font-black text-gray-900 mb-2'>Artykuły blogowe</h1>
						<p className='text-gray-500'>Dodaj 2 artykuły z 30-dniową promocją w blogu</p>
					</div>

					<div className='bg-white p-8 rounded-3xl border border-gray-100 shadow-sm'>
						<div className='text-center py-12'>
							<BookOpen size={64} className='text-gray-300 mx-auto mb-4' />
							<h2 className='text-xl font-black text-gray-900 mb-2'>Funkcja w przygotowaniu</h2>
							<p className='text-gray-500 mb-6'>Zarządzanie artykułami blogowymi będzie dostępne wkrótce.</p>
							<Link
								href={`/dashboard?companyId=${params.companyId}`}
								className='inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold'
							>
								Powrót do dashboardu
							</Link>
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	)
}
