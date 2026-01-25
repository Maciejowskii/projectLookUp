'use client'

import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, MapPin, Star, Info } from 'lucide-react'
import { CompanyGridSkeleton } from './CompanyListSkeleton'

async function fetchSearchResults({
	pageParam = 1,
	query,
	city,
}: {
	pageParam?: number
	query?: string
	city?: string
}) {
	const params = new URLSearchParams({
		page: String(pageParam),
		limit: '50',
	})
	if (query) params.set('q', query)
	if (city) params.set('city', city)

	const response = await fetch(`/api/companies?${params.toString()}`)
	if (!response.ok) {
		throw new Error('Failed to fetch companies')
	}
	return response.json()
}

export function SearchResultsList({
	query,
	city,
	totalResults,
}: {
	query: string
	city?: string
	totalResults: number
}) {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		status,
		isLoading,
	} = useInfiniteQuery({
		queryKey: ['search-companies', query, city],
		queryFn: ({ pageParam }) =>
			fetchSearchResults({ pageParam, query, city }),
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			return lastPage.pagination.hasNextPage
				? lastPage.pagination.page + 1
				: undefined
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	})

	// Infinite scroll
	React.useEffect(() => {
		if (!hasNextPage || isFetchingNextPage) return

		const handleScroll = () => {
			if (
				window.innerHeight + window.scrollY >=
				document.documentElement.scrollHeight - 500
			) {
				fetchNextPage()
			}
		}

		let ticking = false
		const throttledHandleScroll = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					handleScroll()
					ticking = false
				})
				ticking = true
			}
		}

		window.addEventListener('scroll', throttledHandleScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', throttledHandleScroll)
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	const companies = React.useMemo(() => {
		return data?.pages.flatMap((page) => page.data) || []
	}, [data])

	if (status === 'pending' || isLoading) {
		return <CompanyGridSkeleton />
	}

	if (status === 'error') {
		return (
			<div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
				<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
					<Search size={32} />
				</div>
				<h3 className="text-lg font-bold text-gray-900">Błąd ładowania</h3>
				<p className="text-gray-500">Spróbuj odświeżyć stronę.</p>
			</div>
		)
	}

	if (companies.length === 0) {
		return (
			<div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
				<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
					<Search size={32} />
				</div>
				<h3 className="text-lg font-bold text-gray-900">Nic nie znaleziono</h3>
				<p className="text-gray-500">
					Spróbuj wpisać inne słowa kluczowe lub sprawdź pisownię.
				</p>
			</div>
		)
	}

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{companies.map((company: any) => (
					<Link
						key={company.id}
						href={`/firma/${company.slug}`}
						className="block bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group"
					>
						<div className="flex justify-between items-start mb-4">
							<div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
								{company.category.name}
							</div>
						</div>

						<h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
							{company.name}
						</h2>
						<p className="text-sm text-gray-500 mb-4 line-clamp-2">
							{company.description || 'Brak opisu.'}
						</p>

						<div className="space-y-2 text-sm text-gray-600">
							{company.city && (
								<div className="flex items-center gap-2">
									<MapPin size={14} className="text-gray-400" />
									{company.city}
								</div>
							)}
							{company.reviewCount > 0 && (
								<div className="flex items-center gap-2 flex-wrap">
									<span className="font-semibold text-gray-900">
										{company.averageRating.toFixed(1).replace('.', ',')}
									</span>
									<div className="flex items-center gap-0.5">
										{[1, 2, 3, 4, 5].map((i) => (
											<Star
												key={i}
												size={16}
												className={
													i <= Math.round(company.averageRating)
														? 'text-amber-400 fill-amber-400'
														: 'text-gray-200'
												}
											/>
										))}
									</div>
									<span className="text-gray-500">({company.reviewCount})</span>
									<span title="Średnia ocena z opinii klientów">
										<Info size={14} className="text-gray-400" />
									</span>
								</div>
							)}
						</div>
					</Link>
				))}
			</div>
			{isFetchingNextPage && (
				<div className="mt-6">
					<CompanyGridSkeleton />
				</div>
			)}
		</>
	)
}
