import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { cookies } from 'next/headers'
import type { Adapter } from 'next-auth/adapters'

// Check if NextAuth is properly configured
const isNextAuthConfigured = !!process.env.NEXTAUTH_SECRET

// Try to use Prisma adapter, but fallback gracefully if tables don't exist
let adapter: Adapter | undefined
if (isNextAuthConfigured) {
	try {
		// Test if adapter can be created (tables might not exist)
		adapter = PrismaAdapter(prisma) as Adapter
	} catch (error) {
		console.warn('NextAuth Prisma adapter initialization failed. Using JWT strategy instead.')
		console.warn('Run migration to create Account and Session tables: npx prisma migrate dev --name add-oauth-support')
		adapter = undefined
	}
}

// Strategy must be a literal type, not a variable string
const strategy: 'jwt' | 'database' = adapter ? 'database' : 'jwt'

// Helper function to get providers list without initializing full authOptions
export function getProviders() {
	return [
		...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
			? [
					GoogleProvider({
						clientId: process.env.GOOGLE_CLIENT_ID,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET,
					}),
			  ]
			: []),
		...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
			? [
					FacebookProvider({
						clientId: process.env.FACEBOOK_CLIENT_ID,
						clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
					}),
			  ]
			: []),
	]
}

const authOptions = {
	...(adapter && { adapter }),
	secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only',
	trustHost: true,
	providers: getProviders(),
	callbacks: {
		async signIn({ user, account, profile }: { user: any; account?: any; profile?: any }) {
			// Allow sign in
			return true
		},
		async session({ session, user, token }: { session: any; user?: any; token?: any }) {
			// Add user id to session
			// For database strategy, user is available
			// For JWT strategy, use token
			if (session.user) {
				if (user) {
					;(session.user as any).id = user.id
				} else if (token) {
					;(session.user as any).id = (token as any).id
				}
			}
			return session
		},
		async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
			// Add user id to token (for JWT strategy)
			if (user) {
				token.id = user.id
			}
			return token
		},
	},
	pages: {
		signIn: '/strefa-partnera',
		error: '/strefa-partnera',
	},
	session: {
		strategy,
		maxAge: 60 * 60 * 24 * 7, // 7 days
	},
	events: {
		async signIn({ user, account, isNewUser }: { user: any; account?: any; isNewUser?: boolean }) {
			// Set session cookie after OAuth sign in
			// Note: cookies() can only be called during request handling
			try {
				if (user?.id) {
					const cookieStore = await cookies()
					cookieStore.set('session_user_id', user.id, {
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						maxAge: 60 * 60 * 24 * 7,
						path: '/',
					})

					// Track new user registration through OAuth
					if (isNewUser && user?.email) {
						const { trackUserRegistration } = await import('@/actions/trackLead')
						trackUserRegistration(user.id, user.email, user.name).catch(err =>
							console.error('Błąd zapisu leada rejestracji OAuth:', err)
						)
					}
				}
			} catch (error) {
				// Silently fail if cookies() is not available (e.g., during initialization)
				console.warn('Could not set session cookie:', error)
			}
		},
	},
} satisfies NextAuthConfig

// Export NextAuth handlers and functions for NextAuth v5
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)

// Also export authOptions for backward compatibility
export { authOptions }
