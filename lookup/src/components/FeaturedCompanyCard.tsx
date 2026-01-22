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
	if (compact) {
		return (
			<section className="bg-gray-50/80 border-b border-gray-100">
				<div className="max-w-5xl mx-auto px-4 py-2.5">
					<Link
						href={`/firma/${featured.slug}`}
						className="group flex items-center justify-between gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-white/60 transition-colors"
					>
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
								<Sparkles className="text-blue-600" size={14} />
							</div>
							<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
								<span className="inline-flex items-center gap-1 text-white text-xs font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-2.5 py-1 rounded-md shadow-lg border border-red-400/50 animate-pulse">
									<Sparkles size={10} className="text-white" />
									Polecamy
								</span>
								<span className="text-gray-900 font-semibold text-sm truncate group-hover:text-blue-600 transition-colors">
									Najlepsza Agencja SEO/SEM w 2025 roku
								</span>
								{featured.city && (
									<span className="text-gray-500 text-xs flex items-center gap-1 shrink-0">
										<MapPin size={10} /> {featured.city}
									</span>
								)}
							</div>
						</div>
						<span className="text-blue-600 text-xs font-semibold shrink-0 flex items-center gap-1 group-hover:underline">
							Sprawdź ofertę <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
						</span>
					</Link>
				</div>
			</section>
		)
	}

	return (
		<section className="py-16 px-6 bg-gray-50">
			<div className="max-w-7xl mx-auto">
				<Link
					href={`/firma/${featured.slug}`}
					className="group block bg-white border-2 border-blue-200 rounded-2xl p-6 md:p-8 hover:border-blue-400 hover:shadow-xl transition-all duration-300"
				>
					<div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
						<div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
							<div className="w-12 h-12 md:w-14 md:h-14 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
								<Sparkles className="text-blue-600" size={28} />
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-full mb-2 shadow-lg border border-red-400/50">
									<Sparkles size={12} className="text-white" />
									<span className="text-white text-xs font-black uppercase tracking-wider">Polecamy</span>
								</div>
								<h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
									Najlepsza Agencja SEO/SEM w 2025 roku
								</h3>
								{featured.city && (
									<p className="text-gray-600 text-sm flex items-center gap-1">
										<MapPin size={12} className="shrink-0" />
										{featured.city}
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-3 shrink-0">
							<span className="text-gray-700 font-semibold hidden md:block group-hover:text-blue-600 transition-colors">
								Sprawdź ofertę
							</span>
							<ArrowRight size={20} className="text-gray-600 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
						</div>
					</div>
				</Link>
			</div>
		</section>
	)
}
