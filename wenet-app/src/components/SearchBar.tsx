"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce"; // Zaraz to doinstalujemy

export default function SearchBar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Funkcja debounced - uruchamia się dopiero jak przestaniesz pisać (żeby nie katować bazy co literę)
  const handleSearch = useDebouncedCallback(
    (term: string, type: "q" | "city") => {
      const params = new URLSearchParams(searchParams);

      if (term) {
        params.set(type, term);
      } else {
        params.delete(type);
      }

      // Resetujemy paginację przy nowym szukaniu (jak zrobisz paginację w przyszłości)
      // params.set('page', '1');

      replace(`${pathname}?${params.toString()}`);
    },
    300
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Czego szukasz?
        </label>
        <input
          type="text"
          placeholder="Np. opony, wymiana oleju..."
          className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue={searchParams.get("q")?.toString()}
          onChange={(e) => handleSearch(e.target.value, "q")}
        />
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Miasto
        </label>
        <input
          type="text"
          placeholder="Np. Warszawa"
          className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue={searchParams.get("city")?.toString()}
          onChange={(e) => handleSearch(e.target.value, "city")}
        />
      </div>
    </div>
  );
}
