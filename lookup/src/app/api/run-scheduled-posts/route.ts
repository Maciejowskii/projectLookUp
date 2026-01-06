import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPostExecution } from '@/actions/blogActions'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	// Zabezpieczenie przed nieautoryzowanym wywołaniem
	const authHeader = request.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new Response('Unauthorized', { status: 401 })
	}

	try {
		// Pobierz wszystkie zaplanowane posty, których data już minęła
		const jobsToRun = await prisma.scheduledPost.findMany({
			where: {
				status: 'scheduled',
				scheduledAt: { lte: new Date() },
			},
		})

		// Przetwarzaj sekwencyjnie (AI Gemini może mieć limity rate-limit)
		for (const job of jobsToRun) {
			await processPostExecution(job.id)
		}

		return NextResponse.json({ success: true, processed: jobsToRun.length })
	} catch (error) {
		return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
	}
}
