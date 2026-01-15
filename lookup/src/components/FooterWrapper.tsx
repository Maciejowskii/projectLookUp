import { Footer } from './Footer'
import { Suspense } from 'react'

// Server Component wrapper for Footer
// This ensures Footer (which uses Prisma) is not imported in Client Components
// Footer is async, so we wrap it in Suspense for Client Component compatibility
export function FooterWrapper() {
	return (
		<Suspense fallback={
			<footer className='bg-gray-950 text-gray-400 py-16 mt-20 border-t border-gray-900 font-sans'>
				<div className='container mx-auto px-4 text-center text-sm'>
					Ładowanie...
				</div>
			</footer>
		}>
			<Footer />
		</Suspense>
	)
}
