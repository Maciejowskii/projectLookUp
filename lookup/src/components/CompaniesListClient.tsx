'use client'

import React, { useRef, useCallback, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { CompanyListVirtualized } from './CompanyListVirtualized'
import { CompanyListSkeleton } from './CompanyListSkeleton'
import { MapPin } from 'lucide-react'

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

interface CompaniesListClientProps {
	initialDomain?: string
	initialTenantId?: string
	initialQuery?: string
	initialCity?: string
	slugifyCity?: (city: string) => string
}

async function fetchCompanies({
	pageParam = 1,
	domain,
	tenantId,
	query,
	city,
}: {
	pageParam?: number
	domain?: string
	tenantId?: string
	query?: string
	city?: string
}) {
	const params = new URLSearchParams({
		page: String(pageParam),
		limit: '50',
	})
	if (domain) params.set('domain', domain)
	if (tenantId) params.set('tenantId', tenantId)
	if (query) params.set('q', query)
	if (city) params.set('city', city)

	const response = await fetch(`/api/companies?${params.toString()}`)
	if (!response.ok) {
		throw new Error('Failed to fetch companies')
	}
	return response.json()
}

export const CompaniesListClient = React.memo(function CompaniesListClient({
	initialDomain,
	initialTenantId,
	initialQuery,
	initialCity,
	slugifyCity = (city: string) =>
		city
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
			.replace(/ą/g, 'a')
			.replace(/ć/g, 'c')
			.replace(/ę/g, 'e')
			.replace(/ł/g, 'l')
			.replace(/ń/g, 'n')
			.replace(/ó/g, 'o')
			.replace(/ś/g, 's')
			.replace(/ź/g, 'z')
			.replace(/ż/g, 'z'),
}: CompaniesListClientProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		status,
		isLoading,
	} = useInfiniteQuery({
		queryKey: ['companies', initialDomain, initialTenantId, initialQuery, initialCity],
		queryFn: ({ pageParam }) =>
			fetchCompanies({
				pageParam,
				domain: initialDomain,
				tenantId: initialTenantId,
				query: initialQuery,
				city: initialCity,
			}),
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			return lastPage.pagination.hasNextPage
				? lastPage.pagination.page + 1
				: undefined
		},
		staleTime: 5 * 60 * 1000, // 5 minut
		gcTime: 10 * 60 * 1000, // 10 minut
	})

	// Infinite scroll - obserwuj scroll container
	useEffect(() => {
		const container = containerRef.current
		if (!container || !hasNextPage || isFetchingNextPage) return

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = container
			// Załaduj więcej gdy użytkownik jest 200px od końca
			if (scrollHeight - scrollTop - clientHeight < 200) {
				fetchNextPage()
			}
		}

		// Throttle scroll events
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

		container.addEventListener('scroll', throttledHandleScroll, { passive: true })
		return () => {
			container.removeEventListener('scroll', throttledHandleScroll)
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	// Flatten all pages into single array
	const companies = React.useMemo(() => {
		return data?.pages.flatMap((page) => page.data) || []
	}, [data])

	if (status === 'pending' || isLoading) {
		return (
			<div className="p-4">
				<CompanyListSkeleton />
			</div>
		)
	}

	if (status === 'error') {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center px-4">
				<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
					<MapPin size={32} className="text-gray-400" />
				</div>
				<h3 className="text-lg font-bold text-gray-900">Błąd ładowania</h3>
				<p className="text-sm text-gray-500 max-w-xs mt-1">
					Nie udało się załadować firm. Spróbuj odświeżyć stronę.
				</p>
			</div>
		)
	}

	if (companies.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center px-4">
				<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
					<MapPin size={32} className="text-gray-400" />
				</div>
				<h3 className="text-lg font-bold text-gray-900">Brak wyników</h3>
				<p className="text-sm text-gray-500 max-w-xs mt-1">
					Nie znaleźliśmy firm spełniających Twoje kryteria w tym katalogu.
				</p>
			</div>
		)
	}

	return (
		<div
			ref={containerRef}
			className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300"
		>
			<div className="p-4">
				<CompanyListVirtualized
					companies={companies}
					containerRef={containerRef}
					slugifyCity={slugifyCity}
				/>
			</div>
			{isFetchingNextPage && (
				<div className="p-4">
					<CompanyListSkeleton />
				</div>
			)}
		</div>
	)
})
