'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface CategorySearchProps {
  categories: Category[]
  name: string
  required?: boolean
  defaultValue?: string
}

export function CategorySearch({ categories, name, required = false, defaultValue = '' }: CategorySearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    defaultValue ? categories.find(c => c.id === defaultValue) || null : null
  )
  const [filteredCategories, setFilteredCategories] = useState(categories)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filtruj kategorie na podstawie wyszukiwania
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredCategories(
        categories.filter(cat => 
          cat.name.toLowerCase().includes(term)
        )
      )
    }
  }, [searchTerm, categories])

  // Zamknij dropdown gdy klikniesz poza nim
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (category: Category) => {
    setSelectedCategory(category)
    setIsOpen(false)
    setSearchTerm('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedCategory(null)
    setSearchTerm('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Ukryte pole dla formularza */}
      <input
        type="hidden"
        name={name}
        value={selectedCategory?.id || ''}
        required={required}
      />

      {/* Pole wyszukiwania */}
      <div
        className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm cursor-text flex items-center gap-2"
        onClick={() => {
          setIsOpen(true)
          inputRef.current?.focus()
        }}
      >
        <Search className="text-gray-400 shrink-0" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : (selectedCategory?.name || '')}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedCategory ? selectedCategory.name : "Wyszukaj kategorię..."}
          className="flex-1 bg-transparent outline-none placeholder-gray-400"
        />
        {selectedCategory && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        )}
        <ChevronDown
          className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          size={18}
        />
      </div>

      {/* Dropdown z wynikami */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="text-sm">Nie znaleziono kategorii</p>
              <p className="text-xs mt-1">Spróbuj innej frazy</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                    selectedCategory?.id === category.id ? 'bg-blue-50 font-semibold' : ''
                  }`}
                >
                  <span className="text-gray-900">{category.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
