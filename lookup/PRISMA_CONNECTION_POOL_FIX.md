# 🔧 Naprawa Prisma Connection Pool Timeout

## Problem

```
Timed out fetching a new connection from the connection pool. 
More info: http://pris.ly/d/connection-pool 
(Current connection pool timeout: 60, connection limit: 15)
```

## Przyczyna

Prisma ma limit 15 połączeń w connection pool, a aplikacja próbuje użyć więcej równoczesnych połączeń.

## Rozwiązania

### 1. Zwiększ connection_limit w DATABASE_URL (Zalecane)

W Coolify, w zmiennych środowiskowych, zaktualizuj `DATABASE_URL`:

**Przed:**
```
postgresql://user:password@host:5432/database
```

**Po:**
```
postgresql://user:password@host:5432/database?connection_limit=20&pool_timeout=20
```

**Parametry:**
- `connection_limit=20` - zwiększa limit połączeń z 15 do 20
- `pool_timeout=20` - zmniejsza timeout z 60 do 20 sekund (szybsze błędy)

### 2. Użyj PgBouncer (Dla większych aplikacji)

Jeśli masz dużo równoczesnych requestów, użyj PgBouncer jako connection pooler:

1. Zainstaluj PgBouncer w Coolify
2. Skonfiguruj `DATABASE_URL` aby wskazywał na PgBouncer
3. PgBouncer zarządza połączeniami do PostgreSQL

### 3. Optymalizacja kodu (Już zrobione)

- ✅ Używamy singleton pattern dla Prisma Client
- ✅ React Query cache zmniejsza liczbę requestów
- ✅ Paginacja zmniejsza obciążenie bazy

### 4. Sprawdź czy nie ma connection leaks

Upewnij się, że wszystkie połączenia są prawidłowo zamykane:

```typescript
// Po użyciu Prisma, zawsze zamykaj połączenia w długotrwałych procesach
await prisma.$disconnect()
```

## Szybka naprawa w Coolify

1. **Przejdź do aplikacji w Coolify**
2. **Settings → Environment Variables**
3. **Znajdź `DATABASE_URL`**
4. **Dodaj parametry na końcu URL:**
   ```
   ?connection_limit=20&pool_timeout=20
   ```
5. **Zapisz i zrestartuj aplikację**

## Przykładowy DATABASE_URL

```
postgresql://user:password@host:5432/database?connection_limit=20&pool_timeout=20&connect_timeout=10
```

## Weryfikacja

Po zmianie sprawdź logi:
- ✅ Brak błędów "Timed out fetching a new connection"
- ✅ Aplikacja działa płynnie
- ✅ Mniej błędów Prisma

## Dodatkowe optymalizacje

### Użyj connection pooling w Prisma

W `schema.prisma` możesz dodać:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pooling jest zarządzany przez DATABASE_URL parametry
}
```

### Monitoruj connection pool

Dodaj monitoring:

```typescript
// W prisma.ts
prisma.$on('query' as never, (e: any) => {
  if (e.duration > 1000) {
    console.warn(`[PRISMA] Slow query: ${e.duration}ms`)
  }
})
```

---

**Status**: Gotowe do zastosowania ✅
**Data**: 2025-01-25
