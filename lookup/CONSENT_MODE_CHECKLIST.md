# ✅ Checklist przed wdrożeniem Google Consent Mode v2

## 📋 Co musisz zrobić przed wdrożeniem:

### 1. ✅ **Sprawdź strony prawne**
- [x] Strona `/cookies` istnieje i jest kompletna
- [x] Strona `/polityka-prywatnosci` istnieje i jest kompletna
- [ ] **Sprawdź czy linki w `CookieConsent` są poprawne** (obecnie `/cookies`)
- [ ] **Upewnij się, że polityka prywatności zawiera informacje o:**
  - Google Analytics
  - Google Tag Manager
  - Cookies analitycznych
  - Cookies reklamowych (jeśli planujesz używać AdSense w przyszłości)

### 2. ✅ **Sprawdź konfigurację Google Analytics i GTM**
- [x] Google Analytics 4 (GA4) jest skonfigurowany: `G-ME8GSE9S3Z`
- [x] Google Tag Manager jest skonfigurowany: `GTM-KBMJTNBQ`
- [x] Consent Mode v2 jest już częściowo zaimplementowany w `layout.tsx`
- [ ] **Przetestuj czy GA4 i GTM działają poprawnie** (sprawdź w Google Analytics czy widzisz ruch)

### 3. ⚠️ **Przygotuj komponent CookieConsent**
- [x] Komponent `CookieConsent.tsx` istnieje
- [ ] **Odkomentuj import i użycie w `layout.tsx`**
- [ ] **Sprawdź czy linki w komponencie są poprawne:**
  - Link do polityki cookies: `/cookies` ✅
  - Link do polityki prywatności: `/polityka-prywatnosci` (może być potrzebny)

### 4. 🔧 **Konfiguracja Consent Mode**
- [x] Consent Mode v2 jest już zainicjalizowany w `layout.tsx` z domyślnymi wartościami `'denied'`
- [x] Komponent `CookieConsent` używa `gtag('consent', 'update', {...})` do aktualizacji zgody
- [ ] **Upewnij się, że kolejność skryptów jest poprawna:**
  1. `dataLayer` ✅
  2. Consent Mode default ✅
  3. GTM ✅
  4. GA4 ✅

### 5. 🧪 **Testowanie przed wdrożeniem**
- [ ] **Przetestuj lokalnie:**
  - Otwórz stronę w trybie incognito
  - Sprawdź czy banner zgody się pojawia
  - Kliknij "Zgadzam się" i sprawdź w DevTools → Application → Local Storage czy `cookie_consent` jest zapisany
  - Sprawdź w Network tab czy GA4 wysyła dane po akceptacji
  - Sprawdź w Console czy nie ma błędów związanych z `gtag`

- [ ] **Sprawdź w Google Tag Assistant:**
  - Zainstaluj rozszerzenie Google Tag Assistant
  - Otwórz stronę i sprawdź czy Consent Mode jest poprawnie ustawiony
  - Sprawdź czy wartości zmieniają się z `denied` na `granted` po akceptacji

- [ ] **Sprawdź w Google Analytics:**
  - Po akceptacji zgody, sprawdź czy widzisz ruch w Google Analytics
  - Sprawdź czy zdarzenia są rejestrowane poprawnie

### 6. 📝 **Dostosuj teksty w CookieConsent (opcjonalnie)**
- [ ] Sprawdź czy teksty są zgodne z Twoją polityką prywatności
- [ ] Upewnij się, że teksty są zrozumiałe dla użytkowników
- [ ] Sprawdź czy linki prowadzą do właściwych stron

### 7. 🌍 **Zgodność z RODO/GDPR**
- [x] Masz stronę polityki prywatności
- [x] Masz stronę polityki cookies
- [ ] **Upewnij się, że:**
  - Polityka prywatności zawiera informacje o wszystkich cookies i technologiach śledzących
  - Użytkownicy mogą łatwo zmienić swoje preferencje (przez panel ustawień)
  - Zgoda jest dobrowolna (użytkownik może odrzucić)
  - Domyślnie wszystkie cookies są wyłączone (`'denied'`)

### 8. 🚀 **Przed wdrożeniem na produkcję**
- [ ] **Przetestuj na środowisku staging/dev** (jeśli masz)
- [ ] **Sprawdź czy nie ma konfliktów z innymi skryptami**
- [ ] **Upewnij się, że localStorage działa poprawnie** (nie ma blokady)
- [ ] **Sprawdź czy banner nie psuje layoutu na mobile**

---

## 🔧 **Kroki do wykonania:**

### Krok 1: Odkomentuj CookieConsent w layout.tsx

```typescript
// W lookup/src/app/layout.tsx
import { CookieConsent } from '@/components/CookieConsent' // Odkomentuj

// W komponencie RootLayout:
<Providers>
  {children}
  <Toaster />
  <CookieConsent /> {/* Odkomentuj */}
</Providers>
```

### Krok 2: Sprawdź linki w CookieConsent

Upewnij się, że link `/cookies` w komponencie `CookieConsent.tsx` (linia 96) prowadzi do właściwej strony.

### Krok 3: Przetestuj lokalnie

1. Uruchom aplikację lokalnie
2. Otwórz w trybie incognito
3. Sprawdź czy banner się pojawia
4. Kliknij "Zgadzam się"
5. Sprawdź w DevTools → Application → Local Storage → `cookie_consent`
6. Sprawdź w Network tab czy GA4 wysyła dane

### Krok 4: Sprawdź w Google Tag Assistant

1. Zainstaluj rozszerzenie Google Tag Assistant
2. Otwórz stronę
3. Sprawdź czy Consent Mode jest poprawnie ustawiony
4. Kliknij "Zgadzam się" i sprawdź czy wartości się zmieniają

### Krok 5: Sprawdź w Google Analytics

1. Zaloguj się do Google Analytics
2. Po akceptacji zgody, sprawdź czy widzisz ruch
3. Sprawdź czy zdarzenia są rejestrowane poprawnie

---

## ⚠️ **Ważne uwagi:**

1. **Consent Mode v2 jest już częściowo zaimplementowany** - domyślne wartości są ustawione na `'denied'`
2. **Komponent CookieConsent jest gotowy** - wystarczy go odkomentować
3. **Strony prawne istnieją** - `/cookies` i `/polityka-prywatnosci`
4. **Google Analytics i GTM są skonfigurowane** - sprawdź czy działają poprawnie

---

## 🐛 **Możliwe problemy:**

1. **Banner nie pojawia się:**
   - Sprawdź czy `localStorage` nie jest zablokowany
   - Sprawdź czy nie ma błędów w konsoli

2. **GA4 nie wysyła danych:**
   - Sprawdź czy Consent Mode jest poprawnie ustawiony
   - Sprawdź czy `gtag('consent', 'update', {...})` jest wywoływane po akceptacji

3. **Błędy w konsoli:**
   - Sprawdź czy `window.gtag` jest zdefiniowany przed użyciem
   - Sprawdź czy kolejność skryptów jest poprawna

---

## 📚 **Dokumentacja:**

- [Google Consent Mode v2](https://developers.google.com/tag-platform/devguides/consent)
- [Google Tag Manager Consent Mode](https://support.google.com/tagmanager/answer/10718549)
- [RODO - Rozporządzenie o ochronie danych](https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32016R0679)
