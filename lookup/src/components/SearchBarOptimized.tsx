'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'

export const SearchBarOptimized = React.memo(function SearchBarOptimized() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [query, setQuery] = useState(searchParams.get('q') || '')

	// Debounce search input - 400ms delay
	const debouncedSearch = useDebouncedCallback(
		(value: string) => {
			if (value.trim()) {
				router.push(`/szukaj?q=${encodeURIComponent(value)}`)
			}
		},
		400
	)

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value
			setQuery(value)
			debouncedSearch(value)
		},
		[debouncedSearch]
	)

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (query.trim()) {
				router.push(`/szukaj?q=${encodeURIComponent(query)}`)
			}
		},
		[query, router]
	)

	// Sync with URL params
	useEffect(() => {
		const urlQuery = searchParams.get('q') || ''
		if (urlQuery !== query) {
			setQuery(urlQuery)
		}
	}, [searchParams])

	return (
		<form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
			<div className="relative flex items-center">
				<Search className="absolute left-3 md:left-4 text-gray-400 w-5 h-5 z-10" />
				<input
					type="search"
					inputMode="search"
					autoComplete="off"
					placeholder="Czego szukasz? Np. mechanik, hydraulik..."
					className="w-full py-3 md:py-4 pl-11 md:pl-12 pr-20 md:pr-24 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm text-gray-900 touch-manipulation"
					style={{ fontSize: '16px' }} // Prevent iOS zoom
					value={query}
					onChange={handleInputChange}
				/>
				<button
					type="submit"
					className="absolute right-2 bg-blue-600 text-white px-4 md:px-6 py-2 rounded-full active:bg-blue-700 transition-colors touch-manipulation min-h-[44px] text-sm md:text-base font-medium"
					aria-label="Szukaj"
				>
					<span className="hidden md:inline">Szukaj</span>
					<span className="md:hidden">🔍</span>
				</button>
			</div>
		</form>
	)
})
