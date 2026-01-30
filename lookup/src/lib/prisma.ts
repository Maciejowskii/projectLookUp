import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
}

// Konfiguracja Prisma Client z lepszą obsługą błędów i connection pooling
const prismaClientSingleton = () => {
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			location: 'prisma.ts:8',
			message: 'PrismaClient singleton called',
			data: { hasGlobalPrisma: !!globalForPrisma.prisma, nodeEnv: process.env.NODE_ENV },
			timestamp: Date.now(),
			sessionId: 'debug-session',
			runId: 'run1',
			hypothesisId: 'B',
		}),
	}).catch(() => {})
	// #endregion

	// Sprawdź czy DATABASE_URL jest ustawione
	if (!process.env.DATABASE_URL) {
		console.error('[PRISMA] DATABASE_URL nie jest ustawione w zmiennych środowiskowych!')
		console.error('[PRISMA] Prisma Client nie może się połączyć z bazą danych.')
	}

	// Wymuś parametry puli połączeń (nawet gdy DATABASE_URL ma connection_limit=15)
	// Zapobiega P2024 "Timed out fetching a new connection" przy wielu równoległych zapytaniach.
	const CONNECTION_LIMIT = 30
	const POOL_TIMEOUT = 45
	const CONNECT_TIMEOUT = 10

	let databaseUrl = process.env.DATABASE_URL
	if (databaseUrl) {
		// Usuń istniejące parametry puli, żeby je nadpisać
		databaseUrl = databaseUrl
			.replace(/[?&]connection_limit=\d+/gi, '')
			.replace(/[?&]pool_timeout=\d+/gi, '')
			.replace(/[?&]connect_timeout=\d+/gi, '')
			.replace(/&&+/g, '&')
			.replace(/\?&/, '?')
			.replace(/[?&]$/, '') // usuń końcowe ? lub &
		const separator = databaseUrl.includes('?') ? '&' : '?'
		databaseUrl = `${databaseUrl}${separator}connection_limit=${CONNECTION_LIMIT}&pool_timeout=${POOL_TIMEOUT}&connect_timeout=${CONNECT_TIMEOUT}`
	}

	const client = new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
		errorFormat: 'pretty',
		datasources: {
			db: {
				url: databaseUrl || process.env.DATABASE_URL,
			},
		},
	})

	return client
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// #region agent log
fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		location: 'prisma.ts:40',
		message: 'Prisma instance exported',
		data: { isReused: !!globalForPrisma.prisma, isNew: !globalForPrisma.prisma, nodeEnv: process.env.NODE_ENV },
		timestamp: Date.now(),
		sessionId: 'debug-session',
		runId: 'run1',
		hypothesisId: 'B',
	}),
}).catch(() => {})
// #endregion

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
else globalForPrisma.prisma = prisma // Also cache in production to prevent multiple instances

// Test połączenia przy starcie (tylko w produkcji, żeby sprawdzić czy baza działa)
// REMOVED: $connect() holds a connection unnecessarily and can cause pool exhaustion
// Connection will be established automatically on first query
if (process.env.NODE_ENV === 'production') {
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			location: 'prisma.ts:45',
			message: 'Skipping $connect() to avoid holding connection',
			data: {},
			timestamp: Date.now(),
			sessionId: 'debug-session',
			runId: 'run1',
			hypothesisId: 'E',
		}),
	}).catch(() => {})
	// #endregion
	console.log('[PRISMA] Prisma Client initialized (connection will be established on first query)')
}

export default prisma
