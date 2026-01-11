import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
	const body = await req.text()
	const headersList = await headers()
	const signature = headersList.get('stripe-signature')

	if (!signature) {
		return NextResponse.json({ error: 'No signature' }, { status: 400 })
	}

	let event: Stripe.Event

	try {
		event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
	} catch (err) {
		console.error('Webhook signature verification failed:', err)
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
	}

	// Obsługa udanej płatności
	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session

		const companyId = session.metadata?.companyId

		if (companyId) {
			try {
				await prisma.company.update({
					where: { id: companyId },
					data: {
						plan: 'PREMIUM',
						premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dni
					},
				})

				console.log(`✅ Company ${companyId} upgraded to PREMIUM`)
			} catch (error) {
				console.error('Failed to update company plan:', error)
			}
		}
	}

	return NextResponse.json({ received: true })
}
