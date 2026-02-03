'use client'

import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, MapPin, Star, ArrowRight } from 'lucide-react'

function getInitial(name: string) {
	const trimmed = name.trim()
	if (!trimmed) return '?'
	const first = trimmed[0].toUpperCase()
	const words = trimmed.split(/\s+/).filter(Boolean)
	if (words.length >= 2) {
		const second = words[1][0].toUpperCase()
		return first + second
	}
	return first
}
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
						className="group block bg-white rounded-2xl border border-gray-200/90 overflow-hidden hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-200"
					>
						<div className="p-5 md:p-6">
							{/* Nagłówek: avatar + kategoria */}
							<div className="flex items-start gap-4 mb-4">
								<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
									{getInitial(company.name)}
								</div>
								<div className="min-w-0 flex-1">
									<span className="inline-block text-xs font-medium text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-lg mb-1.5">
										{company.category.name}
									</span>
									<h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
										{company.name}
									</h2>
								</div>
							</div>

							<p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">
								{company.description || 'Brak opisu.'}
							</p>

							{/* Stopka: miasto + ocena */}
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-gray-100 text-sm">
								{company.city && (
									<span className="flex items-center gap-1.5 text-gray-500">
										<MapPin size={14} className="text-gray-400 shrink-0" />
										<span className="truncate">{company.city}</span>
									</span>
								)}
								{company.reviewCount > 0 && (
									<span className="flex items-center gap-1.5" title="Średnia ocena z opinii">
										<Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />
										<span className="font-semibold text-gray-900">
											{company.averageRating.toFixed(1).replace('.', ',')}
										</span>
										<span className="text-gray-400">({company.reviewCount})</span>
									</span>
								)}
							</div>

							<div className="mt-4 flex items-center text-blue-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0">
								Zobacz profil
								<ArrowRight size={14} className="ml-1 shrink-0" />
							</div>
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
