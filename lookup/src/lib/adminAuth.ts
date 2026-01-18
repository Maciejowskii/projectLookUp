'use server'

import { cookies, headers } from 'next/headers'
import { prisma } from './prisma'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const ADMIN_SESSION_COOKIE = 'admin_session_token'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 godzin

// Typy
export interface AdminUser {
	id: string
	email: string
	name: string | null
	role: 'ADMIN' | 'SUPER_ADMIN'
}

export interface AdminSessionData {
	user: AdminUser
	sessionId: string
	expiresAt: Date
}

// Generowanie bezpiecznego tokena sesji
function generateSessionToken(): string {
	return randomBytes(32).toString('hex')
}

// Pobieranie IP i User Agent
async function getRequestInfo() {
	const headersList = await headers()
	const forwardedFor = headersList.get('x-forwarded-for')
	const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : headersList.get('x-real-ip') || 'unknown'
	const userAgent = headersList.get('user-agent') || 'unknown'
	return { ipAddress, userAgent }
}

// Logowanie admina
export async function adminLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
	try {
		// Znajdź użytkownika
		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
			select: { id: true, email: true, name: true, password: true, role: true },
		})

		// Sprawdź czy użytkownik istnieje
		if (!user) {
			// Celowo opóźnienie, aby zapobiec timing attacks
			await bcrypt.compare(password, '$2a$12$dummy.hash.to.prevent.timing.attacks')
			return { success: false, error: 'Nieprawidłowy email lub hasło' }
		}

		// Sprawdź czy użytkownik jest adminem
		if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
			return { success: false, error: 'Brak uprawnień administratora' }
		}

		// Sprawdź hasło
		if (!user.password) {
			return { success: false, error: 'Konto nie ma ustawionego hasła' }
		}

		const isValidPassword = await bcrypt.compare(password, user.password)
		if (!isValidPassword) {
			return { success: false, error: 'Nieprawidłowy email lub hasło' }
		}

		// Usuń stare sesje tego użytkownika (opcjonalnie - tylko jeśli chcesz single session)
		await prisma.adminSession.deleteMany({
			where: {
				userId: user.id,
				expiresAt: { lt: new Date() }, // Usuń tylko wygasłe
			},
		})

		// Utwórz nową sesję
		const token = generateSessionToken()
		const expiresAt = new Date(Date.now() + SESSION_DURATION)
		const { ipAddress, userAgent } = await getRequestInfo()

		await prisma.adminSession.create({
			data: {
				userId: user.id,
				token,
				ipAddress,
				userAgent,
				expiresAt,
			},
		})

		// Zapisz audit log
		await prisma.adminAuditLog.create({
			data: {
				userId: user.id,
				action: 'ADMIN_LOGIN',
				details: { ipAddress, userAgent },
				ipAddress,
			},
		})

		// Ustaw cookie
		const cookieStore = await cookies()
		cookieStore.set(ADMIN_SESSION_COOKIE, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			path: '/',
			expires: expiresAt,
		})

		return { success: true }
	} catch (error) {
		console.error('Admin login error:', error)
		return { success: false, error: 'Wystąpił błąd podczas logowania' }
	}
}

// Wylogowanie admina
export async function adminLogout(): Promise<void> {
	try {
		const cookieStore = await cookies()
		const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

		if (token) {
			// Pobierz sesję przed usunięciem dla audit logu
			const session = await prisma.adminSession.findUnique({
				where: { token },
				select: { userId: true },
			})

			// Usuń sesję z bazy
			await prisma.adminSession.delete({
				where: { token },
			}).catch(() => {})

			// Zapisz audit log
			if (session) {
				const { ipAddress } = await getRequestInfo()
				await prisma.adminAuditLog.create({
					data: {
						userId: session.userId,
						action: 'ADMIN_LOGOUT',
						ipAddress,
					},
				})
			}
		}

		// Usuń cookie
		cookieStore.delete(ADMIN_SESSION_COOKIE)
	} catch (error) {
		console.error('Admin logout error:', error)
	}
}

// Pobierz aktualną sesję admina
export async function getAdminSession(): Promise<AdminSessionData | null> {
	try {
		const cookieStore = await cookies()
		const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

		if (!token) {
			return null
		}

		const session = await prisma.adminSession.findUnique({
			where: { token },
			include: {
				user: {
					select: { id: true, email: true, name: true, role: true },
				},
			},
		})

		if (!session) {
			return null
		}

		// Sprawdź czy sesja nie wygasła
		if (session.expiresAt < new Date()) {
			await prisma.adminSession.delete({ where: { token } }).catch(() => {})
			cookieStore.delete(ADMIN_SESSION_COOKIE)
			return null
		}

		// Sprawdź czy użytkownik nadal jest adminem
		if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
			await prisma.adminSession.delete({ where: { token } }).catch(() => {})
			cookieStore.delete(ADMIN_SESSION_COOKIE)
			return null
		}

		return {
			user: {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name,
				role: session.user.role as 'ADMIN' | 'SUPER_ADMIN',
			},
			sessionId: session.id,
			expiresAt: session.expiresAt,
		}
	} catch (error) {
		console.error('Get admin session error:', error)
		return null
	}
}

// Sprawdź autoryzację admina (dla server actions)
export async function checkAdminAuth(): Promise<AdminUser> {
	const session = await getAdminSession()

	if (!session) {
		throw new Error('UNAUTHORIZED: Brak uprawnień administratora.')
	}

	return session.user
}

// Sprawdź autoryzację admina i przekieruj (dla stron)
export async function requireAdminAuth(): Promise<AdminSessionData> {
	const session = await getAdminSession()

	if (!session) {
		redirect('/admin/login')
	}

	return session
}

// Typ dla szczegółów audit logu - obsługuje zagnieżdżone obiekty
type AuditDetails = {
	[key: string]: string | number | boolean | null | undefined | AuditDetails | string[]
}

// Audit log helper - do użycia w server actions
export async function logAdminAction(
	userId: string,
	action: string,
	target?: string,
	details?: AuditDetails
) {
	try {
		const { ipAddress } = await getRequestInfo()
		await prisma.adminAuditLog.create({
			data: {
				userId,
				action,
				target,
				details: details ? JSON.parse(JSON.stringify(details)) : undefined,
				ipAddress,
			},
		})
	} catch (error) {
		console.error('Failed to log admin action:', error)
	}
}

// Utwórz admina (helper do seed/CLI)
export async function createAdminUser(email: string, password: string, name?: string): Promise<void> {
	const hashedPassword = await bcrypt.hash(password, 12)
	
	await prisma.user.upsert({
		where: { email: email.toLowerCase().trim() },
		update: {
			password: hashedPassword,
			role: 'ADMIN',
			name: name || undefined,
		},
		create: {
			email: email.toLowerCase().trim(),
			password: hashedPassword,
			role: 'ADMIN',
			name: name || 'Administrator',
		},
	})
}
