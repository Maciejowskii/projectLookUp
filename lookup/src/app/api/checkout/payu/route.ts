import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// PayU Sandbox URLs (zmień na produkcyjne po testach)
const PAYU_BASE_URL = process.env.NODE_ENV === 'production' 
	? 'https://secure.payu.com' 
	: 'https://secure.snd.payu.com'

const PAYU_POS_ID = process.env.PAYU_POS_ID || ''
const PAYU_MD5_KEY = process.env.PAYU_MD5_KEY || ''
const PAYU_CLIENT_ID = process.env.PAYU_CLIENT_ID || ''
const PAYU_CLIENT_SECRET = process.env.PAYU_CLIENT_SECRET || ''

// Funkcja do uzyskania tokenu OAuth
async function getPayUAccessToken(): Promise<string> {
	const response = await fetch(`${PAYU_BASE_URL}/pl/standard/user/oauth/authorize`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: PAYU_CLIENT_ID,
			client_secret: PAYU_CLIENT_SECRET,
		}),
	})

	if (!response.ok) {
		const error = await response.text()
		console.error('PayU OAuth error:', error)
		throw new Error('Failed to get PayU access token')
	}

	const data = await response.json()
	return data.access_token
}

export async function GET(req: Request) {
	try {
		const cookieStore = await cookies()
		const userId = cookieStore.get('session_user_id')?.value

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Sprawdź konfigurację PayU
		if (!PAYU_POS_ID || !PAYU_CLIENT_SECRET) {
			console.error('PayU not configured - missing env variables')
			return NextResponse.json({ error: 'PayU not configured' }, { status: 500 })
		}

		const { searchParams } = new URL(req.url)
		const companyId = searchParams.get('companyId')

		if (!companyId) {
			return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
		}

		// Pobierz użytkownika z firmami
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				companies: {
					where: { companyId },
					include: {
						company: true,
					},
				},
				company: true,
			},
		})

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// Znajdź firmę
		let company = null
		if (user.companies.length > 0) {
			company = user.companies[0].company
		} else if (user.companyId === companyId && user.company) {
			company = user.company
		}

		if (!company) {
			return NextResponse.json({ error: 'Company not found or access denied' }, { status: 404 })
		}

		// Uzyskaj token OAuth
		const accessToken = await getPayUAccessToken()

		// Utwórz unikalny identyfikator zamówienia
		const extOrderId = `premium-${company.id}-${Date.now()}`

		// Przygotuj dane zamówienia PayU
		const orderData = {
			notifyUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/payu`,
			continueUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard?companyId=${company.id}&payment=success`,
			customerIp: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
			merchantPosId: PAYU_POS_ID,
			description: `Pakiet Premium - ${company.name}`,
			currencyCode: 'PLN',
			totalAmount: '9900', // 99.00 PLN w groszach
			extOrderId,
			buyer: {
				email: user.email,
				firstName: company.name.split(' ')[0] || 'Klient',
				lastName: company.name.split(' ').slice(1).join(' ') || 'Katalogo',
				language: 'pl',
			},
			products: [
				{
					name: 'Pakiet Premium Katalogo - 1 miesiąc',
					unitPrice: '9900',
					quantity: '1',
				},
			],
		}

		// Utwórz zamówienie w PayU
		const orderResponse = await fetch(`${PAYU_BASE_URL}/api/v2_1/orders`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${accessToken}`,
			},
			body: JSON.stringify(orderData),
			redirect: 'manual', // PayU zwraca 302 redirect
		})

		// PayU zwraca 302 z Location header lub 200 z redirectUri
		if (orderResponse.status === 302) {
			const redirectUrl = orderResponse.headers.get('Location')
			if (redirectUrl) {
				console.log(`✅ PayU order created: ${extOrderId} -> ${redirectUrl}`)
				return NextResponse.redirect(redirectUrl)
			}
		}

		// Alternatywnie, PayU może zwrócić JSON z redirectUri
		const responseData = await orderResponse.json()
		
		if (responseData.redirectUri) {
			console.log(`✅ PayU order created: ${extOrderId}`)
			return NextResponse.redirect(responseData.redirectUri)
		}

		if (responseData.status?.statusCode === 'SUCCESS' && responseData.orderId) {
			// Zamówienie utworzone, ale potrzebujemy URL do płatności
			const paymentUrl = `${PAYU_BASE_URL}/pl/standard/co/summary?sessionId=${responseData.orderId}&merchantPosId=${PAYU_POS_ID}&timeStamp=${Date.now()}`
			return NextResponse.redirect(paymentUrl)
		}

		console.error('PayU order creation failed:', responseData)
		return NextResponse.json(
			{ error: 'Failed to create PayU order', details: responseData },
			{ status: 500 }
		)
	} catch (error) {
		console.error('PayU checkout error:', error)
		return NextResponse.json(
			{
				error: 'Failed to create PayU checkout',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		)
	}
}
