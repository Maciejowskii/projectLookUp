# 🔍 Jak sprawdzić czy reklamy AdSense działają?

## ⏱️ Kiedy reklamy się wyświetlają?

### 1. **Natychmiast (jeśli wszystko jest OK)**
- ✅ Skrypt AdSense jest załadowany
- ✅ Ad Slot ID są poprawne
- ✅ Strona jest zweryfikowana w AdSense
- ✅ Nie ma blokad (adblock, ustawienia prywatności)

### 2. **Po 24-48 godzinach (normalne)**
- ⏳ Google potrzebuje czasu na weryfikację nowych jednostek reklamowych
- ⏳ Pierwsze reklamy mogą pojawić się dopiero po weryfikacji
- ⏳ To jest **normalne** i **oczekiwane**

### 3. **Po weryfikacji strony (jeśli nowa)**
- ⏳ Jeśli strona jest nowa w AdSense, może trwać kilka dni
- ⏳ Google sprawdza treść, ruch, zgodność z polityką

---

## ✅ Jak sprawdzić czy działa?

### Metoda 1: Sprawdź w DevTools (F12)

1. **Otwórz konsolę przeglądarki** (F12 → Console)
2. **Sprawdź czy skrypt się załadował:**
   ```javascript
   // W konsoli wpisz:
   typeof window.adsbygoogle
   // Powinno zwrócić: "object" lub "function"
   ```

3. **Sprawdź kolejkę reklam:**
   ```javascript
   // W konsoli wpisz:
   window.adsbygoogle
   // Powinno pokazać tablicę z obiektami reklam
   ```

4. **Sprawdź elementy reklamowe:**
   ```javascript
   // W konsoli wpisz:
   document.querySelectorAll('.adsbygoogle')
   // Powinno zwrócić listę elementów <ins> z klasą adsbygoogle
   ```

### Metoda 2: Sprawdź w Elements (F12 → Elements)

1. Otwórz DevTools → Elements
2. Wyszukaj: `.adsbygoogle`
3. Powinieneś zobaczyć elementy `<ins class="adsbygoogle">`
4. Sprawdź czy mają atrybuty:
   - `data-ad-client="ca-pub-4373415012845424"`
   - `data-ad-slot="twój_slot_id"`
   - `data-ad-format="auto"` lub `"rectangle"`

### Metoda 3: Sprawdź Network (F12 → Network)

1. Otwórz DevTools → Network
2. Odśwież stronę (F5)
3. Filtruj: `adsbygoogle` lub `googlesyndication`
4. Powinieneś zobaczyć żądania do:
   - `pagead/js/adsbygoogle.js`
   - `pagead2.googlesyndication.com/pagead/...`

### Metoda 4: Użyj komponentu diagnostycznego

Dodaj na dowolnej stronie (tylko w development):

```tsx
import { AdSenseDebug } from '@/components/AdSenseDebug'

// W komponencie:
<AdSenseDebug />
```

Pokaże:
- ✅ Czy zmienne środowiskowe są ustawione
- ✅ Czy skrypt AdSense jest załadowany
- ✅ Ile reklam jest w kolejce

---

## 🚨 Typowe problemy i rozwiązania

### Problem 1: Reklamy się nie wyświetlają

**Sprawdź:**
1. ✅ Czy zmienne środowiskowe są ustawione w Coolify?
   - Przejdź do Coolify → Twoja aplikacja → Environment Variables
   - Sprawdź: `NEXT_PUBLIC_ADSENSE_BANNER_SLOT`, `NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT`, `NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT`

2. ✅ Czy aplikacja została zrestartowana po dodaniu zmiennych?
   - W Coolify: Settings → Restart Application

3. ✅ Czy Ad Slot ID są poprawne?
   - Sprawdź w Google AdSense → Reklamy → Według jednostki reklamowej
   - Skopiuj "Ad unit ID" i porównaj z `.env`

4. ✅ Czy nie masz adblocka?
   - Wyłącz adblocker (uBlock Origin, AdBlock Plus, etc.)
   - Sprawdź w trybie incognito

### Problem 2: Widzę elementy `<ins>` ale reklamy są puste

**To normalne jeśli:**
- ⏳ Strona jest nowa (poczekaj 24-48h)
- ⏳ Jednostki reklamowe są świeżo utworzone
- ⏳ Google jeszcze nie zweryfikował strony

**Sprawdź w Google AdSense:**
- Przejdź do "Reklamy" → "Według jednostki reklamowej"
- Sprawdź status jednostek (powinno być "Aktywne")
- Sprawdź "Reklamy" → "Wydajność" - czy są jakieś wyświetlenia?

### Problem 3: Błędy w konsoli

**Sprawdź konsolę (F12 → Console):**
- Jeśli widzisz błędy związane z `adsbygoogle` - skopiuj je
- Typowe błędy:
  - `adsbygoogle.push() error: No slot size for availableWidth=0`
    - **Rozwiązanie:** Sprawdź czy kontener reklamy ma szerokość > 0
  - `adsbygoogle.push() error: All ins elements in the DOM with class=adsbygoogle already have ads in them`
    - **Rozwiązanie:** To oznacza, że reklamy już się załadowały (OK!)

---

## 📊 Sprawdzenie w Google AdSense

### 1. Sprawdź status jednostek reklamowych
- Zaloguj się do AdSense
- Przejdź do "Reklamy" → "Według jednostki reklamowej"
- Sprawdź czy wszystkie 3 jednostki są **"Aktywne"**

### 2. Sprawdź wydajność
- Przejdź do "Reklamy" → "Wydajność"
- Filtruj po jednostkach reklamowych
- Sprawdź czy są wyświetlenia (może być 0 jeśli strona jest nowa)

### 3. Sprawdź weryfikację strony
- Przejdź do "Strony" → "Twoje strony"
- Sprawdź czy Twoja domena jest zweryfikowana
- Status powinien być "Aktywna"

---

## 🧪 Testowanie lokalne

### 1. Sprawdź zmienne środowiskowe

Utwórz plik `.env.local`:
```env
NEXT_PUBLIC_ADSENSE_BANNER_SLOT=twój_banner_id
NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT=twój_sidebar_id
NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT=twój_incontent_id
```

### 2. Zrestartuj serwer deweloperski
```bash
npm run dev
```

### 3. Sprawdź w przeglądarce
- Otwórz `http://localhost:3000`
- Otwórz DevTools (F12)
- Sprawdź konsolę i Network

---

## ✅ Checklist - Czy wszystko działa?

- [ ] Zmienne środowiskowe są ustawione w Coolify
- [ ] Aplikacja została zrestartowana po dodaniu zmiennych
- [ ] Ad Slot ID są poprawne (nie "1234567890")
- [ ] Skrypt AdSense jest załadowany (`typeof window.adsbygoogle !== 'undefined'`)
- [ ] Elementy `<ins class="adsbygoogle">` są w DOM
- [ ] W Network widzę żądania do `googlesyndication.com`
- [ ] W Google AdSense jednostki są "Aktywne"
- [ ] Strona jest zweryfikowana w AdSense
- [ ] Adblocker jest wyłączony
- [ ] Minęło 24-48h od utworzenia jednostek (jeśli nowe)

---

## 🎯 Szybki test

**W konsoli przeglądarki (F12) wpisz:**

```javascript
// 1. Sprawdź czy skrypt jest załadowany
console.log('AdSense loaded:', typeof window.adsbygoogle !== 'undefined')

// 2. Sprawdź kolejkę
console.log('AdSense queue:', window.adsbygoogle)

// 3. Sprawdź elementy reklamowe
console.log('Ad elements:', document.querySelectorAll('.adsbygoogle').length)

// 4. Sprawdź zmienne środowiskowe (w Next.js)
console.log('Banner Slot:', process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT)
console.log('Sidebar Slot:', process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT)
console.log('InContent Slot:', process.env.NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT)
```

**Oczekiwane wyniki:**
- ✅ `AdSense loaded: true`
- ✅ `AdSense queue: [Array z obiektami]`
- ✅ `Ad elements: 3` (lub więcej, w zależności od strony)
- ✅ Slot IDs: prawdziwe ID (nie "1234567890")

---

## 💡 Wskazówki

1. **Reklamy mogą nie wyświetlać się od razu** - to normalne, szczególnie dla nowych stron
2. **Sprawdź w trybie incognito** - adblockery mogą blokować reklamy
3. **Poczekaj 24-48h** - Google potrzebuje czasu na weryfikację
4. **Monitoruj w AdSense** - sprawdzaj "Wydajność" codziennie
5. **Używaj komponentu debug** - dodaj `<AdSenseDebug />` na stronie testowej

---

## 🆘 Jeśli nadal nie działa

1. Sprawdź logi w Coolify (może być błąd w konfiguracji)
2. Sprawdź czy zmienne środowiskowe są dostępne w build time (Next.js wymaga `NEXT_PUBLIC_` prefix)
3. Sprawdź czy nie ma błędów w konsoli przeglądarki
4. Skontaktuj się z Google AdSense Support (jeśli minęło > 48h)

Powodzenia! 🚀
