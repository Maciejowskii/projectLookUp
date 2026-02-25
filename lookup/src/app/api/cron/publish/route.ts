import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPostExecution } from '@/actions/blogActions' // Upewnij się, że ścieżka jest poprawna
import { isPostgresAdminTermination, withPrismaRetry } from '@/lib/prismaRetry'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	// 1. Zabezpieczenie przed nieautoryzowanym wywołaniem
	const authHeader = request.headers.get('authorization')
	const secret = process.env.CRON_SECRET

	if (!secret || authHeader !== `Bearer ${secret}`) {
		console.error('Cron: Nieautoryzowana próba dostępu lub brak CRON_SECRET w env.')
		return new Response('Unauthorized', { status: 401 })
	}

	try {
		// 2. Szukamy postów zaplanowanych, których czas już nadszedł
		const jobsToRun = await withPrismaRetry(() =>
			prisma.scheduledPost.findMany({
				where: {
					status: 'scheduled',
					scheduledAt: { lte: new Date() },
				},
			}),
		)

		console.log(`Cron: Znaleziono ${jobsToRun.length} postów do przetworzenia.`)

		// 3. Uruchamiamy publikację dla każdego znalezionego posta
		// Robimy to sekwencyjnie (for...of), aby nie przeciążyć API Gemini
		for (const job of jobsToRun) {
			await withPrismaRetry(() => processPostExecution(job.id))
		}

		return NextResponse.json({
			success: true,
			processed: jobsToRun.length,
		})
	} catch (error) {
		if (isPostgresAdminTermination(error)) {
			console.warn('Cron: chwilowy restart bazy (57P01). Próba zakończona bez przetwarzania.')
			return NextResponse.json({ success: false, error: 'Database temporarily unavailable' }, { status: 503 })
		}
		console.error('Błąd podczas wykonywania Crona:', error)
		return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
	}
}
