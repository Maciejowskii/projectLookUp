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

		// Get companyId from request body
		const body = await req.json().catch(() => ({}))
		const companyId = body.companyId

		if (!companyId) {
			return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
		}

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

		console.log('Customer Portal - User:', user.email)
		console.log('Customer Portal - Company:', company.name)
		console.log('Customer Portal - Stripe Customer ID:', company.stripeCustomerId)

		if (!company.stripeCustomerId) {
			return NextResponse.json({ error: 'No Stripe customer found. Please subscribe first.' }, { status: 400 })
		}

		// Utwórz sesję Customer Portal
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: company.stripeCustomerId,
			return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?companyId=${company.id}`,
		})

		console.log('Customer Portal URL:', portalSession.url)

		return NextResponse.json({ url: portalSession.url })
	} catch (error) {
		console.error('Customer portal error:', error)
		return NextResponse.json({ error: 'Failed to create portal session', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
	}
}
