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

		if (paymentMethod !== 'stripe' && paymentMethod !== 'przelewy24') {
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
