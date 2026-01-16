'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

// --- 0. REJESTRACJA ---
export async function registerAction(formData: FormData) {
	const email = formData.get('email') as string
	const password = formData.get('password') as string
	const returnTo = formData.get('returnTo') as string | null

	if (!email || !password) {
		redirect('/rejestracja?error=' + encodeURIComponent('Wypełnij wszystkie pola') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		return
	}

	if (password.length < 8) {
		redirect('/rejestracja?error=' + encodeURIComponent('Hasło musi mieć minimum 8 znaków') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		return
	}

	try {
		// Sprawdź czy użytkownik już istnieje
		const existingUser = await prisma.user.findUnique({
			where: { email },
		})

		if (existingUser) {
			redirect('/rejestracja?error=' + encodeURIComponent('Użytkownik z tym emailem już istnieje') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
			return
		}

		// Hashowanie hasła
		const hashedPassword = await bcrypt.hash(password, 10)

		// Tworzenie użytkownika (bez przypisanej firmy - może claimować później)
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				emailVerified: new Date(), // Auto-verify dla uproszczenia (można zmienić na email verification)
			},
		})

		// Auto-login po rejestracji
		const cookieStore = await cookies()
		cookieStore.set('session_user_id', user.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})

		// Jeśli jest returnTo, przekieruj tam, w przeciwnym razie do dashboard
		if (returnTo) {
			redirect(returnTo)
		} else {
			redirect('/dashboard')
		}
	} catch (error) {
		// Sprawdź czy to błąd redirect z Next.js - jeśli tak, rzuć go dalej (nie łap go)
		if (error && typeof error === 'object' && 'digest' in error) {
			const digest = String((error as any).digest)
			// Next.js redirect errors mają digest zaczynający się od "NEXT_REDIRECT"
			if (digest.includes('NEXT_REDIRECT')) {
				throw error // Rzuć błąd redirect dalej - Next.js go obsłuży
			}
		}
		
		console.error('Registration error:', error)
		
		// Handle Prisma errors
		let errorMessage = 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.'
		if (error instanceof Error) {
			// Check for unique constraint violation (Prisma error code P2002)
			if (error.message.includes('Unique constraint') || error.message.includes('P2002') || error.message.includes('email')) {
				errorMessage = 'Użytkownik z tym emailem już istnieje'
			}
		}
		
		// redirect() automatycznie przerywa wykonanie w Next.js 15 Server Actions
		redirect('/rejestracja?error=' + encodeURIComponent(errorMessage) + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
	}
}

// --- 1. LOGOWANIE ---
export async function loginAction(formData: FormData) {
	const email = formData.get('email') as string
	const password = formData.get('password') as string
	const returnTo = formData.get('returnTo') as string | null

	if (!email || !password) {
		redirect('/strefa-partnera?error=' + encodeURIComponent('Wypełnij wszystkie pola') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		return
	}

	try {
		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				// Legacy support
				company: true,
				// New many-to-many
				companies: {
					include: {
						company: {
							include: {
								category: true,
							},
						},
					},
				},
			},
		})

		if (!user) {
			redirect('/strefa-partnera?error=' + encodeURIComponent('Nieprawidłowy email lub hasło') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
			return
		}

		// Sprawdzamy czy konto jest zweryfikowane
		if (!user.emailVerified) {
			redirect('/strefa-partnera?error=' + encodeURIComponent('Konto nieaktywne. Sprawdź e-mail weryfikacyjny.') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
			return
		}

		// Sprawdzamy czy użytkownik ma hasło (OAuth users nie mają hasła)
		if (!user.password) {
			redirect('/strefa-partnera?error=' + encodeURIComponent('To konto używa logowania przez Google/Facebook. Użyj przycisku OAuth.') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
			return
		}

		const isPasswordValid = await bcrypt.compare(password, user.password)

		if (!isPasswordValid) {
			redirect('/strefa-partnera?error=' + encodeURIComponent('Nieprawidłowy email lub hasło') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
			return
		}

		// Auto-migracja: jeśli użytkownik ma companyId ale nie ma CompanyUser
		if (user.companyId && user.companies.length === 0) {
			try {
				await prisma.companyUser.create({
					data: {
						userId: user.id,
						companyId: user.companyId,
						role: 'OWNER',
					},
				})
			} catch (error) {
				// Ignore if already exists or company doesn't exist
				console.log('Auto-migration note:', error)
			}
		}

		const cookieStore = await cookies()
		cookieStore.set('session_user_id', user.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})

		// Jeśli jest returnTo, przekieruj tam, w przeciwnym razie do dashboard
		if (returnTo) {
			redirect(returnTo)
		} else {
			redirect('/dashboard')
		}
	} catch (error) {
		// Sprawdź czy to błąd redirect z Next.js - jeśli tak, rzuć go dalej (nie łap go)
		if (error && typeof error === 'object' && 'digest' in error) {
			const digest = String((error as any).digest)
			// Next.js redirect errors mają digest zaczynający się od "NEXT_REDIRECT"
			if (digest.includes('NEXT_REDIRECT')) {
				throw error // Rzuć błąd redirect dalej - Next.js go obsłuży
			}
		}
		
		console.error('Login error:', error)
		
		// Handle errors - redirect z komunikatem błędu
		let errorMessage = 'Wystąpił błąd podczas logowania. Spróbuj ponownie.'
		if (error instanceof Error) {
			// Jeśli to błąd bazy danych, zwróć ogólny komunikat
			if (error.message.includes('Prisma') || error.message.includes('database')) {
				errorMessage = 'Błąd połączenia z bazą danych. Spróbuj ponownie później.'
			}
		}
		
		// redirect() automatycznie przerywa wykonanie w Next.js 15 Server Actions
		redirect('/strefa-partnera?error=' + encodeURIComponent(errorMessage) + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
	}
}

// --- 2. WYLOGOWYWANIE ---
export async function logoutAction() {
	const cookieStore = await cookies()
	cookieStore.delete('session_user_id')
	redirect('/strefa-partnera')
}

// --- 3. USTAWIANIE HASŁA (WERYFIKACJA) ---
export async function setPasswordAction(formData: FormData) {
	const token = formData.get('token') as string
	const email = formData.get('email') as string
	const password = formData.get('password') as string

	if (!password || password.length < 8) {
		throw new Error('Hasło musi mieć min. 8 znaków')
	}

	// 1. Weryfikacja tokenu
	const verificationData = await prisma.verificationToken.findUnique({
		where: { token },
	})

	if (!verificationData || verificationData.identifier !== email) {
		throw new Error('Nieprawidłowy lub nieważny token.')
	}

	// 2. Hashowanie hasła
	const hashedPassword = await bcrypt.hash(password, 10)

	// 3. Transakcja: Update usera + usunięcie tokenu
	await prisma.$transaction([
		prisma.user.update({
			where: { email },
			data: {
				password: hashedPassword,
				emailVerified: new Date(), // Ustawiamy datę = konto aktywne
			},
		}),
		prisma.verificationToken.delete({
			where: { token },
		}),
	])

	// 4. Auto-login po ustawieniu hasła
	const user = await prisma.user.findUnique({ where: { email } })

	if (user) {
		const cookieStore = await cookies()
		cookieStore.set('session_user_id', user.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})
	}

	redirect('/dashboard')
}

export async function changePasswordAction(formData: FormData) {
	const cookieStore = await cookies()
	const userId = cookieStore.get('session_user_id')?.value

	if (!userId) redirect('/strefa-partnera')

	const oldPassword = formData.get('oldPassword') as string
	const newPassword = formData.get('newPassword') as string
	const confirmPassword = formData.get('confirmPassword') as string

	const user = await prisma.user.findUnique({ where: { id: userId } })
	if (!user) redirect('/strefa-partnera')

	// Sprawdź czy użytkownik ma hasło (OAuth users nie mają hasła)
	if (!user.password) {
		redirect('/dashboard?error=oauth_user_cannot_change_password')
		return
	}

	// Walidacja starego hasła
	const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password)
	if (!isOldPasswordValid) {
		redirect('/dashboard?error=wrong_old_password')
	}

	// Walidacja długości
	if (newPassword.length < 8) {
		redirect('/dashboard?error=password_too_short')
	}

	// Walidacja identyczności haseł (to naprawia Twój błąd ze screena)
	if (newPassword !== confirmPassword) {
		redirect('/dashboard?error=passwords_not_matching')
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10)
	await prisma.user.update({
		where: { id: userId },
		data: { password: hashedPassword },
	})

	redirect('/dashboard?status=password_updated')
}
