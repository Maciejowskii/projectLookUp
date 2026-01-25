import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Konfiguracja Prisma Client z lepszą obsługą błędów i connection pooling
const prismaClientSingleton = () => {
	// Sprawdź czy DATABASE_URL jest ustawione
	if (!process.env.DATABASE_URL) {
		console.error('[PRISMA] DATABASE_URL nie jest ustawione w zmiennych środowiskowych!')
		console.error('[PRISMA] Prisma Client nie może się połączyć z bazą danych.')
	}

	// Optymalizuj DATABASE_URL jeśli nie ma connection_limit
	let databaseUrl = process.env.DATABASE_URL
	if (databaseUrl && !databaseUrl.includes('connection_limit')) {
		// Dodaj parametry connection pool jeśli nie są już w URL
		const separator = databaseUrl.includes('?') ? '&' : '?'
		databaseUrl = `${databaseUrl}${separator}connection_limit=20&pool_timeout=20&connect_timeout=10`
		console.log('[PRISMA] Dodano parametry connection pool do DATABASE_URL')
	}

	return new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
		errorFormat: 'pretty',
		// Optymalizacja connection pool dla produkcji
		datasources: {
			db: {
				url: databaseUrl || process.env.DATABASE_URL,
			},
		},
	});
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Test połączenia przy starcie (tylko w produkcji, żeby sprawdzić czy baza działa)
if (process.env.NODE_ENV === "production") {
	prisma.$connect()
		.then(() => {
			console.log('[PRISMA] Połączenie z bazą danych ustanowione pomyślnie')
		})
		.catch((error) => {
			console.error('[PRISMA] Błąd połączenia z bazą danych:', error)
			console.error('[PRISMA] DATABASE_URL:', process.env.DATABASE_URL ? 'ustawione (ukryte)' : 'BRAK')
		});
}

export default prisma;
