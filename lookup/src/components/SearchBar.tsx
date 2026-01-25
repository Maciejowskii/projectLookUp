"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Search } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import React from "react";

export const SearchBar = React.memo(function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Debounce search input - 400ms delay
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      if (value.trim()) {
        router.push(`/szukaj?q=${encodeURIComponent(value)}`);
      }
    },
    400
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/szukaj?q=${encodeURIComponent(query)}`);
      }
    },
    [query, router]
  );

  // Sync with URL params
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams, query]);

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <Search className="absolute left-4 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Czego szukasz? Np. mechanik, hydraulik, nazwa firmy..."
          className="w-full py-4 pl-12 pr-4 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          value={query}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="absolute right-2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors"
        >
          Szukaj
        </button>
      </div>
    </form>
  );
});
