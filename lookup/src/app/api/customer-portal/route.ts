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

		console.log('Customer Portal - User:', user?.email)
		console.log('Customer Portal - Stripe Customer ID:', user?.company?.stripeCustomerId)

		if (!user?.company?.stripeCustomerId) {
			return NextResponse.json({ error: 'No Stripe customer found. Please subscribe first.' }, { status: 400 })
		}

		// Utwórz sesję Customer Portal
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: user.company.stripeCustomerId,
			return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
		})

		console.log('Customer Portal URL:', portalSession.url)

		return NextResponse.json({ url: portalSession.url })
	} catch (error) {
		console.error('Customer portal error:', error)
		return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
	}
}
