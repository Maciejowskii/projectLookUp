import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function GET(req: Request) {
	// This endpoint will be called when user selects Przelewy24
	// It should create a Przelewy24 transaction and redirect to payment page
	try {
		const cookieStore = await cookies()
		const userId = cookieStore.get('session_user_id')?.value

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { searchParams } = new URL(req.url)
		const companyId = searchParams.get('companyId')

		if (!companyId) {
			return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
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

		// TODO: Implement Przelewy24 payment integration
		// For now, redirect back to checkout with error message
		// You'll need to:
		// 1. Install Przelewy24 SDK or use their REST API
		// 2. Create a transaction
		// 3. Get payment URL
		// 4. Redirect user to Przelewy24 payment page

		// Placeholder - redirect back to checkout with info
		// In production, replace this with actual Przelewy24 integration
		const checkoutUrl = new URL('/checkout', req.url)
		checkoutUrl.searchParams.set('companyId', company.id)
		checkoutUrl.searchParams.set('error', 'przelewy24_not_implemented')
		
		return redirect(checkoutUrl.toString())

		// Example Przelewy24 flow (when implemented):
		// const przelewy24 = new Przelewy24({
		//   merchantId: process.env.PRZELEWY24_MERCHANT_ID,
		//   posId: process.env.PRZELEWY24_POS_ID,
		//   apiKey: process.env.PRZELEWY24_API_KEY,
		//   environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
		// })
		//
		// const transaction = await przelewy24.createTransaction({
		//   sessionId: `premium-${company.id}-${Date.now()}`,
		//   amount: 9900, // 99.00 PLN in grosze
		//   currency: 'PLN',
		//   description: `Pakiet Premium - ${company.name}`,
		//   email: user.email,
		//   urlReturn: `${process.env.NEXT_PUBLIC_URL}/dashboard?companyId=${company.id}&payment=success`,
		//   urlStatus: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/przelewy24`,
		// })
		//
		// return redirect(transaction.paymentUrl)
	} catch (error) {
		console.error('Przelewy24 checkout error:', error)
		return NextResponse.json(
			{
				error: 'Failed to create Przelewy24 checkout',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		)
	}
}
