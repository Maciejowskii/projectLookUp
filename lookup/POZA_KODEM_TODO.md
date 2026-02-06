# 📋 Co musisz zrobić POZA KODEM przed wdrożeniem Consent Mode

## ✅ Co zostało zrobione w kodzie:

1. ✅ **Odkomentowano CookieConsent** w `layout.tsx`
2. ✅ **Usunięto wszystkie komponenty AdSense** (pliki i importy)
3. ✅ **Zaktualizowano CookieConsent** - usunięto opcję reklam (tylko analytics)
4. ✅ **Usunięto skrypt AdSense** z `layout.tsx`

---

## 🔧 Co musisz zrobić POZA KODEM:

### 1. 🧪 **Przetestuj lokalnie**

#### Krok 1.1: Uruchom aplikację lokalnie
```bash
npm run dev
# lub
yarn dev
```

#### Krok 1.2: Otwórz stronę w trybie incognito
- Otwórz przeglądarkę w trybie incognito/private
- Wejdź na `http://localhost:3000`
- **Sprawdź czy banner zgody się pojawia na dole strony**

#### Krok 1.3: Sprawdź localStorage
1. Otwórz DevTools (F12)
2. Przejdź do zakładki **Application** → **Local Storage** → `http://localhost:3000`
3. Kliknij **"Zgadzam się"** w bannerze
4. **Sprawdź czy pojawił się klucz `cookie_consent`** z wartością JSON:
   ```json
   {
     "status": "accepted",
     "preferences": { "analytics": true },
     "timestamp": "2024-..."
   }
   ```

#### Krok 1.4: Sprawdź Network tab
1. W DevTools przejdź do zakładki **Network**
2. Filtruj: `gtag` lub `analytics`
3. Kliknij **"Zgadzam się"** w bannerze
4. **Sprawdź czy widzisz requesty do Google Analytics** (powinny być widoczne po akceptacji)

#### Krok 1.5: Sprawdź Console
1. W DevTools przejdź do zakładki **Console**
2. **Sprawdź czy nie ma błędów** związanych z `gtag` lub `consent`
3. Wpisz w konsoli:
   ```javascript
   window.gtag('consent', 'get', 'analytics_storage')
   ```
   - Przed akceptacją powinno zwrócić: `"denied"`
   - Po akceptacji powinno zwrócić: `"granted"`

---

### 2. 🔍 **Sprawdź w Google Tag Assistant**

#### Krok 2.1: Zainstaluj rozszerzenie
1. Zainstaluj [Google Tag Assistant](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk) (Chrome)
2. Lub użyj [Google Tag Manager Preview Mode](https://tagassistant.google.com/)

#### Krok 2.2: Sprawdź Consent Mode
1. Otwórz stronę lokalnie
2. Kliknij ikonę Tag Assistant w przeglądarce
3. **Sprawdź czy widzisz:**
   - Consent Mode: `analytics_storage: denied` (przed akceptacją)
   - Consent Mode: `analytics_storage: granted` (po akceptacji)

#### Krok 2.3: Sprawdź Google Analytics
1. W Tag Assistant sprawdź czy Google Analytics jest poprawnie załadowany
2. **Sprawdź czy nie ma błędów** związanych z Consent Mode

---

### 3. 📊 **Sprawdź w Google Analytics**

#### Krok 3.1: Zaloguj się do Google Analytics
1. Wejdź na [Google Analytics](https://analytics.google.com/)
2. Wybierz właściwość: `G-ME8GSE9S3Z`

#### Krok 3.2: Sprawdź Real-Time
1. Przejdź do **Reports** → **Real-Time** → **Overview**
2. Otwórz stronę lokalnie i **akceptuj zgodę**
3. **Sprawdź czy widzisz siebie jako aktywnego użytkownika** (może potrwać kilka sekund)

#### Krok 3.3: Sprawdź Events
1. W Real-Time przejdź do **Events**
2. **Sprawdź czy widzisz zdarzenia** po akceptacji zgody
3. Sprawdź czy `page_view` jest rejestrowane

---

### 4. 📝 **Zaktualizuj politykę prywatności (jeśli potrzeba)**

#### Krok 4.1: Sprawdź obecną politykę
1. Otwórz `/polityka-prywatnosci`
2. **Sprawdź czy zawiera informacje o:**
   - Google Analytics
   - Google Tag Manager
   - Cookies analitycznych
   - Consent Mode

#### Krok 4.2: Dodaj informacje o Consent Mode (jeśli brakuje)
Jeśli w polityce prywatności nie ma informacji o Consent Mode, dodaj:

```
Używamy Google Consent Mode v2 do zarządzania zgodą użytkowników na pliki cookie.
Domyślnie wszystkie cookies analityczne są wyłączone i są aktywowane dopiero po wyrażeniu zgody przez użytkownika.
```

---

### 5. 🌍 **Sprawdź zgodność z RODO/GDPR**

#### Krok 5.1: Sprawdź czy:
- [ ] Banner zgody pojawia się przed załadowaniem cookies analitycznych
- [ ] Użytkownik może odrzucić wszystkie cookies
- [ ] Użytkownik może zarządzać preferencjami (przez panel ustawień)
- [ ] Link do polityki cookies jest dostępny w bannerze
- [ ] Zgoda jest dobrowolna (nie jest wymuszona)

#### Krok 5.2: Sprawdź czy polityka prywatności zawiera:
- [ ] Informacje o administratorze danych
- [ ] Informacje o celach przetwarzania danych
- [ ] Informacje o Google Analytics i Google Tag Manager
- [ ] Informacje o prawach użytkownika (RODO)
- [ ] Informacje o czasie przechowywania danych

---

### 6. 🚀 **Przed wdrożeniem na produkcję**

#### Krok 6.1: Przetestuj na staging (jeśli masz)
- [ ] Przetestuj banner zgody na środowisku staging
- [ ] Sprawdź czy Google Analytics działa poprawnie
- [ ] Sprawdź czy nie ma błędów w konsoli

#### Krok 6.2: Sprawdź czy nie ma konfliktów
- [ ] Sprawdź czy nie ma innych bannerów cookies (np. CookieBanner.tsx)
- [ ] Sprawdź czy localStorage działa poprawnie
- [ ] Sprawdź czy banner nie psuje layoutu na mobile

#### Krok 6.3: Sprawdź responsywność
- [ ] Przetestuj banner na mobile (iPhone, Android)
- [ ] Przetestuj banner na tablet
- [ ] Przetestuj banner na desktop
- [ ] Sprawdź czy panel ustawień działa poprawnie na wszystkich urządzeniach

---

### 7. 📱 **Sprawdź na różnych urządzeniach**

#### Krok 7.1: Mobile
- [ ] Otwórz stronę na telefonie
- [ ] Sprawdź czy banner jest widoczny i czytelny
- [ ] Sprawdź czy przyciski są łatwe do kliknięcia
- [ ] Sprawdź czy panel ustawień działa poprawnie

#### Krok 7.2: Tablet
- [ ] Otwórz stronę na tablecie
- [ ] Sprawdź czy banner wygląda dobrze
- [ ] Sprawdź czy panel ustawień jest czytelny

#### Krok 7.3: Desktop
- [ ] Otwórz stronę na desktopie
- [ ] Sprawdź czy banner nie przesłania ważnych elementów
- [ ] Sprawdź czy panel ustawień jest łatwy w użyciu

---

### 8. 🔄 **Sprawdź czy wszystko działa po wdrożeniu**

#### Krok 8.1: Po wdrożeniu na produkcję
1. Otwórz stronę produkcyjną w trybie incognito
2. **Sprawdź czy banner się pojawia**
3. Kliknij **"Zgadzam się"**
4. **Sprawdź w Google Analytics czy widzisz ruch**

#### Krok 8.2: Monitoruj przez kilka dni
- [ ] Sprawdź w Google Analytics czy ruch jest rejestrowany
- [ ] Sprawdź czy nie ma błędów w konsoli
- [ ] Sprawdź czy użytkownicy mogą łatwo zarządzać zgodą

---

## ⚠️ **Możliwe problemy i rozwiązania:**

### Problem 1: Banner nie pojawia się
**Rozwiązanie:**
- Sprawdź czy `localStorage` nie jest zablokowany
- Sprawdź czy nie ma błędów w konsoli
- Sprawdź czy komponent `CookieConsent` jest zaimportowany

### Problem 2: Google Analytics nie wysyła danych
**Rozwiązanie:**
- Sprawdź czy Consent Mode jest poprawnie ustawiony
- Sprawdź czy `gtag('consent', 'update', {...})` jest wywoływane po akceptacji
- Sprawdź w Network tab czy requesty są wysyłane

### Problem 3: Błędy w konsoli
**Rozwiązanie:**
- Sprawdź czy `window.gtag` jest zdefiniowany przed użyciem
- Sprawdź czy kolejność skryptów jest poprawna (dataLayer → Consent Mode → GTM → GA4)
- Sprawdź czy nie ma konfliktów z innymi skryptami

### Problem 4: Banner psuje layout
**Rozwiązanie:**
- Sprawdź czy `z-index` jest ustawiony poprawnie (`z-[9999]`)
- Sprawdź czy banner nie przesłania ważnych elementów
- Sprawdź czy banner jest responsywny

---

## 📚 **Przydatne linki:**

- [Google Consent Mode v2 - Dokumentacja](https://developers.google.com/tag-platform/devguides/consent)
- [Google Tag Manager Consent Mode](https://support.google.com/tagmanager/answer/10718549)
- [RODO - Rozporządzenie o ochronie danych](https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32016R0679)
- [Google Tag Assistant](https://tagassistant.google.com/)

---

## ✅ **Checklist przed wdrożeniem:**

- [ ] Przetestowano lokalnie (banner się pojawia)
- [ ] Sprawdzono localStorage (zapisuje zgodę)
- [ ] Sprawdzono Network tab (GA4 wysyła dane)
- [ ] Sprawdzono Console (brak błędów)
- [ ] Sprawdzono Google Tag Assistant (Consent Mode działa)
- [ ] Sprawdzono Google Analytics (ruch jest rejestrowany)
- [ ] Zaktualizowano politykę prywatności (jeśli potrzeba)
- [ ] Sprawdzono zgodność z RODO/GDPR
- [ ] Przetestowano na różnych urządzeniach
- [ ] Przetestowano responsywność
- [ ] Sprawdzono czy nie ma konfliktów

---

**Po wykonaniu wszystkich kroków, możesz bezpiecznie wdrożyć Consent Mode na produkcję! 🚀**
