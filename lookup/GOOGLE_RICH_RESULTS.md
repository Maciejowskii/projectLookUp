# Google Rich Results - Gwiazdki w wynikach wyszukiwania

## ✅ Co jest już zaimplementowane

Structured data (JSON-LD) dla opinii jest już dodane do strony firmy (`/firma/[slug]`):

- ✅ **LocalBusiness** schema z pełnymi danymi
- ✅ **AggregateRating** z:
  - `ratingValue` - średnia ocena
  - `bestRating: "5"`
  - `worstRating: "1"`
  - `reviewCount` - liczba opinii
- ✅ Opinie są widoczne na stronie (komponent `ReviewSection`)
- ✅ AggregateRating jest dodawane tylko jeśli:
  - Jest co najmniej 1 opinia
  - Średnia ocena >= 3.5 (wymaganie Google)

## 📍 Lokalizacja kodu

Plik: `src/app/firma/[slug]/page.tsx`

Structured data jest generowane dynamicznie w liniach 115-143 i dodawane do strony w linii 146.

## 🧪 Testowanie

### 1. Google Rich Results Test

1. Przejdź do: https://search.google.com/test/rich-results
2. Wklej URL strony firmy z opiniami, np.:
   ```
   https://www.katalogo.pl/firma/nazwa-firmy
   ```
3. Kliknij "Test URL"
4. Sprawdź czy:
   - ✅ Structured data jest rozpoznane
   - ✅ AggregateRating jest poprawnie zidentyfikowane
   - ✅ Nie ma błędów

### 2. Google Search Console

1. Zaloguj się do Google Search Console
2. Przejdź do "Enhancements" → "Ratings"
3. Sprawdź czy Google wykryło structured data z opiniami
4. Monitoruj czy gwiazdki pojawiają się w wynikach wyszukiwania

### 3. Ręczne sprawdzenie w kodzie źródłowym

1. Otwórz stronę firmy w przeglądarce
2. Kliknij prawym przyciskiem → "Wyświetl źródło strony"
3. Wyszukaj: `application/ld+json`
4. Sprawdź czy structured data zawiera:
   ```json
   {
     "@context": "https://schema.org",
     "@type": "LocalBusiness",
     "aggregateRating": {
       "@type": "AggregateRating",
       "ratingValue": "4.5",
       "bestRating": "5",
       "worstRating": "1",
       "reviewCount": "10"
     }
   }
   ```

## ⚠️ Wymagania Google

### Opinie muszą być:
- ✅ **Widoczne na stronie** - są wyświetlane w `ReviewSection`
- ✅ **Prawdziwe** - pochodzą od rzeczywistych użytkowników
- ✅ **Z odpowiednią średnią** - minimum 3.5/5 dla najlepszych wyników

### Structured data musi zawierać:
- ✅ `ratingValue` - średnia ocena (string lub number)
- ✅ `reviewCount` - liczba opinii (string lub number)
- ✅ `bestRating` - maksymalna ocena (zwykle "5")
- ✅ `worstRating` - minimalna ocena (zwykle "1")

## 📊 Monitorowanie

### Google Search Console
- Sprawdź raport "Enhancements" → "Ratings"
- Monitoruj błędy w structured data
- Sprawdź czy gwiazdki pojawiają się w wynikach

### Czas indeksowania
- Google może potrzebować **kilku tygodni** na zaindeksowanie zmian
- Gwiazdki nie zawsze się wyświetlają - Google decyduje czy pokazać je w wynikach
- Nie wszystkie strony z opiniami będą miały gwiazdki

## 🔧 Rozwiązywanie problemów

### Problem: Structured data nie jest rozpoznawane

**Sprawdź:**
1. Czy JSON-LD jest poprawny (walidacja JSON)
2. Czy wszystkie wymagane pola są wypełnione
3. Czy opinie są widoczne na stronie
4. Czy `reviewCount` > 0

**Rozwiązanie:**
- Użyj Google Rich Results Test do sprawdzenia błędów
- Popraw błędy w structured data
- Upewnij się, że opinie są wyświetlane na stronie

### Problem: Gwiazdki nie pojawiają się w wynikach

**Możliwe przyczyny:**
- Google jeszcze nie zaindeksowało zmian (poczekaj kilka tygodni)
- Średnia ocena < 3.5
- Zbyt mało opinii (Google preferuje więcej opinii)
- Google zdecydowało nie pokazywać gwiazdek dla tej strony

**Rozwiązanie:**
- Sprawdź w Google Search Console czy structured data jest poprawnie rozpoznane
- Upewnij się, że opinie są widoczne i prawdziwe
- Poczekaj na indeksację przez Google

### Problem: Błędy w Google Rich Results Test

**Najczęstsze błędy:**
- Brakujące pola (`bestRating`, `worstRating`)
- Nieprawidłowy format danych
- Opinie nie są widoczne na stronie

**Rozwiązanie:**
- Sprawdź kod w `src/app/firma/[slug]/page.tsx`
- Upewnij się, że wszystkie pola są wypełnione
- Sprawdź czy `ReviewSection` wyświetla opinie

## 📝 Przykładowa structured data

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Nazwa Firmy",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ul. Przykładowa 1",
    "addressLocality": "Warszawa",
    "postalCode": "00-000",
    "addressCountry": "PL"
  },
  "url": "https://www.katalogo.pl/firma/nazwa-firmy",
  "telephone": "+48123456789",
  "category": "Hydraulik",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "bestRating": "5",
    "worstRating": "1",
    "reviewCount": "24"
  }
}
```

## 🎯 Następne kroki

1. **Przetestuj** kilka stron firm z opiniami w Google Rich Results Test
2. **Zweryfikuj** w Google Search Console czy structured data jest rozpoznawane
3. **Monitoruj** czy gwiazdki pojawiają się w wynikach wyszukiwania
4. **Czekaj** na indeksację przez Google (może zająć kilka tygodni)

## 📚 Przydatne linki

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Google Search Console](https://search.google.com/search-console)
- [Schema.org LocalBusiness](https://schema.org/LocalBusiness)
- [Schema.org AggregateRating](https://schema.org/AggregateRating)
- [Google Guidelines dla opinii](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
