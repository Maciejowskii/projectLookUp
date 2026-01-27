export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { TrendingUp, ArrowRight, MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { HomeSearchBar } from '@/components/HomeSearchBar'
import { Footer } from '@/components/Footer'
import { Navbar } from '@/components/Navbar'
import { FeaturedCompanyCard } from '@/components/FeaturedCompanyCard'
import { BottomNavigation } from '@/components/BottomNavigation'
import { AdSenseBanner, AdSenseInContent } from '@/components/AdSense'

export default async function LandingPage() {
	// Pobieramy dane z bazy równolegle z error handling
	let companyCount = 0
	let categories: any[] = []
	let recentCompanies: any[] = []
	
	try {
		[companyCount, categories, recentCompanies] = await Promise.all([
			prisma.company.count().catch(() => 0),
			// Pobierz 4 kategorie z największą liczbą firm
			prisma.category.findMany({
				take: 4,
				orderBy: { companies: { _count: 'desc' } },
				include: { _count: { select: { companies: true } } },
			}).catch(() => []),
			// Pobierz 6 ostatnich firm (Dobre dla SEO - strona "żyje")
			prisma.company.findMany({
				take: 6,
				orderBy: { createdAt: 'desc' },
				where: { isVerified: true }, // Opcjonalnie: tylko zweryfikowane
				include: { category: true },
			}).catch(() => []),
		])
	} catch (error) {
		// Podczas build time baza może być niedostępna
		console.warn('[LANDING] Could not fetch data, using defaults:', error)
	}

	// Pobierz wyróżnioną firmę
	let featuredCompany = null
	try {
		const featuredSetting = await prisma.setting.findUnique({
			where: { key: 'featured_company_id' },
		}).catch(() => null)
		
		if (featuredSetting?.value) {
			featuredCompany = await prisma.company.findUnique({
				where: { id: featuredSetting.value },
				select: {
					id: true,
					name: true,
					slug: true,
					city: true,
				},
			}).catch(() => null)
		}
	} catch (error) {
		console.warn('[LANDING] Could not fetch featured company:', error)
	}

	return (
		<div className='min-h-screen bg-white font-sans text-gray-900'>
			<Navbar />

			{/* --- HERO SECTION (TWÓJ DESIGN) --- */}
			<section className='pt-20 md:pt-24 pb-12 md:pb-20 px-4 md:px-6 relative overflow-hidden'>
				<div className='absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] bg-blue-50 rounded-full blur-[100px] -z-10 opacity-60'></div>

				<div className='max-w-4xl mx-auto text-center overflow-hidden'>
					<div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6 border border-blue-100'>
						<TrendingUp size={14} /> Największa baza firm w Polsce
					</div>

					<h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight mb-6 md:mb-8 leading-[1.1] px-2 break-words'>
						Znajdź{' '}
						<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'>
							najlepszych
						</span>{' '}
						<br className='hidden sm:block' />
						<span className='sm:inline'>specjalistów w okolicy.</span>
					</h1>

					<p className='text-base sm:text-lg md:text-xl text-gray-500 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-4 break-words'>
						katalogo to nowoczesna wyszukiwarka łącząca klientów z lokalnymi ekspertami. Przeszukaj{' '}
						<span className='font-bold text-gray-900'>{companyCount.toLocaleString()}</span> zweryfikowanych firm.
					</p>

					<HomeSearchBar />
				</div>
			</section>

			{/* --- REKLAMA BANNER --- */}
			<AdSenseBanner />

			{/* --- WYRÓŻNIONA FIRMA (PROMOCJA) --- */}
			{featuredCompany && (
				<FeaturedCompanyCard
					featured={{
						id: featuredCompany.id,
						name: featuredCompany.name,
						slug: featuredCompany.slug,
						city: featuredCompany.city,
					}}
				/>
			)}

			{/* --- POPULARNE KATEGORIE (DYNAMICZNE) --- */}
			<section className='py-12 md:py-16 lg:py-20 bg-gray-50'>
				<div className='max-w-7xl mx-auto px-4 md:px-6 overflow-hidden'>
					<div className='flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 md:mb-12'>
						<h2 className='text-2xl md:text-3xl font-bold break-words'>Popularne branże</h2>
						<Link href='/kategorie' className='text-blue-600 font-bold hover:underline flex items-center gap-1 text-sm md:text-base whitespace-nowrap'>
							Wszystkie <ArrowRight size={14} className='md:w-4 md:h-4' />
						</Link>
					</div>

					<div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4'>
						{categories.map(cat => (
							<Link
								key={cat.id}
								href={`/kategoria/${cat.slug}`}
								className='group bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm md:hover:shadow-xl md:hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col'
							>
								<div className='w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors text-lg md:text-xl font-bold flex-shrink-0'>
									{cat.name.charAt(0)}
								</div>
								<div className='flex flex-col flex-1 min-w-0'>
									<h3 className='font-bold text-sm md:text-base lg:text-lg text-gray-900 mb-2 line-clamp-2 break-words leading-tight'>{cat.name}</h3>
									<p className='text-xs md:text-sm text-gray-400'>{cat._count.companies} firm</p>
								</div>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* --- REKLAMA W TREŚCI --- */}
			<AdSenseInContent />

			{/* --- OSTATNIO DODANE (DLA SEO) --- */}
			<section className='py-12 md:py-16 lg:py-20 bg-white'>
				<div className='max-w-7xl mx-auto px-4 md:px-6 overflow-hidden'>
					<h2 className='text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center break-words'>Ostatnio dołączyli</h2>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
						{recentCompanies.map(company => (
							<Link
								key={company.id}
								href={`/firma/${company.slug}`}
								className='group border border-gray-100 p-4 md:p-6 rounded-xl md:rounded-2xl md:hover:border-blue-200 md:hover:shadow-lg transition-all overflow-hidden'
							>
								<div className='flex justify-between items-start mb-3 md:mb-4 gap-2'>
									<div className='flex-1 min-w-0'>
										<h3 className='font-bold text-base md:text-lg group-hover:text-blue-600 transition-colors line-clamp-2 break-words'>{company.name}</h3>
										<div className='flex items-center gap-1 text-xs text-gray-400 mt-1'>
											<MapPin size={12} className='flex-shrink-0' /> <span className='truncate'>{company.city}</span>
										</div>
									</div>
									<span className='bg-gray-100 text-gray-600 text-[9px] md:text-[10px] px-2 py-1 rounded-full font-bold uppercase flex-shrink-0 line-clamp-1'>
										{company.category.name}
									</span>
								</div>
								<p className='text-xs md:text-sm text-gray-500 line-clamp-2 break-words'>
									{company.description || 'Sprawdź profil tej firmy...'}
								</p>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* --- CTA DLA FIRM (TWÓJ DESIGN) --- */}
			<section className='py-12 md:py-16 lg:py-24 px-4 md:px-6'>
				<div className='max-w-7xl mx-auto bg-gray-900 rounded-2xl md:rounded-[2.5rem] p-6 md:p-12 lg:p-20 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 lg:gap-12'>
					<div className='absolute top-0 right-0 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2'></div>

					<div className='relative z-10 max-w-xl w-full md:w-auto'>
						<h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 break-words'>Prowadzisz firmę?</h2>
						<p className='text-gray-400 text-sm md:text-base lg:text-lg mb-6 md:mb-8 leading-relaxed break-words'>
							Dołącz do katalogo i daj się znaleźć tysiącom nowych klientów. Darmowa wizytówka to dopiero początek.
						</p>
						<div className='flex flex-wrap gap-3 md:gap-4'>
							<Link
								href='/dodaj-firme'
								className='px-6 md:px-8 py-3 md:py-4 bg-white text-gray-900 font-bold rounded-xl md:hover:bg-gray-100 transition flex items-center gap-2 text-sm md:text-base touch-manipulation min-h-[44px]'
							>
								Dodaj firmę teraz <ArrowRight size={16} className='md:w-[18px] md:h-[18px]' />
							</Link>
						</div>
					</div>

					{/* Element ozdobny (karta) */}
					<div className='relative z-10 bg-white/10 backdrop-blur p-4 md:p-6 rounded-xl md:rounded-2xl border border-white/10 w-full md:w-auto md:max-w-sm md:rotate-3 md:hover:rotate-0 transition-transform duration-500 flex-shrink-0'>
						<div className='flex items-center gap-4 mb-4'>
							<div className='w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center font-bold text-2xl'>
								L
							</div>
							<div>
								<div className='h-3 w-24 bg-white/20 rounded mb-2'></div>
								<div className='h-2 w-16 bg-white/10 rounded'></div>
							</div>
						</div>
						<div className='space-y-2'>
							<div className='h-2 w-full bg-white/10 rounded'></div>
							<div className='h-2 w-full bg-white/10 rounded'></div>
							<div className='h-2 w-3/4 bg-white/10 rounded'></div>
						</div>
					</div>
				</div>
			</section>

			<Footer />
			<BottomNavigation />
		</div>
	)
}
