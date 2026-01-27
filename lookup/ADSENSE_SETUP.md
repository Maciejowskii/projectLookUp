# 🎯 Przewodnik konfiguracji Google AdSense

## 📋 Zmienne środowiskowe (.env)

```env
NEXT_PUBLIC_ADSENSE_BANNER_SLOT=twój_banner_slot_id
NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT=twój_sidebar_slot_id
NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT=twój_incontent_slot_id
```

---

## 🎨 Rekomendowane rozmiary reklam dla każdego typu

### 1. **NEXT_PUBLIC_ADSENSE_BANNER_SLOT** (AdSenseBanner)
**Gdzie używane:**
- Strona główna (po hero section)
- Lista kategorii (przed listą firm)

**Rekomendowane ustawienia w Google AdSense:**
- **Orientacja:** Poziomo (Horizontal) ✅
- **Rozmiar:** Elastyczna (Flexible) - **NAJLEPSZA OPCJA**
  - Automatycznie dostosowuje się do szerokości ekranu
  - Na desktop: 728x90 (Leaderboard) lub 970x250 (Billboard)
  - Na mobile: 320x50 (Mobile Banner) lub 320x100 (Large Mobile Banner)
- **Alternatywnie:** Możesz wybrać konkretne rozmiary:
  - 728x90 (Leaderboard) - desktop
  - 970x250 (Billboard) - desktop
  - 320x50 (Mobile Banner) - mobile

**Dlaczego Elastyczna?**
- Najlepsze dopasowanie do różnych ekranów
- Wyższy CTR (Click-Through Rate)
- Mniej pustych miejsc

---

### 2. **NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT** (AdSenseSidebar)
**Gdzie używane:**
- Profil firmy (w prawej kolumnie, po mapie i godzinach otwarcia)
- Szerokość: ~280-300px

**Rekomendowane ustawienia w Google AdSense:**
- **Orientacja:** Kwadrat (Square) ✅
- **Rozmiar:** Elastyczna (Flexible) - **NAJLEPSZA OPCJA**
  - Automatycznie dostosowuje się do szerokości sidebaru
  - Na desktop: 300x250 (Medium Rectangle) - **NAJPOPULARNIEJSZY**
  - Na mobile: 320x50 lub 300x250
- **Alternatywnie:** Konkretny rozmiar:
  - 300x250 (Medium Rectangle) - **ZALECANY**
  - 300x600 (Half Page) - jeśli sidebar jest wyższy
  - 250x250 (Square)

**Dlaczego 300x250?**
- Najpopularniejszy rozmiar reklam displayowych
- Wysoki eCPM (zarobek na 1000 wyświetleń)
- Idealnie pasuje do sidebaru

---

### 3. **NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT** (AdSenseInContent)
**Gdzie używane:**
- Strona główna (między sekcjami)
- Profil firmy (między opisem a opiniami)
- Lista kategorii (po liście firm)
- Blog (po treści artykułu)
- Szerokość: ~max-w-4xl (ok. 896px)

**Rekomendowane ustawienia w Google AdSense:**
- **Orientacja:** Poziomo (Horizontal) ✅
- **Rozmiar:** Elastyczna (Flexible) - **NAJLEPSZA OPCJA**
  - Automatycznie dostosowuje się do szerokości treści
  - Na desktop: 728x90, 970x250, lub 336x280
  - Na mobile: 320x50, 320x100, lub 300x250
- **Alternatywnie:** Konkretne rozmiary:
  - 728x90 (Leaderboard) - szeroki
  - 336x280 (Large Rectangle) - kompaktowy
  - 970x250 (Billboard) - bardzo szeroki

**Dlaczego Elastyczna?**
- Najlepsze dopasowanie do szerokości treści
- Nie psuje layoutu strony
- Wyższy CTR niż stałe rozmiary

---

## 📊 Podsumowanie - Tabela rekomendacji

| Zmienna ENV | Typ | Orientacja | Rozmiar (Elastyczna) | Gdzie używane |
|------------|-----|------------|---------------------|---------------|
| `BANNER_SLOT` | Banner | **Poziomo** | Elastyczna | Strona główna, Lista kategorii |
| `SIDEBAR_SLOT` | Sidebar | **Kwadrat** | Elastyczna (300x250) | Profil firmy (sidebar) |
| `INCONTENT_SLOT` | In-Content | **Poziomo** | Elastyczna | Wszędzie między treścią |

---

## ✅ Krok po kroku - Tworzenie jednostek reklamowych

### 1. Zaloguj się do Google AdSense
https://www.google.com/adsense/

### 2. Przejdź do "Reklamy" > "Według jednostki reklamowej"

### 3. Utwórz 3 jednostki reklamowe:

#### **Jednostka 1: "Banner - Strona główna"**
- Nazwa: `Banner - Strona główna`
- Typ wyświetlania: **Display ads**
- Orientacja: **Poziomo** ✅
- Rozmiar reklamy: **Elastyczna** ✅
- Skopiuj **Ad unit ID** → `NEXT_PUBLIC_ADSENSE_BANNER_SLOT`

#### **Jednostka 2: "Sidebar - Profil firmy"**
- Nazwa: `Sidebar - Profil firmy`
- Typ wyświetlania: **Display ads**
- Orientacja: **Kwadrat** ✅
- Rozmiar reklamy: **Elastyczna** ✅ (lub konkretnie 300x250)
- Skopiuj **Ad unit ID** → `NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT`

#### **Jednostka 3: "In-Content - Między treścią"**
- Nazwa: `In-Content - Między treścią`
- Typ wyświetlania: **Display ads**
- Orientacja: **Poziomo** ✅
- Rozmiar reklamy: **Elastyczna** ✅
- Skopiuj **Ad unit ID** → `NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT`

### 4. Dodaj do pliku `.env`:
```env
NEXT_PUBLIC_ADSENSE_BANNER_SLOT=1234567890
NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT=0987654321
NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT=1122334455
```

### 5. Zrestartuj aplikację
```bash
npm run dev
# lub
npm run build && npm start
```

---

## 🎯 Dlaczego "Elastyczna" jest najlepsza?

✅ **Automatyczne dopasowanie** - reklamy dostosowują się do szerokości ekranu
✅ **Wyższy CTR** - lepsze dopasowanie = więcej kliknięć
✅ **Mniej pustych miejsc** - zawsze wypełnia dostępną przestrzeń
✅ **Lepsze zarobki** - Google wybiera najlepsze reklamy dla danego rozmiaru
✅ **Responsywność** - działa idealnie na mobile i desktop

---

## 📱 Uwagi dotyczące mobile

Wszystkie reklamy z opcją "Elastyczna" automatycznie:
- Na mobile wyświetlają się jako 320x50 lub 300x250
- Na tablet jako 728x90 lub 336x280
- Na desktop jako 728x90, 970x250, lub 300x250

Nie musisz tworzyć osobnych jednostek dla mobile - Google robi to automatycznie! 🎉

---

## ⚠️ Ważne

1. **Nie używaj tego samego Ad Slot ID w wielu miejscach** - każda jednostka powinna mieć unikalny ID
2. **Poczekaj 24-48h** po utworzeniu jednostek - Google potrzebuje czasu na weryfikację
3. **Testuj na różnych urządzeniach** - sprawdź czy reklamy wyświetlają się poprawnie
4. **Monitoruj wydajność** - w AdSense sprawdzaj CTR i eCPM dla każdej jednostki

---

## 🚀 Gotowe!

Po skonfigurowaniu reklamy będą wyświetlane automatycznie na wszystkich stronach:
- ✅ Strona główna
- ✅ Profil firmy
- ✅ Lista kategorii
- ✅ Blog

Powodzenia! 💰
