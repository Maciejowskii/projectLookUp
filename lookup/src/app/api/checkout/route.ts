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

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			mode: 'payment',
			line_items: [
				{
					price_data: {
						currency: 'pln',
						product_data: {
							name: 'Katalogo Premium',
							description: 'Miesięczny dostęp do funkcji Premium',
						},
						unit_amount: 9900,
					},
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
