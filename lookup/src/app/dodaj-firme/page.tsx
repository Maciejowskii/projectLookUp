import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { Search, TrendingUp, ShieldCheck } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AddCompanyForm } from '@/components/AddCompanyForm'

export const dynamic = 'force-dynamic'

export default async function AddCompanyPage() {
	let categories: Awaited<ReturnType<typeof prisma.category.findMany>> = []
	let defaultTenant: Awaited<ReturnType<typeof prisma.tenant.findFirst>> = null

	try {
		categories = await prisma.category.findMany({
			orderBy: { name: 'asc' },
		})
		defaultTenant = await prisma.tenant.findFirst()
	} catch (error) {
		console.error('Błąd podczas pobierania danych:', error)
		return (
			<div className='p-10 text-center text-red-600 font-sans'>
				Błąd: Nie udało się połączyć z bazą danych. Spróbuj ponownie później.
			</div>
		)
	}

	if (!defaultTenant) {
		return <div className='p-10 text-center text-red-600 font-sans'>Błąd: Brak konfiguracji tenanta.</div>
	}

	let loggedInEmail: string | null = null
	try {
		const cookieStore = await cookies()
		const userId = cookieStore.get('session_user_id')?.value
		if (userId) {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { email: true },
			})
			if (user) loggedInEmail = user.email
		}
	} catch {
		// ignore - user not logged in
	}

	return (
		<div className='min-h-screen bg-[#F3F4F6] flex flex-col font-sans'>
			<Navbar />

			<div className='flex-grow flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden'>
				<div className='absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent -z-10'></div>

				<div className='max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden min-h-[650px] border border-gray-100'>
					{/* LEWA KOLUMNA: FORMULARZ */}
					<div className='lg:col-span-7 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative'>
						<div className='mb-8'>
							<span className='bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block'>
								Natychmiastowa aktywacja
							</span>
							<h1 className='text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight'>
								Dodaj swoją firmę
							</h1>
							<p className='text-gray-600 text-lg'>Twoje konto zostanie utworzone automatycznie.</p>
						</div>

						<AddCompanyForm
							categories={categories.map(c => ({ id: c.id, name: c.name }))}
							loggedInEmail={loggedInEmail}
						/>
					</div>

					{/* PRAWA KOLUMNA: MARKETING */}
					<div className='hidden lg:flex lg:col-span-5 flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-900 text-white p-12'>
						<h2 className='text-3xl font-bold leading-tight'>Zacznij pozyskiwać klientów już teraz</h2>
						<ul className='space-y-6'>
							<FeatureItem
								icon={<Search size={24} />}
								title='Profil SEO'
								desc='Twoja firma pojawi się w wynikach wyszukiwania.'
							/>
							<FeatureItem
								icon={<ShieldCheck size={24} />}
								title='Panel partnera'
								desc='Zarządzaj swoimi danymi i opiniami 24/7.'
							/>
							<FeatureItem
								icon={<TrendingUp size={24} />}
								title='Statystyki'
								desc='Sprawdzaj ile osób zobaczyło Twój numer telefonu.'
							/>
						</ul>
						<div className='bg-white/10 p-4 rounded-xl text-sm border border-white/20 italic'>
							Po rejestracji zostaniesz przekierowany do strony z danymi do logowania.
						</div>
					</div>
				</div>
			</div>
			<Footer />
		</div>
	)
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
	return (
		<li className='flex gap-4 items-start'>
			<div className='bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5 shrink-0'>{icon}</div>
			<div>
				<h3 className='font-bold text-lg mb-1'>{title}</h3>
				<p className='text-blue-100 text-sm leading-relaxed opacity-90'>{desc}</p>
			</div>
		</li>
	)
}
