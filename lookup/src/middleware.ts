import { NextRequest, NextResponse } from 'next/server'

export const config = {
	matcher: ['/admin/:path*'],
}

const ADMIN_SESSION_COOKIE = 'admin_session_token'

export async function middleware(req: NextRequest) {
	const url = req.nextUrl

	// Strona logowania jest publiczna
	if (url.pathname === '/admin/login') {
		// Jeśli użytkownik ma sesję, przekieruj do dashboardu
		const sessionToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
		if (sessionToken) {
			// Sprawdzimy sesję w bazie tylko przez redirect - middleware nie może wykonywać zapytań do bazy
			// Sesja jest weryfikowana przez layout/page
			return NextResponse.redirect(new URL('/admin', req.url))
		}
		return NextResponse.next()
	}

	// Wszystkie inne strony /admin wymagają sesji
	const sessionToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value

	if (!sessionToken) {
		// Brak tokena sesji - przekieruj do logowania
		const loginUrl = new URL('/admin/login', req.url)
		return NextResponse.redirect(loginUrl)
	}

	// Token istnieje - sesja zostanie zweryfikowana w komponencie strony/layoutu
	// (middleware nie ma dostępu do bazy danych w Edge Runtime)
	return NextResponse.next()
}
