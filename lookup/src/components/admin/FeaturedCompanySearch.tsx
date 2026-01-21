'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Building2, MapPin, Check } from 'lucide-react'

interface Company {
	id: string
	name: string
	city: string | null
	slug: string
}

interface FeaturedCompanySearchProps {
	defaultValue?: string
	defaultCompanyName?: string
}

export function FeaturedCompanySearch({ defaultValue, defaultCompanyName }: FeaturedCompanySearchProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [results, setResults] = useState<Company[]>([])
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(
		defaultValue && defaultCompanyName
			? { id: defaultValue, name: defaultCompanyName, city: null, slug: '' }
			: null
	)
	const [isOpen, setIsOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const searchTimeoutRef = useRef<NodeJS.Timeout>()
	const wrapperRef = useRef<HTMLDivElement>(null)

	// Zamykanie dropdown przy kliknięciu poza
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	// Wyszukiwanie z debounce
	useEffect(() => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current)
		}

		if (searchQuery.length < 2) {
			setResults([])
			setIsOpen(false)
			return
		}

		setIsLoading(true)
		searchTimeoutRef.current = setTimeout(async () => {
			try {
				const response = await fetch(`/api/admin/search-companies?q=${encodeURIComponent(searchQuery)}&limit=20`)
				const data = await response.json()
				setResults(data.companies || [])
				setIsOpen(true)
			} catch (error) {
				console.error('Error searching companies:', error)
				setResults([])
			} finally {
				setIsLoading(false)
			}
		}, 300)

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
			}
		}
	}, [searchQuery])

	const handleSelectCompany = (company: Company) => {
		setSelectedCompany(company)
		setSearchQuery('')
		setIsOpen(false)
		setResults([])
	}

	const handleClear = () => {
		setSelectedCompany(null)
		setSearchQuery('')
		setIsOpen(false)
		setResults([])
	}

	return (
		<div ref={wrapperRef} className="relative">
			{/* Ukryte pole dla formularza */}
			<input type="hidden" name="featured_company_id" value={selectedCompany?.id || ''} />

			{/* Wyświetlanie wybranej firmy */}
			{selectedCompany ? (
				<div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<Check className="text-green-600" size={18} />
							<span className="font-bold text-gray-900">{selectedCompany.name}</span>
						</div>
						{selectedCompany.city && (
							<div className="flex items-center gap-1 text-sm text-gray-600">
								<MapPin size={14} />
								{selectedCompany.city}
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={handleClear}
						className="p-2 hover:bg-green-100 rounded-lg transition-colors"
						title="Usuń wybór"
					>
						<X size={18} className="text-gray-600" />
					</button>
				</div>
			) : (
				/* Pole wyszukiwania */
				<div className="relative">
					<div className="relative">
						<Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
							placeholder="Wyszukaj firmę (min. 2 znaki)..."
							className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
						/>
						{isLoading && (
							<div className="absolute right-4 top-3.5">
								<div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
							</div>
						)}
					</div>

					{/* Dropdown z wynikami */}
					{isOpen && results.length > 0 && (
						<div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
							{results.map((company) => (
								<button
									key={company.id}
									type="button"
									onClick={() => handleSelectCompany(company)}
									className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
								>
									<div className="flex items-center gap-3">
										<Building2 className="text-blue-600 flex-shrink-0" size={18} />
										<div className="flex-1 min-w-0">
											<div className="font-semibold text-gray-900 truncate">{company.name}</div>
											{company.city && (
												<div className="flex items-center gap-1 text-sm text-gray-500">
													<MapPin size={12} />
													{company.city}
												</div>
											)}
										</div>
									</div>
								</button>
							))}
						</div>
					)}

					{isOpen && searchQuery.length >= 2 && !isLoading && results.length === 0 && (
						<div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-center text-gray-500">
							Brak wyników dla "{searchQuery}"
						</div>
					)}
				</div>
			)}
		</div>
	)
}
