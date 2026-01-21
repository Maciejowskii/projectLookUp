import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Sparkles, ArrowRight } from 'lucide-react'

export async function FeaturedCompanyBanner() {
	// Pobierz ID wyróżnionej firmy z ustawień
	const setting = await prisma.setting.findUnique({
		where: { key: 'featured_company_id' },
	})

	if (!setting?.value) {
		return null
	}

	// Pobierz dane firmy
	const company = await prisma.company.findUnique({
		where: { id: setting.value },
		select: {
			id: true,
			name: true,
			slug: true,
		},
	})

	if (!company) {
		return null
	}

	return (
		<div className='w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md sticky top-[73px] md:top-[85px] z-40'>
			<div className='max-w-7xl mx-auto px-6 py-2.5'>
				<Link
					href={`/firma/${company.slug}`}
					className='flex items-center justify-center gap-2.5 group hover:opacity-95 transition-opacity'
				>
					<Sparkles size={16} className='text-yellow-300 animate-pulse flex-shrink-0' />
					<span className='text-xs md:text-sm font-semibold tracking-wide text-center'>
						Najlepsza Agencja SEO/SEM w 2025 roku
					</span>
					<ArrowRight
						size={14}
						className='opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0'
					/>
				</Link>
			</div>
		</div>
	)
}
