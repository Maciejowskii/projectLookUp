export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AdSenseBanner, AdSenseInContent } from '@/components/AdSense'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { safeDecode } from '@/lib/text'
import { CategoryCompaniesList } from '@/components/CategoryCompaniesList'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params

	const category = await prisma.category.findFirst({
		where: { slug },
		select: { name: true, slug: true },
	})

	if (!category) return { title: 'Kategoria nie znaleziona | Katalogo' }

	const categoryName = safeDecode(category.name)

	return {
		title: `${categoryName} – Firmy i usługi`,
		description: `Sprawdź firmy w kategorii ${categoryName}. Opinie, kontakt i lokalni wykonawcy.`,
		alternates: { canonical: `/kategoria/${category.slug}` },
		robots: { index: true, follow: true },
	}
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params

	// Pobierz kategorię wraz z tenantId
	const category = await prisma.category.findFirst({
		where: isUuid(slug) ? { id: slug } : { slug },
		select: { id: true, slug: true, name: true, tenantId: true },
	})

	if (!category) return notFound()

	if (isUuid(slug)) permanentRedirect(`/kategoria/${category.slug}`)

	// 2. Pobierz tylko liczbę firm (reszta przez React Query)
	const totalCompanies = await prisma.company.count({
		where: {
			categoryId: category.id,
		},
	})


	return (
		// Używamy <div> jako głównego kontenera, to bezpieczne.
		<div className='min-h-screen bg-gray-50 flex flex-col font-sans'>
			<Navbar />

			<main className='container mx-auto px-4 pt-32 pb-20 flex-grow'>
				{/* HEADER KATEGORII */}
				<div className='mb-12 text-center md:text-left'>
					<span className='text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block'>Kategoria</span>
					<h1 className='text-4xl md:text-5xl font-extrabold text-gray-900 mb-4'>{safeDecode(category.name)}</h1>
					<p className='text-gray-500 text-lg max-w-2xl'>
						Znaleziono {totalCompanies} firm w tej kategorii. Przeglądaj najlepszych specjalistów w Twojej okolicy.
					</p>
				</div>

				{/* Reklama przed listą firm */}
				<AdSenseBanner className="mb-8" />

				{/* LISTA FIRM - używamy zoptymalizowanego komponentu */}
				<CategoryCompaniesList categoryId={category.id} totalCompanies={totalCompanies} />

				{/* Reklama po liście firm */}
				<AdSenseInContent className="mt-8" />
			</main>

			<Footer />
		</div>
	)
}
