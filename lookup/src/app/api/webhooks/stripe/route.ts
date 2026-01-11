import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
	const body = await req.text()
	const signature = req.headers.get('stripe-signature')

	if (!signature) {
		return NextResponse.json({ error: 'No signature' }, { status: 400 })
	}

	let event: Stripe.Event
	try {
		event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
	} catch (err) {
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session
				if (session.mode !== 'subscription') break

				const companyId = session.metadata?.companyId
				const subscriptionId = session.subscription as string | null
				const customerId = session.customer as string | null

				if (!companyId || !subscriptionId || !customerId) break

				const sub = await stripe.subscriptions.retrieve(subscriptionId)

				const item = sub.items.data[0]
				const periodEnd = item?.current_period_end

				if (typeof periodEnd !== 'number') {
					throw new Error(`Missing items.data[0].current_period_end on subscription ${sub.id}`)
				}

				await prisma.company.update({
					where: { id: companyId },
					data: {
						plan: 'PREMIUM',
						stripeCustomerId: customerId,
						stripeSubscriptionId: subscriptionId,
						premiumUntil: new Date(periodEnd * 1000),
					},
				})

				await prisma.company.update({
					where: { id: companyId },
					data: {
						plan: 'PREMIUM',
						stripeCustomerId: customerId,
						stripeSubscriptionId: subscriptionId,
						premiumUntil: new Date(periodEnd * 1000),
					},
				})

				break
			}

			case 'customer.subscription.deleted': {
				const sub = event.data.object as Stripe.Subscription
				await prisma.company.updateMany({
					where: { stripeSubscriptionId: sub.id },
					data: {
						plan: 'FREE',
						premiumUntil: null,
						stripeSubscriptionId: null,
					},
				})
				break
			}
		}

		return NextResponse.json({ received: true })
	} catch (err) {
		console.error('Webhook handler error:', err)
		return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
	}
}
