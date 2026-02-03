'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Building2, MapPin } from 'lucide-react'

interface Company {
  id: string
  name: string
  city: string | null
  slug: string
}

interface CompanyReviewsFilterProps {
  /** Gdy wybrano firmę – jej nazwa do wyświetlenia */
  selectedCompanyName?: string | null
}

export function CompanyReviewsFilter({ selectedCompanyName }: CompanyReviewsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Company[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (searchQuery.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/search-companies?q=${encodeURIComponent(searchQuery)}&limit=20`
        )
        const data = await res.json()
        setResults(data.companies || [])
        setIsOpen(true)
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery])

  const applyCompanyFilter = (companyId: string) => {
    const tab = searchParams.get('tab') || 'all'
    const params = new URLSearchParams()
    params.set('company', companyId)
    params.set('tab', tab)
    router.push(`/admin/reviews?${params.toString()}`)
    setSearchQuery('')
    setIsOpen(false)
    setResults([])
  }

  const clearCompanyFilter = () => {
    const tab = searchParams.get('tab') || 'all'
    const page = searchParams.get('page')
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (page && page !== '1') params.set('page', page)
    router.push(`/admin/reviews?${params.toString()}`)
  }

  if (selectedCompanyName) {
    return (
      <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
        <div className="flex-1">
          <span className="text-sm text-indigo-700 font-medium">Opinie dla firmy:</span>
          <p className="font-bold text-gray-900">{selectedCompanyName}</p>
        </div>
        <button
          type="button"
          onClick={clearCompanyFilter}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <X size={16} />
          Pokaż wszystkie
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
          placeholder="Sprawdź opinie firmy – wyszukaj (min. 2 znaki)..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder:text-gray-400"
        />
        {isLoading && (
          <div className="absolute right-4 top-3.5">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
          {results.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => applyCompanyFilter(company.id)}
              className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Building2 className="text-indigo-600 shrink-0" size={18} />
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
          Brak wyników dla &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  )
}
