import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		const leads = await prisma.lead.findMany({
			orderBy: { createdAt: 'desc' },
			include: { company: true },
		})

		const headers = ['Data', 'Imię/Nazwa', 'Email', 'Telefon', 'Firma', 'Opis', 'Źródło', 'Status']
		const rows = leads.map(lead => [
			new Date(lead.createdAt).toLocaleString('pl-PL'),
			lead.contactName,
			lead.email,
			lead.phone,
			lead.company?.name || 'Brak',
			lead.description || '',
			lead.source || 'Nieznane',
			lead.status,
		])

		const csvContent = [
			headers.join(','),
			...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		].join('\n')

		const filename = `leady-${new Date().toISOString().split('T')[0]}.csv`

		return new NextResponse(csvContent, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		})
	} catch (error) {
		console.error('Błąd eksportu CSV:', error)
		return NextResponse.json({ error: 'Błąd podczas eksportu danych' }, { status: 500 })
	}
}
