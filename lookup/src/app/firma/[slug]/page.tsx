export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CityCrossLinks } from '@/components/CityCrossLinks'
import { FeaturedCompanyCard } from '@/components/FeaturedCompanyCard'
import { MapPin, Globe, Mail, FileText, CheckCircle, ChevronRight } from 'lucide-react'
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay'
import type { OpeningHours } from '@/components/OpeningHoursEditor'
import { ReviewSection } from '@/components/ReviewSection'
import { PhoneRevealButton } from '@/components/PhoneRevealButton'
import { Metadata } from 'next'
import { safeDecode } from '@/lib/text'
/* =========================================================
   METADATA (SEO)
========================================================= */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params
	const company = await prisma.company.findFirst({
		where: { slug },
	})

	if (!company) {
		return { title: 'Firma nie znaleziona | katalogo' }
	}

	return {
		title: `${company.name} – ${company.city} | Opinie i Kontakt`,
		description:
			company.description?.slice(0, 160) ||
			`Sprawdź ofertę firmy ${company.name} w ${company.city}. Opinie, telefon i adres.`,
		alternates: {
			canonical: `/firma/${company.slug}`,
		},
		robots: {
			index: true,
			follow: true,
		},
		openGraph: {
			title: company.name,
			description: company.description?.slice(0, 100),
			images: company.logo ? [company.logo] : [],
		},
	}
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

const getInitial = (name?: string) => {
	const s = safeDecode((name ?? '').trim())
	const m = s.match(/[\p{L}\p{N}]/u)
	return (m?.[0] ?? '?').toUpperCase()
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params

	const [company, featuredSetting] = await Promise.all([
		prisma.company.findFirst({
			where: { slug },
			include: {
				category: true,
				reviews: { orderBy: { createdAt: 'desc' } },
			},
		}),
		prisma.setting.findUnique({ where: { key: 'featured_company_id' } }),
	])

	if (!company) return notFound()

	let featuredCompany: { id: string; name: string; slug: string; city: string | null } | null = null
	if (featuredSetting?.value) {
		const fc = await prisma.company.findUnique({
			where: { id: featuredSetting.value },
			select: { id: true, name: true, slug: true, city: true },
		})
		if (fc) featuredCompany = fc
	}
	const showFeatured = featuredCompany && featuredCompany.slug !== company.slug
	const hasTopBanners = showFeatured

	const mapQuery = encodeURIComponent(`${company.name} ${company.city} ${company.address}`)

	/* ===== JSON-LD (SCHEMA.ORG) ===== */

	const reviewCount = company.reviews.length
	const averageRating =
		reviewCount > 0
			? (
					company.reviews.reduce((acc: number, r: (typeof company.reviews)[number]) => acc + r.rating, 0) / reviewCount
			  ).toFixed(1)
			: undefined

	// Konwertuj godziny otwarcia na format Schema.org
	const formatOpeningHoursForSchema = (hours: OpeningHours | null): string[] => {
		if (!hours) return ['Mo-Fr 08:00-17:00']
		const dayMap: Record<string, string> = {
			mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su'
		}
		const result: string[] = []
		for (const [key, schedule] of Object.entries(hours)) {
			if (!schedule.closed) {
				result.push(`${dayMap[key]} ${schedule.open}-${schedule.close}`)
			}
		}
		return result.length > 0 ? result : ['Mo-Fr 08:00-17:00']
	}

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'LocalBusiness',
		name: company.name,
		image: company.logo ? [company.logo] : undefined,
		address: {
			'@type': 'PostalAddress',
			streetAddress: company.address,
			addressLocality: company.city,
			postalCode: company.zip,
			addressCountry: 'PL',
		},
		url: `https://www.katalogo.pl/firma/${company.slug}`,
		telephone: company.phone || undefined,
		email: company.email || undefined,
		description: company.description || `Profil firmy ${company.name} w miejscowości ${company.city}.`,
		category: company.category.name,
		priceRange: 'PLN',
		openingHours: formatOpeningHoursForSchema(company.openingHours as OpeningHours | null),
		...(reviewCount > 0 && parseFloat(averageRating || '0') >= 3.5 && {
			aggregateRating: {
				'@type': 'AggregateRating',
				ratingValue: averageRating,
				bestRating: '5',
				worstRating: '1',
				reviewCount: reviewCount.toString(),
			},
		}),
	}

	return (
		<div className='min-h-screen bg-gray-50 font-sans'>
			<script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

			<Navbar />

			{/* POLECAMY – wyróżniona firma (na każdej stronie firmy, oprócz własnej) */}
			{showFeatured && featuredCompany && (
				<div className='pt-24'>
					<FeaturedCompanyCard featured={featuredCompany} compact />
				</div>
			)}

			{/* HEADER PROFILU */}
			<div className={`bg-white border-b pb-12 ${hasTopBanners ? 'pt-8' : 'pt-24'}`}>
				<div className='container mx-auto px-4 max-w-5xl'>
					{/* --- 1. BREADCRUMBS (SEO) --- */}
					<nav className='flex flex-wrap items-center text-sm text-gray-500 mb-6 gap-2'>
						<Link href='/' className='hover:text-blue-600 hover:underline'>
							Strona główna
						</Link>
						<ChevronRight size={14} className='text-gray-400' />

						<Link href={`/kategoria/${company.category.slug}`} className='hover:text-blue-600 hover:underline'>
							{company.category.name}
						</Link>

						{company.city && (
							<>
								<ChevronRight size={14} className='text-gray-400' />
								<Link
									href={`/kategoria/${company.category.slug}/${company.city
										.toLowerCase()
										.normalize('NFD')
										.replace(/[\u0300-\u036f]/g, '')
										.replace(/ł/g, 'l')
										.replace(/[^a-z0-9]+/g, '-')}`}
									className='hover:text-blue-600 hover:underline'
								>
									{company.category.name} {company.city}
								</Link>
							</>
						)}

						<ChevronRight size={14} className='text-gray-400' />
						<span className='font-semibold text-gray-900 truncate max-w-[200px]'>{company.name}</span>
					</nav>

					<div className='flex flex-col md:flex-row gap-8'>
						{/* LOGO */}
						<div className='flex-shrink-0'>
							{company.logo ? (
								<div className='w-32 h-32 relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm'>
									<Image src={company.logo} alt={`Logo ${getInitial(company.name)}`} fill className='object-cover' />
								</div>
							) : (
								<div className='w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-sm'>
									{company.name.charAt(0)}
								</div>
							)}
						</div>

						{/* DANE GŁÓWNE */}
						<div className='flex-grow'>
							<div className='flex flex-wrap gap-3 mb-3'>
								{/* --- 2. KATEGORIA JAKO LINK (SEO) --- */}
								<Link
									href={`/kategoria/${company.category.slug}`}
									className='bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors'
								>
									{company.category.name}
								</Link>

								{company.nip && (
									<span className='bg-gray-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-gray-200 text-gray-600'>
										<FileText size={12} /> NIP: {company.nip}
									</span>
								)}

								{company.isVerified && (
									<span className='bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-100'>
										<CheckCircle size={12} /> Zweryfikowana
									</span>
								)}
							</div>

							<h1 className='text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 leading-tight'>{company.name}</h1>

							<div className='flex flex-wrap gap-4 text-sm text-gray-600'>
								{company.city && (
									<div className='flex items-center gap-2'>
										<MapPin size={16} className='text-gray-400' /> {company.city}, {company.address}
									</div>
								)}
								{company.website && (
									<a
										href={company.website}
										target='_blank'
										className='flex items-center gap-2 text-blue-600 hover:underline'
									>
										<Globe size={16} /> Strona www
									</a>
								)}
							</div>
						</div>

						{/* AKCJE */}
						<div className='bg-gray-50 p-6 rounded-2xl w-full md:w-[300px] md:min-w-[300px] md:max-w-[300px] shrink-0 border border-gray-100 h-fit space-y-3 text-center'>
							{company.phone && <PhoneRevealButton phone={company.phone} companyId={company.id} />}

							<a
								href={company.email ? `mailto:${company.email}` : '/kontakt'}
								className='flex items-center justify-center gap-2 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors'
							>
								<Mail size={18} /> Wyślij wiadomość
							</a>

							{!company.isVerified && (
								<div className='pt-3 border-t border-gray-200 text-center'>
									<p className='text-amber-800/90 text-xs mb-3'>
										<strong>To Twoja firma?</strong> Przejmij profil, aby edytować dane i odpowiadać na opinie.
									</p>
									<Link
										href={`/przejmij/${company.id}`}
										className='inline-flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-sm hover:shadow transition-all text-sm'
									>
										Zarządzaj profilem →
									</Link>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* TREŚĆ GŁÓWNA */}
			<main className='container mx-auto px-4 py-12 max-w-5xl grid lg:grid-cols-3 gap-12'>
				<div className='lg:col-span-2 space-y-12'>
					{/* Opis */}
					<section className='bg-white p-8 rounded-3xl shadow-sm border border-gray-100'>
						<h2 className='text-2xl font-bold mb-4 text-gray-900'>O firmie</h2>
						<div className='prose prose-blue text-gray-600 leading-relaxed whitespace-pre-line'>
							{company.description || 'Ta firma nie dodała jeszcze szczegółowego opisu swojej działalności.'}

							{/* --- 3. SEO TEXT INJECTION --- */}
							<p className='mt-6 text-gray-500 italic text-sm border-t pt-4 border-gray-100'>
								Świadczymy usługi w lokalizacji {company.city} i okolicach. Zapraszamy do kontaktu telefonicznego lub
								mailowego w celu ustalenia szczegółów współpracy.
							</p>
						</div>
					</section>

					{/* Sekcja Opinii */}
					<ReviewSection reviews={company.reviews} companyId={company.id} companySlug={company.slug} />
				</div>

				{/* Sidebar */}
				<aside className='space-y-8'>
					<div className='bg-white p-2 rounded-3xl overflow-hidden shadow-sm border border-gray-100'>
						<iframe
							loading='lazy'
							referrerPolicy='no-referrer-when-downgrade'
							className='w-full h-64 rounded-2xl grayscale hover:grayscale-0 transition-all duration-500'
							src={`https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`}
						/>
						<div className='p-4'>
							<p className='font-bold text-gray-900'>{company.address}</p>
							<p className='text-sm text-gray-500'>
								{company.city}, {company.zip}
							</p>
						</div>
					</div>

<OpeningHoursDisplay hours={company.openingHours as OpeningHours | null} />
				</aside>
			</main>
			<CityCrossLinks city={company.city || undefined} />
			<Footer />
		</div>
	)
}
