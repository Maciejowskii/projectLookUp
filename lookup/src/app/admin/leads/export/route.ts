import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'all'

    // Oblicz datę początkową na podstawie zakresu
    let startDate: Date | null = null
    const now = new Date()

    switch (range) {
      case 'day':
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        break
      case 'all':
      default:
        startDate = null
        break
    }

    // Pobierz leady z filtrem daty
    const whereClause = startDate
      ? {
          createdAt: {
            gte: startDate,
          },
        }
      : {}

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { company: true },
    })

    // Nagłówki CSV
    const headers = [
      'Data',
      'Imię i Nazwisko',
      'Email',
      'Telefon',
      'Firma',
      'Opis',
      'Źródło',
      'Status',
    ]

    // Konwersja danych do CSV
    const csvRows = [
      headers.join(','),
      ...leads.map((lead) => {
        const row = [
          new Date(lead.createdAt).toLocaleDateString('pl-PL'),
          `"${lead.contactName.replace(/"/g, '""')}"`,
          `"${lead.email.replace(/"/g, '""')}"`,
          `"${lead.phone.replace(/"/g, '""')}"`,
          `"${lead.company?.name || 'N/A'}"`.replace(/"/g, '""'),
          `"${(lead.description || '').replace(/"/g, '""')}"`,
          `"${lead.source || 'N/A'}"`,
          `"${lead.status}"`,
        ]
        return row.join(',')
      }),
    ]

    const csvContent = csvRows.join('\n')

    // Nazwa pliku z zakresem dat
    const rangeLabel = range === 'day' ? 'dzisiaj' : range === 'week' ? 'tydzien' : range === 'month' ? 'miesiac' : 'wszystkie'
    const filename = `leady-${rangeLabel}-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Błąd eksportu CSV:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas eksportu' },
      { status: 500 }
    )
  }
}
