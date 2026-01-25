'use client'

import React, { useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'
import { MapPin, Star, ShieldCheck, Info } from 'lucide-react'
import Image from 'next/image'

type Company = {
	id: string
	name: string
	slug: string
	description: string | null
	address: string | null
	city: string | null
	logo: string | null
	isVerified: boolean
	plan: 'FREE' | 'PREMIUM'
	premiumUntil: Date | null
	reviewCount: number
	averageRating: number
	category: {
		name: string
		slug: string
	}
}

interface CompanyListVirtualizedProps {
	companies: Company[]
	containerRef: React.RefObject<HTMLDivElement>
	slugifyCity?: (city: string) => string
}

export const CompanyListVirtualized = React.memo(function CompanyListVirtualized({
	companies,
	containerRef,
	slugifyCity = (city: string) => city.toLowerCase().trim().replace(/\s+/g, '-'),
}: CompanyListVirtualizedProps) {
	const virtualizer = useVirtualizer({
		count: companies.length,
		getScrollElement: () => containerRef.current,
		estimateSize: () => 180, // Szacowana wysokość karty
		overscan: 5, // Renderuj 5 dodatkowych elementów poza widocznym obszarem
	})

	const items = virtualizer.getVirtualItems()

	return (
		<div
			style={{
				height: `${virtualizer.getTotalSize()}px`,
				width: '100%',
				position: 'relative',
			}}
		>
			{items.map((virtualRow) => {
				const company = companies[virtualRow.index]
				return (
					<div
						key={virtualRow.key}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							height: `${virtualRow.size}px`,
							transform: `translateY(${virtualRow.start}px)`,
						}}
					>
						<CompanyCard company={company} slugifyCity={slugifyCity} />
					</div>
				)
			})}
		</div>
	)
})

const CompanyCard = React.memo(function CompanyCard({
	company,
	slugifyCity,
}: {
	company: Company
	slugifyCity: (city: string) => string
}) {
	return (
		<Link
			href={`/${slugifyCity(company.city ?? '')}/${company.slug}`}
			className="group block bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm md:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] md:hover:border-blue-400 active:bg-gray-50 active:scale-[0.98] transition-all duration-200 relative overflow-hidden mb-3 touch-manipulation"
		>
			{company.plan === 'PREMIUM' && (
				<div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
			)}

			<div className="flex justify-between items-start gap-3">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-1.5 py-0.5 rounded">
							{company.category.name}
						</span>
						{company.plan === 'PREMIUM' && (
							<span className="flex items-center gap-0.5 text-[10px] text-green-700 font-bold">
								<ShieldCheck size={12} /> Zweryfikowana
							</span>
						)}
					</div>

					<h3 className="font-bold text-gray-900 text-base md:text-lg leading-snug md:group-hover:text-blue-600 transition-colors">
						{company.name}
					</h3>

					<div className="mt-2 flex items-center text-xs md:text-sm text-gray-500 gap-1.5">
						<MapPin size={14} className="flex-shrink-0" />
						<span className="truncate">
							{company.address}, {company.city}
						</span>
					</div>
				</div>
			</div>

			<div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
				{company.reviewCount > 0 ? (
					<div className="flex items-center gap-1.5">
						<span className="font-semibold text-gray-900 text-xs md:text-sm">
							{company.averageRating.toFixed(1).replace('.', ',')}
						</span>
						<div className="flex gap-0.5">
							{[1, 2, 3, 4, 5].map((i) => (
								<Star
									key={i}
									size={12}
									className={
										i <= Math.round(company.averageRating)
											? 'text-amber-400 fill-amber-400'
											: 'text-gray-200'
									}
								/>
							))}
						</div>
						<span className="text-gray-500 text-[10px] md:text-xs">({company.reviewCount})</span>
						<span title="Średnia ocena z opinii">
							<Info size={12} className="text-gray-400 hidden md:block" />
						</span>
					</div>
				) : (
					<span className="text-[10px] md:text-xs text-gray-400">Brak opinii</span>
				)}
				<span className="text-[10px] md:text-xs font-medium text-blue-600 md:group-hover:underline">
					Zobacz szczegóły →
				</span>
			</div>
		</Link>
	)
})
