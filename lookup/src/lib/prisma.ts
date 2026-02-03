import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined
}

// Konfiguracja Prisma Client z lepszą obsługą błędów i connection pooling
const prismaClientSingleton = () => {
	// Sprawdź czy DATABASE_URL jest ustawione
	if (!process.env.DATABASE_URL) {
		console.error('[PRISMA] DATABASE_URL nie jest ustawione w zmiennych środowiskowych!')
		console.error('[PRISMA] Prisma Client nie może się połączyć z bazą danych.')
	}

	// W produkcji używaj mniejszej puli, żeby nie zużywać RAM (każde połączenie = pamięć).
	const CONNECTION_LIMIT = process.env.NODE_ENV === 'production'
		? parseInt(process.env.PRISMA_CONNECTION_LIMIT || '10', 10)
		: 30
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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
else globalForPrisma.prisma = prisma // Also cache in production to prevent multiple instances

// Test połączenia przy starcie (tylko w produkcji, żeby sprawdzić czy baza działa)
// REMOVED: $connect() holds a connection unnecessarily and can cause pool exhaustion
// Connection will be established automatically on first query
if (process.env.NODE_ENV === 'production') {
	console.log('[PRISMA] Prisma Client initialized (connection will be established on first query)')
}

export default prisma
