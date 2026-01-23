# Uruchamianie skryptów na Coolify

## Metoda 1: Przez Terminal Coolify (Zalecane)

1. **Zaloguj się do Coolify** i przejdź do swojej aplikacji
2. **Otwórz terminal** (przycisk "Terminal" lub "Execute Command")
3. **Uruchom skrypt:**

```bash
npm run fix-categories
```

Lub bezpośrednio:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-categories-tenant.ts
```

## Metoda 2: Przez SSH do kontenera

Jeśli masz dostęp SSH do serwera:

```bash
# Połącz się z serwerem
ssh user@your-server

# Znajdź kontener
docker ps

# Wejdź do kontenera
docker exec -it <container-name> bash

# Przejdź do katalogu aplikacji
cd /app

# Uruchom skrypt
npm run fix-categories
```

## Metoda 3: Przez API Endpoint (Opcjonalnie)

Możesz stworzyć endpoint API, który uruchomi skrypt. **UWAGA:** Zabezpiecz go hasłem!

Stwórz plik: `src/app/api/admin/fix-categories/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  // Sprawdź autoryzację (np. przez token)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { stdout, stderr } = await execAsync(
      'npm run fix-categories',
      { cwd: process.cwd() }
    )
    
    return NextResponse.json({
      success: true,
      output: stdout,
      error: stderr
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      output: error.stdout,
      stderr: error.stderr
    }, { status: 500 })
  }
}
```

Następnie wywołaj:

```bash
curl -X POST https://your-domain.com/api/admin/fix-categories \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

## Metoda 4: Dodanie do start.sh (Jednorazowo)

Jeśli chcesz uruchomić skrypt **tylko raz** przy pierwszym starcie, możesz dodać do `start.sh`:

```bash
# Na końcu start.sh, przed uruchomieniem aplikacji
echo "Running one-time fixes..."
npm run fix-categories || echo "Fix categories script failed (continuing anyway)"
```

**UWAGA:** To uruchomi się przy każdym restarcie kontenera. Lepiej użyć metody 1 lub 2.

## Dostępne skrypty

- `npm run fix-categories` - Naprawia tenantId w kategoriach
- `npm run check-categories` - Sprawdza stan kategorii i firm (diagnostyka)

## Wymagania

- Skrypty wymagają połączenia z bazą danych (DATABASE_URL musi być ustawione)
- Node.js i npm muszą być dostępne w kontenerze
- ts-node musi być zainstalowany (jest w devDependencies)

## Troubleshooting

### Błąd: "Cannot find module 'ts-node'"
```bash
npm install ts-node --save-dev
```

### Błąd: "DATABASE_URL is not set"
Sprawdź zmienne środowiskowe w Coolify:
- Settings → Environment Variables
- Upewnij się, że `DATABASE_URL` jest ustawione

### Błąd: "Permission denied"
```bash
chmod +x scripts/fix-categories-tenant.ts
```

### Sprawdzenie czy skrypt działa
```bash
# Najpierw sprawdź stan
npm run check-categories

# Potem napraw
npm run fix-categories

# Sprawdź ponownie
npm run check-categories
```
