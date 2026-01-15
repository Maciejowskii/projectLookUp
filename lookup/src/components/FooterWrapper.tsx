import { Footer } from './Footer'

// Server Component wrapper for Footer
// This ensures Footer (which uses Prisma) is not imported in Client Components
export async function FooterWrapper() {
	return <Footer />
}
