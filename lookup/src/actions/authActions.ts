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

	console.log('[REGISTER] ===== REGISTRATION START =====')
	console.log('[REGISTER] Email:', email)
	console.log('[REGISTER] Has password:', !!password)
	console.log('[REGISTER] ReturnTo:', returnTo)

	if (!email || !password) {
		console.log('[REGISTER] Validation failed: missing email or password')
		redirect('/rejestracja?error=' + encodeURIComponent('Wypełnij wszystkie pola') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
	}

	if (password.length < 8) {
		console.log('[REGISTER] Validation failed: password too short')
		redirect('/rejestracja?error=' + encodeURIComponent('Hasło musi mieć minimum 8 znaków') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
	}

	// Pobierz cookies na początku
	console.log('[REGISTER] Getting cookies...')
	const cookieStore = await cookies()
	console.log('[REGISTER] Cookies obtained')
	
	try {
		console.log('[REGISTER] Checking if user exists...')
		const existingUser = await prisma.user.findUnique({
			where: { email },
		})
		console.log('[REGISTER] User exists check complete:', !!existingUser)

		if (existingUser) {
			console.log('[REGISTER] User already exists, redirecting...')
			redirect('/rejestracja?error=' + encodeURIComponent('Użytkownik z tym emailem już istnieje') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		}

		console.log('[REGISTER] Hashing password...')
		const hashedPassword = await bcrypt.hash(password, 10)
		console.log('[REGISTER] Password hashed, length:', hashedPassword.length)

		console.log('[REGISTER] Creating user in database...')
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				emailVerified: new Date(),
			},
		})
		console.log('[REGISTER] User created successfully, ID:', user.id)

		console.log('[REGISTER] Setting session cookie...')
		cookieStore.set('session_user_id', user.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})
		console.log('[REGISTER] Session cookie set')

		console.log('[REGISTER] Redirecting to dashboard...')
		if (returnTo) {
			redirect(returnTo)
		} else {
			redirect('/dashboard')
		}
	} catch (error: any) {
		console.log('[REGISTER] ===== ERROR CAUGHT =====')
		console.log('[REGISTER] Error type:', error?.constructor?.name)
		console.log('[REGISTER] Error message:', error?.message)
		console.log('[REGISTER] Has digest:', 'digest' in (error || {}))
		console.log('[REGISTER] Digest value:', error?.digest)
		console.log('[REGISTER] Has code:', 'code' in (error || {}))
		console.log('[REGISTER] Code value:', error?.code)
		
		// WAŻNE: Sprawdź czy to błąd redirect - jeśli tak, MUSI być rzucony dalej
		if (error?.digest?.includes?.('NEXT_REDIRECT')) {
			console.log('[REGISTER] This is a redirect error, re-throwing...')
			throw error
		}
		
		// Określ komunikat błędu
		let errorMessage = 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.'
		
		if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
			errorMessage = 'Użytkownik z tym emailem już istnieje'
		} else if (error?.code?.startsWith?.('P') || error?.message?.includes?.('Prisma') || error?.message?.includes?.('database')) {
			errorMessage = 'Błąd połączenia z bazą danych. Spróbuj ponownie później.'
		}
		
		console.log('[REGISTER] Final error message:', errorMessage)
		console.log('[REGISTER] ===== REGISTRATION END (ERROR) =====')
		
		redirect('/rejestracja?error=' + encodeURIComponent(errorMessage) + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
	}
}

// --- 1. LOGOWANIE ---
export async function loginAction(formData: FormData) {
	const email = formData.get('email') as string
	const password = formData.get('password') as string
	const returnTo = formData.get('returnTo') as string | null

	console.log('[LOGIN] ===== LOGIN START =====')
	console.log('[LOGIN] Email:', email)

	if (!email || !password) {
		redirect('/strefa-partnera?error=' + encodeURIComponent('Wypełnij wszystkie pola') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
	}

	// Pobierz cookies na początku
	const cookieStore = await cookies()
	
	try {
		console.log('[LOGIN] Finding user...')
		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				company: true,
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
			console.log('[LOGIN] User not found')
			redirect('/strefa-partnera?error=' + encodeURIComponent('Nieprawidłowy email lub hasło') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		}

		if (!user.emailVerified) {
			console.log('[LOGIN] Email not verified')
			redirect('/strefa-partnera?error=' + encodeURIComponent('Konto nieaktywne. Sprawdź e-mail weryfikacyjny.') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		}

		if (!user.password) {
			console.log('[LOGIN] No password (OAuth user)')
			redirect('/strefa-partnera?error=' + encodeURIComponent('To konto używa logowania przez Google/Facebook. Użyj przycisku OAuth.') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		}

		console.log('[LOGIN] Comparing password...')
		const isPasswordValid = await bcrypt.compare(password, user.password)

		if (!isPasswordValid) {
			console.log('[LOGIN] Invalid password')
			redirect('/strefa-partnera?error=' + encodeURIComponent('Nieprawidłowy email lub hasło') + (returnTo ? '&returnTo=' + encodeURIComponent(returnTo) : ''))
		}

		// Auto-migracja
		if (user.companyId && user.companies.length === 0) {
			try {
				await prisma.companyUser.create({
					data: {
						userId: user.id,
						companyId: user.companyId,
						role: 'OWNER',
					},
				})
			} catch (e) {
				console.log('[LOGIN] Auto-migration note:', e)
			}
		}

		console.log('[LOGIN] Setting session cookie...')
		cookieStore.set('session_user_id', user.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7,
			path: '/',
		})

		console.log('[LOGIN] Redirecting...')
		if (returnTo) {
			redirect(returnTo)
		} else {
			redirect('/dashboard')
		}
	} catch (error: any) {
		console.log('[LOGIN] ===== ERROR CAUGHT =====')
		console.log('[LOGIN] Error:', error?.message, error?.digest, error?.code)
		
		// WAŻNE: redirect() rzuca błąd z digest - musi być rzucony dalej
		if (error?.digest?.includes?.('NEXT_REDIRECT')) {
			throw error
		}
		
		let errorMessage = 'Wystąpił błąd podczas logowania. Spróbuj ponownie.'
		if (error?.code?.startsWith?.('P') || error?.message?.includes?.('Prisma')) {
			errorMessage = 'Błąd połączenia z bazą danych. Spróbuj ponownie później.'
		}
		
		console.log('[LOGIN] ===== LOGIN END (ERROR) =====')
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
