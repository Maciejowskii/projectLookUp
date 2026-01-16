import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const PAYU_MD5_KEY = process.env.PAYU_MD5_KEY || ''

// Weryfikacja podpisu PayU
function verifySignature(body: string, signature: string): boolean {
	if (!PAYU_MD5_KEY) return false
	
	// PayU używa MD5(JSON + secondKey)
	const expectedSignature = crypto
		.createHash('md5')
		.update(body + PAYU_MD5_KEY)
		.digest('hex')
	
	return signature === expectedSignature
}

export async function POST(req: Request) {
	try {
		const body = await req.text()
		const signature = req.headers.get('OpenPayu-Signature')
		
		// Parsuj nagłówek signature (format: signature=xxx;algorithm=MD5)
		let signatureValue = ''
		if (signature) {
			const parts = signature.split(';')
			for (const part of parts) {
				if (part.startsWith('signature=')) {
					signatureValue = part.replace('signature=', '')
					break
				}
			}
		}

		// Weryfikuj podpis (opcjonalnie - PayU zaleca)
		if (PAYU_MD5_KEY && signatureValue) {
			const isValid = verifySignature(body, signatureValue)
			if (!isValid) {
				console.error('❌ PayU webhook: Invalid signature')
				return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
			}
		}

		const data = JSON.parse(body)
		console.log('📬 PayU webhook received:', JSON.stringify(data, null, 2))

		const { order } = data

		if (!order) {
			console.error('❌ PayU webhook: No order data')
			return NextResponse.json({ error: 'No order data' }, { status: 400 })
		}

		const { extOrderId, orderId, status } = order

		// extOrderId format: premium-{companyId}-{timestamp}
		const companyId = extOrderId?.split('-')[1]

		if (!companyId) {
			console.error('❌ PayU webhook: Cannot extract companyId from extOrderId:', extOrderId)
			return NextResponse.json({ error: 'Invalid extOrderId' }, { status: 400 })
		}

		console.log(`📋 PayU order ${orderId}: status=${status}, companyId=${companyId}`)

		// Obsłuż różne statusy
		switch (status) {
			case 'COMPLETED':
				// Płatność zakończona sukcesem!
				console.log(`✅ PayU payment COMPLETED for company ${companyId}`)
				
				// Ustaw premiumUntil na +30 dni
				const premiumUntil = new Date()
				premiumUntil.setDate(premiumUntil.getDate() + 30)

				await prisma.company.update({
					where: { id: companyId },
					data: {
						premiumUntil,
						// Opcjonalnie zapisz orderId PayU
					},
				})

				console.log(`🎉 Company ${companyId} is now Premium until ${premiumUntil.toISOString()}`)
				break

			case 'CANCELED':
				console.log(`❌ PayU payment CANCELED for company ${companyId}`)
				break

			case 'PENDING':
				console.log(`⏳ PayU payment PENDING for company ${companyId}`)
				break

			case 'WAITING_FOR_CONFIRMATION':
				console.log(`⏳ PayU payment WAITING_FOR_CONFIRMATION for company ${companyId}`)
				break

			case 'REJECTED':
				console.log(`❌ PayU payment REJECTED for company ${companyId}`)
				break

			default:
				console.log(`❓ PayU unknown status: ${status} for company ${companyId}`)
		}

		// PayU wymaga odpowiedzi 200 OK
		return NextResponse.json({ status: 'OK' })
	} catch (error) {
		console.error('❌ PayU webhook error:', error)
		return NextResponse.json(
			{ error: 'Webhook processing failed' },
			{ status: 500 }
		)
	}
}

// PayU może też wysłać GET dla weryfikacji endpointu
export async function GET() {
	return NextResponse.json({ status: 'PayU webhook endpoint active' })
}
