import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Konfiguracja Prisma Client z lepszą obsługą błędów
const prismaClientSingleton = () => {
	// Sprawdź czy DATABASE_URL jest ustawione
	if (!process.env.DATABASE_URL) {
		console.error('[PRISMA] DATABASE_URL nie jest ustawione w zmiennych środowiskowych!')
		console.error('[PRISMA] Prisma Client nie może się połączyć z bazą danych.')
	}

	return new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
		errorFormat: 'pretty',
		// Optymalizacja connection pool dla produkcji
		datasources: {
			db: {
				url: process.env.DATABASE_URL,
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
