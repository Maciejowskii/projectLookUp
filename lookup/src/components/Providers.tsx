'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { queryClient } from '@/lib/queryClient'

export function Providers({ children }: { children: React.ReactNode }) {
	const [mounted, setMounted] = useState(false)
	const [nextAuthAvailable, setNextAuthAvailable] = useState(false)

	useEffect(() => {
		setMounted(true)
		
		// Check if NextAuth endpoint is available by testing /api/auth/session
		fetch('/api/auth/session', {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
		})
			.then(async (res) => {
				if (res.ok) {
					const text = await res.text()
					// Check if response is valid JSON
					if (text && text.trim() !== '') {
						try {
							JSON.parse(text)
							setNextAuthAvailable(true)
						} catch {
							// Not valid JSON, NextAuth not configured
							setNextAuthAvailable(false)
						}
					} else {
						// Empty response, NextAuth not configured
						setNextAuthAvailable(false)
					}
				} else {
					setNextAuthAvailable(false)
				}
			})
			.catch(() => {
				// NextAuth is not configured or not available
				setNextAuthAvailable(false)
			})
	}, [])

	// Always wrap with QueryClientProvider (works in SSR too)
	// Only SessionProvider needs to wait for mount
	const content = (!mounted || !nextAuthAvailable) ? (
		<>{children}</>
	) : (
		<SessionProvider
			basePath='/api/auth'
			refetchInterval={0}
			refetchOnWindowFocus={false}
		>
			{children}
		</SessionProvider>
	)

	return (
		<QueryClientProvider client={queryClient}>
			{content}
		</QueryClientProvider>
	)
}
