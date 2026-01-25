'use client'

import { QueryClient } from '@tanstack/react-query'

// Konfiguracja React Query z optymalnymi ustawieniami cache
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Stale-while-revalidate: dane są uważane za "stale" po 5 minutach
			// ale nadal są zwracane z cache podczas refetch w tle
			staleTime: 5 * 60 * 1000, // 5 minut
			// Cache time: dane pozostają w cache przez 10 minut po ostatnim użyciu
			gcTime: 10 * 60 * 1000, // 10 minut (dawniej cacheTime)
			// Refetch w tle gdy okno zyskuje focus
			refetchOnWindowFocus: false,
			// Refetch przy reconnect
			refetchOnReconnect: true,
			// Retry: 1 próba przy błędzie
			retry: 1,
			// Retry delay: exponential backoff
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		},
	},
})
