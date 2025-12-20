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
    // Przekierowanie do /szukaj z parametrami
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);

    router.push(`/szukaj?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="bg-white p-2 rounded-2xl shadow-2xl shadow-blue-900/10 max-w-3xl mx-auto flex flex-col md:flex-row gap-2 border border-gray-100"
    >
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Czego szukasz? np. Fryzjer"
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-transparent focus:bg-gray-50 outline-none text-gray-900 font-medium transition-colors"
        />
      </div>
      <div className="w-px bg-gray-200 hidden md:block"></div>
      <div className="flex-1 relative">
        <MapPin className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Miejscowość np. Warszawa"
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-transparent focus:bg-gray-50 outline-none text-gray-900 font-medium transition-colors"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
      >
        Szukaj
      </button>
    </form>
  );
}
