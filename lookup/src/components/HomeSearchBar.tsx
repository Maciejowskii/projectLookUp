"use client";

import { Search, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);

    router.push(`/szukaj?${params.toString()}`);
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <label id="home-search-label" className="block text-center mb-2">
        <span className="text-base font-semibold text-gray-700 tracking-tight">
          Wyszukaj firmę lub usługę
        </span>
      </label>
      <p className="text-center text-sm text-gray-500 mb-5">
        Wpisz branżę i miasto, np. hydraulik Warszawa
      </p>
      <form
        onSubmit={handleSearch}
        role="search"
        aria-labelledby="home-search-label"
        className="bg-white rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 max-w-3xl mx-auto border border-gray-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow duration-200"
      >
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Branża lub usługa, np. fryzjer, hydraulik"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-colors text-[15px]"
            aria-label="Czego szukasz (branża lub usługa)"
          />
        </div>
        <div className="hidden md:block w-px h-10 bg-gray-200 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0 relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} aria-hidden />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Miasto lub region"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-colors text-[15px]"
            aria-label="Miejscowość"
          />
        </div>
        <button
          type="submit"
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-sm hover:shadow-md active:scale-[0.99] flex items-center justify-center gap-2 shrink-0"
        >
          <Search size={18} aria-hidden />
          Szukaj firm
        </button>
      </form>
    </div>
  );
}
