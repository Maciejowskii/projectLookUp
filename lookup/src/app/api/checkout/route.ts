import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
	try {
		const cookieStore = await cookies()
		const userId = cookieStore.get('session_user_id')?.value

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { company: true },
		})

		if (!user || !user.company) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		// (opcjonalnie) blokada, jeśli już ma subskrypcję w bazie
		if (user.company.stripeSubscriptionId) {
			return NextResponse.json({ error: 'Subscription already exists. Use Customer Portal.' }, { status: 409 })
		}

		// Stripe Customer
		let customerId = user.company.stripeCustomerId

		if (!customerId) {
			const customer = await stripe.customers.create({
				email: user.email ?? undefined,
				name: user.company.name,
				metadata: {
					userId: user.id,
					companyId: user.company.id,
				},
			})

			customerId = customer.id

			await prisma.company.update({
				where: { id: user.company.id },
				data: { stripeCustomerId: customerId },
			})
		}

		// Checkout Session (SUBSCRIPTION)
		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			mode: 'subscription',
			line_items: [
				{
					price: 'price_1SoVJnHGnBnyRYyLMbDKGtmQ',
					quantity: 1,
				},
			],
			metadata: {
				userId: user.id,
				companyId: user.company.id,
			},
			success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?payment=success`,
			cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?payment=cancelled`,
		})

		return NextResponse.json({ url: session.url })
	} catch (error) {
		console.error('Stripe checkout error:', error)
		return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
	}
}
