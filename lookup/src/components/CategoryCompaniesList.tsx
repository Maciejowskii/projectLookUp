'use client'

import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import { CompanyCardSkeleton } from './CompanyListSkeleton'
import { safeDecode } from '@/lib/text'

const getInitial = (name?: string) => {
	const s = safeDecode((name ?? '').trim())
	const m = s.match(/[\p{L}\p{N}]/u)
	return (m?.[0] ?? '?').toUpperCase()
}

async function fetchCategoryCompanies({
	pageParam = 1,
	categoryId,
}: {
	pageParam?: number
	categoryId: string
}) {
	const params = new URLSearchParams({
		page: String(pageParam),
		limit: '50',
		categoryId,
	})

	const response = await fetch(`/api/companies?${params.toString()}`)
	if (!response.ok) {
		throw new Error('Failed to fetch companies')
	}
	return response.json()
}

export function CategoryCompaniesList({
	categoryId,
	totalCompanies,
}: {
	categoryId: string
	totalCompanies: number
}) {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		status,
		isLoading,
	} = useInfiniteQuery({
		queryKey: ['category-companies', categoryId],
		queryFn: ({ pageParam }) =>
			fetchCategoryCompanies({ pageParam, categoryId }),
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
		return (
			<div className='grid grid-cols-1 gap-6'>
				{Array.from({ length: 6 }).map((_, i) => (
					<CompanyCardSkeleton key={i} />
				))}
			</div>
		)
	}

	if (status === 'error') {
		return (
			<div className='text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200'>
				<h3 className='text-xl font-bold text-gray-400'>Błąd ładowania</h3>
				<p className='text-gray-400 mt-2'>Spróbuj odświeżyć stronę.</p>
			</div>
		)
	}

	if (companies.length === 0) {
		return (
			<div className='text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200'>
				<h3 className='text-xl font-bold text-gray-400'>Brak firm w tej kategorii</h3>
				<p className='text-gray-400 mt-2'>Bądź pierwszy i dodaj swoją firmę!</p>
				<Link
					href='/dodaj-firme'
					className='mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition'
				>
					Dodaj firmę
				</Link>
			</div>
		)
	}

	return (
		<>
			<div className='grid grid-cols-1 gap-6'>
				{companies.map((company: any) => (
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
			{isFetchingNextPage && (
				<div className='mt-6 grid grid-cols-1 gap-6'>
					{Array.from({ length: 3 }).map((_, i) => (
						<CompanyCardSkeleton key={i} />
					))}
				</div>
			)}
		</>
	)
}
