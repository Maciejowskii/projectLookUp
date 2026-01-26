import { NextResponse } from 'next/server'
import { generateReviewsForCompanies } from '@/actions/generateReviews'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minut (dla długich operacji)

export async function GET(request: Request) {
  // Zabezpieczenie przed nieautoryzowanym wywołaniem
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    console.error('Cron generate-reviews: Nieautoryzowana próba dostępu lub brak CRON_SECRET w env.')
    return new Response('Unauthorized', { status: 401 })
  }

  // Sprawdź czy trwa deployment (zapobiega konfliktom zasobów)
  if (process.env.DEPLOYING === 'true' || process.env.SKIP_REVIEW_GENERATION === 'true') {
    console.log('⏸️  Cron generate-reviews: Pomijam - trwa deployment')
    return NextResponse.json({
      message: 'Review generation skipped - deployment in progress',
      skipped: true
    })
  }

  try {
    console.log('🚀 Cron: Rozpoczynam generowanie opinii dla firm...')
    
    const result = await generateReviewsForCompanies()

    return NextResponse.json({
      message: 'Generowanie opinii zakończone',
      ...result
    })
  } catch (error) {
    console.error('❌ Błąd podczas generowania opinii:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      }, 
      { status: 500 }
    )
  }
}
