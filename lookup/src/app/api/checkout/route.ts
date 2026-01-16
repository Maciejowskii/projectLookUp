import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
	try {
		const cookieStore = await cookies()
		const userId = cookieStore.get('session_user_id')?.value

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Get companyId and paymentMethod from request body
		const body = await req.json().catch(() => ({}))
		const companyId = body.companyId
		const paymentMethod = body.paymentMethod || 'stripe' // Default to Stripe

		if (!companyId) {
			return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
		}

		if (paymentMethod !== 'stripe' && paymentMethod !== 'przelewy24' && paymentMethod !== 'payu') {
			return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
		}

		// Get user with companies
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				companies: {
					where: { companyId },
					include: {
						company: true,
					},
				},
				// Legacy support
				company: true,
			},
		})

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// Find company - check new structure first, then legacy
		let company = null
		if (user.companies.length > 0) {
			company = user.companies[0].company
		} else if (user.companyId === companyId && user.company) {
			company = user.company
		}

		if (!company) {
			return NextResponse.json({ error: 'Company not found or access denied' }, { status: 404 })
		}

		// Handle different payment methods
		if (paymentMethod === 'przelewy24') {
			// Redirect to Przelewy24 API route which will handle the payment
			return NextResponse.redirect(
				new URL(`/api/checkout/przelewy24?companyId=${company.id}`, req.url)
			)
		}

		if (paymentMethod === 'payu') {
			// PayU payment flow - handle directly here instead of redirect
			const PAYU_BASE_URL = process.env.NODE_ENV === 'production' 
				? 'https://secure.payu.com' 
				: 'https://secure.snd.payu.com'
			
			const PAYU_POS_ID = process.env.PAYU_POS_ID || ''
			const PAYU_CLIENT_ID = process.env.PAYU_CLIENT_ID || ''
			const PAYU_CLIENT_SECRET = process.env.PAYU_CLIENT_SECRET || ''

			if (!PAYU_POS_ID || !PAYU_CLIENT_SECRET) {
				console.error('PayU not configured - missing env variables')
				return NextResponse.json({ error: 'PayU nie jest skonfigurowane. Skontaktuj się z administratorem.' }, { status: 500 })
			}

			// Get OAuth token
			const tokenResponse = await fetch(`${PAYU_BASE_URL}/pl/standard/user/oauth/authorize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'client_credentials',
					client_id: PAYU_CLIENT_ID,
					client_secret: PAYU_CLIENT_SECRET,
				}),
			})

			if (!tokenResponse.ok) {
				const error = await tokenResponse.text()
				console.error('PayU OAuth error:', error)
				return NextResponse.json({ error: 'Błąd autoryzacji PayU' }, { status: 500 })
			}

			const tokenData = await tokenResponse.json()
			const accessToken = tokenData.access_token

			// Create order
			const extOrderId = `premium-${company.id}-${Date.now()}`
			const orderData = {
				notifyUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/payu`,
				continueUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard?companyId=${company.id}&payment=success`,
				customerIp: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
				merchantPosId: PAYU_POS_ID,
				description: `Pakiet Premium - ${company.name}`,
				currencyCode: 'PLN',
				totalAmount: '9900',
				extOrderId,
				buyer: {
					email: user.email,
					firstName: company.name.split(' ')[0] || 'Klient',
					lastName: company.name.split(' ').slice(1).join(' ') || 'Katalogo',
					language: 'pl',
				},
				products: [{
					name: 'Pakiet Premium Katalogo - 1 miesiąc',
					unitPrice: '9900',
					quantity: '1',
				}],
			}

			const orderResponse = await fetch(`${PAYU_BASE_URL}/api/v2_1/orders`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
				},
				body: JSON.stringify(orderData),
				redirect: 'manual',
			})

			// PayU returns 302 with Location header
			if (orderResponse.status === 302) {
				const redirectUrl = orderResponse.headers.get('Location')
				if (redirectUrl) {
					console.log(`✅ PayU order created: ${extOrderId}`)
					return NextResponse.json({ url: redirectUrl })
				}
			}

			// Or JSON with redirectUri
			const responseData = await orderResponse.json()
			
			if (responseData.redirectUri) {
				console.log(`✅ PayU order created: ${extOrderId}`)
				return NextResponse.json({ url: responseData.redirectUri })
			}

			console.error('PayU order creation failed:', responseData)
			return NextResponse.json({ error: 'Błąd tworzenia zamówienia PayU', details: responseData }, { status: 500 })
		}

		// Stripe payment flow
		// (opcjonalnie) blokada, jeśli już ma subskrypcję w bazie
		if (company.stripeSubscriptionId) {
			return NextResponse.json({ error: 'Subscription already exists. Use Customer Portal.' }, { status: 409 })
		}

		// Stripe Customer
		let customerId = company.stripeCustomerId

		if (!customerId) {
			const customer = await stripe.customers.create({
				email: user.email ?? undefined,
				name: company.name,
				metadata: {
					userId: user.id,
					companyId: company.id,
				},
			})

			customerId = customer.id

			await prisma.company.update({
				where: { id: company.id },
				data: { stripeCustomerId: customerId },
			})
		}

		// Checkout Session (SUBSCRIPTION)
		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: 'subscription',
			line_items: [
				{
					price: 'price_1So95cHGnBnyRYyL8t8aQfn0',
					quantity: 1,
				},
			],
			metadata: {
				userId: user.id,
				companyId: company.id,
			},
			success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?companyId=${company.id}&payment=success`,
			cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?companyId=${company.id}&payment=cancelled`,
		})

		return NextResponse.json({ url: session.url })
	} catch (error) {
		console.error('Stripe checkout error:', error)
		return NextResponse.json(
			{ error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		)
	}
}
