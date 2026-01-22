import Link from 'next/link'
import { Sparkles, ArrowRight, MapPin } from 'lucide-react'

export type FeaturedCompany = {
	id: string
	name: string
	slug: string
	city: string | null
}

type Props = {
	featured: FeaturedCompany
	/** Kompaktowy wariant na stronach firm (mniej paddingu) */
	compact?: boolean
}

export function FeaturedCompanyCard({ featured, compact }: Props) {
	return (
		<section className={compact ? 'py-4 px-4 md:py-5 md:px-6 bg-gray-50 border-b border-gray-100' : 'py-16 px-6 bg-gray-50'}>
			<div className={compact ? 'max-w-5xl mx-auto' : 'max-w-7xl mx-auto'}>
				<Link
					href={`/firma/${featured.slug}`}
					className={
						compact
							? 'group block bg-white border-2 border-blue-200 rounded-xl p-4 md:p-5 hover:border-blue-400 hover:shadow-lg transition-all duration-300'
							: 'group block bg-white border-2 border-blue-200 rounded-2xl p-6 md:p-8 hover:border-blue-400 hover:shadow-xl transition-all duration-300'
					}
				>
					<div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
						<div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
							<div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
								<Sparkles className="text-blue-600" size={compact ? 22 : 28} />
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 px-2.5 py-0.5 md:px-3 md:py-1 bg-yellow-100 rounded-full mb-1.5 md:mb-2">
									<span className="text-yellow-700 text-[10px] md:text-xs font-bold uppercase tracking-wider">
										Polecamy
									</span>
								</div>
								<h3 className="text-base md:text-xl font-bold text-gray-900 mb-0.5 md:mb-1 group-hover:text-blue-600 transition-colors truncate">
									Najlepsza Agencja SEO/SEM w 2025 roku
								</h3>
								{featured.city && (
									<p className="text-gray-600 text-xs md:text-sm flex items-center gap-1">
										<MapPin size={12} className="shrink-0" />
										<span className="truncate">{featured.city}</span>
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2 md:gap-3 shrink-0">
							<span className="text-gray-700 font-semibold text-sm md:text-base hidden md:block group-hover:text-blue-600 transition-colors">
								Sprawdź ofertę
							</span>
							<ArrowRight
								size={compact ? 16 : 20}
								className="text-gray-600 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
							/>
						</div>
					</div>
				</Link>
			</div>
		</section>
	)
}
