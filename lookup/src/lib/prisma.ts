import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Konfiguracja Prisma Client z lepszą obsługą błędów i connection pooling
const prismaClientSingleton = () => {
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:8',message:'PrismaClient singleton called',data:{hasGlobalPrisma:!!globalForPrisma.prisma,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
	// #endregion

	// Sprawdź czy DATABASE_URL jest ustawione
	if (!process.env.DATABASE_URL) {
		console.error('[PRISMA] DATABASE_URL nie jest ustawione w zmiennych środowiskowych!')
		console.error('[PRISMA] Prisma Client nie może się połączyć z bazą danych.')
	}

	// Optymalizuj DATABASE_URL jeśli nie ma connection_limit
	let databaseUrl = process.env.DATABASE_URL
	const originalUrl = databaseUrl
	const hasConnectionLimit = databaseUrl?.includes('connection_limit')
	
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:17',message:'DATABASE_URL analysis',data:{hasUrl:!!databaseUrl,hasConnectionLimit,urlLength:databaseUrl?.length,hasParams:databaseUrl?.includes('?')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
	// #endregion

	if (databaseUrl && !hasConnectionLimit) {
		// Dodaj parametry connection pool jeśli nie są już w URL
		const separator = databaseUrl.includes('?') ? '&' : '?'
		databaseUrl = `${databaseUrl}${separator}connection_limit=30&pool_timeout=30&connect_timeout=10`
		console.log('[PRISMA] Dodano parametry connection pool do DATABASE_URL')
		
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:23',message:'Added connection_limit to URL',data:{separator,newUrlLength:databaseUrl.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
		// #endregion
	} else if (hasConnectionLimit) {
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:27',message:'DATABASE_URL already has connection_limit',data:{urlLength:databaseUrl?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
		// #endregion
	}

	const client = new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
		errorFormat: 'pretty',
		// Optymalizacja connection pool dla produkcji
		datasources: {
			db: {
				url: databaseUrl || process.env.DATABASE_URL,
			},
		},
	});

	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:38',message:'PrismaClient created',data:{finalUrlLength:(databaseUrl || process.env.DATABASE_URL)?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
	// #endregion

	return client;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// #region agent log
fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:40',message:'Prisma instance exported',data:{isReused:!!globalForPrisma.prisma,isNew:!globalForPrisma.prisma,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
else globalForPrisma.prisma = prisma; // Also cache in production to prevent multiple instances

// Test połączenia przy starcie (tylko w produkcji, żeby sprawdzić czy baza działa)
// REMOVED: $connect() holds a connection unnecessarily and can cause pool exhaustion
// Connection will be established automatically on first query
if (process.env.NODE_ENV === "production") {
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.ts:45',message:'Skipping $connect() to avoid holding connection',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
	// #endregion
	console.log('[PRISMA] Prisma Client initialized (connection will be established on first query)')
}

export default prisma;
