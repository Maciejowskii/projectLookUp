"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin } from "lucide-react";

export const HomeSearchBar = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Budujemy URL: /szukaj?q=hydraulik&city=Warszawa
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("city", location);

    if (params.toString()) {
      router.push(`/szukaj?${params.toString()}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="bg-white p-2 rounded-2xl shadow-xl border border-gray-200 flex flex-col md:flex-row gap-2 max-w-2xl mx-auto"
    >
      <div className="flex-1 flex items-center px-4 h-14 bg-gray-50 rounded-xl">
        <Search className="text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Usługa, np. Hydraulik"
          className="bg-transparent w-full outline-none font-medium text-gray-900 placeholder:text-gray-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex-1 flex items-center px-4 h-14 bg-gray-50 rounded-xl">
        <MapPin className="text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Miasto, np. Warszawa"
          className="bg-transparent w-full outline-none font-medium text-gray-900 placeholder:text-gray-400"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200"
      >
        Szukaj
      </button>
    </form>
  );
};
