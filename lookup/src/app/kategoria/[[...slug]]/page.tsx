export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { MapPin, ArrowRight } from 'lucide-react'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { safeDecode } from '@/lib/text'

const getInitial = (name?: string) => {
	const s = safeDecode((name ?? '').trim())
	const m = s.match(/[\p{L}\p{N}]/u)
	return (m?.[0] ?? '?').toUpperCase()
}

// Funkcja pomocnicza do "odczarowania" sluga miasta na czytelny tekst (opcjonalnie)
const formatCityName = (slug: string) => {
	return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
	const { slug: slugs } = await params
	const categorySlug = slugs?.[0]
	const citySlug = slugs?.[1]

	if (!categorySlug) return { title: 'Kategorie | Katalogo' }

	const category = await prisma.category.findFirst({
		where: { slug: categorySlug },
		select: { name: true, slug: true, tenantId: true },
	})

	if (!category) return { title: 'Kategoria nie znaleziona | Katalogo' }

	const categoryName = safeDecode(category.name)
	const cityName = citySlug ? ` w ${formatCityName(citySlug)}` : ''

	return {
		title: `${categoryName}${cityName} – Firmy i usługi`,
		description: `Sprawdź firmy w kategorii ${categoryName}${cityName}. Opinie, kontakt i lokalni wykonawcy.`,
		alternates: { canonical: `/kategoria/${category.slug}${citySlug ? `/${citySlug}` : ''}` },
		robots: { index: true, follow: true },
	}
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug?: string[] }> }) {
	const { slug: slugs } = await params
	const categorySlug = slugs?.[0]
	const citySlug = slugs?.[1]

	if (!categorySlug) return notFound()

	const category = await prisma.category.findFirst({
		where: isUuid(categorySlug) ? { id: categorySlug } : { slug: categorySlug },
		select: { id: true, slug: true, name: true, tenantId: true },
	})

	if (!category) return notFound()
	if (isUuid(categorySlug)) permanentRedirect(`/kategoria/${category.slug}`)

	// POBIERANIE FIRM Z FILTROWANIEM PO KATEGORII I (OPCJONALNIE) MIEŚCIE
	// Usunięto filtrowanie po tenantId, żeby pokazać wszystkie firmy z kategorii
	const companies = await prisma.company.findMany({
		where: {
			categoryId: category.id,
			// Wykluczamy firmy bez nazwy (mogą być błędne dane)
			name: { not: null },
			...(citySlug
				? {
						city: {
							contains: citySlug, // Next.js "torun" znajdzie "Toruń" jeśli użyjesz insensitive
							mode: 'insensitive',
						},
				  }
				: {}),
		},
		orderBy: [{ isVerified: 'desc' }, { logo: 'desc' }, { name: 'asc' }],
	})

	type CompanyType = (typeof companies)[number]

	return (
		<div className='min-h-screen bg-gray-50 flex flex-col font-sans'>
			<Navbar />

			<main className='container mx-auto px-4 pt-32 pb-20 flex-grow'>
				<div className='mb-12 text-center md:text-left'>
					<span className='text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block'>
						{citySlug ? `Firmy: ${formatCityName(citySlug)}` : 'Kategoria'}
					</span>
					<h1 className='text-4xl md:text-5xl font-extrabold text-gray-900 mb-4'>
						{safeDecode(category.name)}{' '}
						{citySlug && <span className='text-blue-600'>w {formatCityName(citySlug)}</span>}
					</h1>
					<p className='text-gray-500 text-lg max-w-2xl'>
						Znaleziono {companies.length} firm.{' '}
						{citySlug
							? `To najlepsi specjaliści z branży ${category.name.toLowerCase()} w Twoim mieście.`
							: `Przeglądaj najlepszych specjalistów w Twojej okolicy.`}
					</p>
				</div>

				{companies.length > 0 ? (
					<div className='grid grid-cols-1 gap-6'>
						{companies.map((company: CompanyType) => (
							<Link
								key={company.id}
								href={`/firma/${company.slug}`}
								className='group block bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300'
							>
								<div className='flex flex-col md:flex-row gap-6 items-start'>
									<div className='w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-2xl flex-shrink-0 group-hover:scale-110 transition-transform'>
										{getInitial(company.name)}
									</div>

									<div className='flex-grow'>
										<div className='flex flex-wrap items-center gap-3 mb-2'>
											<h2 className='text-xl md:text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors'>
												{company.name}
											</h2>
											{company.isVerified && (
												<span className='bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold'>
													Zweryfikowana
												</span>
											)}
										</div>

										<div className='flex items-center gap-2 text-gray-500 text-sm mb-4 font-medium'>
											<MapPin size={16} className='text-gray-400' />
											{company.city || 'Polska'}, {company.address || ''}
										</div>

										<p className='text-gray-600 leading-relaxed line-clamp-3 md:line-clamp-2 whitespace-pre-line'>
											{company.description || 'Brak opisu.'}
										</p>

										<div className='mt-4 flex items-center text-blue-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300'>
											Zobacz profil <ArrowRight size={16} className='ml-1' />
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				) : (
					<div className='text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200'>
						<h3 className='text-xl font-bold text-gray-400'>Brak firm spełniających kryteria</h3>
						<p className='text-gray-400 mt-2'>Zmień lokalizację lub kategorię, aby znaleźć wykonawców.</p>
					</div>
				)}
			</main>

			<Footer />
		</div>
	)
}
